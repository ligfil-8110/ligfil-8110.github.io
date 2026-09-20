"""Generate the verified-data chart used by the Pillow PNG article."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH = 1200
HEIGHT = 675
BACKGROUND = "#F3F7FC"
INK = "#14213D"
MUTED = "#5B677A"
BLUE = "#2F80ED"
LIGHT_BLUE = "#DCEBFF"
ORANGE = "#F2994A"
LIGHT_ORANGE = "#FDE9D6"
WHITE = "#FFFFFF"

QUALITY_RESULTS = [
    ("指定なし", 316_511),
    ("quality=10", 316_511),
    ("quality=90", 316_511),
]
DEFAULT_BYTES = 316_511
DEFAULT_MS = 20.43
OPTIMIZED_BYTES = 310_398
OPTIMIZED_MS = 113.64


def find_font() -> Path:
    candidates = [
        Path("C:/Windows/Fonts/YuGothB.ttc"),
        Path("C:/Windows/Fonts/meiryob.ttc"),
        Path("C:/Windows/Fonts/msgothic.ttc"),
    ]
    for path in candidates:
        if path.exists():
            return path
    raise FileNotFoundError("A Japanese font was not found in C:/Windows/Fonts")


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def draw_centered(draw: ImageDraw.ImageDraw, box, text, text_font, fill) -> None:
    left, top, right, bottom = box
    bounds = draw.textbbox((0, 0), text, font=text_font)
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    draw.text(
        ((left + right - width) / 2, (top + bottom - height) / 2 - bounds[1]),
        text,
        font=text_font,
        fill=fill,
    )


def generate(output: Path) -> None:
    font_path = find_font()
    fonts = {
        "eyebrow": font(font_path, 23),
        "title": font(font_path, 46),
        "subtitle": font(font_path, 24),
        "panel": font(font_path, 27),
        "label": font(font_path, 22),
        "value": font(font_path, 28),
        "big": font(font_path, 38),
        "note": font(font_path, 19),
    }

    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle((56, 38, 272, 78), radius=20, fill=INK)
    draw_centered(draw, (56, 38, 272, 78), "Pillow 12.3.0 実測", fonts["eyebrow"], WHITE)
    draw.text((56, 100), "PNGのqualityを変えても容量は同じ", font=fonts["title"], fill=INK)
    draw.text(
        (58, 164),
        "同じ写真をPNG保存して、容量と保存時間を比べました",
        font=fonts["subtitle"],
        fill=MUTED,
    )

    left_panel = (56, 220, 584, 584)
    right_panel = (616, 220, 1144, 584)
    draw.rounded_rectangle(left_panel, radius=24, fill=WHITE)
    draw.rounded_rectangle(right_panel, radius=24, fill=WHITE)

    draw.text((88, 252), "quality指定の比較", font=fonts["panel"], fill=INK)
    bar_left = 88
    bar_right = 536
    for index, (label, byte_count) in enumerate(QUALITY_RESULTS):
        y = 314 + index * 72
        draw.text((bar_left, y), label, font=fonts["label"], fill=MUTED)
        draw.rounded_rectangle((bar_left, y + 34, bar_right, y + 54), radius=10, fill=LIGHT_BLUE)
        draw.rounded_rectangle((bar_left, y + 34, bar_right, y + 54), radius=10, fill=BLUE)
        value = f"{byte_count:,} bytes"
        bounds = draw.textbbox((0, 0), value, font=fonts["value"])
        draw.text((bar_right - (bounds[2] - bounds[0]), y - 3), value, font=fonts["value"], fill=INK)

    draw.rounded_rectangle((88, 520, 552, 559), radius=18, fill=LIGHT_BLUE)
    draw_centered(draw, (88, 520, 552, 559), "3ファイルは中身まで同一", fonts["label"], BLUE)

    draw.text((648, 252), "optimize=True の差", font=fonts["panel"], fill=INK)
    reduction = (DEFAULT_BYTES - OPTIMIZED_BYTES) / DEFAULT_BYTES * 100
    slowdown = OPTIMIZED_MS / DEFAULT_MS

    draw.rounded_rectangle((648, 318, 866, 488), radius=20, fill=LIGHT_BLUE)
    draw.text((680, 346), "容量", font=fonts["label"], fill=MUTED)
    draw.text((680, 384), f"-{reduction:.1f}%", font=fonts["big"], fill=BLUE)
    draw.text((680, 442), f"{DEFAULT_BYTES:,} → {OPTIMIZED_BYTES:,}", font=fonts["note"], fill=INK)

    draw.rounded_rectangle((894, 318, 1112, 488), radius=20, fill=LIGHT_ORANGE)
    draw.text((926, 346), "保存時間", font=fonts["label"], fill=MUTED)
    draw.text((926, 384), f"{slowdown:.1f}倍", font=fonts["big"], fill=ORANGE)
    draw.text((926, 442), f"{DEFAULT_MS:.2f} → {OPTIMIZED_MS:.2f} ms", font=fonts["note"], fill=INK)

    draw.text(
        (648, 520),
        "この写真では、時間ほど容量は減りませんでした",
        font=fonts["label"],
        fill=INK,
    )

    footer = "562×480px RGB写真 / 最初の1回を除く5回の中央値 / Windows・Python 3.10.1"
    draw.text((56, 626), footer, font=fonts["note"], fill=MUTED)

    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, format="PNG", optimize=True)

    with Image.open(output) as check:
        if check.size != (WIDTH, HEIGHT) or check.mode != "RGB" or check.format != "PNG":
            raise AssertionError("Generated chart does not match the required PNG format")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("content/images/2026-09/pillow-png-compression-comparison.png"),
    )
    args = parser.parse_args()
    generate(args.output)
    print(f"generated {args.output} ({WIDTH}x{HEIGHT} RGB PNG)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
