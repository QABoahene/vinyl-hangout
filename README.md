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
- `now_spinning`: no longer used. The banner at the top picks a random "Record of the morning/afternoon/evening/night" every 6 hours by itself. You can leave the column or delete it.

Then **File > Share > Publish to web**, choose the `Records` tab and **CSV**, and paste the link in `config.js` as `recordsCsvUrl`. Edits show up after a few minutes, no redeploy needed.

## 2. Cover photos
Resize phone photos first so the page stays fast (macOS):
```bash
mkdir -p covers && for f in raw/*.jpg; do sips -Z 800 "$f" --out "covers/$(basename "$f")"; done
```

## 3. Guest picks (free)
1. Add a second tab `Picks` with headers `timestamp, name, record_id, note, pick_id`.
2. In the sheet: **Extensions > Apps Script**, and paste the contents of [apps-script.gs](apps-script.gs).
3. **Deploy > New deployment > Web app**, execute as *Me*, access *Anyone*. Paste the URL as `picksPostUrl`.
   When you change the script later, use **Deploy > Manage deployments > Edit > Version: New version** so the URL stays the same.
4. Publish the `Picks` tab as CSV too and paste it as `picksCsvUrl`.

How picks behave:
- The Picks tab is the record. Delete a row there and it disappears from everyone's lineup within about 5 minutes.
- A guest's browser keeps its own picks for up to 10 minutes, so they show up straight away while Google's CSV catches up.
- Guests can remove their own picks from the Lineup. The removal key lives in a hidden `Tokens` tab that isn't published.
- To start fresh before the event, reload the sheet and use the **Hangout > Clear all picks** menu.

## 4. Deploy
Push this folder to a GitHub repo and enable **Settings > Pages**, or drag the folder onto Cloudflare Pages. Make a QR code of the URL to print for the event.
