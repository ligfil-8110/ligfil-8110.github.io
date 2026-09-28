"""Verify the generated reader-facing sitemap and its site-wide entry point."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree
from zoneinfo import ZoneInfo


class Page(HTMLParser):
    def __init__(self, text: str):
        super().__init__()
        self.ids: set[str] = set()
        self.links: list[str] = []
        self.map_links: list[str] = []
        self.footer_links: list[str] = []
        self.canonical = ""
        self.is_content = False
        self.map_depth = 0
        self.in_footer = False
        self.feed(text)

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if attrs.get("id"):
            assert attrs["id"] not in self.ids, f"duplicate id: {attrs['id']}"
            self.ids.add(attrs["id"])
        classes = attrs.get("class", "").split()
        self.is_content |= "article-page" in classes or "english-home" in classes
        if tag == "div" and (self.map_depth or attrs.get("id") == "sitemap-content"):
            self.map_depth += 1
        if tag == "footer":
            self.in_footer = True
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs["href"]
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
            if self.map_depth:
                self.map_links.append(attrs["href"])
            if self.in_footer:
                self.footer_links.append(attrs["href"])

    def handle_endtag(self, tag):
        if tag == "div" and self.map_depth:
            self.map_depth -= 1
        if tag == "footer":
            self.in_footer = False


def future_page_urls(content: Path, site: str) -> set[str]:
    """Pelican publishes future-dated pages; the HTML map deliberately omits them."""
    excluded = set()
    now = datetime.now(ZoneInfo("Asia/Tokyo"))
    for source in (content / "pages").rglob("*.md"):
        header = source.read_text(encoding="utf-8").split("\n\n", 1)[0]
        metadata = {key.lower(): value.strip() for key, value in re.findall(r"^([\w_]+):\s*(.*)$", header, re.M)}
        if not metadata.get("date") or not metadata.get("slug"):
            continue
        date = datetime.fromisoformat(metadata["date"])
        if date.tzinfo is None:
            date = date.replace(tzinfo=ZoneInfo("Asia/Tokyo"))
        if date > now:
            url = metadata.get("url", f"pages/{metadata['slug']}.html")
            excluded.add(f"{site}/{url}")
    return excluded


def check(output: Path, content: Path, excluded_urls: set[str]) -> None:
    site = "https://ligfil-8110.github.io"
    excluded_urls |= future_page_urls(content, site)
    sitemap_url = f"{site}/sitemap.html"
    text = (output / "sitemap.html").read_text(encoding="utf-8")
    sitemap = Page(text)
    assert sitemap.canonical == sitemap_url, sitemap.canonical
    assert "サイトマップ |" in text and 'name="description"' in text
    assert "カテゴリー別の全記事一覧" in text
    assert "G-JDKE8JVXLC" in text and "ca-pub-8290235019998561" in text
    assert "rights-notice" not in text and "affiliate-sidebar" not in text

    xml = ElementTree.parse(output / "sitemap.xml")
    xml_urls = {loc.text for loc in xml.findall(".//{*}loc")}
    expected: set[str] = set()
    documents = {}
    for path in output.rglob("*.html"):
        html = path.read_text(encoding="utf-8")
        page = Page(html)
        documents[path] = page
        if page.canonical in xml_urls and page.is_content and page.canonical not in excluded_urls:
            expected.add(page.canonical)
        if page.canonical in xml_urls:
            assert sitemap_url in page.footer_links, f"missing footer entry: {path}"
        # Existing structured data must stay parseable.
        for match in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
            json.loads(match.group(1))

    mapped = [href for href in sitemap.map_links if not href.startswith("#")]
    assert not (set(mapped) & excluded_urls), "unpublished content listed"
    assert len(mapped) == len(set(mapped)), "duplicate sitemap content links"
    assert set(mapped) == expected | {f"{site}/"}, (
        f"missing={expected - set(mapped)}, unexpected={set(mapped) - expected - {site + '/'}}"
    )
    for href in sitemap.links:
        url = urlsplit(href)
        if href.startswith("#"):
            assert unquote(url.fragment) in sitemap.ids, href
        elif url.netloc == "ligfil-8110.github.io":
            relative = unquote(url.path).lstrip("/")
            target = output / (relative + "index.html" if not relative or relative.endswith("/") else relative)
            assert target.is_file(), f"broken sitemap link: {href}"
            if url.fragment:
                assert unquote(url.fragment) in documents[target].ids, href

    assert (output / "ads.txt").is_file()
    assert f"Sitemap: {site}/sitemap.xml" in (output / "robots.txt").read_text(encoding="utf-8")
    print(f"HTML sitemap check passed: {len(expected)} published content pages; links, footer, metadata, analytics and XML preserved")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", nargs="?", default="output")
    parser.add_argument("--content", default=".build-content", help="Prepared source tree used for the build")
    parser.add_argument("--excluded-url", action="append", default=[], help="Unpublished fixture URL that must not appear")
    args = parser.parse_args()
    check(Path(args.output).resolve(), Path(args.content).resolve(), set(args.excluded_url))
