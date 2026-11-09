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
