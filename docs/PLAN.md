# Resibo — Plan (v2)

**Goal:** a free tool that addresses real Filipino job-search pain points (see [PRODUCT.md](PRODUCT.md)), and a portfolio project for 2027 AI engineering internship applications. Evaluation results matter as much as the app.
**Constraints:** ₱0, no card ([COST_FREE_STACK.md](COST_FREE_STACK.md)); privacy-first and stateless ([ARCHITECTURE.md](ARCHITECTURE.md)).
**Working agreement:** [AGENTIC_WORKFLOW.md](AGENTIC_WORKFLOW.md) — DoR → tests first (IDs from [REQUIREMENTS.md](REQUIREMENTS.md)) → DoD with fresh-context review → one-file commits → audit log. Gaps go to [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md), never guessed.

## What changed from v1

| v1 | v2 | Why |
|---|---|---|
| Resume–job matcher only | Three tools: Post Check, Fit Check, Next Steps | Scam posts (P1) are likely a bigger, more urgent pain than fit scoring, and Post Check works with no LLM |
| Build, then evaluate | Eval-first: golden cases written with each slice | Evals are the differentiator; late evals get skipped |
| Postgres + pgvector in prod | Stateless; in-memory retrieval; DB for dev/eval only | Privacy, ₱0 hosting, less to run |
| Per-requirement LLM calls | One batched judge call; ≤ 3 LLM calls per analysis | Free quotas |
| Build first, ask users later | Validate pain points before building past the skeleton | Avoid building what nobody needs |
| Server-side history | Browser-side history | Privacy |

## What changed in v2.1 (2026-11-11)

| v2 | v2.1 | Why |
|---|---|---|
| FastAPI + Pydantic backend | Node.js + Express 5 + TypeScript, Zod | Owner's stack choice; one language end to end |
| Next.js PWA | React + Vite PWA (static build) | The app is fully static; no server rendering needed |
| `backend/` + `frontend/` | npm workspaces: `apps/api`, `apps/web`, `packages/proof` | Deterministic core isolated and shared; testable without HTTP |
| "Never show unverified claims" as a rule | Enforced by a branded `VerifiedQuote` type | Compiler-level guarantee for the project's core promise |

## Status

