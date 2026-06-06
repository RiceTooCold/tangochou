#!/usr/bin/env python3
"""Generate per-page character "anchor" sets from a vocab-table PDF.

The anchors are the text-layer dictionary the vocab-extract workflow uses to
cross-check the vision sub-agents' output against — any kanji/kana the vision
model produces that is NOT in the page's anchor set is flagged as a possible
hallucination.

Usage (pdfplumber may be run on-demand via uvx):
    uvx --from pdfplumber python3 scripts/gen_anchors.py 13単語.pdf

Prints JSON to stdout:
    {"pageAnchors": [{"page": 1, "chars": "..."}, ...]}
"""
import sys
import json

import pdfplumber


def main():
    if len(sys.argv) < 2:
        print("usage: gen_anchors.py <pdf>", file=sys.stderr)
        sys.exit(1)
    path = sys.argv[1]
    pages = []
    with pdfplumber.open(path) as pdf:
        for i, page in enumerate(pdf.pages, 1):
            text = page.extract_text() or ""
            chars = "".join(sorted(set(c for c in text if not c.isspace())))
            pages.append({"page": i, "chars": chars})
    print(json.dumps({"pageAnchors": pages}, ensure_ascii=False))


if __name__ == "__main__":
    main()
