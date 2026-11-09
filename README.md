# Resibo

**Evidence-grounded resume–job matching for the Philippine job market.**
*"May resibo ka?"* — every match comes with proof.

Three free tools for Filipino job seekers, one rule: **every claim comes with proof, and code verifies the proof.**

1. **Post Check** — red-flag signals in a job post (fees, vague employer, chat-only contact…), each with the exact quote. Advisory, never a verdict. Works without an LLM.
2. **Fit Check** — resume vs. job post. Every rating cites a resume quote that code fuzzy-matches against the resume. No verified quote means the claim is rejected and downgraded to a gap.
3. **Next Steps** — reframing tips using only verified experience, plus an honest list of gaps to earn.

> Status: planning and foundations. See [docs/PLAN.md](docs/PLAN.md).

## Why

- Scam posts, unclear requirements and silent rejections are everyday problems for Filipino applicants ([docs/PRODUCT.md](docs/PRODUCT.md)).
- AI resume tools invent experience. Resibo measures that and blocks it.
- Understands PH context: TESDA NC, Civil Service, PRC licenses, Latin honors, OJT, Taglish posts.
- ₱0 to run, no card. Private by default: nothing stored server-side ([docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/COST_FREE_STACK.md](docs/COST_FREE_STACK.md)).

## Stack

Next.js PWA (static) · FastAPI + Pydantic v2 · Ollama locally, free hosted LLM chain for the demo · rapidfuzz · pytest. Postgres + pgvector only for optional dev/eval work.

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
