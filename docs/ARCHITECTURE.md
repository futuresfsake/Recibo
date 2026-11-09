# Architecture

```
Next.js (frontend) ──HTTP──▶ FastAPI (backend) ──▶ Ollama (LLM + embeddings)
                                   │
                                   └──▶ Postgres 16 + pgvector (Docker)
```

The frontend never talks to Ollama or the DB directly.

## Pipeline

1. **parse_resume** — PDF/DOCX to clean text and sections.
2. **extract_requirements** — LLM returns `[{id, text, category, importance}]`.
3. **match** — embed requirement and resume chunks, retrieve top-k from pgvector, LLM rates `strong|partial|gap` with exact quotes.
4. **verify_citations** — rapidfuzz `partial_ratio` of each quote against the resume. Below threshold: drop the quote. No verified quotes left: rating becomes `gap`, `hallucination_caught=true`.
5. **score** — weighted 0–100 in Python (required > preferred). The LLM never scores.
6. **suggestions** — tips that only reframe verified experience.

## Key design rules

- Structured output (`format=` JSON schema), validated by Pydantic, one retry.
- `temperature=0` for extraction and matching.
- Prompts live in `backend/app/prompts/`.
- Every LLM call logged: prompt name, model, latency, success.
- `LLMClient` interface so `ollama` and `openai_compat` are swappable (needed for free hosted deploy).
- No LangChain; direct Ollama calls.

## API

| Endpoint | Purpose |
|---|---|
| `GET /health` | DB + Ollama reachable |
| `POST /analyze` | multipart `resume_file` + `job_text` |
| `GET /history` | past analyses (no auth) |
| `GET /history/{id}` | one analysis |

Full response shape: see `docs/PROJECT_CONTEXT.md` section 8.

## Config (`backend/.env.example`)

`DATABASE_URL`, `LLM_PROVIDER`, `OLLAMA_BASE_URL`, `LLM_MODEL`, `EMBED_MODEL`, `OPENAI_COMPAT_BASE_URL`, `OPENAI_COMPAT_API_KEY`, `CITATION_MATCH_THRESHOLD`.

## Error handling to cover

Ollama not running, model not pulled, unreadable PDF, empty job post.
