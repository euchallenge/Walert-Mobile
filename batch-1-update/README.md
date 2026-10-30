# walert (Team 4, European AI Challenge 2026)

**walert connects policy makers with their residents in a flood.** One app, two sides:
- **Policy makers:** where it flooded in July 2021, the official 1-in-100-year flood zone and the gap between the two,
  where the data has gaps, verified messages to residents, priority issues per municipality, and a Crisis center
  where mayors and crisis teams coordinate.
- **Residents:** what to do, where to go (closest candidate shelter by a walking route that avoids the flood zones,
  not official), the latest messages from their municipality, and water, power and gas contacts in one place.
  Their location never leaves the phone.

Built on the challenge data (Copernicus EMS EMSR518, EFAS flood hazard maps, GHS-OBAT) for 66 municipalities in
Wallonia only. External sources are marked "External" in the app's Sources list.

## Try it (jury)
- **On a computer:** download `apk/walert-v1.5.2.html` and double-click it (Chrome, Edge or Firefox). It opens on the
  policy side; **Switch role** (top right) shows the resident side. One file, no installation; only the background
  map needs internet.
- **On an Android phone:** download `apk/walert-v1.5.2.apk`, allow "Install unknown apps" for your browser or file
  manager when asked, then open it. It is a debug-signed test build (not from the Play Store).
- **Works in both files without our server:** the 66 municipalities, the flood scenarios and the July 2021 map,
  Priority issues, shelters, people, roads and the data limits (policy side); the closest dry shelter, what to do,
  water/power/gas contacts and the No-internet screen (resident side). Statuses and messages are made up and
  labelled DEMO.
- **Needs our demo server (shown live in the demo):** sending verified messages, the Crisis center, and individual
  building points (opened with a verification code that is never stored in the app or this repository).

## Data
Challenge data (Copernicus EMS EMSR518, EFAS, GHS-OBAT, GHS-POP) plus sourced open data (OpenStreetMap, Eurostat,
Statbel, Infrabel, the energy regulator CWaPE and water distributors), each listed in the app's Sources. Building
points have no ids or addresses; residents only ever see 250 m squares. No personal data.

## Live demo
`work/DEMO-GUIDE-TEAM4.pdf`: setup, the 5-minute run with a screenshot per step, what to do if something breaks.

## What is where
Uploaded in two parts: the files for the jury first, the source second.

| Folder | Contents |
|---|---|
| `apk/` | Final build: one APK + the single-file HTML |
| `template/` | Source: `web/` (Leaflet app), `android/` (Kotlin WebView wrapper), `tools/` (bundler, demo message relay) |
| `motion/` | The 18-second "what to do in a flood" video (Remotion) |
| `work/` | Analysis scripts, AI-use log + PDF, pitch, research notes |
| `patterns/` | Helper code and its tests |
| `logo/` | The team's logo sheet (source for the app icon, `work/make_icon.py`) |

## AI use
Every AI step, what we kept and how we checked it: `work/AI-LOG.md` and `work/AI-USE-TEAM4.pdf`.
No API keys, personal data or whole datasets are in this repository.
