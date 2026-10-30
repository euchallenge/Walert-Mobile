"""walert live demo guide -> DEMO-GUIDE-TEAM4.pdf (A4, matplotlib only, same look as make_pitch_pdf.py):
setup before the demo, the 5-minute run with a screenshot per step, what to do if something breaks.
Screenshots come from work/demo_shots.js (run it first after any change to the app).

    .venv/bin/python3 work/make_demo_pdf.py
"""
import textwrap
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.image as mpimg
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

from make_pitch_pdf import ACCENT, H, INK, LOGO, MUTED, W

plt.rcParams["text.parse_math"] = False   # the shell commands contain $

HERE = Path(__file__).resolve().parent
SHOTS = HERE / "demo-shots"
OUT = HERE / "DEMO-GUIDE-TEAM4.pdf"
TEAL, WARN = "#0b6e6c", "#b45309"

SETUP = [
    ("head", "Tonight or before 12:30 (team)"),
    ("todo", "Key numbers + named actor in template/web/content.js. Until then the policy panel shows "
             "'Key number 1 / source needed' on the projector. Team input only, never invented."),
    ("todo", "A French, a Dutch and a German speaker check the video and the 'In a flood' card "
             "(motion/src/strings.ts, content.residents.js 'card'). Plain words based on the Crisis Centre's advice; "
             "after a change: render the video again (motion: npm run render:fr ...) and rebuild."),
    ("todo", "Rebuild after any change: cd ~/aic-event/template && ./build-apk.sh video, then copy "
             "dist/policy-tool-video-debug.apk to dist/walert-v1.2.apk and dist/policy-tool.html to dist/walert-v1.2.html."),
    ("head", "T-15 min at the table"),
    ("step", "Laptop and phone charged. Phone on USB (event Wi-Fi blocks phone-to-laptop; plan B: phone hotspot)."),
    ("cmd", "cd ~/aic-event/template && RELAY_CODE=<our code> python3 tools/relay_server.py --reset --seed-demo"),
    ("note", "Terminal 1, leave it open. --reset empties old test messages; --seed-demo fills the DEMO water/power/gas "
             "status of Visé, Liège, Esneux, Pepinster and one DEMO message, so the phone is never empty. "
             "Only the speaker knows the code."),
    ("cmd", "./install-phone.sh video mirror"),
    ("note", "Terminal 2: installs walert v1.2, connects the message server over USB, opens scrcpy (phone on the projector)."),
    ("cmd", 'ADB="$(ls -d /mnt/c/Users/*/AppData/Local/Microsoft/WinGet/Packages/Genymobile.scrcpy*/scrcpy-win64-* | head -1)/adb.exe"'),
    ("cmd", '"$ADB" shell pm clear org.aic.policytool.video && "$ADB" shell pm grant org.aic.policytool.video '
            'android.permission.POST_NOTIFICATIONS && "$ADB" reverse tcp:8765 tcp:8765'),
    ("note", "Wipes the app's memory so the jury sees the first open (language screen); keeps notifications allowed. "
             "Do NOT open the app on the phone again until the demo."),
    ("step", "Laptop: Chrome incognito window -> open walert-v1.2.html (copy it from "
             "template/dist in Explorer via \\\\wsl.localhost\\Ubuntu to the Desktop first) -> stay on 'Who are you?'."),
    ("step", "In the policy panel, fold open 'Inform residents', type the code and 'Municipality of Visé', and "
             "pre-type the message (page 3, step 8). Then fold it closed again."),
    ("step", "Dry run once if there is time, then repeat the pm clear line above."),
]

