# Resibo — Project Context

> **Resibo**: Evidence-Grounded Resume–Job Matching for the Philippine Job Market
> "May resibo ka?" — every match comes with proof.

Background document. Where it conflicts with `AGENTS.md` (how to work), `docs/REQUIREMENTS.md` (what to build) or `docs/ARCHITECTURE.md` (how it is built), those win. Updated for the Node.js/Express/React stack (DECISIONS #17).

## 1. What this project is

Resibo helps Filipino job seekers check job posts and compare a resume against a posting. The rule that sets it apart from other resume checkers:

**Every claim the AI makes must be backed by a "resibo": an exact quote from the resume. The code checks each quote programmatically. Claims without verified evidence are rejected, and the type system makes showing one a compile error.**

It's built for **Filipino job seekers** and understands PH-specific credentials and job posts.

Its purpose is to be a portfolio project for AI engineering internship applications in 2027. The **evaluation results** (hallucination rate, citation accuracy, bias, consistency) are as important as the app itself.

### Owner
Chelsea Colaljo, 4th-year BSIT, University of San Carlos, Cebu City. Familiar with: React/Vite, Next.js, TypeScript, Tailwind, shadcn/ui, NestJS, Prisma, PostgreSQL, Python, Pandas, Streamlit, Docker. New to: Express-based LLM services, Zod, pgvector, Ollama, LLM evals. **Explain new concepts briefly when you introduce them.**

## 2. Hard constraint: everything is free

- No paid APIs and no credit card required anywhere.
- LLM and embeddings run locally through **Ollama** in development.
- The optional dev/eval database runs locally in **Docker** (Postgres + pgvector). It is not on the production path.
- Deployment uses free tiers only (see section 10).
- Never add a dependency that needs a paid key.

## 3. Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite + TypeScript, installable PWA (static build) |
| API / AI service | Node.js 22, Express 5, TypeScript (strict) |
| Core logic | `@resibo/proof` workspace package: evidence types, rules, verifier, scorer |
| Schemas / validation | Zod (config, requests, LLM outputs) |
| LLM | Ollama, local. Default chat model set in `.env` (see section 5) |
| Embeddings | Ollama `nomic-embed-text` |
| Database | None in production. Dev/eval only: PostgreSQL 16 + pgvector (`pgvector/pgvector:pg16`) |
| File parsing | PDF and DOCX libraries to be chosen (Open Question Q-17) |
| Citation verification | Fuzzy partial-match in `@resibo/proof` (library per Q-17) |
| Tests / evals | Vitest + Supertest, custom eval runner in `evals/` |
| Dev OS | **Windows (cmd)**. Give Windows-compatible commands. |

The frontend never talks to Ollama or the database directly. Everything goes through the Express API.

## 4. Folder structure

```
resibo/
├── README.md
├── AGENTS.md                   # rules for humans and agents
├── package.json                # npm workspaces root; scripts: dev, test, check, trace
├── tsconfig.base.json          # strict TypeScript shared by all workspaces
├── eslint.config.mjs
├── .env.example                # docker-compose variables only
├── apps/
│   ├── api/                    # Express 5 + TypeScript
│   │   ├── .env.example
│   │   ├── src/
│   │   │   ├── server.ts       # listen; wires real probes
│   │   │   ├── app.ts          # createApp(config, deps): CORS, JSON, routers
│   │   │   ├── config.ts       # Zod-validated settings from env
│   │   │   ├── checks/         # dependency probes (db, ollama); never throw
│   │   │   ├── routes/         # /health now; /post-check, /analyze later
│   │   │   ├── llm/            # (M2) LLMClient interface, Ollama + OpenAI-compatible clients, router
│   │   │   └── prompts/        # (M2+) versioned prompt files
│   │   └── tests/
│   └── web/                    # React + Vite PWA
│       └── src/
├── packages/
│   └── proof/                  # framework-free core
│       └── src/                # evidence contract now; rules, verifier, score later
├── evals/
│   ├── data/                   # labeled resume/job pairs (JSON), synthetic only
│   └── results/                # timestamped result files (gitignored)
├── infra/                      # docker-compose.yml + db/init.sql (optional dev DB)
├── scripts/                    # trace.mjs, setup-hooks.cmd
├── docs/                       # plans, architecture, decisions, research, audit log
└── .githooks/                  # pre-commit (secrets), pre-push (lint, types, tests, trace)
```

## 5. Environment variables (`apps/api/.env.example`)

```
PORT=8000
CORS_ORIGIN=http://localhost:5173
POSTGRES_USER=resibo
POSTGRES_PASSWORD=            # optional; empty means "DB not configured"
POSTGRES_DB=resibo
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
LLM_PROVIDER=ollama                 # ollama | openai_compat
OLLAMA_BASE_URL=http://localhost:11434
LLM_MODEL=qwen2.5:7b                # use llama3.2:3b if the laptop has 8GB RAM
EMBED_MODEL=nomic-embed-text
OPENAI_COMPAT_BASE_URL=             # only for free-tier hosted deploy
OPENAI_COMPAT_API_KEY=              # never commit a real value
CITATION_MATCH_THRESHOLD=90
```

## 6. The Fit Check pipeline (core logic)

```
resume file + job post text
   │
   ▼
1. parseResume          → clean text + sections (education, experience, projects, skills, certifications)
2. extractRequirements  → LLM → JSON list of requirements
                           [{id, text, category: skill|experience|education|certification|soft_skill,
                             importance: required|preferred}]
3. match                → for each requirement:
                           a. retrieve top-k resume chunks in memory (BM25 + small embeddings, no DB)
                           b. one batched LLM call judges all requirements: rating (strong|partial|gap),
                              explanation, evidence_quotes (EXACT text copied from the resume)
4. verifyCitations      → for every evidence quote, fuzzy partial-match against the resume text
                           ≥ threshold → becomes a VerifiedQuote
                           < threshold → dropped; if no verified quotes remain,
                                         downgrade rating to "gap" and set hallucinationCaught=true
5. score                → weighted fit score 0–100 (required > preferred) computed in TypeScript, NOT by the LLM
6. suggestions          → LLM gives tailoring tips that ONLY reframe verified experience.
                         Never suggest adding skills the resume doesn't show.
```

Steps 1, 3a, 4, 5 live in `packages/proof` (deterministic). Steps 2, 3b, 6 are LLM calls orchestrated by `apps/api`. At most 3 LLM calls per analysis.

### Rules
- Use structured output (Ollama `format=` with the JSON schema generated from the Zod schema) for every LLM call that returns data. Validate with Zod, and retry once on failure.
- `temperature` = 0 for extraction, matching and explanation.
- The LLM never computes the final score. TypeScript does.
- Log every LLM call as metadata only (prompt name/version, model, latency ms, success/fail, token counts). Never log resume or job text.
- Keep prompts in `apps/api/src/prompts/`, not hard-coded in source.

## 7. Philippine job-market support

The extractor and matcher should correctly recognize:
- TESDA National Certificates (NC I–IV)
- Civil Service eligibility (Professional / Sub-Professional)
- PRC board licenses
- Latin honors (cum laude, magna cum laude, summa cum laude), Dean's Lister
- OJT / practicum / internship
- PH job sources' formats: JobStreet, Kalibrr, OnlineJobs.ph, LinkedIn PH
- Taglish in job posts (e.g., "Need agad", "May experience sa…")
- Common PH roles: BPO/CSR, VA, IT, nursing

Include PH examples in prompts and in the eval dataset.

## 8. API endpoints

- `GET  /health`: DB (if configured) + Ollama status
- `POST /post-check`: job post text → red-flag signals with exact quotes
- `POST /analyze`: multipart: `resume_file` + `job_text`. Returns the full analysis.

There is no server-side history; analysis history lives in the browser (DECISIONS #11).

Response shape for `/analyze` (types live in `@resibo/proof`):
```json
{
  "id": "uuid",
  "fit_score": 72,
  "summary": "string",
  "requirements": [
    {
      "id": "r1",
      "text": "Experience with React",
      "importance": "required",
      "rating": "strong",
      "explanation": "string",
      "evidence": [{"quote": "Built TaleTrade using React Native...", "verified": true, "score": 97}],
      "hallucination_caught": false
    }
  ],
  "suggestions": ["string"],
  "meta": {"model": "qwen2.5:7b", "latency_ms": 8400}
}
```

## 9. Frontend (MVP)

- Post Check and Fit Check pages: upload resume, paste job post, "Analyze" button, loading state
- Results: big fit score, then a requirement list grouped by Strong / Partial / Gap
- Each requirement shows its **resibo**: the quoted resume line, highlighted, with a ✓ verified badge
- Show a small "⚠ AI claim rejected, no proof found" badge when `hallucinationCaught` is true. This is a feature, not a bug, and it shows the guardrail working.
- History page backed by IndexedDB (browser only)
- Clean and minimal. Mobile-friendly at 360 px.

## 10. Free deployment (later, Milestone 8)

Ollama can't run on free hosting. For the public demo:
- Frontend → Cloudflare Pages (static build of `apps/web`)
- API → Render free web service running `apps/api` (sleeps when idle; fine for a demo)
- Database → none
- LLM → ordered chain of free OpenAI-compatible APIs via `LLM_PROVIDER=openai_compat`. Verify current free limits before using (`docs/COST_FREE_STACK.md`).
- Fallback if no free LLM tier works: deterministic-only mode, the demo video, and local setup instructions in the README.

## 11. Evaluation (this is what makes the project stand out)

Full plan in `docs/EVALS.md`. Dataset: `evals/data/*.json`, 30–50 pairs. Each file:
```json
{
  "id": "case_001",
  "resume_text": "...",
  "job_text": "...",
  "labels": {
    "r_text_or_id": {"expected_rating": "strong", "evidence_should_contain": "React Native"}
  },
  "notes": "PH BPO role, Taglish post"
}
```
Mix: IT, BPO, VA, nursing, data roles; strong fits, weak fits, and tricky cases (skill mentioned in a hobby section, similar-but-different skills like Java vs JavaScript).

Metrics (`evals/metrics.ts`):
1. **Hallucination rate (raw):** % of LLM evidence quotes that failed verification, before the guardrail
2. **Hallucination rate (final):** % of claims shown to the user without valid evidence (target: 0)
3. **Rating accuracy:** predicted vs labeled rating
4. **Bias check:** swap name / gender markers / school (e.g., USC ↔ a provincial state university); report the fit score difference (target: ≤ 3 points)
5. **Consistency:** run each case 5×; report the std dev of fit_score
6. **Latency:** median + p95 per analysis

The README must include a results table plus a "What didn't work" section.

## 12. Milestones

The authoritative list is `docs/PLAN.md` (M0–M9). Build in that order and don't skip ahead. At the end of each milestone: run `npm run check`, summarize what was built, and list what's next.

## 13. Coding rules

- Strict TypeScript everywhere. No `any` without a comment saying why.
- No secrets in code or commits. `.env` is gitignored from the first commit.
- Small, focused commits with clear messages.
- Write tests for pipeline functions, especially `verifyCitations` and `score`. Test titles carry requirement IDs.
- Handle errors clearly: Ollama not running, model not pulled, bad PDF, empty job post.
- Keep it simple. No LangChain. Call Ollama directly so the logic stays visible and explainable in interviews.

## 14. Out of scope (MVP)

User accounts/auth · fine-tuning models · scraping job sites · auto-writing full resumes · applying to jobs · languages besides English/Taglish job posts · OCR for scanned PDFs (clear error instead).
