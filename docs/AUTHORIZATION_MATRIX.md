# Authorization Matrix and Security Posture

Resibo has no accounts, sessions or stored data (DECISIONS #11), so "roles" here are the parties that can touch the system, not logged-in users. This file states what each may do, what stops them from doing more, and whether that control exists today or is planned. It adds no requirement; it maps existing ones (NFR-03, NFR-09, NFR-10, NFR-14, AGENTS.md rules 1, 8, 13, 15, 16).

Status key: **built** = in the code now, **planned** = scheduled milestone, **gap** = no control yet and not scheduled.

## 1. Parties

| Party | Trust level | Notes |
|---|---|---|
| Anonymous visitor | Untrusted | Anyone on the internet who reaches the public demo |
| Web app (`apps/web`) | Semi-trusted | Static build, runs in the visitor's browser; its code is public |
| Resume / job-post text | Untrusted data | Never instructions (AGENTS.md "Untrusted content") |
| LLM provider | Untrusted output | Output is a suggestion until verified in code |
| Owner / operator | Trusted | Holds env vars, provider keys, deploy rights |
| CI (GitHub Actions) | Trusted, least privilege | Token is `contents: read` (secrets job also `pull-requests: read`) |
| Contributor / AI agent | Trusted within rules | Bound by AGENTS.md; reaches `main` only through PRs |

## 2. Endpoint by party

Y = allowed, N = denied, R = allowed with limits.

| Endpoint / action | Anonymous visitor | Web app | Owner / operator | CI | Control that enforces it | Status |
|---|---|---|---|---|---|---|
| `GET /health` | Y | Y | Y | N/A | Returns status only, no secrets or text | built |
| `POST /post-check` | R | R | Y | N/A | Zod body validation, 256 KB cap, per-IP limit, bot check | validation and cap built; limit and bot check planned (M8, NFR-14) |
| `POST /analyze` | R | R | Y | N/A | Same as above, plus file size cap, file type check | planned (M4, M8) |
| Any other route | N | N | N | N/A | 404 with the standard error shape | built |
| Read stored resumes or posts | N | N | N | N/A | Nothing is stored server-side (NFR-10) | built by design |
| Read other users' history | N | N | N | N/A | History is in each browser's IndexedDB only | built by design (M5) |
| Call the LLM provider directly | N | N | Y | N | Only `apps/api` holds provider keys; web never calls Ollama or the DB (AGENTS.md #8) | convention; enforce with a web-bundle check (see gaps) |
| Call the database | N | N | Y (dev/eval) | N | DB is not on the production path (DECISIONS #12) | built by design |
| Disable hosted LLM use | N | N | Y | N | Kill switch env var | planned (M8) |
| Change provider keys or config | N | N | Y | N | Env vars only; `.env` ignored; gitleaks, Semgrep and GitGuardian scan | built |
| Push to `main` or `staging` | N | N | R | N | PR required, checks must pass, no force push, enforced for admins (DECISIONS #35) | built |

## 3. Data flow rules

| Data | Allowed to reach | Must never reach | Control | Status |
|---|---|---|---|---|
| Resume text | Request memory, the LLM prompt for the current request | Logs, disk, DB, error messages, cache persisted to disk | Metadata-only log (FR-14); in-memory cache keyed by hash (FR-22); errors never echo request text | log and cache planned (M2); error shape built |
| Job-post text | Same as resume text | Same as resume text | Same | same |
| LLM claim or quote | The response, only as `VerifiedQuote` | The response unverified | Branded type, verifier is the only minter | type built; verifier M4 |
| `fit_score` | The response | The LLM | Computed in `packages/proof` (AGENTS.md #2) | M4 |
| Provider API keys | API process memory | Web bundle, logs, repo, responses | Env vars, scanners, no keys in the client | scanners built |
| Real resumes | Owner's `local-data/` only | Git, CI, prompts, third-party tools | `check:local-data` in check, hook and CI | built |

## 4. Logic-layer checks (agent and prompt boundaries)

| Boundary | Risk | Control | Verified by | Status |
|---|---|---|---|---|
| Resume or post text inside a prompt | Text tries to steer the model ("ignore previous instructions") | Prompts treat it as delimited data; output must pass Zod and the verifier | Injection cases in evals (NFR-09) | M4/M6 |
| LLM returns a new Post Check signal | Model invents an accusation against an employer | Explain step may only reference rule-produced signals (FR-19, DECISIONS #14) | Schema check plus test | M3 |
| LLM suggests a skill not on the resume | Fabricated advice | Suggestions must cite verified quotes; gap actions are separate and labelled (FR-10) | Tests | M4 |
| Number changed inside a quote | Fuzzy score passes a wrong figure | Number guard with exact `{value, isPercent}` equality (DECISIONS #24, #29) | Table-driven tests | M4 |
| Call budget | Runaway cost on free quotas | At most 3 LLM calls per Fit Check, 1 per Post Check (NFR-12) | Test counting calls | M4 |
| Provider failure | Whole app unusable | Deterministic tools work with the LLM off (AGENTS.md #15) | Test with the router forced to fail | M2/M3 |

## 5. Current posture in the code (checked 2026-11-12)

| Control | Where | State |
|---|---|---|
| `X-Powered-By` disabled | `apps/api/src/app.ts` | built |
| CORS limited to `CORS_ORIGIN` | `apps/api/src/app.ts` | built |
| JSON body limit 256 KB | `apps/api/src/app.ts` | built |
| One error shape, no request text echoed | `apps/api/src/errors.ts` | built |
| Config validated with Zod | `apps/api/src/config.ts` | built |
| Secret scanning (gitleaks local and CI, GitGuardian) | hooks, CI | built; `ggshield` login pending |
| Static analysis (Semgrep, local rules) | CI | built |
| Production dependency audit | `npm audit --omit=dev` | 0 findings; dev-only advisories accepted (DECISIONS #37) |
| Least-privilege CI token | `.github/workflows` | built |
| Branch protection on `main`, `staging` | GitHub | built |

## 6. Gaps and proposed follow-ups

These are proposals. None is built or approved; each needs its own task and approval (AGENTS.md "Scope").

| # | Gap | Proposal (free) | When |
|---|---|---|---|
| G-1 | No HTTP security headers on the API (the app disables `x-powered-by` only) | Add `helmet` (free, MIT) with a strict default; API returns JSON only, so the policy can be tight | M2 |
| G-2 | No rate limit yet; `trust proxy` not set, so a per-IP limit behind a host proxy would see the proxy's address | Set `trust proxy` to the exact hop count for the chosen host, then in-memory limiter (Q-13, Q-18) | M8 |
| G-3 | Nothing proves the web bundle holds no provider key or Ollama URL | Add a test that greps the built `apps/web` output for key patterns and provider hosts | M5 |
| G-4 | Upload handling is unspecified: allowed types, magic-byte check, size cap, zip-bomb limit on DOCX | Specify in a requirement note (owner approves), check magic bytes not just extension, cap decompressed size | before M4 upload route |
| G-5 | Response cache could keep resume-derived text in memory | Key by SHA-256, bound size and TTL, never write to disk (already the design); add a test | M2 |
| G-6 | Error log review for NFR-10 is manual | Add a test that sends sentinel text and asserts it appears in no log line or error body | M2 |
| G-7 | CORS allows one origin, but a wildcard in `CORS_ORIGIN` would pass config validation | Reject `*` in the Zod config schema | M2 |
| G-8 | `ggshield` not yet logged in or wired | Owner logs in; then add to pre-commit and CI (M0) | owner |

## 7. Review checklist for any change that adds a route

1. Is the route in section 2? If not, add a row first.
2. Does it validate its body with Zod before any logic?
3. Does it log metadata only?
4. Does a hosted-LLM failure leave it working (rule 15)?
5. Does it stay inside the call budget (rule 16)?
6. Does an error body ever contain request text?
7. Is there a test whose title carries the FR or NFR id (rule 11)?
