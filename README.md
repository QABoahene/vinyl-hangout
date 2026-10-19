# Vinyl Listening Hangout

A static, no-build site that shows your vinyl collection, lets guests add the record they want to explore, and has a few games. Plain HTML/CSS/JS.

## Run locally
```bash
python3 -m http.server 8000
```
Open http://localhost:8000. With empty URLs in `config.js` it uses `sample-records.csv` and keeps picks in the browser only.

## 1. Records sheet
Create a Google Sheet with a tab `Records` and these columns (row 1):

`id, title, artist, year, genre, cover_file, tracks, description, spotify_url, youtube_url, now_spinning`

- `id`: any unique value (1, 2, 3…)
- `tracks`: separate songs with `|`
- `cover_file`: filename in `covers/` (e.g. `kind-of-blue.jpg`). Empty shows a colored placeholder.
- `now_spinning`: `TRUE` on the record currently playing

Then **File > Share > Publish to web**, choose the `Records` tab and **CSV**, and paste the link in `config.js` as `recordsCsvUrl`. Edits show up after a few minutes, no redeploy needed.

## 2. Cover photos
Resize phone photos first so the page stays fast (macOS):
```bash
mkdir -p covers && for f in raw/*.jpg; do sips -Z 800 "$f" --out "covers/$(basename "$f")"; done
```

## 3. Guest picks (free)
1. Add a second tab `Picks` with headers `timestamp, name, record_id, note`.
2. In the sheet: **Extensions > Apps Script**, paste:
```js
function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const name = String(d.name || "").slice(0, 40);
  if (!name || !d.record_id) return ContentService.createTextOutput("bad");
  SpreadsheetApp.getActive().getSheetByName("Picks")
    .appendRow([new Date(), name, String(d.record_id), String(d.note || "").slice(0, 200)]);
  return ContentService.createTextOutput("ok");
}
```
3. **Deploy > New deployment > Web app**, execute as *Me*, access *Anyone*. Paste the URL as `picksPostUrl`.
4. Publish the `Picks` tab as CSV too and paste it as `picksCsvUrl`.

## 4. Deploy
Push this folder to a GitHub repo and enable **Settings > Pages**, or drag the folder onto Cloudflare Pages. Make a QR code of the URL to print for the event.
