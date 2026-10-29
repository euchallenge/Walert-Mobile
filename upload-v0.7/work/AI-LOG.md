# AI log (team number only, no names)

Fill in as you go. It feeds the AI sheet. Use the stage names from the official sheet.
Never paste keys, personal data or whole datasets into an AI tool.

## Use log
| Time | Stage | Tool (Claude chat / Claude Code / Gemini) | What we asked (short) | What we kept | Checked how |
|---|---|---|---|---|---|
| Thu AM | 1 Understanding case and data | Claude Code | Check prep repo for personal data before start | Repo clean; kept as is | Grep of files + git history, read the results |
| Thu AM | 1 Understanding case and data | Claude Code | Turn personal checklist into a team overview PDF | TEAM-OVERVIEW.pdf (Team 4) | Rebuilt after reading Annexes 1, 3, 4, 5 (first version relied on checklist only) |
| Thu AM | 5 Desk research and sources | Claude Code (web search + fetch) | Background on July 2021 floods in Wallonia | WALLONIA-2021-TEAM4.pdf, key figures from Walloon Gov press release 4 Jul 2022 | Opened the primary PDF; unopened sources marked "verify" |
| Thu AM | 1 Understanding case and data | Claude Code | Can our teammate's GEV / extreme value idea be used? | No own GEV fit: data has no discharge/rain time series; use EFAS RP10/100/500 maps (Annex 2) | Listed dataset files; Annex 2 fact sheet |
| Thu AM | 2 Loading and preparing data | Claude Code | Read real layer/column names before coding | Field names, CRS (all EPSG:4326) | Metadata read from the files, not guessed |
| Thu AM | 3 Analysis and code | Claude Code | Script: observed 2021 flood vs EFAS return-period zones, buildings + people | work/analysis/vesdre_rp_gap.py (first run, AOI01) | 15 helper tests pass; building count cross-checked with a second method |
| Thu AM | 5 Desk research and sources | Claude Code (web search + fetch) | Do long river-flow records exist for a GEV? Any soil data? | Wallonia Annexe F (official GEV fits incl. July 2021 peaks); Meuse records (RWS, GRDC); EU-SoilHydroGrids as optional context | Annexe F PDF opened and read; peaks read off charts = approximate |
| Thu midday | 8 Policy tool | Claude Code | Merge teammate's Streamlit "flood impact card" data into our Android/web map | work/analysis/build_app_layers.py: municipality, RP10/100/500, observed 2021, gap and gauge layers; 4-step story | Teammate's 156 vs our 158 buildings in the 2021 footprint (AOI01): two independent methods agree |
| Thu midday | 5 Desk research and sources | Claude Code | Official coordinates for the Annexe F gauges | 2 gauges (Spixhe L6790, Theux L5860) from the AQUALIM geoservice; Meuse/Ourthe gauges left out (no official coordinates found) | Queried the official Wallonia geoservice, no coordinates guessed |
| Thu midday | 8 Policy tool | Claude Code | One app, two sides: policy makers + residents (alerts, shelter info) | Mode switch; residents side = public layers + official Crisis Centre advice/links + labelled DEMO notification; no shelter points (none in data, only authorities can name them) | Official URLs checked (one 404 replaced); advice quoted from Crisis Centre pages |
| Thu midday | 8 Policy tool | Claude Code | Code review + build APK v0.1 | 3 fixes: demo alert sent right after permission grant; no mode switch in the separate public edition; script-order note | APK inspected: version 0.1, 7 layers, notification permission, residents content bundled |
| Thu PM | 8 Policy tool | Claude Code | v0.2: role choice at start, residents' essentials every open, verified messages policy → residents, water/electricity/gas status per municipality (mayor's idea) | Demo relay server (code-protected, in memory, laptop + USB); essentials quoted from Crisis Centre "Inondation pluviale" page; statuses never pre-filled | Relay tested with curl (wrong code 403, bad input 400, CORS); all page element ids cross-checked; APK inspected (v0.2, localhost-only http) |
| Thu PM | 7 Recommendations and brief | Claude Code | 2-page concept sheet for the Communicator (pitch, trust points, words to use/avoid, real vs demo) | work/CONCEPT-TEAM4.pdf | Only figures already traced to opened sources; layout checked on rendered pages |
| Thu PM | 8 Policy tool | Claude Code (Remotion) | v0.3: 18 s "what to do" animation for residents (skippable, then 4-tile card) + GPS municipality | motion/ project, media/essentials-en.mp4 (430 KB); FR/NL/DE left empty until a native speaker writes them; location used on the phone only | 6 stills reviewed before render (water line lowered after review); MP4 probed (18.0 s, 720×1280, no audio); point-in-polygon tested (Visé, Esneux found; Brussels outside → manual) |
| Thu PM | 8 Policy tool | Claude Code | v0.4: A/B test apps (video vs 3-line text), easy-read mode for elderly/disabled residents (big text, contrast, read aloud), crisis chat between policy makers | Two side-by-side APKs ("Flood app A/B"); essentials cut to 3 lines; chat private (code needed to read and write), senders are roles not names | Chat endpoints tested with curl (403 without code); both APKs inspected (id, label, video present/absent, variant flag) |
| Thu PM | 8 Policy tool | Claude Code | v0.5: integrate teammate's flood-impact v2 + quick-info screen for policy makers | Flood zones without permanent water; residents in 100-year zone as a range (census vs GHS-POP) + 65+; candidate shelters and flooded roads on the policy side only (teammate's own rule: candidates are not official); OSM/Eurostat/Infrabel credited | Visé values match teammate's data (4,591 buildings; 4,800-5,120 residents); source URLs checked; residents' layer list verified (no shelters); 3 APKs inspected |
| Thu PM | 4 Maps and charts / 8 Policy tool | Claude Code (+ built-in dataviz skill) | v0.6: "closest shelter" for residents, simplicity pass, colour check | Closest 3 candidate shelters computed on the phone (dry in 500-yr model and in 2021; no hospitals, no open-air pitches; "not official" warning); 3 big resident actions; secondary sections folded; map colours replaced after the palette validator failed the old ones | Validator run (old overlay set FAILED: two near-identical purples; new set passes); nearest-shelter tested on Visé/Esneux; 3 APKs inspected |
| Thu PM | 8 Policy tool | Claude Code | v0.7 for the presentation: location useless outside Wallonia; map unclear | DEMO location (Visé) offered only when the real location is outside the data area or unavailable, labelled DEMO; grey basemap; municipalities as light outlines; gap layer off at start; map opens on the data area | Layer defaults listed from the build; basemap tile URL checked; syntax and element ids checked |
| Thu midday | 8 Policy tool | Claude Code | Build web page + Android APK | dist/policy-tool.html (3.8 MB), dist/policy-tool-debug.apk (2.1 MB) | Build succeeded; web page served locally; visual check on phone still to do |

