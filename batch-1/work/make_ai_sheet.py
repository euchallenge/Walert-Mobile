"""Annex 7 AI sheet for Team 4, filled from work/AI-LOG.md and the teammate's flood-impact notes.

Reads annexes/Annex 7. AI sheet template.docx and writes work/AI-SHEET-TEAM4.docx (team number only, no names).
Re-run after editing the text below (e.g. once the policy brief is written: stage 7).

    .venv/bin/python work/make_ai_sheet.py
"""
import copy
from pathlib import Path

import docx

AIC = Path(__file__).resolve().parents[1]
TEMPLATE = AIC / "annexes" / "Annex 7. AI sheet template.docx"
OUT = AIC / "work" / "AI-SHEET-TEAM4.docx"

TEAM = "Team 4"
TOOLS = ("Claude Code (Claude Opus, event account) for analysis code, the app (web + Android), research with web "
         "search, documents and testing; Claude sub-agents: Claude Haiku for test runs on the Android emulator, a "
         "research agent for official sources. The teammate's data pipeline (flood-impact v3) was also built with "
         "Claude Code, with review and adversarial-check agents. No other AI tools.")

# Stage -> (column: 2 No AI, 3 Team led, 4 Together, 5 AI did most, misled?, sentences)
STAGES = {
    1: (4, True, "We read the annexes and the challenge data ourselves and used Claude to summarise them and to check "
        "our own preparation for personal data. Claude labelled the Copernicus area AOI01 as 'Liège / Vesdre', but "
        "about 90% of the mapped flooding is the Meuse north of Liège; splitting the flooded area by latitude showed "
        "it, and we reframed the case on the BE-NL-DE border triangle. A first team overview cited the annexes before "
        "they had been read; we had it rebuilt from Annexes 1, 3, 4 and 5."),
    2: (4, True, "Claude read the real layer and column names and coordinate systems from the files before writing any "
        "code, instead of guessing. The teammate's pipeline (EMS, EFAS, GHS-OBAT, GHS-POP plus OpenStreetMap, "
        "Eurostat, Statbel, Infrabel) was written with Claude Code and reviewed by separate check agents. Errors were "
        "caught along the way: a script pointing to the wrong data folder, a pipeline file that could not run, and a "
        "review claim ('no river east of 5.94°') that turned out wrong. We kept the challenge data local (Annex 1 "
        "option C) and never sent datasets or keys to the AI."),
    3: (5, True, "Claude wrote most of the analysis code (exposure per scenario, people, shelters, dry walking routes, "
        "the export to the app); the team decided what to compute and checked it. Its first result, 158 buildings "
        "in the 2021 flood, was presented before a plausibility check; against the Walloon Government's figure and "
        "Annex 2 (OBAT undercounts Belgium) we treated it as a lower bound. Every number in the app comes from one "
        "export script, and an independent script recomputes three municipalities x four scenarios: all match."),
    4: (5, False, "Claude built the maps and charts in the app (Leaflet layers, legends, municipality tabs, bar charts) "
        "from our choices: depth classes in blue, July 2021 in orange, the gap in purple, aggregates only for "
        "residents. We judged them on screenshots at phone and laptop size; contrast was measured (5.4 to 11.8:1). "
        "From phone tests we asked for a better basemap, a folded legend on phones and less header space."),
    5: (4, True, "Claude searched and opened official sources: the Walloon Government, the National Crisis Centre, "
        "the energy regulator CWaPE (operator per postcode for all 66 municipalities), water distributors, SPW. A web "
        "summary gave death tolls of 31 to 42 and a 271.5 mm rainfall figure without a primary source; we opened the "
        "Government press release and used only checked figures, marking the rest 'verify'. Every external source "
        "is labelled 'External' in the app, separate from the challenge data."),
    6: (4, True, "We decided the story ourselves: the observed 2021 map is a lower bound, the model is undefended "
        "hazard, and the gap between them is the policy question (not 'the model was wrong', since the JRC produces "
        "these layers). Claude first proposed '47 buildings flooded outside the 100-year zone' as a headline number; "
        "it rests on about 200 satellite-mapped buildings, so we replaced it with residents who have no dry walking "
        "route to a shelter."),
    7: (4, False, "Claude drafted the concept sheet, the pitch texts and the demo guide from our decisions; the team "
        "chose the audience and the words to use or avoid (never 'safe', shelters are 'candidates', not official). "
        "The policy brief and its named actor and recommendation are written by the team. When we doubted our own "
        "prediction model, Claude advised presenting the tool as the layer that relays official forecasts (EFAS), "
        "naming the model as a limit unless checked against July 2021, and mentioning a locally hosted open-weight "
        "model only as an untested deployment option with a human always pressing Send. Claude also timed the pitch "
        "from the 87 s film after we had switched to the 35 s cut; we caught it and the team chose the final order."),
    8: (5, True, "Claude built the app (web + Android) through many versions; the owner tested every APK on a real "
        "phone and sent back 17 corrections that changed it: one 'elderly or disabled' switch instead of a third "
        "start button, the video in four languages, the teammate's priority issues in place of an empty recommendation, the start screen in the chosen language, no empty screens in the "
        "demo, three main buttons for what people act on, a slimmer header, privacy rules for building data. AI "
        "errors found this way included a content file that blanked a whole side of the app, a laptop panel that "
        "could not scroll, and a grey video placeholder only visible on Android."),
}

