(() => {
  const cfg = window.VINYL_CONFIG;
  const $ = (s) => document.querySelector(s);
  const state = { records: [], picks: [], lineupOrder: null };

  // Build DOM safely: text is always set via textContent, never innerHTML (sheet/guest input is untrusted).
  function el(tag, props = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    kids.flat().forEach((c) => c != null && n.append(c));
    return n;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); cell = "";
        if (row.some((x) => x !== "")) rows.push(row);
        row = [];
      } else cell += c;
    }
    row.push(cell);
    if (row.some((x) => x !== "")) rows.push(row);
    const head = (rows.shift() || []).map((h) => h.trim().toLowerCase());
    return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
  }

  async function loadCsv(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return parseCsv(await res.text());
  }

  const toRecord = (r) => ({
    id: r.id, title: r.title, artist: r.artist, year: parseInt(r.year, 10) || null,
    genre: r.genre, coverFile: r.cover_file,
    tracks: r.tracks ? r.tracks.split("|").map((t) => t.trim()).filter(Boolean) : [],
    description: r.description, spotify: r.spotify_url, youtube: r.youtube_url,
    spinning: /^true$/i.test(r.now_spinning),
  });

  const safeUrl = (u) => (/^https?:\/\//i.test(u) ? u : "");

  function cover(rec, cls = "cover") {
    if (rec.coverFile) {
      return el("img", { class: cls, src: cfg.coversDir + encodeURIComponent(rec.coverFile), alt: `${rec.title} cover`, loading: "lazy" });
    }
    return el("div", { class: cls, text: rec.title.slice(0, 2).toUpperCase(), "aria-label": `${rec.title} cover` });
  }

  // ---------- Collection ----------
  function visible() {
    const q = $("#search").value.trim().toLowerCase();
    const g = $("#genre").value;
    const s = $("#sort").value;
    let list = state.records.filter((r) =>
      (!g || r.genre === g) &&
      (!q || [r.title, r.artist, r.genre, ...r.tracks].some((x) => x.toLowerCase().includes(q))));
    const by = {
      title: (a, b) => a.title.localeCompare(b.title),
      artist: (a, b) => a.artist.localeCompare(b.artist),
      "year-asc": (a, b) => (a.year || 9999) - (b.year || 9999),
      "year-desc": (a, b) => (b.year || 0) - (a.year || 0),
    }[s];
    return list.sort(by);
  }

  function renderGrid() {
    const list = visible();
    const grid = $("#grid");
    grid.replaceChildren(...list.map((r) =>
      el("button", { class: "card", onclick: () => openDetail(r) },
        cover(r),
        el("div", { class: "t" }, r.title, r.spinning ? el("span", { class: "badge", text: "Spinning" }) : null),
        el("div", { class: "a", text: [r.artist, r.year].filter(Boolean).join(" · ") }))));
    $("#count").textContent = `${list.length} of ${state.records.length} records`;
  }

  function renderNow() {
    const r = state.records.find((x) => x.spinning);
    const box = $("#nowSpinning");
    box.hidden = !r;
    if (!r) return;
    box.replaceChildren(el("div", { class: "disc" }),
      el("div", {}, el("small", { text: "Now spinning" }), el("div", { text: `${r.title}` }), el("div", { class: "muted", text: r.artist })));
    box.onclick = () => openDetail(r);
  }

  function fillGenres() {
    const gs = [...new Set(state.records.map((r) => r.genre).filter(Boolean))].sort();
    $("#genre").replaceChildren(el("option", { value: "", text: "All genres" }), ...gs.map((g) => el("option", { value: g, text: g })));
  }

  // ---------- Detail + pick form ----------
  function openDetail(r) {
    const picks = state.picks.filter((p) => p.record_id === r.id);
    const msg = el("p", { class: "msg", role: "status" });
    const name = el("input", { placeholder: "Your name", maxlength: "40", required: "", value: localStorage.getItem("vinyl.name") || "" });
    const note = el("textarea", { placeholder: "Why this record? (optional)", maxlength: "200", rows: "2" });
    const hp = el("input", { class: "hp", name: "website", tabindex: "-1", autocomplete: "off", "aria-hidden": "true" });
    const form = el("form", { class: "pickform", onsubmit: async (e) => {
      e.preventDefault();
      if (hp.value) return; // honeypot tripped
      msg.textContent = "Saving…";
      try {
        await submitPick({ name: name.value.trim(), record_id: r.id, note: note.value.trim() });
        localStorage.setItem("vinyl.name", name.value.trim());
        msg.textContent = "You're on the lineup! 🎶";
        renderLineup();
      } catch { msg.textContent = "Couldn't save. Try again."; }
    } },
      el("strong", { text: "I want to explore this one" }), name, note, hp,
      el("button", { class: "btn", type: "submit", text: "Add to lineup" }), msg);

    const links = [["Spotify", safeUrl(r.spotify)], ["YouTube", safeUrl(r.youtube)]].filter(([, u]) => u)
      .map(([t, u]) => el("a", { href: u, target: "_blank", rel: "noopener noreferrer", text: t }));

    $("#detailBody").replaceChildren(el("div", { class: "detail" },
      cover(r),
      el("h3", { text: r.title }),
      el("p", { class: "muted", text: [r.artist, r.year, r.genre].filter(Boolean).join(" · ") }),
      r.description ? el("p", { text: r.description }) : null,
      r.tracks.length ? el("ol", { class: "tracks" }, r.tracks.map((t) => el("li", { text: t }))) : null,
      links.length ? el("p", { class: "links" }, links) : null,
      picks.length ? el("p", { class: "muted", text: "Picked by " + picks.map((p) => p.name).join(", ") }) : null,
      form));
    $("#detail").showModal();
  }

  // This browser's own picks. The sheet is the real record; these only bridge the few minutes
  // before Google's published CSV catches up, and hold the token that lets this guest remove a pick.
  const PENDING_MS = 10 * 60 * 1000;
  const readMine = () => { try { return JSON.parse(localStorage.getItem("vinyl.mine") || "[]"); } catch { return []; } };
  const writeMine = (m) => { try { localStorage.setItem("vinyl.mine", JSON.stringify(m)); } catch {} };
  const age = (iso) => Date.now() - new Date(iso).getTime();
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

  async function post(body) {
    if (!cfg.picksPostUrl) return;
    // text/plain avoids a CORS preflight, which Apps Script web apps cannot answer.
    await fetch(cfg.picksPostUrl, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(body) });
  }

  async function submitPick(p) {
    const pick = { ...p, pick_id: uid(), timestamp: new Date().toISOString() };
    const token = uid();
    await post({ action: "add", ...pick, token });
    writeMine([...readMine(), { ...pick, token }]);
    state.picks.push(pick);
  }

  async function removePick(p) {
    const mine = readMine();
    const m = mine.find((x) => x.pick_id === p.pick_id);
    if (!m) return;
    await post({ action: "delete", pick_id: m.pick_id, token: m.token });
    m.removedAt = new Date().toISOString(); // keep hiding it until the published CSV drops the row
    writeMine(mine);
    state.picks = state.picks.filter((x) => x.pick_id !== p.pick_id);
    renderLineup();
  }

  // ---------- Lineup ----------
  function renderLineup() {
    const seen = new Set();
    let list = state.picks.filter((p) => {
      const k = p.name.toLowerCase() + "|" + p.record_id;
      return seen.has(k) ? false : (seen.add(k), true);
    });
    if (state.lineupOrder) list = state.lineupOrder.filter((p) => list.includes(p)).concat(list.filter((p) => !state.lineupOrder.includes(p)));
    const ol = $("#lineup");
    if (!list.length) { ol.replaceChildren(el("p", { class: "muted", text: "No picks yet. Open a record and add yourself." })); return; }
    const mineIds = new Set(readMine().map((m) => m.pick_id));
    ol.replaceChildren(...list.map((p) => {
      const r = state.records.find((x) => x.id === p.record_id);
      if (!r) return null;
      const rm = p.pick_id && mineIds.has(p.pick_id)
        ? el("button", { class: "btn ghost rm", text: "Remove", "aria-label": `Remove ${p.name}'s pick`, onclick: (e) => {
            e.stopPropagation();
            if (confirm(`Remove "${r.title}" from the lineup?`)) removePick(p);
          } })
        : null;
      return el("li", { onclick: () => openDetail(r) }, cover(r),
        el("div", {}, el("div", { class: "who", text: p.name }),
          el("div", { text: `${r.title} · ${r.artist}` }),
          p.note ? el("div", { class: "muted", text: p.note }) : null), rm);
    }));
    state.lineupCurrent = list;
  }

  async function loadPicks() {
    try { localStorage.removeItem("vinyl.picks"); } catch {} // old format that never expired
    let mine = readMine();
    if (!cfg.picksCsvUrl) { // no sheet: this browser is the only record
      state.picks = mine.filter((m) => !m.removedAt);
      return;
    }
    let remote;
    try {
      remote = (await loadCsv(cfg.picksCsvUrl)).map((r) => ({ name: r.name, record_id: r.record_id, note: r.note, timestamp: r.timestamp, pick_id: r.pick_id }));
    } catch { // sheet unreachable: show what this browser knows, change nothing
      state.picks = mine.filter((m) => !m.removedAt);
      return;
    }
    const inSheet = new Set(remote.map((p) => p.pick_id).filter(Boolean));
    // Keep a local pick while the sheet still has it, or while it's fresh enough that the CSV may lag.
    // Anything else was deleted in the sheet (or reset), so forget it.
    mine = mine.filter((m) => m.removedAt ? inSheet.has(m.pick_id) && age(m.removedAt) < PENDING_MS
                                          : inSheet.has(m.pick_id) || age(m.timestamp) < PENDING_MS);
    writeMine(mine);
    const removed = new Set(mine.filter((m) => m.removedAt).map((m) => m.pick_id));
    state.picks = remote.filter((p) => !removed.has(p.pick_id))
      .concat(mine.filter((m) => !m.removedAt && !inSheet.has(m.pick_id)));
  }

  // ---------- Views ----------
  function showView(name) {
    document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== "view-" + name));
    document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.view === name));
    $("#nowSpinning").style.display = name === "collection" ? "" : "none";
    if (name === "lineup") renderLineup();
  }

  async function init() {
    $("#siteTitle").textContent = cfg.siteTitle;
    document.title = cfg.siteTitle;
    $("#tagline").textContent = cfg.tagline;
    try {
      state.records = (await loadCsv(cfg.recordsCsvUrl || cfg.fallbackCsv)).map(toRecord).filter((r) => r.id && r.title);
    } catch {
      try { state.records = (await loadCsv(cfg.fallbackCsv)).map(toRecord); $("#status").textContent = "Showing sample data (couldn't reach the sheet)."; }
      catch { $("#status").textContent = "Couldn't load records."; }
    }
    await loadPicks();
    fillGenres(); renderGrid(); renderNow();

    ["#search", "#genre", "#sort"].forEach((s) => $(s).addEventListener("input", renderGrid));
    $("#surprise").onclick = () => { const l = visible(); if (l.length) openDetail(l[Math.floor(Math.random() * l.length)]); };
    document.querySelectorAll(".tabs button").forEach((b) => (b.onclick = () => showView(b.dataset.view)));
    $("#shuffleLineup").onclick = () => {
      const a = [...(state.lineupCurrent || [])];
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      state.lineupOrder = a; renderLineup();
    };
    $("#refresh").onclick = async () => { await loadPicks(); renderLineup(); };
    $("#detail").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
    window.Vinyl = { state, el, cover, openDetail };
    document.dispatchEvent(new Event("vinyl:ready"));
  }
  init();
})();