## AI errors caught (up to 5 on the sheet)
| Time | What the AI got wrong | How we caught it (test, recomputation, source opened) | Fix |
|---|---|---|---|
| Thu AM | Labelled EMS AOI01 as "Liège / Vesdre"; ~90% of the mapped flood area is actually the Meuse north of Liège to the NL border | Split flooded area by latitude band | Reframe on the BE-NL-DE border triangle |
| Thu AM | First result: only 158 buildings in the 2021 flood, presented before plausibility check (official: ~48,000 buildings in Wallonia) | Compared with Walloon Gov figure; Annex 2: OBAT undercounts Belgium, EMS = snapshot not peak | Report as a lower bound with these limits |
| Thu AM | Web-search summary gave death tolls 31-42 and a 271.5 mm rainfall figure without a primary source | Opened the Walloon Government press release | Use 39 (police, via Gov); rainfall marked "verify with RMI" |
| Thu AM | Analysis script pointed to the wrong data folder | Script crashed on first run | Path fixed |
| Thu AM | First team overview PDF cited annex numbers without having read the annexes | Annexes unzipped and read | PDF rebuilt from Annexes 1, 3, 4, 5 |
| Thu midday | Map layer transparency set with a setting the app ignores ("opacity" instead of "fillOpacity") | Read the template's app.js before reusing it | Fixed in the new layer script |

## Key prompts (pick 3 for the sheet)
1.
2.
3.

## Verification of every number in the tool
| Number | Source (file / URL + date) | Recomputed by (role) | Same result? |
|---|---|---|---|
|  |  |  |  |

## Biggest help / biggest letdown
- Help:
- Letdown:

## Limits (of the data, of the AI, of our method)
- EMS flood maps are satellite snapshots (15 and 17 July), not the peak, and miss water in narrow urban valleys like the Vesdre.
- OBAT undercounts buildings in the Belgian flood areas (Annex 2); OBAT `use` codes 0/1/2 not yet decoded (check the OBAT PDF).
- EFAS leaves out rivers with a catchment below 500 km², and was run on 1990-2016 data.
- No own GEV fit: the data has no long time series of river flow or rainfall.
