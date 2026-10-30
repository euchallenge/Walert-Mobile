# Safe access to the challenge data (Team 4)

Source: Annex 1 Setup Guide (read 29 Oct 2026). Data: read-only bucket `gs://datasets_challenge/working_data`.

## What we do
- **Annex 1 Option C (downloaded files).** Our copy is in `data/working_data` (about 15 GB). The analysis
  scripts read it from disk: no network, no login, no credentials anywhere in our code.
- **The app never connects to the bucket or to any database of challenge data.** `build_app_layers.py` and
  `tools/build_layers.py` turn our results into `web/data/layers.js`, which ships inside the app. Phones hold no
  credentials and send nothing back. Location stays on the phone.

## If we need fresh data (Annex 1 Option B: own environment + starter notebook)
1. Log in only with the event account (`…@european-ai-challenge.com`), never a personal Google account:
   `gcloud auth application-default login`. The person at the keyboard runs this themselves; Claude never does.
2. Use the starter notebook `how_to_get_started.ipynb` as is. It reads only the area you choose.
3. No service-account key files, no tokens or passwords in code, notebooks, prompts or git.
4. The bucket is read-only. Our outputs go to our own team folder, e.g.
   `gcloud storage cp results.csv gs://outputs_challenge/team-04/` (Annex 1 example; check the team folder name).
5. Do not paste whole datasets into Claude. Share column names, a few sample rows or the error (Annex 3).

## App messages (relay server)
- Messages, water/power/gas status and the mayors' chat are in a local SQLite file (`template/tools/relay.db`,
  git-ignored) on the demo laptop, listening on `127.0.0.1` only. Phones reach it over USB (`adb reverse`).
- The verification code comes from the `RELAY_CODE` environment variable and is never stored. Queries use
  parameters (no SQL built from text). No personal data: senders are roles or places, not names.
- Before the demo: `RELAY_CODE=<code> python3 tools/relay_server.py --reset`.
- In real life this would be the authorities' own channel (BE-Alert) with real identity checks (eID/itsme).
