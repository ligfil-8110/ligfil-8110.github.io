"""Compare PNG encoders in memory; never overwrite an input image.

Run with no argument for a reproducible RGB fixture, or pass an image path.
The timing covers encoding only, not loading, decoding, or network delivery.
"""

import argparse
import hashlib
import io
import platform
import statistics
import time
import zlib

import PIL
from PIL import Image, ImageOps


CASES = [
    ("default", {}),
    ("quality=10", {"quality": 10}),
    ("quality=90", {"quality": 90}),
    ("compress_level=0", {"compress_level": 0}),
    ("compress_level=1", {"compress_level": 1}),
    ("compress_level=9", {"compress_level": 9}),
    ("optimize=True, level=1", {"optimize": True, "compress_level": 1}),
    ("optimize=True, level=9", {"optimize": True, "compress_level": 9}),
]


def fixture():
    # A repeatable mix of smooth colours and sharp block boundaries.
    return Image.frombytes(
        "RGB", (640, 480),
        bytes(value for y in range(480) for x in range(640)
              for value in (x % 256, y % 256, ((x // 16) ^ (y // 16)) * 5 % 256)),
    )


def compare(image, repeats):
    expected = image.tobytes()
    results = {}
    print("option | bytes | median encoding ms | identical decoded pixels")
    for label, options in CASES:
        durations = []
        encoded = None
        for iteration in range(repeats + 1):
            buffer = io.BytesIO()  # Fresh buffer for every encoding.
            started = time.perf_counter()
            image.save(buffer, format="PNG", **options)
            elapsed = (time.perf_counter() - started) * 1000
            if iteration:  # First run is a warm-up, excluded from median.
                durations.append(elapsed)
            encoded = buffer.getvalue()
        with Image.open(io.BytesIO(encoded)) as decoded:
            identical = (decoded.size == image.size and decoded.mode == image.mode
                         and decoded.tobytes() == expected)
        if not identical:
            raise AssertionError(f"Pixels changed: {label}")
        results[label] = encoded
        print(f"{label} | {len(encoded)} | {statistics.median(durations):.2f} | {identical}")
    print("quality outputs byte-identical:",
          results["default"] == results["quality=10"] == results["quality=90"])
    print("optimize outputs byte-identical:",
          results["optimize=True, level=1"] == results["optimize=True, level=9"])
    print("baseline PNG SHA256:", hashlib.sha256(results["default"]).hexdigest())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", nargs="?", help="Optional image, opened read-only")
    parser.add_argument("--repeats", type=int, default=5)
    args = parser.parse_args()
    if args.repeats < 1:
        parser.error("--repeats must be positive")
    if args.image:
        with Image.open(args.image) as original:
            if getattr(original, "n_frames", 1) != 1:
                parser.error("Only single-frame images are supported")
            image = ImageOps.exif_transpose(original).convert("RGB")
            image.thumbnail((640, 480), Image.Resampling.LANCZOS)
        label = "supplied image, oriented and converted to RGB, fitted within 640x480"
    else:
        image = fixture()
        label = "generated RGB fixture"
    print(f"Python {platform.python_version()}, Pillow {PIL.__version__}, "
          f"{platform.system()}, zlib {zlib.ZLIB_RUNTIME_VERSION}")
    print(f"Input: {label}, {image.width}x{image.height}, {image.mode}; "
          f"{args.repeats} measured runs plus one warm-up per option")
    compare(image, args.repeats)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
