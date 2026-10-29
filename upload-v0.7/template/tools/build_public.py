"""Build the public (consumer) edition into build/web-public/ and dist/policy-tool-public.html.

It ships only what is marked public:
  - web/content.public.js (as content.js); web/content.js is never copied
  - layers whose web/data/src/layers.json entry has "audience": "public", with only their "props"
  - no raw files from web/data/src/
The internal edition (build_layers.py + bundle_html.py) is unchanged.

    python3 tools/build_public.py
"""
import shutil
from pathlib import Path

import build_layers
import bundle_html

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
STAGE = ROOT / "build" / "web-public"


def main():
    if STAGE.exists():
        shutil.rmtree(STAGE)
    shutil.copytree(WEB, STAGE, ignore=shutil.ignore_patterns("data", "content.js", "content.public.js"))
    shutil.copy(WEB / "content.public.js", STAGE / "content.js")
    build_layers.main("public", STAGE / "data" / "layers.js")
    bundle_html.main(STAGE, ROOT / "dist" / "policy-tool-public.html")


if __name__ == "__main__":
    main()
