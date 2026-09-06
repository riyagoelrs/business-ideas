# NYC Restaurant Hype Map

A browser-based visual prototype that maps NYC burger spots by **Beli score** and a lightweight **hype signal**.

## Why this version exists

The map is the product. There is no Excel workflow and no local Python setup required.

Once this folder is pushed to the `business-ideas` repository, the repo's existing GitHub Pages workflow deploys it automatically.

## Current prototype signals

- **Quality score:** 75% Beli burger rating + 25% public restaurant rating
- **Hype signal:** public review-volume signal + estimated access / reservation friction
- **Circle size:** hype signal
- **Circle color:** verdict

### Verdicts
- Worth the Hype
- Sleeper
- Hype > Score
- Mixed

## Data notes

Beli ratings come from Beli's public NYC burger ranking page:
https://beliapp.com/nyc-burger-search

Public restaurant ratings/review counts were refreshed on September 6, 2026.

The access / reservation-friction field is a prototype heuristic based on current public booking/access information. It should be replaced with a reproducible reservation-availability signal later.

## Next build

1. Pull TikTok mention velocity from the existing TikTok scraper.
2. Add Reddit mention velocity.
3. Add scheduled data refreshes.
4. Replace the estimated access score with actual reservation availability.
5. Expand beyond burgers to categories/neighborhoods.

## Expected public URL

`https://riyagoelrs.github.io/business-ideas/restaurant-hype-map/`
