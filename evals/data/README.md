# Eval data

**All data here is synthetic.** People, employers, license numbers, emails and phone numbers are fictional (NFR-11, AGENTS.md #5). Real resumes never go in this repo; owner-only local checks use the gitignored `local-data/` folder.

| Path | What | Status |
|---|---|---|
| `resumes/` | 5 synthetic resumes: IT, BPO/CSR, virtual assistant, nursing, data | done |
| `posts/` | 30+ hand-collected, anonymized job posts: legit, borderline, scam-like (Post Check corpus) | not started; owner collects, no scraping |
| `*.json` | Labeled resume/job pairs (see `docs/EVALS.md`) | M6 |

## Deliberate traps in the resumes

These exist so the guardrail and the FR-07 rules get exercised:

| Trap | Where |
|---|---|
| Java only in coursework, JavaScript in projects (similar-but-different skill) | `it-developer.txt` |
| Skill mentioned only under interests (Python scripting) | `it-developer.txt` |
| Same number written as `40%`, `35 percent`, `forty percent` | `it-developer.txt`, `data-analyst.txt` |
| Ranges ("15-20 bugs", "2 to 3 weeks", "8 to 10 patients") | all |
| Numbers with commas ("1,200", "1,500", "50,000") | most |
| PH credentials: TESDA NC II, Civil Service Sub-Professional / Professional, PRC RN license, Latin honors, Dean's Lister, OJT, RLE duty hours | most |
| Personal-detail habits (age, civil status) for resume-hygiene notes (FR-20) | `it-developer.txt` |
| Undergraduate degree, career gaps, part-time work | `bpo-csr.txt` |
| Freelance work history, degree not central to the role | `virtual-assistant.txt` |
