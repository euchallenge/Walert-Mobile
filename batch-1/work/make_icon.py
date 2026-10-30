"""Team 4's walert logo sheet -> Android launcher icon + start-screen logo (Pillow only).

    .venv/bin/python3 work/make_icon.py

Input: "Logo and app name/IMG-20261029-WA0014.jpg" (logo by the team). The sheet's light-grey background becomes
transparent; the mark (rooster, megaphone, waves) becomes the adaptive icon foreground on a white background.
"""
from pathlib import Path

from PIL import Image, ImageChops

AIC = Path(__file__).resolve().parents[1]
SHEET = AIC / "Logo and app name" / "IMG-20261029-WA0014.jpg"
RES = AIC / "template" / "android" / "app" / "src" / "main" / "res"
WEB_LOGO = AIC / "template" / "web" / "media" / "walert-logo.png"
MARK_BOX = (560, 45, 970, 360)      # rooster + megaphone + waves (large logo, top centre of the sheet)
LOGO_BOX = (490, 45, 1050, 565)     # mark + "walert" + tagline
DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def cut_out(box):
    """Crop, make the near-white background transparent (soft edge), trim to the drawing."""
    im = Image.open(SHEET).convert("RGB").crop(box)
    grey = im.convert("L")
    # Distance from the background: 0 for the light sheet colour, 255 for clearly drawn pixels.
    spread = ImageChops.subtract(Image.new("L", im.size, 255), grey)
    sat = ImageChops.subtract(im.convert("HSV").split()[1], Image.new("L", im.size, 0))
    alpha = ImageChops.lighter(spread, sat).point(lambda v: 0 if v < 18 else min(255, (v - 18) * 6))
    out = im.convert("RGBA")
    out.putalpha(alpha)
    return out.crop(out.getbbox())


def fit(img, size, share):
    """Centre img on a transparent square of `size` px, scaled to `share` of the side."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    scale = share * size / max(img.size)
    small = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    canvas.alpha_composite(small, ((size - small.width) // 2, (size - small.height) // 2))
    return canvas


mark = cut_out(MARK_BOX)
for name, k in DENSITIES.items():
    d = RES / f"mipmap-{name}"
    d.mkdir(parents=True, exist_ok=True)
    # Adaptive icon: 108 dp canvas, launchers show the central 66 dp, so the mark takes 60% of the side.
    fit(mark, round(108 * k), 0.60).save(d / "ic_launcher_foreground.png")
    # Plain 48 dp icon for launchers without adaptive icons: mark on white, 80% of the side.
    plain = Image.new("RGBA", (round(48 * k),) * 2, (255, 255, 255, 255))
    plain.alpha_composite(fit(mark, round(48 * k), 0.80))
    plain.convert("RGB").save(d / "ic_launcher.png")
anydpi = RES / "mipmap-anydpi-v26"
anydpi.mkdir(exist_ok=True)
(anydpi / "ic_launcher.xml").write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
    '    <background android:drawable="@color/icon_background"/>\n'
    '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
    '</adaptive-icon>\n')

logo = cut_out(LOGO_BOX)
logo.thumbnail((600, 600), Image.LANCZOS)
logo.save(WEB_LOGO, optimize=True)
print(f"icons written to {RES}/mipmap-*; logo {logo.size} -> {WEB_LOGO}")

# Header mark (v1.1): the top 60 % of the web logo (bird + megaphone + wave, no wordmark), 160 px wide.
mark = Image.open(WEB_LOGO).convert("RGBA")
mark = mark.crop((0, 0, mark.width, int(mark.height * 0.6)))
mark = mark.crop(mark.getbbox())
mark.thumbnail((160, 160))
mark.save(WEB_LOGO.with_name("walert-mark.png"), optimize=True)
