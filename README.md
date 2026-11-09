# Resibo

**Evidence-grounded resume–job matching for the Philippine job market.**
*"May resibo ka?"* — every match comes with proof.

Resibo compares a resume with a job post and rates the fit. Every claim the AI makes must cite an exact quote from the resume. The backend checks each quote programmatically (fuzzy match). A claim with no verified quote is rejected and downgraded to a gap.

> Status: planning. See [docs/PLAN.md](docs/PLAN.md).

## Why

- Resume checkers often hallucinate skills. Resibo makes that measurable and blocks it.
- Understands PH context: TESDA NC, Civil Service, PRC licenses, Latin honors, OJT, Taglish job posts.
- 100% free to run: Ollama (local LLM), Postgres + pgvector (Docker), free-tier deploy.

## Stack

Next.js + TypeScript + Tailwind + shadcn/ui · FastAPI + Pydantic v2 · Ollama · Postgres 16 + pgvector · rapidfuzz · pytest

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

## Local setup

_Added in Milestone 1._
