# Q-17 spike: TypeScript libraries for verification and parsing

Date: 2026-11-11. Throwaway scripts, not committed. Node 22, synthetic data only (NFR-11).

**Scope and limits (read first):** one synthetic single-column resume, generated as both PDF and DOCX; 10 quote cases for fuzzy matching, plus 3 extra cases for the final design. It does not cover multi-column layouts, scanned PDFs, tables, or non-English resumes. Treat the numbers as directional, not as an evaluation. The real test is the M6 eval set.

## Recommendation

| Need | Pick | Why |
|---|---|---|
| Quote verification | **Own small matcher in `packages/proof`**: normalize, best-window Levenshtein using `fastest-levenshtein`, plus a number guard and a minimum quote length | Only approach that passed every sensible case; the library "partial ratio" functions did not (below) |
| PDF text | **`unpdf`** | Worked first try, 87 ms, no dependencies, MIT, published 2026-10-30 |
| DOCX text | **`mammoth`** | Worked first try, 21 ms, BSD-2, published 2026-09-26 |
| Retrieval (BM25) | **Not tested.** `minisearch` is the candidate (MIT, 0 deps) | Decide in M4 with real chunks (Q-02) |

**Status: PROVISIONAL.** Accepted by the owner on 2026-11-11 (DECISIONS #25) as good enough to start M4, not as final. Follow-ups before it is final: (1) a two-column resume; (2) a scanned PDF, which must return a clear "can't read this file" error with no OCR (DECISIONS #26); (3) 2-3 anonymized real resumes, kept local and gitignored, never committed, with only aggregate results recorded here.

## Parsing results

| Library | Result |
|---|---|
| `unpdf` 2.1.0 | 495 chars extracted, sentence intact after whitespace normalization. Soft line wraps come back as `\n` mid-sentence, so verification must normalize whitespace |
| `mammoth` 1.13.0 | 507 chars, sentence intact |
| `pdf-parse` 2.4.5 | **Failed** when installed next to `unpdf`: `The API version "5.4.296" does not match the Worker version "6.4.299"` (two `pdfjs-dist` versions). Also 20 MB unpacked. Not recommended |

An empty extraction (0 chars) is how a scanned PDF will show up; that feeds the Q-09 decision. Not tested with a real scan.

## Fuzzy verification results

Score 0–100. "Want" is the correct decision for the guardrail.

| Case | Want | fuzzball partial | fuzzball token_set | fuse.js | custom window |
|---|---|---|---|---|---|
| exact | accept | 100 | 100 | 55 | 100 |
| whitespace / line wrap | accept | **38** | 100 | 55 | 100 |
| case change | accept | **38** | 100 | 55 | 100 |
| one-word typo | accept | 99 | 95 | 40 | 98 |
| paraphrase | reject | 45 | 56 | 7 | 33 |
| fabricated | reject | 43 | 22 | 6 | 28 |
| Java vs JavaScript | reject | 40 | 38 | 5 | 40 |
| wrong number (90 vs 40 percent) | reject | **99** | **98** | 40 | **99** |
| tiny quote "React" | accept | **20** | 100 | 55 | 100 |
| tiny quote "Python" (absent) | reject | 17 | 3 | 8 | **50** |
| **Correct at T=90** | | 6/10 | 9/10 | 5/10 | 9/10 |

Findings:

1. **`fuzzball.partial_ratio` is unreliable on resume-length text.** `react` scores 100 in a 150-character string and 20–40 once the text reaches resume length. It is a difflib-style heuristic, not an exhaustive best-window search. Do not use it for the guardrail.
2. **`fuzzball.token_set_ratio` is a bag-of-words match.** A scrambled quote ("Node.js React built and dashboard inventory using the that") and a quote stitched from different bullets both scored **100**. That lets a fabricated quote built from real resume words pass. Do not use it.
3. **`fuse.js` scores are not on a usable scale for this** (exact match scored 55 with `ignoreLocation`), and it is built for search, not verification.
4. **No fuzzy score catches a changed number.** "90 percent" vs "40 percent" scored 98–99 in every method. Verification needs a separate rule: every number in a quote must appear in the resume.
5. **Very short quotes break similarity scoring.** Absent "Python" scored 50 in the custom matcher; "React" is trivially a substring. Use a minimum quote length for fuzzy matching, and verify short skill names by exact whole-word match instead.

## Design that passed (custom matcher, 8 extra cases)

1. Normalize both sides: NFKC, lowercase, collapse whitespace.
2. Quotes under about 5 words skip fuzzy matching and must match exactly after normalization (owner rule, FR-07). The spike used a character cutoff (8) as a stand-in; the real rule counts words.
3. Best-window Levenshtein similarity over windows of ±10% of the quote length; score = 1 − distance / length.
4. Reject if the score is below `CITATION_MATCH_THRESHOLD` (Q-04).
5. Reject if any number in the quote is absent from the resume (owner rule, FR-07). The spike compared digit strings only. Normalizing `40%`, `40 percent` and `forty percent` to one number is required by FR-07 but **not yet built or tested**.

| Case | token_set | Custom design |
|---|---|---|
| scrambled words | 100 | reject (41) |
| words from different bullets | 100 | reject (64) |
| wrong number | 98 | reject (number guard) |
| exact | 100 | accept (100) |
| line wrap + caps | 100 | accept (100) |
| typo | 90 | accept (96) |
| tiny "React" | 100 | reject (too short; exact-word path would accept) |
| Java vs JavaScript | 23 | reject (31) |

Cost: about 49 ms per quote on a 6,000-character resume with a naive sliding window, fine for a handful of quotes per analysis; can be optimized later if evals show a need.

## What this changes

- Q-17: accepted as provisional (DECISIONS #25). Q-09 closed: scanned PDFs get an error (DECISIONS #26).
- Q-04: threshold 90 held up on these cases; still needs the M6 eval set to tune.
- Both rules are now part of FR-07 (owner decision, DECISIONS #24).
