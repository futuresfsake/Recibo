# Resibo — Project Context

> **Resibo**: Evidence-Grounded Resume–Job Matching for the Philippine Job Market
> "May resibo ka?" — every match comes with proof.

## 1. What this project is

Resibo is an AI tool that compares a resume against a job posting and tells the user how well they fit. The rule that sets it apart from other resume checkers:

**Every claim the AI makes must be backed by a "resibo": an exact quote from the resume. The code checks each quote programmatically. Claims without verified evidence are rejected.**

It's built for **Filipino job seekers** and understands PH-specific credentials and job posts.

Its purpose is to be a portfolio project for AI engineering internship applications in 2027. The **evaluation results** (hallucination rate, citation accuracy, bias, consistency) are as important as the app itself.

### Owner
Chelsea Colaljo, 4th-year BSIT, University of San Carlos, Cebu City. Familiar with: React/Vite, Next.js, TypeScript, Tailwind, shadcn/ui, NestJS, Prisma, PostgreSQL, Python, Pandas, Streamlit, Docker. New to: FastAPI, Pydantic, pgvector, Ollama, LLM evals. **Explain new concepts briefly when you introduce them.**

## 2. Hard constraint: everything is free

- No paid APIs and no credit card required anywhere.
- LLM and embeddings run locally through **Ollama**.
- Database runs locally in **Docker** (Postgres + pgvector).
- Deployment uses free tiers only (see section 10).
- Never add a dependency that needs a paid key.

## 3. Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Backend / AI service | Python 3.11+, FastAPI, Pydantic v2 |
| LLM | Ollama, local. Default chat model set in `.env` (see section 5) |
| Embeddings | Ollama `nomic-embed-text` |
| Database | PostgreSQL 16 + pgvector (Docker image `pgvector/pgvector:pg16`) |
| ORM | SQLModel (or SQLAlchemy 2.0) + Alembic migrations |
| File parsing | `pdfplumber` (PDF), `python-docx` (DOCX) |
| Citation verification | `rapidfuzz` |
| Tests / evals | `pytest` + custom eval scripts |
| Dev OS | **Windows (cmd)**. Give Windows-compatible commands. |

The frontend never talks to Ollama or the database directly. Everything goes through the FastAPI backend.

## 4. Folder structure

```
resibo/
├── README.md
├── docker-compose.yml          # postgres + pgvector
├── .gitignore                  # must include .env, __pycache__, node_modules, .venv
├── docs/                       # plans, architecture, decisions
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py             # FastAPI app, CORS, routers
│   │   ├── config.py           # settings from .env (pydantic-settings)
│   │   ├── db.py
│   │   ├── models/             # SQLModel tables
│   │   ├── schemas/            # Pydantic request/response + LLM output schemas
│   │   ├── routers/            # /analyze, /history, /health
│   │   ├── llm/
│   │   │   ├── base.py         # LLMClient interface
│   │   │   ├── ollama_client.py
│   │   │   └── openai_compat_client.py  # for free-tier hosted deploy later
│   │   ├── pipeline/
│   │   │   ├── parse_resume.py
│   │   │   ├── extract_requirements.py
│   │   │   ├── match.py
│   │   │   ├── verify_citations.py
│   │   │   └── score.py
│   │   └── prompts/            # prompt templates as .md or .txt files
│   └── tests/
├── evals/
│   ├── data/                   # labeled resume/job pairs (JSON)
│   ├── run_evals.py
│   ├── metrics.py
│   └── results/                # timestamped result files
└── frontend/
    └── (Next.js app)
```

## 5. Environment variables (`backend/.env.example`)

```
DATABASE_URL=postgresql+psycopg://resibo:@localhost:5432/resibo
LLM_PROVIDER=ollama                 # ollama | openai_compat
OLLAMA_BASE_URL=http://localhost:11434
LLM_MODEL=qwen2.5:7b                # use llama3.2:3b if the laptop has 8GB RAM
EMBED_MODEL=nomic-embed-text
OPENAI_COMPAT_BASE_URL=             # only for free-tier hosted deploy
OPENAI_COMPAT_API_KEY=              # never commit a real value
CITATION_MATCH_THRESHOLD=90
```

## 6. The pipeline (core logic)

