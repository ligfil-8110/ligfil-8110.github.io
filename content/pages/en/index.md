Title: Practical Python and Image Processing Notes
Date: 2026-09-23 00:00
Category: English
Tags: Python, Pillow, Image Processing
Slug: english-home
Summary: Practical Pillow notes based on real image files: PNG compression, JPEG quality and progressive scans, and built-in AVIF support.
Lang: en
URL: en/
Save_as: en/index.html
ja_url:

## Hello, I’m Mitchy

I’m a Japanese hobbyist who likes trying things out and keeping useful notes. This English section starts with practical image-processing experiments using Python and Pillow. The measurements come from the files and setup described in each post, so results may differ with your images or environment.

<h2 id="articles">Latest technical posts</h2>

These are English editions of my three latest technical posts. The original Japanese articles remain available from the language switch on each page.

### [Pillow AVIF Support: Save AVIF Without an Extra Plugin](/en/pillow-avif-support.html)

Pillow 11.3.0 and later can include AVIF support in its prebuilt wheels. I checked it with Pillow 12.3.0, then compared `quality` and `speed` on seven resized photos.

### [Pillow JPEG Compression: quality, optimize, and progressive Compared](/en/pillow-jpeg-quality-progressive.html)

I compared JPEG save options on seven photos resized to a 1,200-pixel long edge. In this set, `quality=80, progressive=True` produced files 56.4% smaller than `quality=95`.

### [Pillow PNG Compression: Why quality Does Not Change File Size](/en/pillow-png-compression.html)

In my comparison, `quality=10` and `quality=90` produced identical PNG files. The useful controls here were `compress_level` and `optimize`.

## What you’ll find here

- Repeatable Python examples and comparison scripts
- Image-format settings explained with actual output sizes and timings
- Notes about what each experiment did—and did not—measure

For more posts in Japanese, [visit the Japanese home page](/).