# (screenshot, action, what to say / point at)
RUN_LAPTOP = [
    ("laptop-01-intro.png", "Click 'Policy maker'. The 30-second intro opens.",
     "Every flood decision starts with two questions: where is the risk, and who lives there? ..."),
    ("laptop-02-story-1.png", "'▶ Start the 4-step briefing'. Step 1: July 2021 from satellite.",
     "One map brings together where it flooded in July 2021 ..."),
    ("laptop-03-story-3.png", "Next (or the clicker / arrow key). Step 3: the gap at Visé.",
     "... and the gap between them: places that flooded outside the official zone."),
    ("laptop-04-story-4.png", "Next. Step 4: the Vesdre gauges. Then 'Done ✓': the card closes, '▶ Briefing' replays it.",
     "River gauges show how rare July 2021 was ..."),
    ("laptop-06-impact.png", "Pick 'Visé' in 'Impact by municipality' (or tap it on the map). Overview, then 'Shelters'.",
     "Per municipality: who lives in the flood zone, which shelters stay dry, who has no dry route: go up, not out."),
    ("laptop-07-buildings.png", "Tab 'Buildings': type the code, 'Unlock': individual buildings on the map. Chips switch the scenario.",
     "Officials see building detail after the code; residents only ever see 250 m squares."),
]
RUN_PHONE = [
    ("phone-01-language.png", "Open walert on the phone. First open: choose the language. Tap 'Français'.",
     "In a flood, every minute counts ... Four languages: French, Dutch, German, English."),
    ("phone-02-video.png", "The 18-second video in French. Let '112' play, then 'Skip ›' (or let it end).",
     "What to do, based on the Crisis Centre's advice. No reading, no sound needed."),
    ("phone-03-who.png", "'Qui êtes-vous ?': two choices only, in the language just chosen.", "Residents and policy makers, one app."),
    ("phone-04-live-here.png", "Tap 'I live here'. Switch on '♿ Elderly or disabled'. 'Continue ›'.",
     "One switch: big text, read aloud, and routes without stairs."),
    ("phone-05-card.png", "The card in French; it is read aloud. 'Voir la carte'.",
     "The three things that matter, every time the app opens."),
    ("phone-06-shelter.png", "Tap the DEMO location (Visé). Closest candidate shelter, by a dry walking route.",
     "Where to go: the closest possible shelter ... Not official: we always say check with your municipality."),
    ("phone-07-water-power-gas.png", "Scroll: water, electricity, gas for Visé. Tap a number = it calls.",
     "Nobody should spend those minutes searching three websites."),
    ("laptop-05-send.png", "Speaker 1 on the laptop: 'Inform residents', press 'Send message'.",
     "With one verified message, signed with their name ..."),
    ("phone-08-message.png", "The phone shows the notification and the message, signed 'Municipality of Visé'.",
     "... they reach their residents' phones. walert. Anticiper, coordonner, protéger."),
]

TROUBLE = [
    ("Video doesn't play", "The app jumps to the card by itself. Say: 'normally an 18-second video plays here' and go on."),
    ("Message doesn't arrive", "Check terminal 1 is running and the 'Demo server' row in the policy panel. "
     "No time: show the inbox and say 'a demo server on our laptop today; for real it runs at the municipality'."),
    ("Phone can't reach the laptop", "Re-run the adb reverse line. Wi-Fi is blocked anyway: USB or the phone's hotspot."),
    ("No GPS / wrong place", "Use the DEMO location button (Visé); the app says DEMO wherever it is used."),
    ("Read aloud is silent or in English", "The phone has no voice for that language. Keep talking, don't wait."),
    ("Projector or scrcpy fails", "Hand the phone to the jury; the laptop shows the policy side on its own screen."),
    ("Language screen doesn't show", "The app remembers the first open. Run the pm clear line, or replay it from 'Official advice' (link '▶ What to do in a flood')."),
]
QA = [
    ("Are these shelters official?", "No: candidates from our own analysis (dry walking routes, 1-in-500-year model). "
     "Municipalities and BE-Alert name the real reception centres. We never say 'safe'."),
    ("Where does the advice come from? Who translated it?", "It is based on the National Crisis Centre's flood advice "
     "(its FR/NL/DE/EN pages, 29 Oct 2026), in plain words, not word for word. Say 'a teammate checked it' only once "
     "that check is done. The rest of the app is English for now."),
    ("Where does the data live?", "In the app for this demo: the teammate's analysis as municipality totals, 250 m "
     "squares and public buildings; building points open only after the code. In a real deployment it all sits on the "
     "municipality's server behind the same login as the messages."),
    ("Why can't residents see buildings?", "Privacy: no flood flag on anyone's home. Residents see 250 m squares, "
     "with no count where fewer than 5 buildings."),
    ("Is the water/power/gas status real?", "No: a DEMO scenario we loaded; in reality the operators and the "
     "municipality set it from the policy side."),
    ("Utility numbers?", "From official pages for all 66 municipalities (29 Oct 2026): electricity and gas from the "
     "regulator CWaPE by postcode, water from each distributor's list. Where a town has two water operators, the app "
     "says 'check your bill'."),
    ("Where does my location go?", "Nowhere: it stays on the phone."),
    ("What area?", "66 municipalities in Wallonia (Copernicus EMSR518); the EU datasets reach much further."),
]