HELP_LETDOWN = (
    "AI made the biggest difference in turning our analysis and the teammate's data into a working two-sided app "
    "(policy makers and residents) with traceable numbers in two days, and in checking official sources quickly, for "
    "example the network operator for every municipality. It let us down when it presented results with more "
    "confidence than they deserved: a first building count before any plausibility check, unsourced figures from web "
    "summaries, and app bugs that only showed on a real phone. What worked was treating every AI answer as a draft: we "
    "recomputed numbers independently, opened the primary sources and tested each build on a phone ourselves.")

ERRORS = [
    ("1 Understanding the case", "Labelled the mapped area 'Liège / Vesdre'; ~90% of it is the Meuse north of Liège.",
     "Split the flooded area by latitude band."),
    ("3 Analysis and code", "Presented 158 buildings in the 2021 flood before checking plausibility (official: ~48,000).",
     "Compared with the Walloon Government figure and Annex 2 (OBAT undercount)."),
    ("5 Desk research", "Gave death tolls of 31-42 and 271.5 mm of rain from a web summary, no primary source.",
     "Opened the Walloon Government press release."),
    ("6 Interpreting results", "Proposed a headline number resting on ~200 satellite-mapped buildings.",
     "Read it against the data limits (EMS snapshot, OBAT undercount)."),
    ("8 Policy tool", "A grey 'play' placeholder flashed before the video on Android; desktop tests missed it.",
     "The owner saw it on a phone; an emulator screen recording confirmed it."),
]

PROMPTS = [
    ("main goal was to connect database info like done for pc version as they have data = flood-impact-main v3",
     "Claude Code", "Pointed the AI at the team's own checked analysis instead of new numbers, so every figure is traceable."),
    ("so for the android app v1 when open up was very empty … make sure every feature works for our demo region … "
     "perfect simplicity beats complexity but keep in mind is app for crisis", "Claude Code",
     "A real phone test turned into a clear rule: nothing empty, nothing extra."),
    ("which best middle ground maybe 250 for residents and for policy makers both for more detail? verify what best",
     "Claude Code", "Made the AI check our idea against the teammate's privacy rule before building it."),
]

VERIFY = (
    "Numbers: one export script with the same formulas as the teammate's admin view, and a second, independent script "
    "that recomputes three municipalities x four scenarios from the raw outputs (all match); the three key numbers "
    "equal the sum of the 66 municipality cards. Plausibility: results compared with official figures (Walloon "
    "Government) and the dataset limits in Annex 2. Sources: primary pages opened, never a search summary; operators "
    "checked per postcode with the regulator CWaPE and matched the four we had checked by hand. App: automated "
    "browser tests of every municipality, scenario and tab, tests on an Android emulator, screen recordings, syntax "
    "checks before each build, measured text contrast, and the owner's test of every build on a real phone. The "
    "teammate's pipeline was reviewed by separate check agents and its numbers recomputed from the data.")

LIMITS = (
    "Data: the July 2021 satellite map is a snapshot after the peak and a lower bound (it missed most of the Vesdre); "
    "GHS-OBAT undercounts buildings in Belgium; EFAS leaves out rivers below 500 km² and ignores flood defences; "
    "people per building are estimates (two sources, shown as a range). Method: our own prediction model is not validated; shelters are candidates, not official "
    "reception centres; their capacity is a theoretical maximum; wheelchair access is tagged for only 49 of 2,346 "
    "buildings; 394 rural cells get no route even when dry (not explained yet). App: the FR/NL/DE texts still need a "
    "native-speaker check; water/power/gas statuses and messages in the demo are made up and labelled DEMO; for the "
    "demo the analysis data is inside the app, including building points opened by a code (a real deployment would "
    "serve them from the municipality's server); some communal water lines are not staffed 24/7; the gas network may "
    "not reach every street.")


def fill(cell, text):
    cell.paragraphs[0].text = text
    for extra in cell.paragraphs[1:]:
        extra._p.getparent().remove(extra._p)


def para_after(anchor, text, style=None, bold_prefix=None):
    """New paragraph right after `anchor` (a paragraph or a table element); returns its element."""
    new = copy.deepcopy(doc.paragraphs[6]._p)   # a plain body paragraph of the template
    for r in new.findall(".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r"):
        new.remove(r)
    anchor.addnext(new)
    p = docx.text.paragraph.Paragraph(new, doc.paragraphs[6]._parent)
    if bold_prefix:
        p.add_run(bold_prefix).bold = True
    p.add_run(text)
    return new


doc = docx.Document(TEMPLATE)
t_team, t_stage, t_err, t_prompt = doc.tables[:4]
fill(t_team.rows[0].cells[1], TEAM)
fill(t_team.rows[1].cells[1], TOOLS)

doc.paragraphs[11].text = HELP_LETDOWN          # the blank line after "3-4 sentences" (before any insertion)

anchor = t_stage._tbl
for n, (col, misled, text) in STAGES.items():
    row = t_stage.rows[n]
    for c in range(2, 6):
        fill(row.cells[c], "☒" if c == col else "")
    fill(row.cells[6], "☒" if misled else "☐")
    anchor = para_after(anchor, " " + text, bold_prefix=f"{n} · {row.cells[1].text}.")

for i, (stage, wrong, noticed) in enumerate(ERRORS, start=1):
    r = t_err.rows[i].cells
    fill(r[1], stage), fill(r[2], wrong), fill(r[3], noticed)
for i, (prompt, tool, why) in enumerate(PROMPTS, start=1):
    r = t_prompt.rows[i].cells
    fill(r[1], f"“{prompt}”"), fill(r[2], tool), fill(r[3], why)

heads = {p.text.strip(): p for p in doc.paragraphs}
para_after(heads["How did you check the AI answers or AI-assisted results?"]._p, VERIFY)
para_after(heads["What in your findings is still unverified or uncertain?"]._p, LIMITS)

doc.save(OUT)
print(OUT)
