# Resibo — Plan

**Goal:** a portfolio project for 2027 AI engineering internship applications. Evaluation results matter as much as the app.
**Constraint:** everything free, no paid keys.
**Rule:** build milestones in order; at the end of each, run tests, summarize, list what's next.

## Working agreement

Work follows [AGENTIC_WORKFLOW.md](AGENTIC_WORKFLOW.md): DoR → tests first (titles carry FR/NFR IDs from [REQUIREMENTS.md](REQUIREMENTS.md)) → DoD with fresh-context review → small commit → audit log entry. Gaps go to [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md), never guessed. Target maturity: Level 3.

## Milestones

### M0 — Agentic scaffolding (before M1)
- [ ] `AGENTS.md`, `REQUIREMENTS.md`, workflow and register docs (done in this commit batch)
- [ ] `.githooks/` pre-commit (secrets scan, lint) and pre-push (tests, trace); `git config core.hooksPath .githooks`
- [ ] gitleaks + semgrep config (free, local)
- [ ] `scripts/trace.py`: requirement coverage from JUnit XML (covered / uncovered / orphaned)
- [ ] `docs/audit/log.jsonl` append-only (`.gitattributes` `merge=union`, hook blocks edits)
- [ ] CI (GitHub Actions free tier): tests, trace, lint
- **Done when:** a commit containing a fake key is blocked, and `trace.py` flags an uncovered FR.

### M1 — Setup
- [ ] Repo structure, `.gitignore`, `.env.example`
- [ ] `docker-compose.yml` (`pgvector/pgvector:pg16`)
- [ ] FastAPI skeleton + `config.py` (pydantic-settings)
- [ ] `GET /health` checks DB + Ollama
- [ ] Ollama connection test (pull `qwen2.5:7b` or `llama3.2:3b`, `nomic-embed-text`)
- **Done when:** `/health` returns OK for DB and Ollama on Windows.

### M2 — Parsing + requirement extraction
- [ ] `parse_resume` (pdfplumber, python-docx) with sections
- [ ] `LLMClient` interface + `ollama_client` with structured output, retry once, call logging
- [ ] `extract_requirements` prompt (PH + Taglish examples)
- [ ] Tests on 3 sample resumes / job posts
- **Done when:** a job post becomes valid requirement JSON; bad PDF and empty job text give clear errors.

### M3 — Matching + embeddings
- [ ] Resume chunking, embeddings stored in pgvector
- [ ] Top-k retrieval per requirement
- [ ] LLM judgment: rating, explanation, exact evidence quotes
- **Done when:** each requirement has a rating and candidate quotes.

### M4 — Citation verification + scoring
- [ ] `verify_citations` with rapidfuzz `partial_ratio`, threshold from env
- [ ] Downgrade to gap + `hallucination_caught` when no verified quote
- [ ] `score` weighted in Python (required > preferred)
- [ ] Unit tests: exact, near-match, fabricated quotes; score edge cases
- **Done when:** the guardrail and scoring are fully tested.

### M5 — Frontend MVP
- [ ] Upload + paste + Analyze + loading state
- [ ] Score, grouped requirements, highlighted resibo, verified / rejected badges
- [ ] History page, mobile-friendly
- **Done when:** end-to-end flow works against the API.

### M6 — Eval dataset + runner
- [ ] 30–50 labeled pairs (IT, BPO, VA, nursing, data; strong / weak / tricky)
- [ ] `metrics.py`, `run_evals.py --model ...`, two-model comparison
- [ ] First results recorded in `evals/results/`
- **Done when:** one command prints the full metrics table.

### M7 — Improve
- [ ] Tune prompts, threshold, chunking from eval findings
- [ ] Re-run, record before/after
- [ ] Write the "What didn't work" section

### M8 — Deploy (free) + README + demo video
- [ ] Vercel + Render + Neon/Supabase + free OpenAI-compatible LLM (verify limits)
- [ ] Fallback: demo video + local setup instructions
- [ ] README results table

## Risks

| Risk | Mitigation |
|---|---|
| Laptop too slow for 7B model | Use `llama3.2:3b`; compare both in evals |
| Small models emit invalid JSON | Structured output + Pydantic validation + one retry |
| Free hosted LLM limits change | Verify before M8; keep video fallback |
| Eval labeling takes long | Start with 10 cases at M4, grow to 30–50 by M6 |

## Timeline

Internship applications open in 2027. Target: M1–M5 working MVP first, then evals (M6–M7), deploy last. Set dates once M1 is done and pace is known.

## Out of scope (MVP)

Auth, fine-tuning, scraping job sites, auto-writing resumes, auto-applying, non-English/Taglish posts.
