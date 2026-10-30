# Roadmap to v1.0 (Team 4), target ~16:00 Thu 29 Oct

v1.0 = everything shown in the demo works end to end, the database is live, no placeholder text on screen.
Status Thu evening: v1.0 = walert (one APK, video). See work/HANDOFF.md for everything done and open.
Still open: #2 key numbers + named actor (team), real-phone check + projector dry run (#5), GitHub upload via website.

| # | Time | Task | Who | Done when |
|---|---|---|---|---|
| 1 | 14:45-15:05 | **Utility tiles per municipality** (mayor's request): operator + official fault/emergency number (tap = call) + outage page (tap = open), for Visé, Liège, Esneux, Pepinster; all other municipalities: "check your bill or your municipality" | Claude Code (research running) + Researcher checks 2 numbers by hand | Every number/link from an opened official page, URL + date in sources |
| 2 | 14:45 | **Key numbers + named actor** in content.js (else the policy panel shows "Key number 1 / source needed") | **Team → send to Claude** | 3 numbers with source + check line; actor, action, why |
| 3 | 15:05-15:25 | **Database live end to end**: relay with SQLite on the demo laptop, phone over USB (`adb reverse`); policy side sends message (with sender) + status + chat → residents side gets notification and tiles; relay restart keeps everything; `--reset` before the demo | Claude Code (emulator) + Coder (real phone) | Checklist passes on emulator AND real phone |
| 4 | 15:25-15:40 | **Polish** from the emulator test: dark loading screen instead of white on start; gauge legend colour = marker colour; story card smaller on phone; check title rendering on a real phone (looked clipped in emulator) | Claude Code | Screenshots reviewed |
| 5 | 15:40-15:50 | **Build v1.0** (versionName 1.0): video + text APKs, single HTML; install on phone; 5-min demo dry run with projector (scrcpy) | Coder + Communicator | Dry run under 5 min, no dead screen |
| 6 | 15:50-16:00 | **Paper trail**: AI-LOG rows + AI-USE PDF; `upload-v1.0/` clean copy for the GitHub website upload (branch v1.0); outputs to `gs://outputs_challenge/team-XX` | Claude Code + Communicator | PDF regenerated, upload folder has no keys/personal data |

**After v1.0 (before Friday 13:30):** Q1-Q4 check against the story → policy brief (Annex 6 template) telling the same
story → AI sheet (Annex 7) from AI-LOG → email to JRC-SI@ec.europa.eu and info@fari.brussels.

**Cut if late (in this order):** story-card resize, gauge legend, text-variant APK rebuild.
**Never cut:** sources on every number, "not official" warnings, DEMO labels, the --reset before the demo.
