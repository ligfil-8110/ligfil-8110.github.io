"""Check the DQ7 reader guide, links, and article-only entry points."""

from __future__ import annotations

import argparse
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


GUIDE = "pages/dq7-reimagined-guide.html"
SITE = "https://ligfil-8110.github.io"
PRODUCT = "https://books.rakuten.co.jp/rb/18378428/"


class BodyLinks(HTMLParser):
    def __init__(self, text: str):
        super().__init__()
        self.depth = 0
        self.links: list[str] = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "div" and (self.depth or "article-body" in attrs.get("class", "").split()):
            self.depth += 1
        if self.depth and tag == "a":
            self.links.append(attrs.get("href", ""))

    def handle_endtag(self, tag):
        if tag == "div" and self.depth:
            self.depth -= 1


def metadata(source: Path) -> dict[str, str]:
    header = source.read_text(encoding="utf-8").split("\n\n", 1)[0]
    return dict(re.findall(r"^(\w+):\s*(.*)$", header, re.M))


def check(output: Path, content: Path, baseline: Path | None) -> None:
    articles = [metadata(source) for source in content.glob("*.md")]
    dq7 = [article for article in articles if article.get("Slug", "").startswith(("dragon-quest-vii-play-", "dq7-re-"))]
    expected = {article["Slug"] + ".html" for article in dq7}
    guide = (output / GUIDE).read_text(encoding="utf-8")
    links = BodyLinks(guide).links
    paths = [urlsplit(link).path.lstrip("/") for link in links]
    assert len(paths) == len(set(paths)), "duplicate guide links"
    assert set(paths) == expected, (set(paths) - expected, expected - set(paths))
    assert all(urlsplit(link).netloc in {"", "ligfil-8110.github.io"} for link in links)
    assert all((output / path).is_file() for path in paths), "missing target"
    diary_order = [article["Slug"] + ".html" for article in sorted(dq7, key=lambda article: article["Date"]) if article["Slug"].startswith("dragon-quest-vii-play-")]
    assert [path for path in paths if path.startswith("dragon-quest-vii-play-")] == diary_order
    assert f'<link rel="canonical" href="{SITE}/{GUIDE}">' in guide
    assert '<meta name="description"' in guide
    assert "googletagmanager.com/gtag/js" in guide and "pagead2.googlesyndication.com" in guide
    assert 'class="article-affiliate"' not in guide, "guide must not introduce another product advert"
    assert "© ARMOR PROJECT" not in guide, "no game imagery on the guide"
    entries = 0
    for page in output.rglob("*.html"):
        html = page.read_text(encoding="utf-8")
        path = page.relative_to(output).as_posix()
        count = html.count('class="post-meta dq7-guide-entry"')
        assert count == (1 if path in expected else 0), (path, count)
        if path in expected:
            entries += 1
            assert "application/ld+json" in html
            assert f'href="{SITE}/{GUIDE}"' in html
            assert html.index('dq7-guide-entry') < html.index('class="article-cover"')
            assert 'class="article-affiliate"' in html
            product = html.split('<aside class="article-affiliate"', 1)[1].split("</aside>", 1)[0]
            assert f'href="{PRODUCT}"' in product, path
            assert "Nintendo Switch 2版" in product and "初代Nintendo Switchでは遊べません" in product
            assert "af.moshimo.com" not in product and "data-affiliate-network" not in product
            assert 'rel="sponsored' not in product
    assert entries == len(expected)
    if baseline:
        # All existing article prose, images, product links, and related cards
        # remain byte-for-byte equal after the body begins. Only headers change.
        for article in articles:
            path = article["Slug"] + ".html"
            before = (baseline / path).read_text(encoding="utf-8")
            after = (output / path).read_text(encoding="utf-8")
            marker = '<div class="article-body">'
            assert before.split(marker, 1)[1] == after.split(marker, 1)[1], path
            for field in ("<title>", '<meta name="description"', '<h1>'):
                assert next(line for line in before.splitlines() if field in line) == next(line for line in after.splitlines() if field in line), (path, field)
    print(f"DQ7 guide OK: {len(expected)} targets, {len(diary_order)} chronological diaries, {entries} article entries")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--content", type=Path, default=Path(".build-content"))
    parser.add_argument("--baseline", type=Path)
    args = parser.parse_args()
    check(args.output, args.content, args.baseline)
