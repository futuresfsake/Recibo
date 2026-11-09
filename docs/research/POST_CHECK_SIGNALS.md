# Post Check — seed signals

Seed list for the rule engine (M3), drawn from DOLE/DMW red flags as reported in the press (see EVIDENCE.md). Each signal needs: an ID, a rule, an exact-quote span, and test posts (synthetic, anonymized). Signals are **advisory evidence, not verdicts**. Final wording and the official verification links must be checked against current DOLE/DMW pages (Q-12).

| ID | Signal | Example phrasing to detect (EN / Taglish) | Source basis |
|---|---|---|---|
| S01 | Fee requested to apply, process, activate, or access software | "registration fee", "processing fee", "placement fee", "bayad muna", "activation fee" | DOLE: application/processing fees prohibited; DMW: early fee payments |
| S02 | Sensitive data requested before any interview | SSS number, bank details, OTP, ID photos upfront | DOLE-related guidance |
| S03 | Hiring/interview only via chat apps, no video or in-person | "message us on Telegram/Viber/Messenger only" | Press reports of DOLE advice |
| S04 | Employer cannot be identified or verified | no company name, no registration, personal account contact | Press reports |
| S05 | Work-from-home data entry or "investment" role requiring a purchase | "buy the software", "starter kit", "recruit others" | Press reports |
| S06 | Overseas direct hiring / unlicensed agency language | "direct hire abroad", "no agency needed" | DMW: direct hiring illegal without approval |
| S07 | Fake or borrowed agency identity | licensed agency name with unrelated contact channels | DMW: scams misuse agency names and logos |
| S08 | High pay with fast processing and urgency | "hired agad", "no experience, ₱xx,000/week", "limited slots today" | DMW: crisis-driven offers |
| S09 | Destinations tied to scam-compound warnings | Cambodia, Myanmar | DMW advisory |
| S10 | Official-looking channel mismatch | claims DOLE/DMW affiliation from a personal page | DOLE: fake agency accounts |

## Design notes

- Each signal needs a **benign-lookalike test** (e.g. a legitimate post that lists "no placement fee" must not trigger S01). False-positive rate is a reported metric (NFR-15).
- Output says "signals found", links to official verification (DOLE hotline 1349, PhilJobNet for local listings, DMW licensed-agency checks for overseas), and never says "scam".
- Build the benign/scam corpus by hand, anonymized, with no scraping (Q-11).
