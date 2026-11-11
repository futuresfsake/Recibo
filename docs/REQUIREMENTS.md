# Requirements (v2)

Stable IDs. Every test title contains the ID it proves (e.g. `it("FR-07 exact quote is verified", …)`). `npm run trace` (`scripts/trace.mjs`) reports covered / uncovered / orphaned.

Changing this file is a controlled action: only the owner, with the change logged in `docs/DECISIONS.md`.

## Functional

| ID | Requirement | Milestone |
|---|---|---|
| FR-01 | Accept resume as PDF or DOCX and return clean text | M4 |
| FR-02 | Split resume into sections (education, experience, projects, skills, certifications) | M4 |
| FR-03 | Extract requirements from job text as `{id, text, category, importance}` | M4 |
| FR-04 | Recognize PH credentials and formats (TESDA NC, Civil Service, PRC, Latin honors, OJT, Taglish) via a YAML taxonomy | M4 |
| FR-05 | Retrieve top-k resume chunks per requirement in memory (no database) | M4 |
| FR-06 | Rate each requirement `strong / partial / gap` with explanation and exact quotes, in one batched LLM call | M4 |
| FR-07 | Verify each quote against the resume with fuzzy match and threshold; record `verified` and `score`. Two rules: (a) every number in a quote must appear in the resume, and `40%`, `40 percent` and `forty percent` count as the same number; (b) quotes under about 5 words skip fuzzy matching and must match exactly after whitespace and case normalization | M4 |
| FR-08 | If no verified quote remains, downgrade to `gap` and set `hallucination_caught=true` | M4 |
| FR-09 | Compute weighted fit score 0–100 in Python (required > preferred) | M4 |
| FR-10 | Suggestions reframe only verified experience; gap-actions list is separate and labeled "not on your resume" | M4 |
| FR-11 | `POST /analyze` returns the documented response shape | M4 |
| FR-13 | `GET /health` reports DB (if configured) and LLM provider status | M2 |
| FR-14 | Log every LLM call as metadata only: prompt name/version, model, latency ms, success/fail, token counts | M2 |
| FR-15 | UI: upload, paste, analyze, score, grouped results, highlighted resibo, rejected-claim badge | M5 |
| FR-17 | Post Check returns red-flag signals, each with an exact quote from the post | M3 |
| FR-18 | Post Check rules work with the LLM disabled | M3 |
| FR-19 | Optional plain-language explanation (English or Taglish) constrained to rule-produced signals | M3 |
| FR-20 | Resume hygiene notes (e.g. personal details that may not be needed), shown as advice, not rules | M4 |
| FR-21 | LLM router tries an ordered provider list and falls back on timeout/quota/error; deterministic-only mode if all fail | M2 |
| FR-22 | Identical inputs hit an in-memory cache and make zero LLM calls | M2 |
| FR-23 | Analysis history is stored in the browser only | M5 |

(FR-12 and FR-16 from v1 are retired: server-side history is out of scope; see DECISIONS.)

## Non-functional

| ID | Requirement | Target | Milestone |
|---|---|---|---|
| NFR-01 | Everything free: no paid API, no card | 0 paid deps | all |
| NFR-02 | `temperature=0` for extraction, matching, explanation | enforced in code | M2 |
| NFR-03 | No secrets in repo; env files ignored | 0 findings in scans | M0 |
| NFR-04 | Clear errors: LLM down, model missing, bad PDF, empty or oversized input | each tested | M2–M4 |
| NFR-05 | Final hallucination rate (claims shown without valid evidence) | 0% | M6 |
| NFR-06 | Bias: score difference after swapping name / gender / school | ≤ 3 points | M6 |
| NFR-07 | Consistency: std dev of fit_score over 5 runs | reported | M6 |
| NFR-08 | Latency median and p95 | reported | M6 |
| NFR-09 | Prompt-injection text in resume or post is treated as data | eval cases pass | M4/M6 |
| NFR-10 | No resume or post text persisted or logged server-side | verified by test and log review | M2 |
| NFR-11 | Synthetic data only in tests, evals, docs | 0 real personal data | all |
| NFR-12 | At most 3 LLM calls per Fit Check, at most 1 per Post Check | enforced and tested | M4 |
| NFR-13 | Usable at 360 px width; small payloads | manual check + size budget | M5 |
| NFR-14 | Abuse controls: payload caps, per-IP rate limit, bot check on demo, kill switch | each tested | M8 |
| NFR-15 | Post Check: recall on scam-like posts and false-positive rate on legit posts | reported honestly | M3 |
