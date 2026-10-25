// Paste this into the sheet's Extensions > Apps Script, replacing the old code,
// then Deploy > Manage deployments > Edit > Version: New version > Deploy.
//
// Picks tab columns: timestamp, name, record_id, note, pick_id
// A hidden "Tokens" tab (created automatically) holds each pick's removal token.
// It is never published, so only the browser that made a pick can remove it.

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (d.action === "delete") return text(deletePick(String(d.pick_id || ""), String(d.token || "")));
    return text(addPick(d));
  } finally {
    lock.releaseLock();
  }
}

function addPick(d) {
  const name = String(d.name || "").trim().slice(0, 40);
  const recordId = String(d.record_id || "").slice(0, 20);
  const pickId = String(d.pick_id || "").slice(0, 64);
  if (!name || !recordId || !pickId) return "bad";
  picks().appendRow([new Date(), name, recordId, String(d.note || "").slice(0, 200), pickId]);
  tokens().appendRow([pickId, String(d.token || "").slice(0, 64)]);
  return "ok";
}

function deletePick(pickId, token) {
  if (!pickId || !token) return "bad";
  const t = tokens();
  const rows = t.getDataRange().getValues();
  const i = rows.findIndex((r) => r[0] === pickId && r[1] === token);
  if (i < 0) return "denied";
  deleteRowsWhere(picks(), 4, pickId); // pick_id is column E (index 4)
  t.deleteRow(i + 1);
  return "ok";
}

// Sheet menu for the host: Hangout > Clear all picks
function onOpen() {
  SpreadsheetApp.getUi().createMenu("Hangout").addItem("Clear all picks", "clearAllPicks").addToUi();
}

function clearAllPicks() {
  const ui = SpreadsheetApp.getUi();
  if (ui.alert("Clear all picks?", "This removes every row from the Picks tab. It can't be undone.", ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  [picks(), tokens()].forEach((s) => { if (s.getLastRow() > 1) s.deleteRows(2, s.getLastRow() - 1); });
  ui.alert("All picks cleared. The site updates within about 5 minutes.");
}

function picks() {
  const s = SpreadsheetApp.getActive().getSheetByName("Picks");
  if (s.getRange("E1").getValue() !== "pick_id") s.getRange("E1").setValue("pick_id");
  return s;
}

function tokens() {
  const ss = SpreadsheetApp.getActive();
  let s = ss.getSheetByName("Tokens");
  if (!s) {
    s = ss.insertSheet("Tokens");
    s.appendRow(["pick_id", "token"]);
    s.hideSheet();
  }
  return s;
}

function deleteRowsWhere(sheet, col, value) {
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) if (rows[i][col] === value) sheet.deleteRow(i + 1);
}

function text(s) {
  return ContentService.createTextOutput(s);
}