PNG_DIR = None   # --png DIR: also write each page as a PNG (to look at the pages without a PDF viewer)


def save(pdf, fig):
    pdf.savefig(fig)
    if PNG_DIR:
        fig.savefig(Path(PNG_DIR) / f"demo-guide-{pdf.get_pagecount()}.png", dpi=80)
    plt.close(fig)


def header(fig, subtitle):
    logo = mpimg.imread(LOGO)
    height = 0.12 * W * logo.shape[0] / logo.shape[1] / H
    ax = fig.add_axes([0.07, 0.975 - height, 0.12, height])
    ax.imshow(logo)
    ax.axis("off")
    fig.text(0.22, 0.945, "walert · live demo guide", fontsize=18, weight="bold", color=ACCENT)
    fig.text(0.22, 0.925, f"Team 4 · European AI Challenge 2026 · v1.2 · {subtitle}", fontsize=9, color=MUTED)


def setup_page(pdf):
    fig = plt.figure(figsize=(W, H))
    header(fig, "1/4 Before the demo")
    y = 0.87
    for kind, text in SETUP:
        if kind == "head":
            y -= 0.01
            fig.text(0.07, y, text.upper(), fontsize=9.5, weight="bold", color=ACCENT)
            y -= 0.024
            continue
        style = {"todo": (10.5, WARN, "normal", None, "☐ ", 92),
                 "step": (10.5, INK, "normal", None, "• ", 92),
                 "cmd": (8.2, TEAL, "normal", "monospace", "$ ", 98),
                 "note": (9, MUTED, "italic", None, "", 108)}[kind]
        size, color, fstyle, family, bullet, wrap = style
        lines = textwrap.wrap(text, wrap, break_on_hyphens=False) if kind != "cmd" else textwrap.wrap(text, wrap, break_long_words=True)
        for i, line in enumerate(lines):
            fig.text(0.07 if kind != "note" else 0.09, y, (bullet if i == 0 else "  " * (len(bullet) > 0)) + line,
                     fontsize=size, color=color, style=fstyle, family=family or "sans-serif")
            y -= 0.019 if kind != "note" else 0.016
        y -= 0.006
    y -= 0.01
    fig.text(0.07, y, "THE 5 MINUTES", fontsize=9.5, weight="bold", color=ACCENT)
    for t, what in [("0:00-2:00", "Speaker 1, laptop: policy side, the 4-step briefing (page 2)."),
                    ("2:00-4:30", "Speaker 2, phone on the projector: first open to shelter, water/power/gas (page 3)."),
                    ("4:15", "Speaker 1 sends the verified message from the laptop; it lands on the phone."),
                    ("4:30-5:00", "Close: 'walert. Anticiper, coordonner, protéger.' Then questions (page 4).")]:
        y -= 0.021
        fig.text(0.07, y, t, fontsize=10, weight="bold", color=INK)
        fig.text(0.2, y, what, fontsize=10, color=INK)
    save(pdf, fig)


def run_page(pdf, rows, subtitle, title, shot_w):
    fig = plt.figure(figsize=(W, H))
    header(fig, subtitle)
    fig.text(0.07, 0.875, title, fontsize=12, weight="bold", color=INK)
    n = len(rows)
    top, bottom = 0.855, 0.03
    row_h = (top - bottom) / n
    for i, (shot, action, say) in enumerate(rows):
        y0 = top - (i + 1) * row_h
        img = mpimg.imread(SHOTS / shot)
        ih, iw = img.shape[0], img.shape[1]
        h = row_h * 0.92
        w = min(h * H / W * iw / ih, shot_w)
        h = w * W / H * ih / iw
        ax = fig.add_axes([0.07, y0 + (row_h - h) / 2, w, h])
        ax.imshow(img)
        ax.set_xticks([]); ax.set_yticks([])
        for s in ax.spines.values():
            s.set_color("#d9e1eb")
        x = 0.07 + shot_w + 0.03
        ty = y0 + row_h - 0.018
        fig.text(x, ty, f"{i + 1}", fontsize=15, weight="bold", color=TEAL)
        for line in textwrap.wrap(action, 40):
            fig.text(x + 0.04, ty, line, fontsize=10.5, weight="bold", color=INK)
            ty -= 0.017
        ty -= 0.004
        for line in textwrap.wrap("Say: " + say, 48):
            fig.text(x + 0.04, ty, line, fontsize=9.5, style="italic", color=MUTED)
            ty -= 0.015
    save(pdf, fig)


