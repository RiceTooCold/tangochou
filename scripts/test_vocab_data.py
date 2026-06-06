#!/usr/bin/env python3
"""Validate vocabulary JSON data integrity.

Data is produced by the vision-extraction workflow (see
docs/superpowers/specs/2026-06-06-vision-vocab-extraction-design.md).
`accent` is an array of ints 0-9 (multiple values = multiple pitch patterns).

Usage:
    python scripts/test_vocab_data.py
    python scripts/test_vocab_data.py --verbose
"""

import json
import re
import sys
from pathlib import Path

DATA_DIR = Path("src/data")
LESSONS = [7, 8, 9, 10, 11, 12]

# ── Schema rules ──────────────────────────────────────────────

def check_schema(words: list[dict], lesson: int) -> list[str]:
    """Validate field types and value ranges."""
    errors = []
    seen_ids = set()

    for i, w in enumerate(words):
        prefix = f"L{lesson} #{i+1} ({w.get('word', '?')})"

        # Required fields
        for field in ("id", "word", "reading", "accent", "meaning", "section", "lesson", "tags"):
            if field not in w:
                errors.append(f"{prefix}: missing field '{field}'")

        # ID format and uniqueness
        wid = w.get("id", "")
        if not re.match(rf"^l{lesson}-\d{{3}}$", wid):
            errors.append(f"{prefix}: bad id format '{wid}'")
        if wid in seen_ids:
            errors.append(f"{prefix}: duplicate id '{wid}'")
        seen_ids.add(wid)

        # Accent: array of ints in [0, 9] (may be empty for unmarked phrases)
        accent = w.get("accent")
        if not isinstance(accent, list) or not all(isinstance(a, int) and 0 <= a <= 9 for a in accent):
            errors.append(f"{prefix}: accent must be a list of ints 0-9, got: {accent!r}")

        # Lesson match
        if w.get("lesson") != lesson:
            errors.append(f"{prefix}: lesson mismatch: {w.get('lesson')}")

        # Word not empty
        if not w.get("word", "").strip():
            errors.append(f"{prefix}: empty word")

        # Word should not be noise characters
        word = w.get("word", "")
        if re.match(r"^[ㅡㄱ⓪①②③④⑤⑥⑦⑧⑨\s]+$", word):
            errors.append(f"{prefix}: word is noise: '{word}'")

        # Tags is a list
        if not isinstance(w.get("tags", None), list):
            errors.append(f"{prefix}: tags is not a list")

    return errors


# ── Known-answer tests (golden entries, keyed by word) ───────
# accent is a list; dual-accent and 7/8-pitch entries are locked here.

GOLDEN = {
    7: [
        {"word": "家族", "reading": "かぞく", "accent": [1], "meaning": "家人／家族"},
        {"word": "姉", "reading": "あね", "accent": [0], "meaning": "姐姐（謙稱自己的）"},
        {"word": "お父さん", "reading": "おとうさん", "accent": [2], "meaning": "父親（尊稱別人的）"},
        {"word": "嬉しい", "reading": "うれしい", "accent": [3], "meaning": "開心的"},
    ],
    8: [
        {"word": "奈良", "reading": "なら", "accent": [1]},
        {"word": "地震", "reading": "じしん", "accent": [0], "meaning": "地震"},
        {"word": "握手（します／する）", "reading": "あくしゅ", "accent": [1]},  # vision misread あ→お; locked
    ],
    9: [
        {"word": "座る", "reading": "すわる", "accent": [0], "meaning": "坐"},
        {"word": "すみません", "reading": "すみません", "accent": [4], "meaning": "對不起／抱歉"},
        {"word": "塩", "reading": "しお", "accent": [2], "meaning": "鹽"},
        {"word": "覚える", "reading": "おぼえる", "accent": [3], "meaning": "記下／記住"},
    ],
    11: [
        # 7/8-pitch accents (beyond the old 0-6 assumption)
        {"word": "おはようございます", "reading": "おはようございます", "accent": [8]},
        {"word": "ご馳走様でした", "reading": "ごちそうさまでした", "accent": [7]},
        {"word": "笑う", "reading": "わらう", "accent": [0]},  # source PDF typo あらう; corrected
    ],
    12: [
        # dual-accent entries
        {"word": "ズボン", "reading": "ズボン", "accent": [1, 2]},
        {"word": "靴下", "reading": "くつした", "accent": [4, 2]},
        {"word": "アクセサリー", "reading": "アクセサリー", "accent": [1, 3]},
        {"word": "フエ", "reading": "フエ", "meaning": "順化市"},  # vision misread フェ; corrected
    ],
}


def check_golden(words: list[dict], lesson: int) -> list[str]:
    """Verify known-correct entries haven't drifted."""
    errors = []
    lookup = {w["word"]: w for w in words}

    for expected in GOLDEN.get(lesson, []):
        word_key = expected["word"]
        actual = lookup.get(word_key)
        if not actual:
            errors.append(f"L{lesson} golden: missing entry '{word_key}'")
            continue
        for field, val in expected.items():
            if actual.get(field) != val:
                errors.append(
                    f"L{lesson} golden '{word_key}'.{field}: "
                    f"expected {val!r}, got {actual.get(field)!r}"
                )

    return errors


