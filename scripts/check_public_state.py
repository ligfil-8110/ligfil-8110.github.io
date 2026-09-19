"""Reject likely private revenue figures in the public operations record."""

from __future__ import annotations

import argparse
import re
from pathlib import Path


PRIVATE_PATTERNS = [
    (
        "period revenue",
        re.compile(
            r"(?:昨日|前日|今月|当月|直近\s*\d+\s*日)"
            r"\s*(?:は|:|：)?\s*(?:[¥￥]\s*)?\d[\d,]*(?:\.\d+)?\s*円"
        ),
    ),
    (
        "dated daily revenue",
        re.compile(
            r"\d{4}-\d{2}-\d{2}\s*(?:は|:|：)\s*"
            r"(?:[¥￥]\s*)?\d[\d,]*(?:\.\d+)?\s*円"
        ),
    ),
    (
        "revenue gap",
        re.compile(
            r"(?:差額|残り)\s*(?:は|:|：)?\s*"
            r"(?:[¥￥]\s*)?\d[\d,]*(?:\.\d+)?\s*円"
        ),
    ),
    (
        "daily revenue requirement",
        re.compile(r"(?:[¥￥]\s*)?\d[\d,]*(?:\.\d+)?\s*円\s*/\s*日"),
    ),
    (
        "month-end revenue forecast",
        re.compile(
            r"月末(?:見込み|予測|約)\s*(?:[¥￥]\s*)?"
            r"\d[\d,]*(?:\.\d+)?\s*円"
        ),
    ),
]


def find_private_figures(text: str) -> list[tuple[int, str, str]]:
    findings = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        for label, pattern in PRIVATE_PATTERNS:
            if pattern.search(line):
                findings.append((line_number, label, line.strip()))
    return findings


def self_test() -> None:
    allowed = """\
- 長期目標は月30,000円。
- 短期目標には現在のペースで大幅に届かない。
- 前日分まで正常に取得できた。
"""
    private = """\
- 収益: 2030-01-02は123円、今月456円、直近7日789円。
- 目標まで残り1,234,567円で、約98,765円/日が必要。月末約12,345円。
"""
    if find_private_figures(allowed):
        raise AssertionError("Public goal amounts and qualitative notes must remain allowed")
    detected_labels = {label for _line_number, label, _line in find_private_figures(private)}
    expected_labels = {label for label, _pattern in PRIVATE_PATTERNS}
    if detected_labels != expected_labels:
        raise AssertionError("Private revenue fixture was not fully detected")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", nargs="?", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        print("public state checker self-test: passed")
        if args.path is None:
            return 0
    if args.path is None:
        parser.error("path is required unless --self-test is used")

    findings = find_private_figures(args.path.read_text(encoding="utf-8"))
    if findings:
        print(f"Private revenue details found in {args.path}:")
        for line_number, label, _line in findings:
            print(f"  line {line_number} ({label})")
        print("Keep exact figures in the private monitor or thread; use qualitative text here.")
        return 1

    print(f"public state check passed: {args.path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
