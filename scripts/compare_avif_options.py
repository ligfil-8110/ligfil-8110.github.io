"""Compare Pillow AVIF quality and speed settings without writing image files.

Pass one or more photos on the command line. Each source is opened read-only,
resized in memory, encoded to AVIF, decoded again, and compared with the resized
RGB image using PSNR. JPEG and WebP rows are included only as reference points;
the same quality number does not mean the same visual quality across formats.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import math
import platform
import statistics
import time
from pathlib import Path

import PIL
from PIL import Image, ImageChops, ImageOps, ImageStat, features


CASES = [
    ("AVIF default", "AVIF", {}),
    ("AVIF q60 speed6", "AVIF", {"quality": 60, "speed": 6}),
    ("AVIF q70 speed6", "AVIF", {"quality": 70, "speed": 6}),
    ("AVIF q80 speed6", "AVIF", {"quality": 80, "speed": 6}),
    ("AVIF q90 speed6", "AVIF", {"quality": 90, "speed": 6}),
    ("AVIF q80 speed4", "AVIF", {"quality": 80, "speed": 4}),
    ("AVIF q80 speed8", "AVIF", {"quality": 80, "speed": 8}),
    ("AVIF q80 speed10", "AVIF", {"quality": 80, "speed": 10}),
    ("JPEG q80 progressive", "JPEG", {"quality": 80, "progressive": True}),
    ("WebP q80 method4", "WEBP", {"quality": 80, "method": 4}),
]


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_resized(path: Path, max_edge: int) -> Image.Image:
    with Image.open(path) as original:
        if getattr(original, "n_frames", 1) != 1:
            raise ValueError(f"Only single-frame images are supported: {path}")
        image = ImageOps.exif_transpose(original).convert("RGB")
    if max(image.size) > max_edge:
        scale = max_edge / max(image.size)
        image = image.resize(
            (round(image.width * scale), round(image.height * scale)),
            Image.Resampling.LANCZOS,
        )
    return image


def psnr(reference: Image.Image, decoded: Image.Image) -> float:
    difference = ImageChops.difference(reference, decoded)
    channel_rms = ImageStat.Stat(difference).rms
    mse = sum(value * value for value in channel_rms) / len(channel_rms)
    if mse == 0:
        return math.inf
    return 20 * math.log10(255 / math.sqrt(mse))


def encode(image: Image.Image, image_format: str, options: dict[str, object]) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format=image_format, **options)
    return buffer.getvalue()


def compare(images: list[Image.Image], repeats: int) -> None:
    print("option | total bytes | sum of median encoding ms | PSNR range dB")
    for label, image_format, options in CASES:
        total_bytes = 0
        total_median_ms = 0.0
        psnr_values = []
        for image in images:
            encode(image, image_format, options)  # Warm-up, excluded from timing.
            durations = []
            encoded = b""
            for _ in range(repeats):
                started = time.perf_counter()
                encoded = encode(image, image_format, options)
                durations.append((time.perf_counter() - started) * 1000)
            total_bytes += len(encoded)
            total_median_ms += statistics.median(durations)
            with Image.open(io.BytesIO(encoded)) as decoded_source:
                decoded_format = decoded_source.format
                decoded = decoded_source.convert("RGB")
            if decoded_format != image_format:
                raise AssertionError(f"Decoded as {decoded_format}, expected {image_format}")
            if decoded.size != image.size:
                raise AssertionError(f"Decoded dimensions changed: {label}")
            psnr_values.append(psnr(image, decoded))
        print(
            f"{label} | {total_bytes} | {total_median_ms:.2f} | "
            f"{min(psnr_values):.2f}-{max(psnr_values):.2f}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("images", nargs="+", type=Path, help="Images opened read-only")
    parser.add_argument("--max-edge", type=int, default=1200)
    parser.add_argument("--repeats", type=int, default=3)
    args = parser.parse_args()
    if args.max_edge < 1:
        parser.error("--max-edge must be positive")
    if args.repeats < 1:
        parser.error("--repeats must be positive")
    if not features.check("avif"):
        parser.error("This Pillow build does not have AVIF support")

    before_hashes = {}
    for path in args.images:
        if not path.is_file():
            parser.error(f"Image not found: {path}")
        before_hashes[path] = file_sha256(path)
    images = [load_resized(path, args.max_edge) for path in args.images]

    dimensions = sorted({f"{image.width}x{image.height}" for image in images})
    print(
        f"Python {platform.python_version()}, Pillow {PIL.__version__}, "
        f"libavif {features.version('avif')}, "
        f"{platform.system()} {platform.machine()}"
    )
    print(
        f"Input: {len(images)} supplied image(s), opened read-only; "
        f"resized dimensions: {', '.join(dimensions)}; "
        f"{args.repeats} measured runs plus one warm-up per option"
    )
    compare(images, args.repeats)

    for path, before_hash in before_hashes.items():
        if file_sha256(path) != before_hash:
            raise AssertionError(f"Input file changed: {path}")
    print("input files unchanged: True")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
