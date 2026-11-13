# Job-post corpus (Post Check)

**Status: approved 2026-11-13 (Q-11 closed, DECISIONS #46). The owner collects posts by hand; nothing is collected yet.**

Goal: 30+ posts to measure Post Check recall on scam-like posts and the false-positive rate on legit posts (NFR-15). Posts are text only.

## Sourcing rules

1. **Manual copy only.** The owner copies posts by hand. No scraping, bots, browser automation or API harvesting.
2. **Public posts only.** Posts the owner saw on public job boards or public social pages. Nothing from private groups, direct messages, or anything behind a login that the poster did not publish openly.
3. **Text only.** No screenshots or images (they carry faces, logos and handles).
4. **Composites are allowed and labelled.** Scam-like posts are scarce and risky to copy. The owner may write a composite from the patterns in `docs/research/POST_CHECK_SIGNALS.md`. Every file records its origin: `observed` or `composite`. Reports state the split.
5. **Nothing is collected from a person the owner knows** or that came from a victim's private report, unless that person gives explicit consent.

## Anonymize before the file is saved

Replace with placeholders, in the raw text, before saving. The unredacted text is never committed, pasted into a prompt or sent to a third-party tool (AGENTS.md "Confidentiality").

| Replace | With |
|---|---|
| Employer, agency and brand names | `[EMPLOYER]`, `[AGENCY]` |
| Person names, recruiter names | `[PERSON]` |
| Phone and messaging numbers | `[PHONE]` |
| Emails, URLs, social handles, group links | `[EMAIL]`, `[URL]`, `[HANDLE]` |
| Street addresses (keep city or region) | `[ADDRESS]` |
| Bank, e-wallet, DTI, SEC, license numbers | `[ACCOUNT]`, `[REG-NO]` |

Keep everything that is a signal: fee amounts, "hired agad", chat-only contact instructions, pay figures, urgency wording. Replace the identifier, not the behavior, so the quote spans stay realistic. A post whose signal cannot survive anonymization is dropped.

## Labels

- `legit`, `borderline`, `scam-like`. Never "scam": Post Check reports signals, not verdicts (DECISIONS #14), and a label on a real employer would be an accusation.
- The owner writes down the labeling criteria from `POST_CHECK_SIGNALS.md` before labeling, so labels are not shaped by what the rules already catch.
- Label each post once, from the post alone. No post is labeled after seeing the rule engine's output.
- A second labeler is optional; if used, record disagreements instead of resolving them silently.

## Held-out set

Set aside about 30% of posts as a **test split** that is not used while writing or tuning rules (M3). Report results on the test split; use the rest for development. Without this, the recall number is tuned to itself.

## File layout (proposed)

```
posts/
  p001.txt            anonymized text only
  labels.json         [{ "id": "p001", "label": "legit|borderline|scam-like",
                         "origin": "observed|composite", "split": "dev|test",
                         "collected": "2026-11", "board": "job-board|social|other",
                         "signals": ["fee-request", ...] }]
```

Store the month collected and a platform category, not the URL or poster. `signals` lists the expected rule ids, filled in at labeling time.

## Checks (proposed, not built)

A `check:posts` script that fails on anything that looks like an unredacted email, phone number, URL or handle in `posts/`, run in `npm run check`, the pre-commit hook and CI, the same way `check:local-data` works. Needs its own task and approval.
