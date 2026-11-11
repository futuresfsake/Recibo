# Decisions Log

| # | Decision | Why |
|---|---|---|
| 1 | Everything free (Ollama, Docker Postgres, free-tier deploy) | No credit card, reproducible for reviewers |
| 2 | No LangChain; call Ollama directly | Logic stays visible and explainable in interviews |
| 3 | Quote verification with rapidfuzz in code, not by the LLM | Deterministic guardrail, measurable |
| 4 | Fit score computed in Python | LLM scores are inconsistent; testable and bias-checkable |
| 5 | `LLMClient` interface with `ollama` and `openai_compat` | Ollama cannot run on free hosting; swap for deploy |
| 6 | pgvector in Postgres | One DB for history and vectors |
| 7 | Frontend only talks to FastAPI | Single boundary, simpler security |
| 8 | Remote repo is named `Recibo`; the project is "Resibo" | Spelling mismatch in GitHub URL; rename repo later if desired |
| 9 | v2 restructure: three tools (Post Check, Fit Check, Next Steps) | Scam posts are a likely top pain and need no LLM; to be re-ranked after discovery (M1) |
| 10 | Deterministic first, LLM last | Testable, cheaper, works when free LLM quota is gone |
| 11 | Stateless backend, history in the browser | Privacy (Data Privacy Act), ₱0 hosting. Retires FR-12 and FR-16 |
| 12 | No pgvector in the production path; in-memory retrieval | Resume has tens of chunks. pgvector stays as an optional dev/eval spike for learning |
| 13 | One batched judge call, max 3 LLM calls per analysis | Fit inside free quotas; evals must confirm accuracy vs. per-requirement calls |
| 14 | Post Check outputs signals with quotes, never a scam verdict | Avoid falsely accusing legitimate employers; keep the resibo principle |
| 15 | Eval-first: golden cases grow with each slice | Evals are the portfolio differentiator |
| 16 | Remove hard-coded DB password; URL built from env parts; history rewritten and force-pushed once on 2026-11-09 | Secret scanner flagged a generic password |
| 17 | **Stack change (2026-11-11): Node.js + Express 5 + TypeScript API and a React + Vite PWA frontend, replacing FastAPI/Pydantic and the planned Next.js app.** Still no LangChain (#2) | Owner chose the Node/Express/React stack: one language end to end, shared types, familiar tooling. Skeleton and `/health` ported with tests |
| 18 | Monorepo with npm workspaces: `apps/api`, `apps/web`, `packages/proof` | Deterministic core (verifier, scorer, rules) isolated from Express and React; testable alone; shared by evals |
| 19 | The evidence contract is a branded TypeScript type (`VerifiedQuote`); only the verifier mints it | Turns AGENTS.md rule #1 from a convention into a compile-time guarantee. Refines #3: still verified in code, now also enforced by types |
| 20 | Zod replaces Pydantic; Vitest + Supertest replace pytest; ESLint + `tsc` replace ruff + mypy; `scripts/trace.mjs` replaces `trace.py` | Native to the new stack. Library choices for fuzzy matching and PDF/DOCX parsing deferred to Q-17 (supersedes rapidfuzz, pdfplumber, python-docx) |
| 21 | Postgres counts as "not configured" (healthy) when no password is set; compose file moved to `infra/` | DB is dev/eval only (#12), so its absence must not mark the API degraded |
| 22 | Edited `AGENTS.md`, `docs/AGENTIC_WORKFLOW.md`, `docs/EVALS.md`, and the test-naming header of `docs/REQUIREMENTS.md` to match the new stack. No requirement row was changed | Requirement rows are stack-neutral; only tooling language changed. Owner-requested |
