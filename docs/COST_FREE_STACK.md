# Cost-free stack

Rule: ₱0 and no credit card at any layer. Free-tier terms change, so every row marked **verify** must be re-checked on the provider's site at build time (M8) and the date recorded here.

| Layer | Choice | Why free | Card needed? | Risk | Fallback |
|---|---|---|---|---|---|
| Dev LLM | Ollama (`qwen2.5:7b` or `llama3.2:3b`) | Local, open weights | No | Slow on weak laptops | Smaller model; compare in evals |
| Dev embeddings | Ollama `nomic-embed-text` | Local | No | none | BM25-only retrieval |
| Hosted LLM (demo) | Ordered chain: Groq first, Gemini second, Cloudflare Workers AI third, OpenRouter free models last. Researched 2026-11-09; see `research/EVIDENCE.md` | Free quotas | **verify per provider** | **Token caps bind first (about 20–30 analyses/day on one provider, unmeasured estimate)**; ToS changes | Next provider; deterministic-only mode; bring-your-own-key option (Q-15); demo video |
| Frontend hosting | Cloudflare Pages or Vercel Hobby — **verify** (Vercel Hobby is non-commercial) | Free static hosting | No | Terms | Either one; GitHub Pages |
| Backend hosting | **Render free web service** (sleeps after 15 min idle, about 1 min wake, 750 shared hours/month). Hugging Face Spaces dropped: Docker Spaces reportedly need a paid plan | Free tier | **verify** | Cold starts; terms say not for production | Keep the Node API light (no local model); show a "waking up" state; ping on page load |
| Database | None in production. Dev/eval: Postgres + pgvector in Docker | Local | No | none | If ever needed: Neon or Supabase free |
| Bot protection | Cloudflare Turnstile — **verify** | Free tier | No | none | Per-IP rate limit only |
| CI | GitHub Actions (public repo) | Free minutes | No | Minutes cap | Run checks via local hooks |
| Secrets scanning | gitleaks + ggshield (free tier) | Free | No | none | Either one alone |
| Domain | Provider subdomain (`*.pages.dev`, `*.vercel.app`) | Free | No | none | none needed |
| Monitoring | Provider logs + a free uptime pinger (**verify**) | Free | No | none | Manual health checks |

## Call budget (sizing the free quota)

- Fit Check: ≤ 3 LLM calls (extract, judge, suggest). Post Check: ≤ 1.
- Cache hit on identical input: 0 calls.
- Daily capacity ≈ (sum of provider daily request limits) ÷ calls per analysis. Compute this from the verified limits at M8 and record it here.
- Kill switch env var turns hosted LLM off when quota is near exhaustion; the app keeps serving deterministic results.

## What would break the ₱0 rule (do not do)

Paid API keys, paid hosting tiers, anything that asks for a card "just for verification", Cloud Run/Fly/AWS-style billing accounts, paid vector databases, paid captcha.
