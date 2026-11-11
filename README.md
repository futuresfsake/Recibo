# Resibo

**Evidence-grounded resume–job matching for the Philippine job market.**
*"May resibo ka?"* — every match comes with proof.

Three free tools for Filipino job seekers, one rule: **every claim comes with proof, and code verifies the proof.**

1. **Post Check** — red-flag signals in a job post (fees, vague employer, chat-only contact…), each with the exact quote. Advisory, never a verdict. Works without an LLM.
2. **Fit Check** — resume vs. job post. Every rating cites a resume quote that code fuzzy-matches against the resume. No verified quote means the claim is rejected and downgraded to a gap.
3. **Next Steps** — reframing tips using only verified experience, plus an honest list of gaps to earn.

> Status: planning and foundations. The Node.js/Express API, React app and evidence contract are scaffolded; features start at M3. See [docs/PLAN.md](docs/PLAN.md).

## Why

- Scam posts, unclear requirements and silent rejections are everyday problems for Filipino applicants ([docs/PRODUCT.md](docs/PRODUCT.md)).
- AI resume tools invent experience. Resibo measures that and blocks it.
- Understands PH context: TESDA NC, Civil Service, PRC licenses, Latin honors, OJT, Taglish posts.
- ₱0 to run, no card. Private by default: nothing stored server-side ([docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/COST_FREE_STACK.md](docs/COST_FREE_STACK.md)).

## What makes it different: the proof is a type

Most "grounded AI" projects promise not to show unverified claims. Resibo makes it a compile error.

```ts
// packages/proof/src/index.ts
interface VerifiedQuote { text: string; score: number; [verifiedBrand]: true }
interface Finding { rating: Rating; evidence: readonly VerifiedQuote[]; hallucinationCaught: boolean; /* … */ }
```

A raw LLM quote is a `RawQuote`. Only the verifier (a fuzzy match against the resume text, in code) can turn one into a `VerifiedQuote`, and `Finding.evidence` accepts nothing else. The API and the UI cannot render a claim that skipped verification, because that code would not type-check.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite + TypeScript, installable PWA (static build) |
| API | Node.js 22 + Express 5 + TypeScript, REST over JSON with one error shape ([conventions](docs/ARCHITECTURE.md#api-rest-over-http-json)), Zod for every schema |
| Core | `@resibo/proof`: framework-free evidence contract, rules, verifier, scorer |
| LLM | Ollama locally; free hosted OpenAI-compatible chain for the demo |
| Tests | Vitest + Supertest; test titles carry requirement IDs |
| Dev only | Postgres + pgvector in Docker (optional, not on the production path) |

## Repository layout

```
apps/
  api/            Express API: config, routes, dependency checks, (later) LLM router
  web/            React + Vite PWA
packages/
  proof/          Evidence contract and deterministic core, shared by api and web
evals/            Golden cases, runner and results (grows from M3)
infra/            docker-compose + init.sql for the optional dev database
scripts/          trace.mjs (requirement traceability), setup-hooks.cmd
docs/             Plan, architecture, requirements, decisions, research, audit log
.githooks/        pre-commit (secrets) and pre-push (lint, types, tests, trace)
```

## Local setup

Needs Node.js 22 or newer. Windows (cmd) commands:

```bat
npm install
copy apps\api\.env.example apps\api\.env
scripts\setup-hooks.cmd
npm run dev
```

- API: http://localhost:8000/health
- Web: http://localhost:5173 (proxies `/api` to the API)
- `/health` reports `degraded` until Ollama is running with the models pulled: `ollama pull qwen2.5:7b` and `ollama pull nomic-embed-text`. Postgres is optional; with no password set it reports "not configured".

Useful scripts:

| Command | What it does |
|---|---|
| `npm run check` | lint + type check + tests + traceability, the same gate as CI |
| `npm test` | Vitest across all workspaces |
| `npm run trace` | Which FR/NFR IDs have tests, which are uncovered or orphaned |
| `npm run build` | Production builds for api and web |
| `docker compose -f infra/docker-compose.yml --env-file .env up -d` | Optional dev database |

## Docs

- [Rules for contributors and agents](AGENTS.md)
- [Requirements (FR/NFR IDs)](docs/REQUIREMENTS.md)
- [Agentic workflow, gates, DoR/DoD](docs/AGENTIC_WORKFLOW.md)
- [Open questions register](docs/OPEN_QUESTIONS.md)
- [Plan and milestones](docs/PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Evaluation plan](docs/EVALS.md)
- [Decisions log](docs/DECISIONS.md)

## Results

_Pending Milestone 6._ This section will hold the metrics table and a "What didn't work" section.
