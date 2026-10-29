"""Inline the whole web/ folder into one file, dist/policy-tool.html, for the email deliverable.
Opens by double-click, no server needed. Standard library only.

    python3 tools/bundle_html.py
    python3 tools/bundle_html.py --web build/web-public --out dist/policy-tool-public.html
"""
import argparse
import base64
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
OUT = ROOT / "dist" / "policy-tool.html"


def inline_images_in_layers(js, web=WEB):
    """Swap image-overlay file paths for data: URIs so the single file stays self-contained."""
    def repl(m):
        path = web / json.loads(m.group(1))
        data = base64.b64encode(path.read_bytes()).decode()
        return f'"url": "data:image/png;base64,{data}"'
    return re.sub(r'"url":\s*("data/src/[^"]+\.png")', repl, js)


def main(web=WEB, out=OUT):
    web, out = Path(web), Path(out)
    html = (web / "index.html").read_text()

    def css(m):
        return "<style>\n" + (web / m.group(1)).read_text() + "\n</style>"

    def js(m):
        code = (web / m.group(1)).read_text()
        if m.group(1) == "data/layers.js":
            code = inline_images_in_layers(code, web)
        return "<script>\n" + code.replace("</script", "<\\/script") + "\n</script>"

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css, html)
    html = re.sub(r'<script src="([^"]+)"></script>', js, html)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html)
    print(f"{out} ({out.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--web", default=str(WEB))
    ap.add_argument("--out", default=str(OUT))
    args = ap.parse_args()
    main(args.web, args.out)
