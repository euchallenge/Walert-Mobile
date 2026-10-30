"""AI-LOG.md -> AI-USE-TEAM4.pdf (A4, matplotlib only). Re-run after every logged step:

    .venv/bin/python3 work/make_ai_use_pdf.py
"""
import re
import textwrap
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

HERE = Path(__file__).resolve().parent
LOG = HERE / "AI-LOG.md"
OUT = HERE / "AI-USE-TEAM4.pdf"
W, H = 8.27, 11.69            # A4 in inches
LEFT, TOP, BOTTOM = 0.07, 0.95, 0.05
LINE = 0.0145                 # line height as a fraction of the page
WRAP = 105                    # characters per line at 8.5 pt
INK, MUTED, ACCENT = "#1f2937", "#6b7280", "#1d4ed8"


def sections(md):
    """{heading: [lines]} for every '## ' section of the log."""
    out, name = {}, None
    for line in md.splitlines():
        if line.startswith("## "):
            name = line[3:].strip()
            out[name] = []
        elif name:
            out[name].append(line)
    return out


def table(lines):
    """Rows of a markdown table, without the header and the --- line; empty rows dropped."""
    rows = [[c.strip() for c in l.strip().strip("|").split("|")] for l in lines if l.strip().startswith("|")]
    return [r for r in rows[2:] if any(r)]


class Pages:
    def __init__(self, pdf):
        self.pdf, self.fig, self.y, self.n = pdf, None, 0, 0

    def new(self):
        if self.fig:
            self.close()
        self.n += 1
        self.fig = plt.figure(figsize=(W, H))
        self.y = TOP
        self.fig.text(LEFT, 0.975, "Team 4 · AI use log · European AI Challenge 2026", fontsize=7.5, color=MUTED)
        self.fig.text(1 - LEFT, 0.975, f"p. {self.n}", fontsize=7.5, color=MUTED, ha="right")

    def close(self):
        self.pdf.savefig(self.fig)
        plt.close(self.fig)
        self.fig = None

    def room(self, lines):
        if self.fig is None or self.y - lines * LINE < BOTTOM:
            self.new()

    def text(self, s, size=8.5, color=INK, weight="normal", indent=0.0, wrap=WRAP):
        lines = textwrap.wrap(s, wrap) or [""]
        self.room(len(lines))
        for l in lines:
            self.fig.text(LEFT + indent, self.y, l, fontsize=size, color=color, weight=weight, va="top")
            self.y -= LINE * size / 8.5

    def gap(self, k=0.5):
        self.y -= LINE * k


def main():
    s = sections(LOG.read_text(encoding="utf-8"))
    use = table(s.get("Use log", []))
    errors = table(s.get("AI errors caught (up to 5 on the sheet)", []))
    checks = table(s.get("Verification of every number in the tool", []))
    human_lines = s.get("Where the team stopped or corrected the AI (human decisions)", [])
    human = table(human_lines)
    human_intro = " ".join(l for l in human_lines if l.strip() and not l.startswith("|"))
    limits = [l[2:].strip() for l in s.get("Limits (of the data, of the AI, of our method)", []) if l.startswith("- ")]
    with PdfPages(OUT) as pdf:
        p = Pages(pdf)
        p.new()
        p.text("How Team 4 used AI", size=18, weight="bold")
        p.gap()
        p.text(f"{len(use)} logged steps, {len(errors)} AI errors caught. Every step lists what we kept and how we "
               "checked it. No personal data, keys or whole datasets were given to the AI. Source: work/AI-LOG.md.",
               color=MUTED)
        p.gap(1.5)
        p.text("Use log", size=12, weight="bold", color=ACCENT)
        for time_, stage, tool, asked, kept, checked in ((r + [""] * 6)[:6] for r in use):
            p.room(5)
            p.text(f"{time_} · {stage} · {tool}", weight="bold")
            for label, value in (("Asked", asked), ("Kept", kept), ("Checked", checked)):
                p.text(f"{label}: {value}", indent=0.015, wrap=WRAP - 3)
            p.gap(0.6)
        p.gap()
        p.text("AI errors we caught", size=12, weight="bold", color=ACCENT)
        for time_, wrong, caught, fix in ((r + [""] * 4)[:4] for r in errors):
            p.room(4)
            p.text(f"{time_} · {wrong}", weight="bold")
            p.text(f"Caught by: {caught}", indent=0.015, wrap=WRAP - 3)
            p.text(f"Fix: {fix}", indent=0.015, wrap=WRAP - 3)
            p.gap(0.6)
        if human:
            p.gap()
            p.text("Where the team stopped or corrected the AI", size=12, weight="bold", color=ACCENT)
            p.text(human_intro, color=MUTED, wrap=WRAP)
            p.gap(0.4)
            for time_, saw, decided, changed in ((r + [""] * 4)[:4] for r in human):
                p.room(4)
                p.text(f"{time_} · {saw}", weight="bold")
                p.text(f"Team decided: {decided}", indent=0.015, wrap=WRAP - 3)
                p.text(f"Changed: {changed}", indent=0.015, wrap=WRAP - 3)
                p.gap(0.6)
        if checks:
            p.gap()
            p.text("Verification of every number", size=12, weight="bold", color=ACCENT)
            for number, source, who, same in ((r + [""] * 4)[:4] for r in checks):
                p.text(f"{number}: {source} · recomputed by {who} · same result: {same}", wrap=WRAP)
        p.gap()
        p.text("Limits", size=12, weight="bold", color=ACCENT)
        for l in limits:
            p.text(f"• {re.sub(r'`', '', l)}", wrap=WRAP)
        p.close()
    print(f"{OUT} ({p.n} pages, {len(use)} steps, {len(errors)} errors, {len(human)} team corrections)")


if __name__ == "__main__":
    main()
