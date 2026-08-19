#!/usr/bin/env python3
"""
Bake a photo into towne.html so the whole site stays one self-contained file.

    python3 tools/embed-photo.py our-first-day.jpg

The image is resized, re-compressed, and written into CONFIG.photoUrl as a
data URI. Run it again with a different file to swap the photo out.

Needs Pillow:  pip install Pillow
"""
import base64
import io
import re
import sys
from pathlib import Path

MAX_EDGE = 1100          # plenty for a phone screen
TARGET_BYTES = 320_000   # keep the data URI civil
HTML = Path(__file__).resolve().parent.parent / "towne.html"


def encode(path: Path) -> str:
    try:
        from PIL import Image, ImageOps
    except ImportError:
        sys.exit("Pillow is missing.  Run:  pip install Pillow")

    img = Image.open(path)
    img = ImageOps.exif_transpose(img)          # honour the phone's rotation flag
    img = img.convert("RGB")
    img.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)

    for quality in (86, 80, 74, 68, 62, 55, 48):
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=quality, optimize=True, progressive=True)
        data = buf.getvalue()
        if len(data) <= TARGET_BYTES:
            break

    print(f"  {img.width}x{img.height}, quality {quality}, {len(data)/1024:.0f} KB")
    return "data:image/jpeg;base64," + base64.b64encode(data).decode("ascii")


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(f"usage: python3 {Path(__file__).name} <image file>")

    src = Path(sys.argv[1]).expanduser()
    if not src.is_file():
        sys.exit(f"no such file: {src}")
    if not HTML.is_file():
        sys.exit(f"cannot find {HTML}")

    print(f"reading {src.name}")
    uri = encode(src)

    html = HTML.read_text(encoding="utf-8")
    pattern = re.compile(r"(photoUrl:\s*)'[^']*'")
    if not pattern.search(html):
        sys.exit("could not find the photoUrl line in towne.html")

    html = pattern.sub(lambda m: m.group(1) + "'" + uri + "'", html, count=1)
    HTML.write_text(html, encoding="utf-8")

    print(f"baked into {HTML.name}  ({HTML.stat().st_size/1024:.0f} KB total)")
    print("open it in a browser to check the August 12 card.")


if __name__ == "__main__":
    main()
