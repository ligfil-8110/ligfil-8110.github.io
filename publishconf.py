# This file is only used if you use `make publish` or
# explicitly specify it as your config file.

import os
import sys

sys.path.append(os.curdir)
from pelicanconf import *

# Production-only static files that must be published at the site root.
STATIC_PATHS = [*STATIC_PATHS, "extra/robots.txt"]
EXTRA_PATH_METADATA = {
    **EXTRA_PATH_METADATA,
    "extra/robots.txt": {"path": "robots.txt"},
}

# Use a stable Japanese date format instead of relying on the build host locale.
DEFAULT_DATE_FORMAT = "%Y年%m月%d日"

# Increment when theme CSS or JavaScript changes so CDN/browser caches refresh.
THEME_ASSET_VERSION = "20260909-1"

# If your site is available via HTTPS, make sure SITEURL begins with https://
SITEURL = "https://ligfil-8110.github.io"
RELATIVE_URLS = False

FEED_ALL_ATOM = "feeds/all.atom.xml"
CATEGORY_FEED_ATOM = "feeds/{slug}.atom.xml"

DELETE_OUTPUT_DIRECTORY = True

# Following items are often useful when publishing

# DISQUS_SITENAME = ""
# GOOGLE_ANALYTICS = ""