def grid_page(pdf, rows, subtitle, title, cols=3):
    """Phone steps as a grid: a large screenshot per step, the action and the line to say under it."""
    fig = plt.figure(figsize=(W, H))
    header(fig, subtitle)
    fig.text(0.07, 0.875, title, fontsize=12, weight="bold", color=INK)
    n_rows = -(-len(rows) // cols)
    top, bottom, left, right = 0.855, 0.02, 0.07, 0.95
    cell_w, cell_h = (right - left) / cols, (top - bottom) / n_rows
    img_h = cell_h * 0.6
    for i, (shot, action, say) in enumerate(rows):
        r, c = divmod(i, cols)
        x0, y0 = left + c * cell_w, top - (r + 1) * cell_h
        img = mpimg.imread(SHOTS / shot)
        ih, iw = img.shape[0], img.shape[1]
        w = min(img_h * H / W * iw / ih, cell_w * 0.9)
        h = w * W / H * ih / iw
        ax = fig.add_axes([x0 + (cell_w - w) / 2, y0 + cell_h - h - 0.004, w, h])
        ax.imshow(img)
        ax.set_xticks([]); ax.set_yticks([])
        for sp in ax.spines.values():
            sp.set_color("#d9e1eb")
        ty = y0 + cell_h - img_h - 0.02
        fig.text(x0 + 0.005, ty, f"{i + 1}", fontsize=13, weight="bold", color=TEAL)
        for line in textwrap.wrap(action, 30):
            fig.text(x0 + 0.03, ty, line, fontsize=8.6, weight="bold", color=INK)
            ty -= 0.0135
        for line in textwrap.wrap("Say: " + say, 34):
            fig.text(x0 + 0.03, ty, line, fontsize=7.8, style="italic", color=MUTED)
            ty -= 0.012
    save(pdf, fig)


def trouble_page(pdf):
    fig = plt.figure(figsize=(W, H))
    header(fig, "4/4 If something breaks · questions")
    y = 0.88
    for title, rows in [("IF SOMETHING BREAKS: KEEP TALKING, NEVER WAIT IN SILENCE", TROUBLE), ("LIKELY QUESTIONS", QA)]:
        fig.text(0.07, y, title, fontsize=9.5, weight="bold", color=ACCENT)
        y -= 0.026
        for q, a in rows:
            fig.text(0.07, y, q, fontsize=10.5, weight="bold", color=INK)
            y -= 0.018
            for line in textwrap.wrap(a, 100):
                fig.text(0.09, y, line, fontsize=9.5, color=INK)
                y -= 0.016
            y -= 0.008
        y -= 0.015
    fig.text(0.07, max(y, 0.04), "Never say 'safe' or 'predict'. The DEMO labels and 'not official' notes stay on screen.",
             fontsize=9.5, style="italic", color=WARN)
    save(pdf, fig)


def main():
    with PdfPages(OUT) as pdf:
        setup_page(pdf)
        run_page(pdf, RUN_LAPTOP, "2/4 Speaker 1: laptop", "Speaker 1 · laptop · policy side (about 2 min)", 0.42)
        grid_page(pdf, RUN_PHONE, "3/4 Speaker 2: phone", "Speaker 2 · phone on the projector · residents side (about 2.5 min)")
        trouble_page(pdf)
    print(OUT)


if __name__ == "__main__":
    import sys
    if "--png" in sys.argv:
        PNG_DIR = sys.argv[sys.argv.index("--png") + 1]
    main()