# ── Word count bounds ─────────────────────────────────────────

EXPECTED_COUNTS = {
    7: (92, 98),    # locked at 95
    8: (58, 62),    # locked at 60
    9: (55, 59),    # locked at 57
    10: (48, 52),   # locked at 50
    11: (72, 76),   # locked at 74
    12: (75, 79),   # locked at 77
}


def check_counts(words: list[dict], lesson: int) -> list[str]:
    errors = []
    lo, hi = EXPECTED_COUNTS.get(lesson, (0, 999))
    n = len(words)
    if n < lo or n > hi:
        errors.append(f"L{lesson}: word count {n} outside expected range [{lo}, {hi}]")
    return errors


# ── Section continuity ────────────────────────────────────────

def check_sections(words: list[dict], lesson: int) -> list[str]:
    """Warn if section assignment looks broken (all words in one section, etc.)."""
    errors = []
    sections = set(w["section"] for w in words)
    if len(sections) < 2:
        errors.append(f"L{lesson}: only {len(sections)} section(s) found: {sections}")
    empty_section = sum(1 for w in words if not w["section"])
    if empty_section > len(words) * 0.5:
        errors.append(f"L{lesson}: {empty_section}/{len(words)} words have empty section")
    return errors


# ── Meaning should not be a reading ──────────────────────────

HIRAGANA_RE = re.compile(r"^[぀-ゟ゠-ヿー]+$")
KATAKANA_RE = re.compile(r"^[゠-ヿー]+$")
HIRAGANA_ONLY_RE = re.compile(r"^[぀-ゟ]+$")


def check_meaning_not_reading(words: list[dict], lesson: int) -> list[str]:
    """Flag entries where meaning looks like it's actually a Japanese reading."""
    errors = []
    for w in words:
        meaning = w.get("meaning", "")
        if HIRAGANA_RE.match(meaning) and len(meaning) > 1:
            errors.append(
                f"L{lesson} {w['id']} ({w['word']}): "
                f"meaning looks like a reading: '{meaning}'"
            )
    return errors


# ── Pattern-based validation ─────────────────────────────────

def check_patterns(words: list[dict], lesson: int) -> list[str]:
    """Validate entries against the teacher's PDF formatting patterns."""
    warnings = []
    p = lambda w: f"L{lesson} {w['id']} ({w['word']})"

    for w in words:
        word = w["word"]
        reading = w["reading"]

        # Pattern 1: katakana word → reading should == word
        if KATAKANA_RE.match(word) and reading and reading != word:
            warnings.append(f"{p(w)}: katakana word but reading differs: '{reading}'")

        # Pattern 2: hiragana-only word → reading should == word
        if HIRAGANA_ONLY_RE.match(word) and reading and reading != word:
            warnings.append(f"{p(w)}: hiragana word but reading differs: '{reading}'")

        # Pattern 3: no reading → should look like a phrase/sentence
        if not reading and not re.search(r"[をはがにでもの].|です|ます|ません|ましょう|ください", word):
            if "（する）" not in word:
                warnings.append(f"{p(w)}: no reading but doesn't look like a phrase")

    return warnings


# ── Main ──────────────────────────────────────────────────────

def main():
    verbose = "--verbose" in sys.argv or "-v" in sys.argv
    all_errors = []
    all_warnings = []

    for lesson in LESSONS:
        path = DATA_DIR / f"vocab-lesson-{lesson}.json"
        if not path.exists():
            all_errors.append(f"L{lesson}: file not found: {path}")
            continue

        with open(path) as f:
            data = json.load(f)

        words = data.get("words", [])
        if verbose:
            print(f"L{lesson}: {len(words)} words, {len(set(w['section'] for w in words))} sections")

        all_errors.extend(check_schema(words, lesson))
        all_errors.extend(check_golden(words, lesson))
        all_errors.extend(check_counts(words, lesson))
        all_warnings.extend(check_sections(words, lesson))
        all_warnings.extend(check_meaning_not_reading(words, lesson))
        all_warnings.extend(check_patterns(words, lesson))

    # Report
    if all_warnings:
        print(f"\n⚠️  {len(all_warnings)} warning(s):")
        for w in all_warnings:
            print(f"  {w}")

    if all_errors:
        print(f"\n❌ {len(all_errors)} error(s):")
        for e in all_errors:
            print(f"  {e}")
        sys.exit(1)
    else:
        total = sum(
            len(json.load(open(DATA_DIR / f"vocab-lesson-{l}.json"))["words"])
            for l in LESSONS
        )
        print(f"\n✅ All checks passed — {total} words across {len(LESSONS)} lessons")
        sys.exit(0)


if __name__ == "__main__":
    main()
