Title: Pillow AVIF Support: Save AVIF Without an Extra Plugin
Date: 2026-09-19 01:37
Modified: 2026-09-24
Category: Image processing
Tags: Python, Pillow, AVIF, Image compression
Slug: pillow-avif-support
Summary: Pillow 11.3.0 and later can include AVIF support in prebuilt wheels. Tests with Pillow 12.3.0 compare quality and speed on seven photos.
Lang: en
URL: en/pillow-avif-support.html
Save_as: en/pillow-avif-support.html
ja_url: pillow-avif-built-in-quality-speed.html
Image: images/2026-02/0211/P_20260211_194528.jpg
image_alt: Close-up of a CHUWI CoreBook X keyboard used in the image comparisons.
en_article: true

Searching for how to save AVIF images with Pillow still turns up instructions for installing `pillow-avif-plugin`. Do you still need it with current Pillow?

In a Windows AMD64 test environment, Pillow 12.3.0 saved and opened AVIF files without an extra plugin. For a basic save, this was enough:

```python
from PIL import Image

with Image.open("input.jpg") as image:
    image.convert("RGB").save(
        "output.avif",
        format="AVIF",
        quality=75,
        speed=6,
    )
```

Pillow’s release notes say AVIF reading and writing were included in prebuilt wheels starting with [Pillow 11.3.0](https://pillow.readthedocs.io/en/stable/releasenotes/11.3.0.html#avif-support-in-wheels). Windows ARM64 and iOS are exceptions; the Windows AMD64 wheel in this test worked with `pip install Pillow` alone.

## Check whether your Pillow build supports AVIF

You can check whether AVIF is enabled in the Pillow installation you already have:

```python
from PIL import features

print(features.check("avif"))
print(features.version("avif"))
```

The test returned:

```text
True
1.4.2
```

The environment was Windows AMD64, Python 3.10.1, and Pillow 12.3.0. `True` means AVIF support is enabled. The second line is the version of libavif used by Pillow.

If the check returns `False`, first confirm your Pillow version and where it came from. If a compatible wheel is available for your platform, updating Pillow is a good first step.

## Changing quality on seven photos

The comparison used seven photos from the [CHUWI CoreBook X unboxing post](/chuwi-corebook-x-review.html). Each was resized with its aspect ratio preserved and its long edge set to 1,200 pixels. The original files were opened read-only; encoded outputs were held in memory.

Each setting had one warm-up save, followed by three timed saves. The save-time column is the sum of the seven per-image medians.

| AVIF save settings | Total size, 7 photos | Save time | PSNR range |
| --- | ---: | ---: | ---: |
| Defaults (`quality=75`, `speed=6`) | 1,106,585 bytes | 698.98 ms | 36.87–44.97 dB |
| `quality=60`, `speed=6` | 663,485 bytes | 715.10 ms | 33.19–44.18 dB |
| `quality=70`, `speed=6` | 964,997 bytes | 777.88 ms | 36.09–44.69 dB |
| `quality=80`, `speed=6` | 1,292,853 bytes | 835.49 ms | 38.07–45.25 dB |
| `quality=90`, `speed=6` | 1,921,627 bytes | 1,005.80 ms | 41.92–45.79 dB |

In this set, increasing `quality` raised both file size and the image-quality metric. Pillow’s AVIF `quality` range is 0–100, with a default of 75. The default landed between the smaller and larger results here.

PSNR compares the decoded output with the resized RGB image; a higher value means a smaller pixel-level difference. Results varied by photo, so inspect the images themselves before choosing a setting.

## Higher speed made the files larger

AVIF also has a `speed` option: 0 is slower and higher quality, 10 is fastest, and the default is 6. With `quality=80`, the results were:

| `speed` | Total size, 7 photos | Save time | PSNR range |
| ---: | ---: | ---: | ---: |
| 4 | 1,312,633 bytes | 4,550.27 ms | 38.14–45.23 dB |
| 6 | 1,292,853 bytes | 835.49 ms | 38.07–45.25 dB |
| 8 | 1,415,896 bytes | 402.51 ms | 38.07–45.13 dB |
| 10 | 1,490,585 bytes | 190.62 ms | 37.81–45.12 dB |

At `speed=10`, saving was about 4.4 times faster than at `speed=6`, while the files were about 15% larger and PSNR was slightly lower. `speed=4` took about 5.4 times longer than `speed=6`; it did not make this set smaller, and the PSNR difference was slight. For these photos, the default `speed=6` seems like a sensible starting point.

Pillow documents `quality`, `speed`, chroma subsampling, and the other options in its [AVIF saving reference](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#avif).

## The same quality number does not guarantee a smaller file

The same seven photos were also saved as JPEG and WebP:

| Format and settings | Total size, 7 photos | Save time | PSNR range |
| --- | ---: | ---: | ---: |
| AVIF `quality=80`, `speed=6` | 1,292,853 bytes | 835.49 ms | 38.07–45.25 dB |
| JPEG `quality=80`, `progressive=True` | 1,259,719 bytes | 103.29 ms | 32.36–45.70 dB |
| WebP `quality=80`, `method=4` | 1,146,130 bytes | 1,221.03 ms | 36.23–44.60 dB |

Here, AVIF at `quality=80` was slightly larger than JPEG at `quality=80`. AVIF does not automatically produce a smaller file with the same numeric setting. Different formats also interpret `quality` differently, so file size alone is not a like-for-like quality comparison.

For the JPEG settings, see the [comparison of Pillow JPEG quality and progressive output](/en/pillow-jpeg-quality-progressive.html).

## Try the comparison script without overwriting originals

The [comparison script is on GitHub](https://github.com/ligfil-8110/ligfil-8110.github.io/blob/main/scripts/compare_avif_options.py). It creates AVIF, JPEG, and WebP outputs in memory and reports file size, save time, and PSNR.

```shell
python -m pip install "Pillow>=11.3"
python scripts/compare_avif_options.py your-photo.jpg --repeats 3
```

You can pass multiple images. The script also checks each input file’s SHA-256 before and after processing.

If your Pillow build supports AVIF, try `features.check("avif")` first; no extra plugin may be needed. Start with `quality=75` and `speed=6`, then compare both appearance and file size on the images you actually use.
