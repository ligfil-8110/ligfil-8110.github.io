"""Create a lighter, disposable content tree for the production build.

Original photos stay untouched. The generated tree keeps every filename so
Markdown image links continue to work, while large raster images are resized
and recompressed before Pelican copies them to the published site.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

from PIL import Image, ImageOps


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_EDGE = 1800
MIN_BYTES_TO_REENCODE = 320 * 1024


def optimize_image(path: Path) -> None:
    if path.suffix.lower() not in IMAGE_EXTENSIONS or path.stat().st_size < MIN_BYTES_TO_REENCODE:
        return

    try:
        with Image.open(path) as source:
            image = ImageOps.exif_transpose(source)
            if max(image.size) > MAX_EDGE:
                scale = MAX_EDGE / max(image.size)
                image = image.resize(
                    (round(image.width * scale), round(image.height * scale)),
                    Image.Resampling.LANCZOS,
                )

            suffix = path.suffix.lower()
            if suffix in {".jpg", ".jpeg"}:
                image = image.convert("RGB")
                image.save(path, format="JPEG", quality=80, optimize=True, progressive=True)
            else:
                image.save(path, format="PNG", optimize=True, compress_level=9)
    except (OSError, ValueError):
        # Keep an unusual or damaged image available rather than failing the
        # entire site build. Pelican can still copy the original file.
        return


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: prepare_build_content.py SOURCE DEST", file=sys.stderr)
        return 2

    source = Path(sys.argv[1]).resolve()
    destination = Path(sys.argv[2]).resolve()
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(source, destination)

    before = sum(path.stat().st_size for path in destination.rglob("*") if path.is_file())
    for path in destination.rglob("*"):
        if path.is_file():
            optimize_image(path)
    after = sum(path.stat().st_size for path in destination.rglob("*") if path.is_file())
    print(f"Prepared build content: {before / 1024 / 1024:.1f} MB -> {after / 1024 / 1024:.1f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
