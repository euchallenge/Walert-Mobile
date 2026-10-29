# What was prepared before the event

For the AI sheet and the jury. Prepared on **Wed 28 Oct 2026, the day before the challenge**, by one team member, using **Claude Code (Anthropic, model Claude Opus 5.5) on a personal account**. No event account was used, and no challenge material was available or used.

## What the template is
- an empty web page: a map (Leaflet 1.9.4, bundled locally), layer on/off toggles, a bottom sheet on phones / side panel on laptops
- empty slots for 3 key numbers (each with a source and a "how it was checked" line), one recommendation to a named actor, a limits box and a source list
- presentation tooling: a "story mode" card that steps the map through views the team defines (Next/Back, arrow keys or a presenter clicker), with two placeholder steps
- colour-by-value styling for layers (categories or thresholds the team sets) with a map legend that builds itself; no thresholds or classes are pre-set beyond the example
- two small scripts, standard library only: `tools/build_layers.py` turns GeoJSON/PNG files into the map's layer file; `tools/bundle_html.py` packs everything into one HTML file
- a thin Android app that only displays that same web page, plus one build command
- an "edition" switch: the same template can build an internal edition (default) and a public edition that contains only items explicitly marked public. It's a build option only, with no content

## What it does NOT contain
- no flood logic, risk scoring or analysis of any kind
- no challenge data, no July 2021 content, no numbers, no recommendation text
- one placeholder "Example layer (delete me)": a rectangle and a point with no meaning

Everything in the final tool (data, layers, numbers, recommendation, limits, sources) is made by the team during the event, under the event's AI rules.

## Also prepared: generic code helpers (`../patterns/`)
- `patterns.py`: CRS check, raster clip, area-weighted population for partly covered cells, building counts inside polygons, observed-vs-modelled overlap scores (hits, misses, false alarms), export of a layer to this template
- tested only on small synthetic rasters and shapes with known answers (`test_patterns.py`, 15 tests); no challenge data, no results

## How it was checked
- the Android build succeeded (debug APK, about 1.4 MB); **phone install: not yet tested** (update this line once done)
- story steps, Back/Next, arrow keys, layer toggles and the legend were clicked through in a headless browser
- the page was rendered in a headless browser at phone (390 px) and laptop (1280 px) widths with no console errors
- the helper functions pass their synthetic tests

## Suggested line for the AI sheet ("tool building" stage)
> Before the event, one member used Claude Code (personal account) to prepare an empty map/panel template (with a step-through "story mode" and an automatic legend), an Android viewer for it, and generic GIS helper functions tested on synthetic data. They contained no challenge data, analysis or content. During the event, all data work, layers, numbers and text were produced by the team with the event's AI accounts and checked against the data.
