# 30-Day AI Curriculum — Build Signal While Learning

Goal: become AI-native in finance by shipping a working private-markets intelligence engine, not by completing disconnected courses.

Daily cadence: 20 min learn + 20 min use + 30-60 min build. One longer weekend shipping block.

## Week 1 — Foundations: models, APIs, prompting, code

### Day 1 — Model map
Learn the difference between Astra, Sol, Terra and Luna: capability, latency, cost, reasoning effort, context, tools.
Build: run the same private-markets question through Astra, Sol and Terra. Compare output quality, citations, speed and cost.
Deliverable: a model-routing rule for Signal.

### Day 2 — Tokens, context and cost
Learn input/output tokens, caching, context windows and why long prompts cost money.
Build: shorten Signal's system prompt without losing quality.
Deliverable: cost-per-market-screen estimate.

### Day 3 — Responses API
Learn request/response objects, IDs, status, persisted responses and background mode.
Build: launch one background research job from the app.
Deliverable: first successful remote research run.

### Day 4 — JSON + structured data
Learn JSON objects, arrays, schemas and why agents need structured outputs.
Build: define a target-company schema: company, URL, geography, services, ownership clues, scale signals, score, sources.
Deliverable: machine-readable target table.

### Day 5 — Python fundamentals
Learn variables, lists/dicts, loops, functions, requests and pandas.
Build: write a tiny script that takes target-company JSON and ranks targets.
Deliverable: deterministic scoring layer separate from the model.

### Day 6 — Git/GitHub
Learn branches, commits, diffs, pull requests and rollback.
Build: inspect this branch and make one small UI or prompt change yourself.
Deliverable: first personally understood code change.

### Day 7 — Ship + review
Run 3 industries through Signal. Grade hallucinations, usefulness, source quality and missing data.
Deliverable: v0.1 scorecard and top 5 bugs.

## Week 2 — Agents and tools

### Day 8 — What an agent actually is
Learn model + instructions + tools + state + loop + stopping condition.
Build: diagram Signal's research loop.

### Day 9 — Tool calling
Learn function/tool schemas and deterministic actions.
Build: add one deterministic scoring tool instead of asking the model to invent a score.

### Day 10 — Web search
Learn search planning, source quality and evidence gathering.
Build: improve source hierarchy: primary > government > trade > credible press > secondary databases.

### Day 11 — Structured Outputs
Learn schemas and validation.
Build: return the company universe in strict structured form alongside the memo.

### Day 12 — State and persistence
Learn response IDs, sessions and databases.
Build: save every screen to a persistent history rather than losing it on refresh.

### Day 13 — Background jobs + webhooks
Learn long-running tasks and event callbacks.
Build: notify the app when research completes instead of only polling.

### Day 14 — Ship + review
Run one market screen entirely from your phone while away from your laptop.
Deliverable: remote-control milestone.

## Week 3 — Data moat and private-markets workflow

### Day 15 — SQL
Learn SELECT, WHERE, GROUP BY, JOIN, ORDER BY.
Build: query your saved target universe.

### Day 16 — Database design
Learn entities, IDs, normalization vs convenience.
Build tables for markets, companies, evidence, runs and scores.

### Day 17 — Data enrichment
Learn APIs and public-data ingestion.
Build: enrich targets with one external public source rather than relying only on generated research.

### Day 18 — Entity resolution
Learn why matching 'ABC Heating LLC' across sources is hard.
Build: company deduplication and canonical records.

### Day 19 — Scoring systems
Learn weights, normalization, missing values and model-vs-rule judgments.
Build a PE screen with factors like fragmentation, recurring revenue, local density, review velocity and ownership clues.

### Day 20 — Evals
Learn test cases and graders.
Build 10 benchmark market screens and score factuality, target validity and decision usefulness.

### Day 21 — Ship + review
Deliverable: v0.2 with persistent proprietary target data and an eval score.

## Week 4 — Automation, orchestration and monetization

### Day 22 — Model routing
Build cheap-first routing: Terra for extraction/classification, Sol for synthesis, Astra for difficult IC-level work.

### Day 23 — Multi-agent design
Learn when specialists help and when they add complexity.
Build only if evals justify it: Researcher → Target Screener → Investment Committee Critic.

### Day 24 — Mid-turn steering
Learn how Astra can accept additional guidance during a run.
Build a phone control like 'focus on founder-owned businesses' or 'stop researching this subsegment'.

### Day 25 — Monitoring agent
Build recurring watchlists for markets/companies: acquisition news, ownership changes, hiring, new locations, reviews and filings.

### Day 26 — Notifications
Add push/email/ChatGPT-style alerts for material changes and completed jobs.

### Day 27 — Approval gates
Add buttons for human approval before expensive work or external actions: 'Deep dive', 'Add to watchlist', 'Generate outreach list'.

### Day 28 — Product economics
Calculate API cost, gross margin, pricing and customer ROI. Design a $49/$199/bespoke pricing test.

### Day 29 — User test
Give Signal to 3 people who understand investing/search funds/PE. Watch what they actually use and where they distrust it.

### Day 30 — IC Day
Choose one market. Use Signal to produce the strongest investment thesis you can. Present: market, 10 targets, thesis, risks, diligence plan, acquisition strategy, what the agent discovered, what required human judgment, and next 30-day roadmap.

## Your model routing default
- GPT-5.6 Terra: extraction, tagging, classification, repetitive screening.
- GPT-5.6 Sol: normal professional analysis, synthesis and code iteration.
- GPT-6 Astra: hard research, ambiguous judgment, IC-quality synthesis, complex agentic workflows and difficult debugging.

Rule: do not use Astra because it is impressive. Use Astra when better judgment is worth the incremental cost.

## Non-negotiable finance boundary
Use only public, synthetic or personally owned data in this project unless your employer explicitly approves otherwise. Never put MNPI, confidential client materials, internal models, CIMs, banker books or restricted work product into the app.
