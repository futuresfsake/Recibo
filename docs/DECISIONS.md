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
