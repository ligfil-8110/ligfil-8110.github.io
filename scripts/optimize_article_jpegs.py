"""Create smaller, EXIF-free JPEG copies of first-party article photos.

Example:
    python scripts/optimize_article_jpegs.py --output-dir preview photo1.jpg photo2.jpg

The input files are never modified. Existing output files are not overwritten.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("images", nargs="+", type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--max-edge", type=int, default=1200)
    parser.add_argument("--quality", type=int, default=80)
    args = parser.parse_args()

    if args.max_edge < 1 or not 1 <= args.quality <= 95:
        parser.error("--max-edge must be positive and --quality must be 1–95")
    if not args.output_dir.is_dir():
        parser.error("--output-dir must already be an existing directory")

    outputs = [args.output_dir / f"{path.stem}-{args.max_edge}.jpg" for path in args.images]
    if len(set(outputs)) != len(outputs):
        parser.error("input filenames would collide in the output directory")
    for path, output in zip(args.images, outputs):
        if path.suffix.lower() not in {".jpg", ".jpeg"} or not path.is_file():
            parser.error(f"not an existing JPEG: {path}")
        if path.resolve() == output.resolve() or output.exists():
            parser.error(f"refusing to overwrite: {output}")

    for path, output in zip(args.images, outputs):
        with Image.open(path) as original:
            upright = ImageOps.exif_transpose(original).convert("RGB")
        upright.thumbnail((args.max_edge, args.max_edge), Image.Resampling.LANCZOS)
        upright.save(output, format="JPEG", quality=args.quality, progressive=True)
        with Image.open(output) as check:
            check.load()
            if check.size != upright.size or check.getexif():
                raise RuntimeError(f"invalid output: {output}")
        print(f"{path.name}: {path.stat().st_size} -> {output.stat().st_size} bytes; {upright.width}x{upright.height}; EXIF=0")


if __name__ == "__main__":
    main()
