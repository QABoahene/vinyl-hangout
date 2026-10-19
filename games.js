document.addEventListener("vinyl:ready", () => {
  const { state, el, cover } = window.Vinyl;
  const area = document.querySelector("#gameArea");
  const rand = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
  let score = { right: 0, total: 0 };

  function options(answer, label) {
    const others = shuffle(state.records.filter((r) => r.id !== answer.id)).slice(0, 3);
    return shuffle([answer, ...others]).map((r) => ({ r, text: label(r) }));
  }

  function choices(answer, opts, next) {
    const box = el("div", { class: "opts" });
    opts.forEach(({ r, text }) => {
      const b = el("button", { text, onclick: () => {
        box.querySelectorAll("button").forEach((x) => (x.disabled = true));
        const ok = r.id === answer.id;
        score.total++; if (ok) score.right++;
        b.classList.add(ok ? "right" : "wrong");
        if (!ok) [...box.children].find((x) => x.textContent === opts.find((o) => o.r.id === answer.id).text).classList.add("right");
        box.append(el("button", { class: "btn", text: "Next", onclick: next }));
      } });
      box.append(b);
    });
    return box;
  }

  const scoreLine = () => el("p", { class: "muted", text: `Score: ${score.right} / ${score.total}` });

  function need(min) {
    if (state.records.length >= min) return true;
    area.replaceChildren(el("p", { class: "muted", text: `Add at least ${min} records to play this.` }));
    return false;
  }

  const games = {
    cover() {
      if (!need(4)) return;
      const ans = rand(state.records);
      const zoom = el("div", { class: "zoom" }, cover(ans));
      zoom.style.setProperty("--s", "4");
      zoom.style.setProperty("--ox", Math.random() * 100 + "%");
      zoom.style.setProperty("--oy", Math.random() * 100 + "%");
      const box = choices(ans, options(ans, (r) => `${r.title} – ${r.artist}`), games.cover);
      box.addEventListener("click", () => zoom.style.setProperty("--s", "1"), { once: true });
      area.replaceChildren(el("h3", { text: "Guess the cover" }), zoom, box, scoreLine());
    },
    track() {
      if (!need(4)) return;
      const pool = state.records.filter((r) => r.tracks.length);
      if (!pool.length) return area.replaceChildren(el("p", { class: "muted", text: "No tracklists yet." }));
      const ans = rand(pool);
      area.replaceChildren(el("h3", { text: "Which record has this track?" }),
        el("p", { class: "bigname", text: `"${rand(ans.tracks)}"` }),
        choices(ans, options(ans, (r) => `${r.title} – ${r.artist}`), games.track), scoreLine());
    },
    year() {
      const pool = state.records.filter((r) => r.year);
      if (pool.length < 2) return area.replaceChildren(el("p", { class: "muted", text: "Add years to at least two records." }));
      let [a, b] = shuffle(pool);
      if (a.year === b.year) return games.year();
      const older = a.year < b.year ? a : b;
      const opts = shuffle([a, b]).map((r) => ({ r, text: `${r.title} – ${r.artist}` }));
      area.replaceChildren(el("h3", { text: "Which one is older?" }), choices(older, opts, games.year), scoreLine());
    },
    spinner() {
      const names = [...new Set(state.picks.map((p) => p.name))];
      const input = el("input", { placeholder: "Names, comma separated (or leave empty to use the lineup)" });
      const out = el("div", { class: "bigname", text: "?" });
      const go = el("button", { class: "btn", text: "Spin", onclick: () => {
        const list = input.value.split(",").map((s) => s.trim()).filter(Boolean);
        const from = list.length ? list : names;
        if (!from.length) return (out.textContent = "No names yet");
        let i = 0;
        const t = setInterval(() => {
          out.textContent = rand(from);
          if (++i > 15) clearInterval(t);
        }, 90);
      } });
      area.replaceChildren(el("h3", { text: "Who goes next?" }), input, el("div", { class: "row" }, go), out);
    },
  };

  document.querySelectorAll("[data-game]").forEach((b) => b.addEventListener("click", () => {
    score = { right: 0, total: 0 };
    games[b.dataset.game]();
  }));
});
