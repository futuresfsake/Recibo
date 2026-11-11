# Architecture (v2.1: Node.js + Express + React, cost-free, privacy-first)

## Workspace layout

npm workspaces monorepo. Dependencies point one way: `apps/*` → `packages/proof`.

| Workspace | Role |
|---|---|
| `packages/proof` | Framework-free core: the evidence contract (types), Post Check rules, quote verifier, scorer. No Express, no React, no network. Everything here is unit-testable in isolation. |
| `apps/api` | Express 5 + TypeScript. Config (Zod), routes, dependency probes, LLM router, prompts (`src/prompts/`). Orchestrates; contains no scoring or verification logic. |
| `apps/web` | React + Vite PWA. Talks only to the API. Imports types from `@resibo/proof`, never its logic. |

## Principle 0: the proof is a type

`VerifiedQuote` is a branded type. Only the verifier in `packages/proof` can produce one, and `Finding.evidence` accepts only `VerifiedQuote[]`. A raw LLM quote cannot reach the API response or the UI without failing to compile. This turns AGENTS.md rule #1 into a compiler guarantee; tests then cover the verifier's behavior (FR-07, FR-08).

## Principles

1. **Deterministic first, LLM last.** Code does everything it can (parsing, red-flag rules, quote verification, scoring). The LLM is used only where language understanding is needed.
2. **Stateless and private by default.** No resume or job text stored or logged server-side. History lives in the user's browser.
3. **Every external dependency is swappable** behind an interface (LLM, embeddings).
4. **Degrade, don't fail.** If the LLM is down or out of quota, the deterministic tools still work.
5. **₱0 to run, no credit card anywhere.**

## System

```
 Phone / browser (React + Vite PWA, static build)
   │  history in IndexedDB (browser only)
   ▼
 Express API (Node.js, stateless)
   ├─ Rule engine ........ Post Check red-flag rules                        [no LLM]
   ├─ Parser ............. PDF/DOCX → text + sections (library: Q-17)      [no LLM]
   ├─ Retriever .......... in-memory: BM25 + small embeddings per request  [no DB]
   ├─ Verifier ........... fuzzy quote check, downgrade, flag (Q-17)        [no LLM]
   ├─ Scorer ............. weighted 0–100, in TypeScript                   [no LLM]
   └─ LLM router ......... provider chain, cache, schema validation, retry
         ├─ Ollama (local dev)
         └─ free hosted OpenAI-compatible providers (ordered, with fallback)
 Optional Postgres + pgvector: dev/eval only, not on the production path.
```

## Pipelines

**Post Check** (`POST /post-check`)
1. `rules` (D): regex/keyword/structure checks over the post → signals with exact quote spans (fee requests, "hired agad", personal chat-only contact, missing employer identity, unrealistic pay/no-interview patterns, etc.).
2. `explain` (L, optional): plain-language explanation in English or Taglish. Output is validated; each explained signal must reference a rule-produced signal and a verified quote. The LLM cannot add new signals.

