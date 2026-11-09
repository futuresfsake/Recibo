# Evidence log

Researched **2026-11-09** via web search. Most sources are news coverage or third-party guides, not primary documents. Anything a feature depends on must be re-checked against the official source before launch. Figures that conflicted between sources are marked and not used.

## 1. Pain points

### P1 — Scam and illegal recruitment: supported

- The DMW issued multiple 2026 warnings about fake overseas job offers on social media, including Advisory No. 22 s. 2026, a DMW–PNP Anti-Cybercrime Group tie-up (Nov 2026) and enforcement actions such as a Manila consultancy shut down over a Poland job scam where applicants were charged ₱300,000 each. DMW reports 146,871 illegal-recruitment posts removed from Facebook and 57,557 from TikTok (2020–2026). ([Tribune, DMW intensifies drive](https://tribune.net.ph/2026/05/25/dmw-intensifies-drive-vs-online-overseas-job-scams-illegal-recruitment), [Tribune, DMW–PNP ACG](https://tribune.net.ph/2026/11/06/dmw-pnp-acg-team-up-vs-online-recruitment-scams), [Philstar, Poland scam](https://www.philstar.com/other-sections/newsmakers/2026/07/01/2539088/manila-based-consultancy-shut-over-poland-job-scam), [GMA](https://www.gmanetwork.com/news/balitambayan/pinoyabroad/988899/dmw-pinaigting-ang-kampanya-laban-sa-online-job-scams-at-illegal-recruitment/story/))
- DOLE has repeatedly warned about fake social-media job offers and fake DOLE accounts, and points local job seekers to PhilJobNet. ([PTV, DOLE warns](https://ptvnews.ph/dole-warns-about-scam-job-offers-made-online/), [Manila Bulletin 2024](https://mb.com.ph/2024/3/19/dole-reminds-job-seekers-to-be-wary-of-online-recruitment-scams))
- Caveat: the DMW advisory text itself was not found on an official site; red flags above come from press reports of it.

### P2/P4 — Fresh graduates struggle; experience requirements: partly supported

- PSA data (June 2026): unemployment rose to about 2.59 million, with the increase tied mainly to more new graduates entering the labor force; analysts said the market could not absorb them. ([Manila Bulletin, Aug 2026](https://mb.com.ph/2026/08/06/fresh-graduates-struggle-as-june-unemployment-rises-to-259-million))
- Employers often ask for experience or skills students don't have yet. ([FEU Advocate, Feb 2026](https://feuadvocate.net/?p=11136))
- Many graduates work outside their field; shortage of quality jobs. ([Davao Today](https://davaotoday.com/economy/shrinking-job-market-leaves-college-graduates-struggling-as-government-falls-short/))
- Nursing/medical graduates face weak prospects, partly due to civil-service requirements. ([EurekAlert, Ateneo survey](https://www.eurekalert.org/news-releases/1087153))
- **Conflict, not used:** sources disagree on the fresh-grad unemployment percentage (38.2% vs 35.6%). Cite only the PSA release when a number is needed.

### Not yet evidenced

P3 (silent rejections/ghosting), P5 (PH resume habits: photo, age, civil status), P6 (Taglish posts), P7 (AI tools inventing experience as a *user* problem), P8 (data cost). These stay hypotheses until the M1 interviews.

## 2. Free-tier facts affecting the architecture

| Service | Finding | Impact |
|---|---|---|
| Groq | Limits are per model and per organization. One guide lists, for `openai/gpt-oss-120b`: 30 RPM, 1,000 RPD, 8,000 TPM, 200,000 TPD | **Token caps, not request caps, are the binding limit** |
| Gemini API | Limits are per project, not fixed numbers; shown in AI Studio | Cannot plan capacity from docs; read the dashboard at build time |
| OpenRouter | Free models: 20 requests/min, 50/day (1,000/day after buying $10 credit) | Too low as a primary provider; last-resort fallback only |
| Cloudflare Workers AI | 10,000 Neurons/day on Free plan, requests fail once exhausted; some large models need a paid plan | Usable as a small fallback |
| Render free web service | Spins down after 15 min idle, about 1 min to wake; 750 free hours/month shared across the workspace; ephemeral disk; docs reportedly say not for production | Acceptable for a demo with a "waking up" state |
| Hugging Face Spaces | Docs list CPU Basic as 2 vCPU / 16 GB free, but also say Docker/Gradio Spaces require a paid plan; forum reports of free CPU Basic being restricted around July 2026 (unconfirmed) | **Do not rely on it** as the backend |
| Vercel Hobby | Non-commercial personal use only | OK for a portfolio demo; Cloudflare Pages is safer if it ever turns commercial |
| Cloudflare Pages | Free: 500 builds/month, 1 concurrent build, 20-min build timeout; static requests generally unlimited. Functions share the Workers quota (third-party claim: 100,000 requests/day) | Good fit for the static frontend |

Sources: [OpenRouter free LLM comparison](https://openrouter.ai/blog/tutorials/free-llm-apis-compared/), [KDnuggets](https://www.kdnuggets.com/5-free-llm-api-providers-you-can-use-in-2026), [aireiter](https://aireiter.com/blog/best-free-ai-api), [Render FAQ](https://render.com/docs/faq), [Render free tier notes](https://justinmckelvey.com/blog/is-render-free), [Hugging Face Spaces overview](https://huggingface.co/docs/hub/en/spaces-overview), [HF forum thread](https://discuss.huggingface.co/t/official-community-complaint-revert-free-cpu-basic-spaces-and-remove-anti-developer-sdk-restrictions/177703), [Vercel fair use](https://vercel.com/docs/limits/fair-use-guidelines), [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits).

## 3. Capacity estimate (assumption, to be measured)

A Fit Check sends a resume plus a post plus instructions, roughly 6,000–10,000 tokens across 3 calls (unmeasured guess). At a 200,000 tokens/day cap that is about **20–30 analyses per day per provider**, not hundreds. So the public demo is pilot-scale, and token use per analysis must be measured in M2 and minimized (trim inputs, short prompts, cache).
