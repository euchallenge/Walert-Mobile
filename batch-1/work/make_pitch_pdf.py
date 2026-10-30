"""The two walert pitches -> one A4 page each (matplotlib only), spoken text only (at the table):
PITCH_COMPUTER -> PITCH-COMPUTER-TEAM4.pdf (first speaker), PITCH -> PITCH-TEAM4.pdf (second speaker, phone side).

    .venv/bin/python3 work/make_pitch_pdf.py
"""
import textwrap
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.image as mpimg
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

HERE = Path(__file__).resolve().parent
LOGO = HERE.parent / "template" / "web" / "media" / "walert-logo.png"
OUT = HERE / "PITCH-TEAM4.pdf"
OUT_COMPUTER = HERE / "PITCH-COMPUTER-TEAM4.pdf"
W, H = 8.27, 11.69            # A4 in inches
INK, MUTED, ACCENT = "#1f2937", "#6b7280", "#173B5E"

# ("cue", text) = what to do, grey; ("say", text) = spoken; ("head", text) = section label.
PITCH_COMPUTER = [
    ("say", "Every flood decision starts with two questions: where is the risk, and who lives there? On the "
            "computer, walert answers both, for mayors and crisis teams."),
    ("head", "The full picture"),
    ("say", "One map brings together where it flooded in July 2021, the official flood zones for 1-in-100 and "
            "1-in-500-year floods, and the gap between them: places that flooded outside the official zone."),
    ("say", "Click a municipality and you see what a decision needs: how many buildings and residents are in the "
            "flood zone, how many of them are older, and where the shelters are, roughly how many people they "
            "hold, and, where it's known, whether a wheelchair can get in."),
    ("say", "River gauges show how rare July 2021 was: on the Hoegne at Theux, the peak was far outside anything "
            "on record."),
    ("say", "And walert is honest about its limits: where the models don't cover a river, the map turns grey. "
            "Not \"no risk\", but \"not known\"."),
    ("head", "Built on European data"),
    ("say", "All of this comes from the challenge data, European flood maps from Copernicus and the JRC, for 66 "
            "municipalities in Wallonia, plus open sources we mark as external."),
    ("head", "From the desk to the street"),
    ("say", "But a map on a desk doesn't reach a family on the street. That's where computer and phone connect: "
            "what the crisis team decides here goes out as a verified message to residents' phones. My teammate "
            "will show you that side."),
]

PITCH = [
    ("say", "In a flood, every minute counts. Nobody should spend them searching three websites. Yet that's exactly "
            "what residents in Verviers had to deal with, just to know about their water, electricity and gas."),
    ("say", "That's why we built walert: it connects communities, from crisis teams and mayors to every "
            "resident, and between municipalities."),
    ("say", "walert runs on both phone and computer, and both matter: the computer version shows more data and "
            "detail."),
    ("head", "One app, two sides"),
    ("say", "Policy makers get the full picture: where it flooded in July 2021, where the official 100-year flood "
            "zone is, and the gap between the two. walert also shows where the data has gaps: in some areas, the "
            "satellite map shows no flooded buildings at all, because satellites miss narrow valleys. So policy "
            "makers know what they don't know."),
    ("say", "With one verified message, signed with their name, they reach their residents' phones. And in the "
            "crisis chat, mayors and crisis teams talk to each other directly: fast, and from the people on the "
            "ground."),
    ("say", "Residents get it simple: what to do, and above all where to go: the closest possible shelter, by a "
            "walking route that avoids the flood zones. Plus the latest messages and essentials like water, power "
            "and gas, in one place."),
    ("head", "Built to grow"),
    ("say", "We built walert on the challenge data for Wallonia: European flood maps from Copernicus and the JRC. "
            "Those datasets reach far beyond Wallonia, so walert can grow to all of Belgium, and to the EU."),
    ("head", "Without walert"),
    ("say", "Without it, the risk is silence. In past disasters, the problem wasn't missing big data. It was the "
            "small communication between local people: the mayor, the neighbours, the street. walert closes "
            "that gap."),
    ("head", "Close"),
    ("say", "walert. Anticiper, coordonner, protéger. Thank you."),
]

NOTES = []


def page(pitch, out, subtitle):
    fig = plt.figure(figsize=(W, H))
    logo = mpimg.imread(LOGO)
    height = 0.16 * W * logo.shape[0] / logo.shape[1] / H     # keep the logo's aspect ratio on A4
    ax = fig.add_axes([0.07, 0.97 - height, 0.16, height])
    ax.imshow(logo)
    ax.axis("off")
    fig.text(0.27, 0.935, "walert", fontsize=20, weight="bold", color=ACCENT)
    fig.text(0.27, 0.91, f"Team 4 · European AI Challenge 2026 · {subtitle}",
             fontsize=9.5, color=MUTED)
    y = 0.83
    for kind, text in pitch:
        if kind == "head":
            y -= 0.008
            fig.text(0.07, y, text.upper(), fontsize=9, weight="bold", color=ACCENT)
            y -= 0.026
            continue
        size, color, style, wrap = (13, INK, "normal", 72) if kind == "say" else (10, MUTED, "italic", 95)
        text = text if kind == "say" else f"[{text}]"
        for line in textwrap.wrap(text, wrap):
            fig.text(0.07, y, line, fontsize=size, color=color, style=style)
            y -= 0.023 if kind == "say" else 0.017
        y -= 0.008
    y = min(y, 0.12)
    if NOTES:
        fig.text(0.07, y, "Notes", fontsize=9, weight="bold", color=MUTED)
    for note in NOTES:
        for line in textwrap.wrap(note, 115):
            y -= 0.016
            fig.text(0.07, y, line, fontsize=8, color=MUTED)
    with PdfPages(out) as pdf:
        pdf.savefig(fig)
    print(f"{out} ({y:.3f} lowest line)")


def main():
    page(PITCH_COMPUTER, OUT_COMPUTER, "1st speaker: computer side")
    page(PITCH, OUT, "2nd speaker: phone side")


if __name__ == "__main__":
    main()
