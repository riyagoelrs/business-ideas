# Signal — Private Markets Intelligence

Signal is a mobile-first private-markets research engine. Enter an industry, geography and investment screen; the app launches a background OpenAI research job and returns an investor-grade market brief with target companies, evidence, risks and diligence questions.

## V1 architecture

Phone/browser → Next.js UI → `/api/research` → OpenAI Responses API in background mode → web search → `/api/status/:id` polling → completed brief.

Model routing is user-selectable:
- `gpt-6-astra` for hardest research and judgment
- `gpt-5.6-sol` for strong professional analysis at lower cost
- `gpt-5.6-terra` for efficient screening

## Environment variables

- `OPENAI_API_KEY` — required, server-side only
- `REMOTE_PIN` — optional lightweight gate for a personal deployment

Never commit either value.

## Local run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## V1 use case

Example:
- Industry: HVAC services
- Geography: North Carolina
- Screen: fragmented founder-owned operators, recurring maintenance, tuck-in acquisition potential

Expected output:
- 0-100 market attractiveness score
- market structure and why-now thesis
- geography analysis
- up to 15 real target companies with evidence and scores
- value-creation playbook
- key risks
- top diligence questions
- sources

## Roadmap

V0.2: strict structured company schema, deterministic scoring, saved history, persistent target database.

V0.3: watchlists, recurring monitors, company-change alerts, model router, cost tracking, eval harness.

V0.4: specialist agents only where evals show improvement: Researcher → Target Screener → IC Critic.

V0.5: phone steering and approval actions: Deep Dive, Add to Watchlist, Re-screen, Generate Diligence Plan.

## Security boundary

This is for public, synthetic and personally owned information. Do not use employer-confidential information, client data, MNPI, internal models, CIMs, restricted research or other non-public work product without explicit employer approval.

See `30-day-curriculum.md` for the learning plan that builds the product in parallel.
