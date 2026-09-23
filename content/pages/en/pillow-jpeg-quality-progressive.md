Title: Pillow JPEG Compression: quality, optimize, and progressive Compared
Date: 2026-09-18 01:38
Category: Image processing
Tags: Python, Pillow, JPEG, Image compression
Slug: pillow-jpeg-quality-progressive
Summary: I compared Pillow’s JPEG quality, optimize, and progressive options on seven photos resized to the same 1,200-pixel long edge.
Lang: en
URL: en/pillow-jpeg-quality-progressive.html
Save_as: en/pillow-jpeg-quality-progressive.html
ja_url: pillow-jpeg-quality-progressive-comparison.html
Image: images/2026-02/0211/P_20260211_194528.jpg
image_alt: Close-up of a CHUWI CoreBook X keyboard used in the image comparisons.
en_article: true

What `quality` should you use to make a JPEG smaller with Pillow? Should you also set `optimize=True` or `progressive=True`? With several options in play, it can be hard to tell which one made a difference.

I resized seven photos used on this blog to the same 1,200-pixel long edge, then changed only the save settings. In this set, `quality=80, progressive=True` produced 1,259,719 bytes in total—56.4% smaller than `quality=95` at 2,887,101 bytes. Adding `optimize=True` did not reduce the size further than progressive output alone.

```python
image.save("output.jpg", quality=80, progressive=True)
```

## Results from seven photos

The inputs were JPEGs from my [CHUWI CoreBook X unboxing post](/chuwi-corebook-x-review.html). They included original dimensions such as 4,096 × 3,072 pixels. I corrected orientation, converted to RGB, and resized with the aspect ratio preserved so the long edge was 1,200 pixels.

I used the first save for warm-up and took the median of the next five saves for each setting. The save-time values below add the seven per-image medians; they exclude opening and resizing the images. The environment was Windows, Python 3.10.1, and Pillow 12.3.0.

| JPEG save settings | Total size, 7 photos | Change vs. `quality=95` | Save time | PSNR range |
| --- | ---: | ---: | ---: | ---: |
| `quality=95` | 2,887,101 bytes | baseline | 20.60 ms | 41.52–48.85 dB |
| `quality=90` | 2,016,298 bytes | -30.2% | 17.96 ms | 36.78–47.28 dB |
| `quality=85` | 1,604,818 bytes | -44.4% | 16.01 ms | 34.05–46.39 dB |
| `quality=80` | 1,360,948 bytes | -52.9% | 15.21 ms | 32.36–45.70 dB |
| `quality=75` | 1,185,632 bytes | -58.9% | 14.73 ms | 31.25–45.25 dB |
| `quality=80`, `optimize=True` | 1,318,954 bytes | -54.3% | 41.37 ms | 32.36–45.70 dB |
| `quality=80`, `progressive=True` | 1,259,719 bytes | -56.4% | 97.02 ms | 32.36–45.70 dB |
| `quality=80`, both options | 1,259,719 bytes | -56.4% | 103.03 ms | 32.36–45.70 dB |

Repeating the comparison produced the same file sizes and PSNR values. Save times varied slightly: for example, `quality=80` took 15.21–16.03 ms, and progressive output took 97.02–98.30 ms.

## How much does lowering quality save?

Going from `quality=95` to `quality=90` cut the total size by about 30%. At `quality=80`, it was about 53% smaller.

JPEG is lossy, so decoding the saved file changes pixel values. PSNR compares the decoded file with the resized RGB input; a higher number means a smaller pixel-level difference. Across these photos, `quality=80` ranged from 32.36 to 45.70 dB, while `quality=75` ranged from 31.25 to 45.25 dB. The variation is why I would look at the actual images instead of choosing by file size alone.

Pillow documents JPEG `quality` as 0–95, with a default of 75. Its documentation advises against values above 95 because they increase size with little quality gain. See [Pillow’s JPEG saving options](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#jpeg-saving).

## What changed with optimize and progressive?

At `quality=80`, `optimize=True` reduced the total from 1,360,948 to 1,318,954 bytes, about 3.1%, while save time rose from 15.21 to 41.37 ms.

`progressive=True` produced 1,259,719 bytes, but took 97.02 ms to save. In this comparison, combining `optimize=True` with progressive output gave exactly the same file size as progressive output alone. I repeated the combination and got the same result both times.

Pillow describes `optimize` as an extra pass to select encoder settings, while `progressive` saves a JPEG that can be displayed progressively. They do different things, but their effect on size depends on the images and environment—so it is useful to compare them on your own files.

## Resize first, then save as JPEG

To set a maximum long edge while preserving aspect ratio, you can use code like this. `ImageOps.exif_transpose()` applies the EXIF orientation to the pixels, which is useful for phone photos.

```python
from PIL import Image, ImageOps

with Image.open("input.jpg") as original:
    image = ImageOps.exif_transpose(original).convert("RGB")

if max(image.size) > 1200:
    scale = 1200 / max(image.size)
    image = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )

image.save("output.jpg", quality=80, progressive=True)
```

Pillow documents resize filters and `reducing_gap` in [`Image.resize()`](https://pillow.readthedocs.io/en/stable/reference/Image.html#PIL.Image.Image.resize), and orientation correction in [`ImageOps.exif_transpose()`](https://pillow.readthedocs.io/en/stable/reference/ImageOps.html#PIL.ImageOps.exif_transpose).

## Run the comparison on your own photos

The [comparison script is on GitHub](https://github.com/ligfil-8110/ligfil-8110.github.io/blob/main/scripts/compare_jpeg_options.py). It opens inputs read-only and keeps the JPEG output in memory, so it does not overwrite your originals.

```shell
python -m pip install Pillow==12.3.0
python scripts/compare_jpeg_options.py your-photo.jpg --repeats 5
```

With no image argument, the script creates an RGB image for a quick check. Pass multiple photos to compare their total size and PSNR range. For my PNG comparison, see [why changing PNG `quality` did not change the file](/en/pillow-png-compression.html).

For website JPEGs, I would first resize to the dimensions needed for display, then compare `quality` and progressive output on the images themselves.
