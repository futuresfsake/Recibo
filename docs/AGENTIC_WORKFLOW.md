# Agentic Workflow

How AI agents and humans build Resibo safely. Target maturity: **Level 3 (gated-autonomous)**. Level 4 (parallel fleet) is not needed for a solo project.

## 1. Context stack (who wins)

| Layer | File | Answers |
|---|---|---|
| Rules: how to work | `AGENTS.md` | Never-lists, scope, confidentiality |
| Spec: what to build | `docs/REQUIREMENTS.md` | FR/NFR IDs |
| Background | `docs/PROJECT_CONTEXT.md` | Stack, pipeline, API shape (v1 background; where it conflicts with `ARCHITECTURE.md`, the latter wins) |
| Plan | `docs/PLAN.md` | Milestones and tasks |
| Register | `docs/OPEN_QUESTIONS.md`, `docs/DECISIONS.md` | Gaps and settled choices |
| Task | the prompt for the current task | What to do now |

Conflict rule is at the top of `AGENTS.md`. A conflict is reported, not silently resolved.

## 2. Work cycle for one task

1. **Pick a task** from `docs/PLAN.md`. Check **DoR**.
2. **Write test stubs** first, titles containing requirement IDs.
3. **RED**: write the real failing test. **GREEN**: minimal implementation. **REFACTOR**.
4. **Gate**: DoD checklist below, verified by a fresh-context review (a separate agent session or the owner), not by the session that wrote the code.
5. **Commit** small, push, append an entry to the audit log.

For `verifyCitations`, `score`, prompt-injection handling, and anything touching resume data: strict per-case RED→GREEN, and the review gate is always run (no skipping).

## 3. Definition of Ready (DoR)

- [ ] Task maps to one or more FR/NFR IDs
- [ ] No open blocking question in `OPEN_QUESTIONS.md` for it
- [ ] Acceptance criteria written as checkable statements
- [ ] Test approach noted (unit / integration / eval)

## 4. Definition of Done (DoD)

- [ ] Tests exist, titles carry requirement IDs, no stubs counted as passing
- [ ] `npm test` green; `npm run trace` shows no uncovered ID for this task (`npm run check` runs everything)
- [ ] Type check and lint clean (`npm run typecheck`, `npm run lint`)
- [ ] Secrets scan clean
- [ ] Errors handled per NFR-04 where relevant
- [ ] Docs updated (README/ARCHITECTURE/PLAN checkbox)
- [ ] Anything not applicable is marked `N/A: reason`, never silently skipped
- [ ] Reviewed by a fresh context (note "not independently reviewed" in the log if none was available)

## 5. Execution modes

- **Autonomous**: default for ordinary tasks once DoR is met.
- **Fully gated** (human approves each gate): anything on the guardrail path (FR-07, FR-08, FR-09, FR-10), prompt-injection handling, data retention (NFR-10), deploy and any secret handling. This override is a rule; the default cannot swallow it.
- **Auto-fix loop**: at most 2 rounds, only for concrete findings (file and line). A second occurrence of the same defect class stops the loop: fix the class or escalate.

## 6. Traceability

- Tests: `it("FR-07 <what>", …)` (literal ID in the title).
- `scripts/trace.mjs` (`npm run trace`) reads `docs/REQUIREMENTS.md` and scans `*.test.ts` titles under `apps/`, `packages/` and `evals/`, then reports covered / uncovered / orphaned. It runs in CI and the pre-push hook as a gate.

## 7. Audit log

`docs/audit/log.jsonl`, append-only (enforced by a hook and `.gitattributes` `merge=union`). One JSON line per run:

```json
{"ts":"2026-11-09T10:00:00+08:00","task":"M2-T3","actor":"agent|human","mode":"autonomous|gated","req":["FR-03"],"outcome":"completed|blocked|declined|errored","review":"fresh|owner|none","notes":"..."}
```

Sort by `ts`, not file position. Derived metrics for the README: first-pass rate, autonomous completion rate, active time.

## 8. Guards (repo tooling, built in M0)

| Guard | Mechanism |
|---|---|
| No secrets | pre-commit secrets scan (gitleaks), `.env` ignored |
| Static analysis | ESLint (`no-eval`, `no-new-func`) and semgrep with a small TypeScript ruleset (no `eval`, no hard-coded keys, no SQL string-building, no LangChain) |
| Hooks | `.githooks/` : pre-commit (secrets scan), pre-push (lint, types, tests, trace) |
| Commit style | one concern per commit, message says what and why |
| Branches | one task branch per task off `dev`, promoted `dev` → `staging` → `main` (section 11); worktrees only if running tasks in parallel |

## 9. Agent evaluation

The product evals (`docs/EVALS.md`) are separate from agent-process evals. Process metrics come from the audit log. Keep 3 golden tasks (e.g. implement `verifyCitations`, add a prompt, add an endpoint) to re-run after changing `AGENTS.md`.

## 10. Governance

Single owner (Chelsea) decides what to build, the rules, and the tooling. "Proposed" means nobody has looked yet, not "do not build". Design questions go to a human decision recorded in the register, not to another AI session.

## 11. Branches and promotion

Changes move one way: task branch → `dev` → `staging` → `main` (DECISIONS #34).

| Branch | Role | How changes arrive | Deploys to |
|---|---|---|---|
| `feature/*` | One task (e.g. `feature/post-check-rules`) | Branched off `dev` | nothing |
| `dev` | Integration. May be a little unstable | PR from a task branch; CI green and at least one review | dev environment |
| `staging` | Release candidate. QA and demo testing happen here. After the cut, only bug fixes land | PR `dev` → `staging` when `dev` is ready for a release | staging environment that mirrors production (same config and env vars) |
| `main` | Always equals what is live | PR `staging` → `main` once staging is verified, then tag the release (`v1.2.0`) | production |
| `hotfix/*` | Urgent production bug | Branched off `main`, PR back into `main`, then `main` is merged back down into `staging` and `dev` | production, through `main` |

Rules that make it hold:

1. `main` and `staging` are protected: no direct pushes, a PR with passing CI is required.
2. Never skip a step upward (no `dev` straight to `main`).
3. Every hotfix is synced back down to `staging` and `dev`, so nothing regresses.

Enforced on GitHub since 2026-11-12 (DECISIONS #35): `main` and `staging` require a PR with the `check`, `semgrep` and `secrets` jobs passing, with no force pushes and no deletion, and this applies to the owner too. Required approvals are set to zero, because GitHub does not let an author approve their own PR; the review is the fresh-context review from the DoD, noted in the PR. `dev` is not protected.

Not in place yet:

- The three environments do not exist. Deploy is M8; until then `dev`, `staging` and `main` differ only in what has been promoted.
