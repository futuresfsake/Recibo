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
| 11-16 – 11-30 | M1 Data + M2 Foundation (starts during interview prep, keep it small) |
| 12-08 – 12-31 | M3 Post Check, M4 Fit Check |
| Jan 2027 | M5 PWA, M6 evals, M7 improve |
| Feb 2027 | M8 deploy + pilot, M9 write-up, ready for applications |

## Milestones

### M0 — Guards (mostly done)
- [x] Hooks, audit log, trace script, CI, semgrep, gitleaks config
- [ ] `ggshield` login, add to pre-commit and CI
- [x] Semgrep run in CI (`semgrep` job, pinned image, local rules only, metrics off). Rules checked against planted violations and the repo with the same image; first run on GitHub passed 2026-11-12 on `dev`
- **Done when:** a fake key commit is blocked locally and in CI.

### M1 — Data
- [x] ~~Job-seeker and recruiter interviews~~ skipped by owner decision (DECISIONS #31); pain points rest on published sources in `docs/research/EVIDENCE.md`. The M8 pilot is the real-user validation
- [ ] 30+ hand-collected anonymized job posts: legit, borderline, scam-like (`evals/data/posts/`)
- [x] 5 synthetic resumes (IT, BPO, VA, nursing, data) in `evals/data/resumes/`
- [x] ~~PH taxonomy YAML~~ dropped by owner decision and recorded as a known gap (DECISIONS #32, Q-20)
- [x] Write the assumption into PRODUCT.md: pain points are based on published sources, not user interviews
- **Done when:** the assumption is written down and the job-post corpus and synthetic resumes exist.

### M2 — Foundation
- [x] Express skeleton, `/health` (FR-13), React shell, `@resibo/proof` types
- [x] `LLMClient` interface, Ollama client, OpenAI-compatible client (`apps/api/src/llm/`). Ollama checked live with a synthetic prompt; the hosted client is tested with a fake fetch only, no real provider yet (Q-07)
- [ ] LLM router: provider chain, timeout, circuit breaker, cache, schema validation, retry once, metadata-only call log (FR-14, FR-21, FR-22)
- [ ] Zod schemas for all LLM outputs
- **Done when:** a structured call succeeds locally and falls back to a second provider when the first is forced to fail (test).

### M3 — Slice A: Post Check
- [x] Rule engine with signals + exact quote spans (FR-17, FR-18): `packages/proof/src/post-check.ts`, 7 text rules (S01, S02, S03, S05, S06, S08, S09). S04, S07, S10 need employer data, not text rules (Q-22)
- [ ] Optional LLM plain-language explanation, constrained to rule-produced signals (FR-19)
- [x] `POST /post-check` (`apps/api/src/routes/post-check.ts`), works with DB and LLM down
- [ ] Eval on the post corpus: recall on scam-like posts, false-positive rate on legit posts (NFR-15). Blocked on the owner collecting posts by hand (Q-11 approved, DECISIONS #46)
- **Done when:** works with the LLM switched off, and eval numbers are recorded.

### M4 — Slice B: Fit Check
- [ ] Parse resume with the provisional Q-17 libraries (`unpdf`, `mammoth`, own matcher), then sections, sections, PH normalization (FR-01, FR-02, FR-04)
- [x] Synthetic regression fixtures in `packages/proof/tests/fixtures/` (regenerate with `npm run fixtures`): two-column (column by column), two-column (row-interleaved), table-heavy DOCX, image-only PDF. Known gap: row-interleaved columns split wrapped sentences; a full-bullet quote then scores about 84 and is rejected (fail-safe, lower recall)
- [ ] Real-resume check, local only: the owner's own resume or ones shared with explicit consent, kept in `local-data/` (gitignored; `npm run check:local-data`, the pre-commit hook and CI fail if it is tracked). Record aggregate results only
- [ ] Decide whether column-aware extraction is worth building for the row-interleaved case, using the real-resume results
- [ ] Image-only or unreadable PDF returns a clear "can't read this file" error (NFR-04), detected by empty extraction (fixture `image-only.pdf`)
- [ ] FR-07 number parser: in-house pure function, table-driven tests, no new dependency. Compare `{value, isPercent}` with exact equality. Digits with commas/decimals, `%` / `percent` / `per cent`, `k` / `M` / `thousand` / `million`, number words zero to ninety-nine plus `hundred` (hyphenated or not). A range is two numbers and both must match. A number it cannot read makes the claim unverified. Plus exact match for quotes under about 5 words
- [ ] Extract requirements (FR-03), in-memory retrieval (FR-05), batched judge (FR-06)
- [ ] Verify citations, downgrade, flag (FR-07, FR-08): strict RED→GREEN, gated review
- [ ] Score (FR-09), suggestions with verification, separate gap-actions list (FR-10)
- [ ] `POST /analyze` (FR-11); injection test cases (NFR-09)
- **Done when:** end-to-end analysis on 5 synthetic resumes, with `verify_citations` and `score` fully unit tested.

### M5 — PWA frontend
- [ ] React + Vite PWA (static build): Post Check page, Fit Check page, results with highlighted resibo and rejected-claim badge (FR-15). Post Check page done and wired to the API, quotes highlighted in the post (DECISIONS #47); Fit Check page, PWA manifest and offline not started
- [ ] Port `design/prototype/` to React using the same `styles.css` (DECISIONS #33); self-host the two fonts so the PWA works offline and makes no third-party request at runtime
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
