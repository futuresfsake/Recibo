"""Requirement traceability check.

Reads docs/REQUIREMENTS.md (source of truth) and scans test files for requirement
IDs written in test names, e.g. test_FR07_exact_quote_verified -> FR-07.

Reports covered / uncovered / orphaned. Exit code 1 if there are orphans
(a test referencing an ID that does not exist). With --strict, uncovered IDs
also fail.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REQ_FILE = ROOT / "docs" / "REQUIREMENTS.md"
TEST_DIRS = [ROOT / "backend" / "tests", ROOT / "evals"]

REQ_ROW = re.compile(r"^\|\s*(N?FR)-(\d{2})\s*\|")
TEST_ID = re.compile(r"def (test\w*?(N?FR)[-_]?(\d{2})\w*)\s*\(")


def load_requirements() -> set[str]:
    ids: set[str] = set()
    for line in REQ_FILE.read_text(encoding="utf-8").splitlines():
        m = REQ_ROW.match(line)
        if m:
            ids.add(f"{m.group(1)}-{m.group(2)}")
    return ids


def load_test_ids() -> dict[str, list[str]]:
    found: dict[str, list[str]] = {}
    for d in TEST_DIRS:
        if not d.exists():
            continue
        for path in d.rglob("*.py"):
            text = path.read_text(encoding="utf-8")
            for m in TEST_ID.finditer(text):
                rid = f"{m.group(2)}-{m.group(3)}"
                found.setdefault(rid, []).append(m.group(1))
    return found


def main(argv: list[str]) -> int:
    strict = "--strict" in argv
    reqs = load_requirements()
    tests = load_test_ids()

    covered = sorted(r for r in reqs if r in tests)
    uncovered = sorted(r for r in reqs if r not in tests)
    orphaned = sorted(r for r in tests if r not in reqs)

    print(f"Requirements: {len(reqs)} | covered: {len(covered)} | "
          f"uncovered: {len(uncovered)} | orphaned: {len(orphaned)}")
    if uncovered:
        print("Uncovered:", ", ".join(uncovered))
    if orphaned:
        print("ORPHANED test IDs (no matching requirement):", ", ".join(orphaned))

    if orphaned or (strict and uncovered):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
