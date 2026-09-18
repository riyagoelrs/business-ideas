# Riya OS — Market Intelligence

A local-first personal market intelligence and opportunity engine.

## Live app

GitHub Pages path: `/business-ideas/personal-ai-os.html`

## v1 workflow

1. Capture the strongest signals from the daily market brief.
2. Promote a signal into an opportunity.
3. Score novelty, market size, timing and evidence.
4. Define the cheapest test that could invalidate the thesis.
5. Automatically create four workstreams:
   - Finance — model the economics
   - Content — explain the insight
   - Outreach — find informed people
   - Build — create a data test
6. Track the research question to completion.

## Storage

The page works immediately using browser localStorage.

For cross-device cloud sync, use **Create account** / **Sign in** in the sidebar. The app connects to the existing Supabase project using its publishable browser key.

Cloud tables:
- `market_briefings`
- `market_opportunities`
- `market_research_tasks`
- `market_workstreams`

All four tables have Row Level Security enabled. Anonymous access is revoked; authenticated users can only access rows where `user_id = auth.uid()`.

## What should come next

### v1.1 — Automated ingestion
- RSS/news/source ingestion
- source provenance
- deduplication
- signal extraction
- daily briefing automatically saved to the dashboard

### v1.2 — AI opportunity analyst
- generate opportunity candidates from sources
- explain supporting and contradicting evidence
- score confidence separately from attractiveness
- suggest falsification tests

### v1.3 — Finance handoff
- company/ticker extraction
- comps/model queue
- Excel model generation
- research packet with source traceability

### v1.4 — Content + outreach handoffs
- turn selected opportunities into script drafts
- identify relevant experts/operators/investors
- create approved outreach drafts

## Guardrails

- Do not ingest employer/client confidential information or MNPI.
- Public/sanitized research only.
- Trade ideas remain research hypotheses until compliance review and user approval.
- Outbound messages and publishing require human approval.
