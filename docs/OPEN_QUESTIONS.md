# Open Questions (decisions register)

Status is mutable; resolved items move to the closed list and are not edited again. "Blocks" says which tasks cannot start.

| ID | Question | Owner class | Blocks | Status |
|---|---|---|---|---|
| Q-01 | Default model: `qwen2.5:7b` or `llama3.2:3b`? Depends on laptop RAM and measured latency | fact needed (benchmark in M1) | M2 | open |
| Q-02 | Resume chunking: by section, by fixed size with overlap, or per bullet? | owner decides after M3 spike | M3 | open |
| Q-03 | Resume storage: persist full text in history, or only the analysis + quotes? Retention and delete-my-data for a public demo | owner decides | M3 (NFR-10) | open |
| Q-04 | `CITATION_MATCH_THRESHOLD` start value (90 proposed) and whether to normalize whitespace/case before matching | tune in M4 with unit cases, finalize in M7 | M4 | open |
| Q-05 | Score weights: required vs preferred, and how partial counts (proposed required 3, preferred 1; strong 1.0, partial 0.5, gap 0) | owner decides | M4 | open |
| Q-06 | Eval labels: who labels the 30–50 pairs, and are synthetic resumes acceptable? (proposed: synthetic only, written by owner) | owner decides | M6 | open |
| Q-07 | Free hosted LLM choice (Groq vs Gemini) and current free limits | fact needed (verify at M8) | M8 | open |
| Q-08 | Repo name `Recibo` vs project `Resibo`: rename the GitHub repo? | owner decides | none | open |
| Q-09 | Is a missing/unreadable PDF section an error or best-effort parse? | owner decides | M2 | open |

## Closed

_None yet._