**Fit Check** (`POST /analyze`)
1. `parse_resume` (D)
2. `normalize` (D): whitespace and case only. There is no curated PH lookup list (known gap, DECISIONS #32); TESDA NC, Civil Service, PRC and Taglish terms are handled by the LLM prompts and checked by the eval cases.
3. `extract_requirements` (L): job text → requirements JSON.
4. `retrieve` (D): per requirement, top-k resume chunks (BM25 + in-memory embeddings).
5. `judge` (L): **one batched call** for all requirements → rating, explanation, exact quotes.
6. `verify_citations` (D): fuzzy-match each quote; below threshold, drop it; none left → `gap` + `hallucination_caught`.
7. `score` (D): TypeScript, required > preferred.
8. `suggest` (L) + `verify` (D): reframing tips must cite verified quotes; the gap-actions list is generated separately and labeled "not on your resume".

(D) = deterministic, (L) = LLM call. Budget: **at most 3 LLM calls per analysis** (extract, judge, suggest). Post Check: 0–1.

## LLM router

- Interface `LLMClient` (`generate_structured`, `embed`); implementations: `ollama_client`, `openai_compat_client`.
- Ordered provider list from config; per-provider timeout and circuit breaker; on quota/429/timeout, try the next.
- Structured output with a JSON schema generated from the Zod schema, Zod validation, one retry, `temperature=0`.
- Response cache keyed by SHA-256 of (prompt version, model, inputs); in memory, never persisted. Identical re-submits cost zero calls.
- Prompts are versioned files in `apps/api/src/prompts/`; the version is part of the cache key and the eval record.
- If all providers fail: return deterministic-only results with an explicit "AI explanation unavailable" state.

## Abuse and cost control (the public demo is a free-quota target)

- Payload caps: resume and post text length limits; file size limit.
- Per-IP rate limit (in memory) and a free bot check (Cloudflare Turnstile) on the demo.
- Kill switch via env var to disable hosted LLM use if quota is nearly exhausted.

## Privacy

- No resume/job text in logs. Logs hold metadata only: prompt name/version, model, latency, success, token counts.
- No server-side persistence in v1. If it is ever added: explicit consent, retention limit, delete path, notice aligned with the Data Privacy Act.
- Tests and evals use synthetic data only.

## API (REST over HTTP, JSON)

Conventions, implemented in `apps/api/src/errors.ts` and covered by NFR-04 tests:

- JSON request and response bodies (file upload is the one `multipart/form-data` exception, on `/analyze`). Body limit 256 KB for JSON.
- Stateless: no sessions, no server-side history. Every request carries all it needs.
- Status codes: `200` success, `400` malformed or invalid input, `404` unknown route, `413` payload too large, `429` rate limited (M8), `500` unexpected. Dependency outages (LLM down) are **not** errors: the response is `200` with an explicit degraded/unavailable state (principle 4).
- One error shape everywhere: `{"error": {"code": "not_found", "message": "…"}}`. Messages never echo request text and never expose internals (NFR-10).
- Every request body is validated with Zod at the route boundary before any logic runs.
- CORS limited to the configured web origin (`CORS_ORIGIN`).

| Endpoint | Purpose |
|---|---|
| `GET /health` | DB (if configured; "not configured" counts as healthy), LLM providers reachable |
| `POST /post-check` | job post text → signals with quotes |
| `POST /analyze` | resume file + job text → full analysis |

No `/history` on the server in v1 (browser-side). Response shapes: `docs/PROJECT_CONTEXT.md` §8, extended with `signals[]` for post checks.

## Failure modes

| Failure | Behavior |
|---|---|
| Ollama/hosted LLM down | Fall through provider chain; else deterministic-only |
| Model emits bad JSON | Retry once; else mark that step failed, show partial result |
| Unreadable/scanned PDF | Clear error; suggest DOCX or text paste |
| Empty or oversized input | 400 with a plain message |
| Quote fails verification | Dropped; rating downgraded; flag shown (feature, not bug) |

## Key trade-offs

| Choice | Why | Cost |
|---|---|---|
| No pgvector in production path | A resume has tens of chunks; in-memory retrieval is simpler, faster and free | Lose pgvector practice in prod; keep it as an optional eval/learning spike |
| Stateless backend | Privacy, ₱0 hosting, no migrations | No server-side history or cross-device sync |
| Batched judge call | Fewer free-tier calls, lower latency | Longer prompt; evals must confirm accuracy vs. per-requirement calls |
| Rules before LLM for scams | Deterministic, testable, works offline | Needs a good corpus and maintenance |
| Static frontend | Free CDN hosting, fast on mobile | No server rendering needs; fine here |
| One language end to end (TypeScript) | Shared types between api and web, one toolchain, the evidence contract enforced by the compiler | Fewer mature NLP/PDF libraries than Python; chosen libraries are tracked in Q-17 |
| Core logic in `packages/proof`, not in Express routes | Verifier and scorer testable without HTTP; the web app can share types without importing server code | One more workspace to maintain |
