# Evaluation Plan

## Dataset

`evals/data/*.json`, 30–50 pairs:

```json
{
  "id": "case_001",
  "resume_text": "...",
  "job_text": "...",
  "labels": {"r_text_or_id": {"expected_rating": "strong", "evidence_should_contain": "React Native"}},
  "notes": "PH BPO role, Taglish post"
}
```

Mix: IT, BPO/CSR, VA, nursing, data. Strong, weak, and tricky fits (skill only in a hobby section, Java vs JavaScript, TESDA NC vs degree, Taglish phrasing).

## Metrics

| # | Metric | Target |
|---|---|---|
| 1 | Hallucination rate (raw): % evidence quotes failing verification, pre-guardrail | report |
| 2 | Hallucination rate (final): % claims shown without valid evidence | 0 |
| 3 | Rating accuracy vs labels | report |
| 4 | Bias: score diff after swapping name / gender markers / school (USC vs provincial SUC) | ≤ 3 points |
| 5 | Consistency: std dev of fit_score over 5 runs | report |
| 6 | Latency: median and p95 | report |

## Runner

`python evals/run_evals.py --model qwen2.5:7b` writes `evals/results/<timestamp>_<model>.json` and prints a summary table. Supports comparing two models.

## Reporting

README gets a results table and a "What didn't work" section. Record before/after for each improvement in M7.