```
resume file + job post text
   │
   ▼
1. parse_resume       → clean text + sections (education, experience, projects, skills, certifications)
2. extract_requirements → LLM → JSON list of requirements
                           [{id, text, category: skill|experience|education|certification|soft_skill,
                             importance: required|preferred}]
3. match              → for each requirement:
                           a. embed requirement + resume chunks, retrieve top-k chunks (pgvector)
                           b. LLM judges: rating (strong|partial|gap), explanation,
                              evidence_quotes (EXACT text copied from the resume)
4. verify_citations   → for every evidence_quote, rapidfuzz.partial_ratio against the resume text
                           ≥ threshold → verified
                           < threshold → unverified: drop the quote; if no verified quotes remain,
                                         downgrade rating to "gap" and set flag hallucination_caught=true
5. score              → weighted fit score 0–100 (required > preferred) computed in Python, NOT by the LLM
6. suggestions        → LLM gives tailoring tips that ONLY reframe verified experience.
                         Never suggest adding skills the resume doesn't show.
```

### Rules
- Use Ollama's structured output (`format=` with the Pydantic model's JSON schema) for every LLM call that returns data. Validate with Pydantic, and retry once on failure.
- `temperature` = 0 for extraction and matching.
- The LLM never computes the final score. Python does.
- Log every LLM call (prompt name, model, latency ms, success/fail) so evals can report latency.
- Keep prompts in `app/prompts/`, not hard-coded in Python.

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

- `GET  /health`: checks DB + Ollama reachable
- `POST /analyze`: multipart: `resume_file` + `job_text`. Returns the full analysis.
- `GET  /history`: past analyses (no auth in MVP)
- `GET  /history/{id}`

Response shape for `/analyze`:
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

- One page: upload resume, paste job post, "Analyze" button, loading state
- Results: big fit score, then a requirement list grouped by Strong / Partial / Gap
- Each requirement shows its **resibo**: the quoted resume line, highlighted, with a ✓ verified badge
- Show a small "⚠ AI claim rejected, no proof found" badge when `hallucination_caught` is true. This is a feature, not a bug, and it shows the guardrail working.
- History page
- Clean and minimal with shadcn/ui. Mobile-friendly.

## 10. Free deployment (later, Milestone 7)

Ollama can't run on free hosting. For the public demo:
- Frontend → Vercel (Hobby, free)
- Backend → Render free web service (sleeps when idle; that's fine for a demo)
- Database → Supabase or Neon free Postgres (both support pgvector)
- LLM → a free-tier OpenAI-compatible API (e.g., Groq or Google Gemini), via `LLM_PROVIDER=openai_compat`. Verify current free limits before using.
- Fallback if no free LLM tier works: the demo video + local setup instructions in the README.

## 11. Evaluation (this is what makes the project stand out)

Dataset: `evals/data/*.json`, 30–50 pairs. Each file:
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

Metrics (`evals/metrics.py`):
1. **Hallucination rate (raw):** % of LLM evidence quotes that failed verification, before the guardrail
2. **Hallucination rate (final):** % of claims shown to the user without valid evidence (target: 0)
3. **Rating accuracy:** predicted vs labeled rating
4. **Bias check:** swap name / gender markers / school (e.g., USC ↔ a provincial state university); report the fit score difference (target: ≤ 3 points)
5. **Consistency:** run each case 5×; report the std dev of fit_score
6. **Latency:** median + p95 per analysis

`python evals/run_evals.py --model qwen2.5:7b` writes `evals/results/<timestamp>_<model>.json` and prints a summary table. Support comparing two models.

The README must include a results table plus a "What didn't work" section.

## 12. Milestones (build in this order and don't skip ahead)

1. **Setup:** repo, docker-compose (pgvector), FastAPI skeleton, `/health`, Ollama connection test
2. **Parsing + requirement extraction:** with tests on 3 sample resumes/jobs
3. **Matching + embeddings:** pgvector retrieval + LLM judgment
4. **Citation verification + scoring:** unit tests for verify_citations (exact, near-match, fabricated)
5. **Frontend MVP:** connected to the API
6. **Eval dataset + eval runner:** first results recorded
7. **Improve** based on evals (prompts, threshold, chunking) → re-run → record before/after
8. **Deploy (free)** + README + demo video

At the end of each milestone: run tests, summarize what was built, and list what's next.

## 13. Coding rules

- Type hints everywhere in Python; strict TypeScript in the frontend.
- No secrets in code or commits. `.env` is gitignored from the first commit.
- Small, focused commits with clear messages.
- Write tests for pipeline functions, especially `verify_citations` and `score`.
- Handle errors clearly: Ollama not running, model not pulled, bad PDF, empty job post.
- Keep it simple. No LangChain. Call Ollama directly so the logic stays visible and explainable in interviews.

## 14. Out of scope (MVP)

User accounts/auth · fine-tuning models · scraping job sites · auto-writing full resumes · applying to jobs · languages besides English/Taglish job posts.
