# Open Questions (decisions register)

Status is mutable; resolved items move to Closed and are not edited again. "Blocks" says which tasks cannot start.

| ID | Question | Owner class | Blocks | Status |
|---|---|---|---|---|
| Q-01 | Default model: `qwen2.5:7b` or `llama3.2:3b`? Benchmark latency and accuracy on the laptop | fact needed | M2 | open |
| Q-02 | Resume chunking: by section, fixed size with overlap, or per bullet? | owner decides after spike | M4 | open |
| Q-03 | Resume storage. **Proposed:** none server-side; history in the browser only (DECISIONS #11) | owner confirms | M4 | proposed |
| Q-04 | `CITATION_MATCH_THRESHOLD` start value (90) and whether to normalize whitespace/case | tune with unit cases | M4 | open |
| Q-05 | Score weights (proposed: required 3, preferred 1; strong 1.0, partial 0.5, gap 0) | owner decides | M4 | open |
| Q-06 | Who labels the 30–50 eval pairs; synthetic only? **Proposed:** synthetic resumes written by the owner; job posts collected by hand and anonymized | owner decides | M6 | proposed |
| Q-07 | Which free hosted LLMs make up the provider chain, and their current limits and terms | fact needed | M8 | open |
| Q-08 | Rename the GitHub repo `Recibo` to `Resibo`? | owner decides | none | open |
| Q-11 | Source and legality of collected job posts: hand-collected, anonymized, no scraping. Any employer-name handling rule? | owner decides | M1 | proposed: rules drafted in `evals/data/posts/README.md`, owner approval pending |
| Q-12 | Which official verification channels to link from Post Check (agency names and URLs must be verified current) | fact needed | M3 | open |
| Q-13 | Backend host for the demo (cold starts vs. memory limits); verify at M8 | fact needed | M8 | open |
| Q-14 | Timeline: confirm the proposed windows against Queueless and interview dates | owner decides | none | open |
| Q-15 | Capacity is about 20–30 analyses/day per provider (unmeasured). Add a bring-your-own-free-key mode (key held in the browser, never logged)? | owner decides after measuring tokens in M2 | M8 | open |
| Q-16 | Fresh-grad statistics conflict between sources (38.2% vs 35.6%); cite only the PSA release. Who confirms the final numbers for the README? | owner | M9 | open |
| Q-17 | Pick TypeScript libraries to replace the Python ones: fuzzy partial-match for quote verification (e.g. `fastest-levenshtein`, `fuse.js`, or a small custom partial-ratio), PDF text extraction, DOCX text extraction, BM25/embeddings. Must be free and maintained, and handle text vs. scanned PDFs (Q-09). Spike each on synthetic resumes first. **Spike done 2026-11-11 ([research/Q17_LIBRARY_SPIKE.md](research/Q17_LIBRARY_SPIKE.md)). Recommended: `unpdf` (PDF), `mammoth` (DOCX), own best-window matcher on `fastest-levenshtein` with a number guard and short-quote rule. `fuzzball` and `fuse.js` rejected; BM25 untested.** | owner decides | M4 | provisional: accepted 2026-11-11; follow-ups in docs/research/Q17_LIBRARY_SPIKE.md must pass before M4 closes |
| Q-18 | Demo hosting: confirm Render free supports the Node 22 runtime, and that the static web build deploys separately (Cloudflare Pages) | fact needed | M8 | open |
| Q-22 | Post Check rules need owner calls before they are tuned. (a) S04, S07, S10 (employer unidentifiable, borrowed agency identity, fake DOLE/DMW affiliation) need an employer or agency registry, not text rules: leave out of v1? (b) S02 fires on OTP, PIN, password, bank details and ID-selfie requests but not on SSS/TIN/ID numbers, which legitimate employers ask for at onboarding: accept? (c) No high-pay threshold for S08 (any figure would be a guess). (d) No text length limit beyond the 256 KB body cap; the prototype shows 6,000 characters. **Proposed:** accept (a)-(c); set the limit at 6,000 characters if the owner wants one | owner decides | M3 tuning | open |

## Closed

| ID | Question | Resolution | Closed |
|---|---|---|---|
| Q-09 | Unreadable or partially readable PDF: error or best-effort parse? | Error. Return a clear "can't read this file" message (NFR-04) and suggest DOCX or pasting text. No OCR: out of scope for this portfolio project | 2026-11-11 |
| Q-19 | Rename endpoints to resource nouns? | No. Keep `/post-check` and `/analyze`: action endpoints, nothing stored by ID. Revisit if analyses get saved. FR-11 unchanged | 2026-11-11 |
| Q-10 | Is the interview sample reachable before M1 ends? Who? | Moot. Interviews skipped by owner decision; assume pain points from published sources and validate in the M8 pilot (DECISIONS #31) | 2026-11-11 |
| Q-21 | Switch on branch protection for `main` and `staging`, and with how many required reviews on a single-owner repo? | Yes. PR required, `check` / `semgrep` / `secrets` must pass, zero required approvals (GitHub does not allow self-approval), no force pushes or deletion, enforced for the owner too. `dev` stays unprotected (DECISIONS #35) | 2026-11-12 |
| Q-20 | FR-04 still says "via a YAML taxonomy" but the taxonomy was dropped (DECISIONS #32). Revise FR-04 or keep it as an unmet requirement? | Keep as an unmet requirement and report it as a known gap. `docs/REQUIREMENTS.md` is not edited (AGENTS.md rule 10); FR-04 and FR-20 show as uncovered in `npm run trace` until M6 measures how the prompts cope. Owner may still revise FR-04 later (controlled edit, owner only) (DECISIONS #36) | 2026-11-12 |
