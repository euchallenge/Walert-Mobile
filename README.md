# Policy tool template

A blank map + panel for a policy tool. It is one web page that works as:
- a single HTML file for the email deliverable (`dist/policy-tool.html`, opens by double-click), and
- an Android app for a live demo on a phone (`dist/policy-tool-debug.apk`).

It has no data and no analysis in it. The team adds both.

## The 4 places you edit
| What | Where |
|---|---|
| Title, 3 key numbers (each with a source and a "how checked" line), recommendation to a named actor, limits, sources, map start view | `web/content.js` (public edition: `web/content.public.js`) |
| Map layers | files in `web/data/src/` (see below) |
| Look and feel | `web/style.css` (colours are tokens at the top) |
| Behaviour | `web/app.js` (only if needed) |

## Add a layer
Export from Python (Colab or local):
```python
gdf.to_crs(4326).to_file("my_layer.geojson", driver="GeoJSON")   # simplify first if it is big
```
- Put the file in `web/data/src/`.
- Rasters: save a PNG plus `name.json` containing `{"bounds": [[south, west], [north, east]]}`.
- Optional: `web/data/src/layers.json` sets per-layer `name`, `color`, `visible`, `props` (columns shown on tap), `order` and `opacity`.

Then run `python3 tools/build_layers.py`. It writes `web/data/layers.js`; the example layer disappears once a real one exists.

## Colour by value (legend builds itself)
In `web/data/src/layers.json`, give a layer a `style`:
```json
{"people_per_area": {"name": "People per area", "style": {"by": "people", "bins": [100, 1000],
  "colors": ["#c6dbef", "#6baed6", "#08519c"], "labels": ["< 100", "100 - 1,000", "> 1,000"]}}}
```
- Use `"classes": [{"value": "x", "color": "#hex", "label": "X"}]` for categories instead of `bins`.
- PNG layers take a manual `"legend": [{"color": "#hex", "label": "..."}]`.
- The legend box (top right) shows only the layers that are on.

## Story mode (the live demo)
`story` in `web/content.js` holds the steps: a title, one line of text, a map view, and which layers are on.
```js
{ title: "1 · The question", text: "...", center: [50.6, 5.8], zoom: 10, layers: ["layer_id"] }
```
- Click Next/Back, or press → / Space / PageDown and ← / PageUp. A presenter clicker works.
- An empty `story: []` hides the card.
- Keep it to 3-5 steps, and make the captions match the brief's story.
- `layers` uses the layer ids (file names without extension). Unknown ids are ignored with a console warning; a step whose ids all are unknown leaves the layers as they are. So the placeholder steps can't blank the map, but do replace them.
- While a story exists, the arrow keys step the story and don't pan the map.

## Two editions: internal first, public later
The template builds two separate products from one codebase:

| | Internal (policy) edition | Public (consumer) edition |
|---|---|---|
| For | decision-makers, the jury, testers | residents, once the internal one is tested |
| Content | `web/content.js` | `web/content.public.js` |
| Layers | all layers | only layers with `"audience": "public"` in `layers.json`, and only their `props` columns |
| Recommendation | shown | hidden (set to `null`) |
| Badge | optional `badge` in `content.js` (e.g. "Draft"), none by default | none |
| Build | `./build-apk.sh` | `./build-apk.sh public` |
| Output | `dist/policy-tool.html`, `dist/policy-tool-debug.apk` | `dist/policy-tool-public.html`, `dist/policy-tool-public-debug.apk` |
| App on phone | Policy Tool (`org.aic.policytool`) | Policy Tool (public) (`org.aic.policytool.public`) |

- **Internal is the default.** A layer is internal-only unless you mark it public.
- The public build is assembled in `build/web-public/` from **only** the public pieces. Internal content is never copied in, so it can't leak through the page source or the APK. It isn't just hidden on screen.
- Mark a layer public: `{"flood_zones": {"audience": "public", "props": ["name"]}}`. Columns not listed in `props` (and not the `style.by` column) are stripped from the public copy.
- **Rules for the public edition** (top of `content.public.js`): only information that is already public or cleared for release, with sources; relay official warnings (e.g. BE-Alert) and never issue one or say "safe"; no recommendation to authorities; no names.
- Upgrade path: test the internal edition with its users first. Then decide, with whoever owns the data, what may go public, and fill in `content.public.js`.

## Build
```bash
./build-apk.sh            # layers -> dist/policy-tool.html -> dist/policy-tool-debug.apk
./build-apk.sh install    # same, then install on a phone connected over adb
./build-apk.sh public     # public edition (see "Two editions")
./install-phone.sh [public] [mirror]   # install over USB via Windows adb, optionally mirror with scrcpy
```
- To view only the web page, open `web/index.html` or `dist/policy-tool.html` in a browser.
- On the Android app, a phone shows the panel as a bottom sheet: drag or tap the handle.

## Numbers: source and "how checked"
Every key number has `source` (dataset file or URL + date) and `check` (how the team verified it, e.g. "recomputed independently by the second coder"). The check line is shown under each number. It makes the responsible-AI criterion visible in the tool itself.

## Notes
- Layers draw on a canvas, so thousands of points (e.g. building points) stay smooth.
- The basemap (`"osm"` or `"gray"` in `content.js`) needs internet. Layers and the panel work offline.
- Keep `web/data/layers.js` under about 15 MB. The script warns above that.
- Third-party: Leaflet 1.9.4 (BSD-2-Clause, `web/vendor/leaflet/LICENSE`). Map tiles: OpenStreetMap contributors (ODbL) or Esri.
- What was prepared before the event is in `TEMPLATE-NOTE.md`.
