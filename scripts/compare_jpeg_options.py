"""Compare Pillow JPEG save options in memory without overwriting inputs.

Pass one or more image paths to compare real photos. With no path, the script
uses a deterministic RGB fixture. Resize time is excluded; only JPEG encoding
is measured. Every output is decoded again and compared with the resized RGB
input using PSNR.
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
from PIL import Image, ImageChops, ImageOps, ImageStat


CASES = [
    ("quality=95", {"quality": 95}),
    ("quality=90", {"quality": 90}),
    ("quality=85", {"quality": 85}),
    ("quality=80", {"quality": 80}),
    ("quality=75", {"quality": 75}),
    ("q80, optimize", {"quality": 80, "optimize": True}),
    ("q80, progressive", {"quality": 80, "progressive": True}),
    (
        "q80, optimize, progressive",
        {"quality": 80, "optimize": True, "progressive": True},
    ),
]


def fixture() -> Image.Image:
    """Return a repeatable mix of gradients, edges, and fine detail."""
    return Image.frombytes(
        "RGB",
        (800, 600),
        bytes(
            value
            for y in range(600)
            for x in range(800)
            for value in (
                (x * 3 + y) % 256,
                (y * 2 + x // 3) % 256,
                (((x // 8) ^ (y // 8)) * 17) % 256,
            )
        ),
    )


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


def encode(image: Image.Image, options: dict[str, object]) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", **options)
    return buffer.getvalue()


def compare(images: list[Image.Image], repeats: int) -> None:
    results = []
    for label, options in CASES:
        total_bytes = 0
        total_median_ms = 0.0
        psnr_values = []
        progressive_outputs = 0
        for image in images:
            encode(image, options)  # Warm-up, excluded from timing.
            durations = []
            encoded = b""
            for _ in range(repeats):
                started = time.perf_counter()
                encoded = encode(image, options)
                durations.append((time.perf_counter() - started) * 1000)
            total_bytes += len(encoded)
            total_median_ms += statistics.median(durations)
            with Image.open(io.BytesIO(encoded)) as decoded_source:
                decoded = decoded_source.convert("RGB")
                is_progressive = bool(
                    decoded_source.info.get("progressive")
                    or decoded_source.info.get("progression")
                )
            if decoded.size != image.size:
                raise AssertionError(f"Decoded dimensions changed: {label}")
            progressive_outputs += int(is_progressive)
            psnr_values.append(psnr(image, decoded))
        results.append(
            {
                "label": label,
                "bytes": total_bytes,
                "milliseconds": total_median_ms,
                "psnr_min": min(psnr_values),
                "psnr_max": max(psnr_values),
                "progressive": progressive_outputs,
            }
        )

    baseline_bytes = results[0]["bytes"]
    print(
        "option | total bytes | change vs quality=95 | "
        "sum of median encoding ms | PSNR range dB | progressive files"
    )
    for result in results:
        change = (result["bytes"] / baseline_bytes - 1) * 100
        print(
            f"{result['label']} | {result['bytes']} | {change:+.1f}% | "
            f"{result['milliseconds']:.2f} | "
            f"{result['psnr_min']:.2f}-{result['psnr_max']:.2f} | "
            f"{result['progressive']}/{len(images)}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("images", nargs="*", type=Path, help="Images opened read-only")
    parser.add_argument("--max-edge", type=int, default=1200)
    parser.add_argument("--repeats", type=int, default=5)
    args = parser.parse_args()
    if args.max_edge < 1:
        parser.error("--max-edge must be positive")
    if args.repeats < 1:
        parser.error("--repeats must be positive")

    before_hashes = {}
    if args.images:
        for path in args.images:
            if not path.is_file():
                parser.error(f"Image not found: {path}")
            before_hashes[path] = file_sha256(path)
        images = [load_resized(path, args.max_edge) for path in args.images]
        source_label = f"{len(images)} supplied image(s), opened read-only"
    else:
        images = [fixture()]
        source_label = "one generated RGB fixture"

    dimensions = sorted({f"{image.width}x{image.height}" for image in images})
    print(f"Python {platform.python_version()}, Pillow {PIL.__version__}, {platform.system()}")
    print(
        f"Input: {source_label}; resized dimensions: {', '.join(dimensions)}; "
        f"{args.repeats} measured runs plus one warm-up per option"
    )
    compare(images, args.repeats)

    for path, before_hash in before_hashes.items():
        if file_sha256(path) != before_hash:
            raise AssertionError(f"Input file changed: {path}")
    if before_hashes:
        print("input files unchanged: True")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
