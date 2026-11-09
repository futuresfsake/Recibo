# Product

## Who it is for

**Primary:** Filipino fresh graduates and early-career job seekers (IT, BPO/CSR, VA, nursing and allied health, admin) who apply through JobStreet, Kalibrr, LinkedIn, OnlineJobs.ph and Facebook groups, mostly on a phone, often on limited mobile data.
**Secondary:** career shifters and TESDA graduates.

## Pain points

Everything below is a **hypothesis until validated** (see "Validation"). Evidence level says how sure we are today.

| # | Pain | Evidence level | Resibo response |
|---|---|---|---|
| P1 | Scam and illegal-recruitment posts: fees to apply, "hired agad", no interview, contact only via personal chat | **Supported** by 2026 DMW advisories, DOLE warnings and enforcement news ([evidence](research/EVIDENCE.md)) | **Post Check**: red-flag signals, each with the exact quote from the post |
| P2 | "Do I even qualify?" People self-reject, or mass-apply blindly | Common job-search behavior; validate locally | **Fit Check** with proof |
| P3 | No feedback; rejections and ghosting | Common; validate | Gap report before applying, so the rejection reason is visible in advance |
| P4 | Entry-level posts ask for experience; OJT, projects, TESDA NC, CSC eligibility, honors are undervalued | **Partly supported**: PSA June 2026 data and press say new graduates cannot be absorbed and employers ask for experience students lack; validate locally ([evidence](research/EVIDENCE.md)) | Treat those as first-class evidence |
| P5 | One generic resume; PH resume habits (photo, age, civil status, religion) vs. what employers need; privacy exposure | Likely; validate with HR/recruiters | **Resume hygiene** notes (advice, context-dependent) |
| P6 | Taglish, vague, jargon-heavy posts | Likely | Plain-language restatement of requirements (English or Taglish) |
| P7 | AI resume tools invent experience, so candidates get caught in interviews | Known LLM failure mode | The resibo guardrail: no verified quote, no claim |
| P8 | Cost and connectivity: paid tools, data-limited phones | Likely | Free, no sign-up, light mobile-first PWA |
| P9 | Resumes are personal data (Data Privacy Act of 2012, RA 10173) | Legal fact; applies to us | Stateless processing, nothing stored server-side by default |
| P10 | Salary opacity ("competitive salary") | Likely, but no reliable free data | Out of scope for v1 |

## Product shape (v1): three tools, one principle

**Principle:** every claim carries a resibo. For fit, the resibo is a quote from the resume. For red flags, it is a quote from the job post. Quotes are verified by code, not by the model.

1. **Post Check** — paste a job post, get red-flag signals (fee requests, vague employer, personal-account contact, unrealistic pay, no interview). Rules run first with no LLM; the LLM only explains in plain language. Output is **advisory signals with quotes, never a verdict** ("signals found", not "this is a scam"), plus pointers to official verification channels.
2. **Fit Check** — resume vs. post: requirement list, strong/partial/gap ratings, verified quotes, fit score computed in Python.
3. **Next Steps** — (a) reframing tips that only use verified experience; (b) separate list of gaps with honest actions to *earn* the missing item. Never mixed: earning actions are not claims about the resume.

## Success metrics

| Type | Metric | v1 target |
|---|---|---|
| Trust | Final hallucination rate (claims without valid evidence) | 0% |
| Safety | Post Check recall on scam corpus; false-positive rate on legit posts | reported honestly |
| Speed | Result time on the hosted demo | under 60 s |
| Reach | Real users in pilot | 10 |
| Usefulness | Pilot users who say it changed whether or how they apply | collected by short survey |

## Validation (before building past the skeleton)

1. Interview 8–10 Filipino job seekers (fresh grads first) and 2–3 recruiters/HR: what made you not apply last time, have you met a scam post, what do you do about your resume.
2. Collect 30+ anonymized real job posts by hand (no scraping): legit, borderline, scam-like. This is also the Post Check eval corpus.
3. Rank P1–P10 by what people actually say. If P1 (scams) outranks P2 (fit), build Post Check first. It is the plan's default order already.

## Non-goals (v1)

Accounts, applying on the user's behalf, scraping job sites, auto-writing resumes, salary data, fine-tuning, languages beyond English/Taglish, legal determinations about any employer.

## Risks specific to this product

| Risk | Mitigation |
|---|---|
| Falsely flagging a legit employer | Signals not verdicts; show the quote; report false-positive rate; disclaimer |
| Advice that is wrong for a given employer (e.g. photo on resume) | Frame as context-dependent, not rules |
| Leaking someone's personal data | Stateless, metadata-only logs, synthetic data in tests and evals |
| Free LLM quota runs out | Provider chain + deterministic-only mode (see ARCHITECTURE) |
