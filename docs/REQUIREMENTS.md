# Requirements

Stable IDs. Every test title must contain the ID it proves (e.g. `test_FR-07_exact_quote_verified`). `scripts/trace.py` (M0) reports covered / uncovered / orphaned.

Changing this file is a controlled action: only the owner, with the change logged in `docs/DECISIONS.md`.

## Functional

| ID | Requirement | Milestone |
|---|---|---|
| FR-01 | Accept resume as PDF or DOCX and return clean text | M2 |
| FR-02 | Split resume into sections (education, experience, projects, skills, certifications) | M2 |
| FR-03 | Extract requirements from job text as `{id, text, category, importance}` | M2 |
| FR-04 | Recognize PH credentials and formats (TESDA NC, Civil Service, PRC, Latin honors, OJT, Taglish) | M2 |
| FR-05 | Retrieve top-k resume chunks per requirement via embeddings (pgvector) | M3 |
| FR-06 | Rate each requirement `strong / partial / gap` with explanation and exact evidence quotes | M3 |
| FR-07 | Verify each quote against the resume with fuzzy match and threshold; record `verified` and `score` | M4 |
| FR-08 | If no verified quote remains, downgrade to `gap` and set `hallucination_caught=true` | M4 |
| FR-09 | Compute weighted fit score 0–100 in Python (required > preferred) | M4 |
| FR-10 | Generate suggestions that only reframe verified experience | M4 |
| FR-11 | `POST /analyze` returns the documented response shape | M4 |
| FR-12 | `GET /history` and `GET /history/{id}` | M4 |
| FR-13 | `GET /health` reports DB and Ollama status | M1 |
| FR-14 | Log every LLM call: prompt name, model, latency ms, success/fail | M2 |
| FR-15 | UI: upload, paste, analyze, score, grouped results, highlighted resibo, rejected-claim badge | M5 |
| FR-16 | UI: history page, mobile-friendly | M5 |

## Non-functional

| ID | Requirement | Target | Milestone |
|---|---|---|---|
| NFR-01 | Everything free: no paid API, no card | 0 paid deps | all |
| NFR-02 | `temperature=0` for extraction and matching | enforced in code | M2 |
| NFR-03 | No secrets in repo; `.env` ignored from first commit | 0 findings in scan | M0 |
| NFR-04 | Clear errors: Ollama down, model missing, bad PDF, empty job post | each tested | M2 |
| NFR-05 | Final hallucination rate (claims shown without valid evidence) | 0% | M6 |
| NFR-06 | Bias: score difference after swapping name / gender / school | ≤ 3 points | M6 |
| NFR-07 | Consistency: std dev of fit_score over 5 runs | reported | M6 |
| NFR-08 | Latency median and p95 | reported | M6 |
| NFR-09 | Prompt-injection text in resume/job is treated as data | eval cases pass | M6 |
| NFR-10 | Resume data handling per decision Q-03 | decided before M3 | M3 |