| Item | State |
|---|---|
| Docs, rules, requirements, workflow | done |
| Hooks (secrets, audit log, tests, trace), CI file, semgrep config | done (ggshield pending login) |
| Stack moved to Node.js + Express + React monorepo (DECISIONS #17–#22) | done |
| Express skeleton + `/health` + tests (ported from FastAPI), React shell, `@resibo/proof` evidence types | done |
| Everything below | not started |

## Timeline (proposed, confirm)

The Queueless MVP is due 2026-11-14 with interviews 2026-12-01 to 12-07, so Resibo gets light time until then.

| Window | Work |
|---|---|
| now – 11-14 | Docs only; no feature work |
| 11-16 – 11-30 | M1 Discovery + M2 Foundation (starts during interview prep, keep it small) |
| 12-08 – 12-31 | M3 Post Check, M4 Fit Check |
| Jan 2027 | M5 PWA, M6 evals, M7 improve |
| Feb 2027 | M8 deploy + pilot, M9 write-up, ready for applications |

## Milestones

### M0 — Guards (mostly done)
- [x] Hooks, audit log, trace script, CI, semgrep, gitleaks config
- [ ] `ggshield` login, add to pre-commit and CI
- [ ] Semgrep run in CI
- **Done when:** a fake key commit is blocked locally and in CI.

### M1 — Discovery and data
- [ ] 8–10 job-seeker interviews + 2–3 recruiter/HR conversations; notes in `docs/research/` (anonymized)
- [ ] 30+ hand-collected anonymized job posts: legit, borderline, scam-like (`evals/data/posts/`)
- [ ] 5 synthetic resumes (IT, BPO, VA, nursing, data)
- [ ] PH taxonomy YAML: TESDA NC levels, CSC eligibility, PRC licenses, honors, OJT, role synonyms, Taglish phrases
- [ ] Re-rank pain points; update PRODUCT.md and, if needed, this plan
- **Done when:** pain-point ranking written and the corpus exists.

### M2 — Foundation
- [x] Express skeleton, `/health` (FR-13), React shell, `@resibo/proof` types
- [ ] `LLMClient` interface, Ollama client, OpenAI-compatible client
- [ ] LLM router: provider chain, timeout, circuit breaker, cache, schema validation, retry once, metadata-only call log (FR-14, FR-21, FR-22)
- [ ] Zod schemas for all LLM outputs
- **Done when:** a structured call succeeds locally and falls back to a second provider when the first is forced to fail (test).

### M3 — Slice A: Post Check
- [ ] Rule engine with signals + exact quote spans (FR-17, FR-18)
- [ ] Optional LLM plain-language explanation, constrained to rule-produced signals (FR-19)
- [ ] `POST /post-check`; eval on the post corpus: recall on scam-like posts, false-positive rate on legit posts (NFR-15)
- **Done when:** works with the LLM switched off, and eval numbers are recorded.

### M4 — Slice B: Fit Check
- [ ] Parse resume with the provisional Q-17 libraries (`unpdf`, `mammoth`, own matcher), then sections, sections, PH normalization (FR-01, FR-02, FR-04)
- [ ] Q-17 follow-ups before the libraries are final: two-column resume, scanned PDF (must return the "can't read this file" error, no OCR), 2-3 anonymized real resumes kept local and gitignored (never committed; record aggregate results only)
- [ ] FR-07 rules built and tested: number guard (`40%` = `40 percent` = `forty percent`) and exact match for quotes under about 5 words
- [ ] Extract requirements (FR-03), in-memory retrieval (FR-05), batched judge (FR-06)
- [ ] Verify citations, downgrade, flag (FR-07, FR-08): strict RED→GREEN, gated review
- [ ] Score (FR-09), suggestions with verification, separate gap-actions list (FR-10)
- [ ] `POST /analyze` (FR-11); injection test cases (NFR-09)
- **Done when:** end-to-end analysis on 5 synthetic resumes, with `verify_citations` and `score` fully unit tested.

### M5 — PWA frontend
- [ ] React + Vite PWA (static build): Post Check page, Fit Check page, results with highlighted resibo and rejected-claim badge (FR-15)
- [ ] Browser-side history (FR-23), mobile-first at 360 px (NFR-13)
- **Done when:** both tools usable on a phone-width viewport against the local API.

### M6 — Eval suite (grows from M3 onward)
- [ ] 30–50 labeled resume/post pairs (strong, weak, tricky; PH roles; Taglish)
- [ ] `evals/metrics.ts`, `evals/run-evals.ts --model`, two-model comparison
- [ ] Hallucination (raw/final), rating accuracy, bias swaps, consistency, latency, injection, Post Check precision/recall
- **Done when:** one command prints the full table and writes a timestamped result file.

### M7 — Improve
- [ ] Tune prompts, threshold, chunking, batched vs. per-requirement judging; record before/after
- [ ] Draft the "What didn't work" section
- **Done when:** at least one measured improvement per weak metric.

### M8 — Free deploy and pilot
- [ ] Verify current free limits, record date in COST_FREE_STACK.md
- [ ] Deploy frontend + backend; provider chain; Turnstile; rate limits; kill switch
- [ ] Pilot with 5–10 real users; short survey; fix top issues
- **Done when:** public URL works on a phone with no card on file anywhere.

### M9 — Write-up
- [ ] README results table + "What didn't work", architecture diagram, demo video, short case study

## Risks

| Risk | Mitigation |
|---|---|
| Interviews show scams matter less than fit | Re-rank at M1; both slices exist, only order changes |
| Free LLM tiers change or vanish | Provider chain, deterministic-only mode, demo video fallback |
| Laptop too slow for 7B | `llama3.2:3b`; compare in evals |
| Scam rules produce false positives | Signals not verdicts, quotes shown, FP rate reported |
| Time collision with Queueless and interviews | Timeline above; docs-only until Nov 14 |
| Eval labeling takes long | Grow the set with each slice instead of all at once |

## Out of scope (v1)

Accounts, auto-apply, scraping, resume auto-writing, salary data, fine-tuning, languages beyond English/Taglish, OCR for scanned PDFs (they get a clear error instead).
