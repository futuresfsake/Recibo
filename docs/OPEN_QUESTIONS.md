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
| Q-09 | Unreadable or partially readable PDF: error or best-effort parse? | owner decides | M4 | open |
| Q-10 | Is the interview sample (8–10 job seekers, 2–3 recruiters) reachable before M1 ends? Who? | owner | M1 | open |
| Q-11 | Source and legality of collected job posts: hand-collected, anonymized, no scraping. Any employer-name handling rule? | owner decides | M1 | open |
| Q-12 | Which official verification channels to link from Post Check (agency names and URLs must be verified current) | fact needed | M3 | open |
| Q-13 | Backend host for the demo (cold starts vs. memory limits); verify at M8 | fact needed | M8 | open |
| Q-14 | Timeline: confirm the proposed windows against Queueless and interview dates | owner decides | none | open |
| Q-15 | Capacity is about 20–30 analyses/day per provider (unmeasured). Add a bring-your-own-free-key mode (key held in the browser, never logged)? | owner decides after measuring tokens in M2 | M8 | open |
| Q-16 | Fresh-grad statistics conflict between sources (38.2% vs 35.6%); cite only the PSA release. Who confirms the final numbers for the README? | owner | M9 | open |
| Q-17 | Which response format does each hosted provider in the chain accept: `json_schema` or only `json_object`? The client supports both (default `json_schema`); the per-provider setting is unverified | fact needed | M2 router config | open |
| Q-18 | The one retry on invalid LLM output re-sends the same request. Should it instead tell the model what failed validation? That needs a repair prompt file in `app/prompts/` and costs more tokens | owner decides | none (current behaviour works) | open |
| Q-19 | Q-01 is marked as blocking all of M2, but the client code does not depend on the default model. Narrow Q-01 to "blocks choosing the default in config"? | owner decides | none | open |

## Closed

_None yet._
