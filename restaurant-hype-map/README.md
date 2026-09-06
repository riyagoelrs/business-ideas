# NYC Restaurant Hype Map

A free restaurant-intelligence map for NYC that separates **attention** from **quality**.

The product is designed to answer three questions:

1. Which restaurants are getting attention right now?
2. Is that attention accelerating?
3. Is quality keeping up with the hype?

## Headline metrics

Every restaurant can have:

- **Hype Score (0–100):** current attention and momentum.
- **Quality Score (0–100):** quality evidence from free/public sources.
- **Hype Gap:** Hype minus Quality.
- **Data Coverage (0–100):** how much of the free source stack contributed.

Missing sources are reweighted instead of being treated as zero.

## Strictly $0 source stack

No Google Places, Yelp, Tripadvisor or paid Reddit API is required.

### Hype Score

| Source | Default weight | Signal |
|---|---:|---|
| TikTok | 65% | 7-day mention growth, mention volume, views, engagement |
| Public web/news | 25% | 30-day mentions, 7-day velocity, number of distinct publishing domains |
| Reservation scarcity | 10% | optional free snapshot when a reliable public source is available |

The public-web layer uses the no-key GDELT DOC 2.0 endpoint.

### Quality Score

| Source | Default weight | Signal |
|---|---:|---|
| Beli | 85% | published Beli category rating |
| Restaurant website | 15% | structured `aggregateRating` metadata when the restaurant's public site publishes it |

Beli is a **quality input**, not the Hype Score.

## Restaurant universe

OpenStreetMap supplies the broad NYC restaurant universe, coordinates, cuisine tags and website URLs without a paid mapping key. The refresh job currently requests up to roughly 1,600 named restaurant records per run.

## TikTok

The project reuses `riyagoelrs/tiktok-scraper` and automatically searches public TikTok for:

- `nyc restaurants`
- `nyc food`
- `new york restaurants`

The resulting JSON is matched against restaurant names and aggregated into:

- mentions in the latest 7 days
- mentions in the previous 7 days
- views in the latest 7 days
- likes + comments + shares
- distinct creators

TikTok collection is best-effort because the unofficial TikTokApi can be blocked or changed by TikTok. A free `TIKTOK_MS_TOKEN` GitHub secret can improve reliability, but no paid key is required. The rest of the data job still runs if TikTok fails.

## Public web signal

For restaurants surfaced by Beli or TikTok, GDELT provides a zero-cost cross-publication signal:

- mentions in 30 days
- mentions in 7 days
- mentions in the previous 7 days
- distinct publishing domains
- example articles

This creates a second independent momentum signal beyond TikTok.

## Signals

- **Worth the hype:** Hype and Quality are both high and close together.
- **Overhyped:** Hype is at least 15 points above Quality.
- **Sleeper:** Quality is at least 15 points above Hype.
- **Hot:** Hype is high while quality is incomplete or not equally high.
- **Balanced:** no major divergence.
- **Low coverage / Not enough hype data:** insufficient source breadth for a confident call.

## Automation

`.github/workflows/restaurant-hype-refresh.yml` runs daily on GitHub's public-repository runner and can also be triggered manually. It:

1. checks out the TikTok scraper,
2. attempts free TikTok collection,
3. refreshes OpenStreetMap,
4. refreshes Beli public lists,
5. queries GDELT public web coverage,
6. inspects public restaurant-site structured metadata,
7. calculates Hype / Quality / Gap / Coverage,
8. writes `data/restaurant_scores.json`, and
9. publishes the latest snapshot to the `gh-pages` branch.

## Main files

- `pipeline/score_model.py` — scoring logic
- `pipeline/refresh_scores.py` — zero-cost collectors and normalization
- `data/restaurant_scores.json` — generated output
- `index.html` — public map

## Public URL

`https://riyagoelrs.github.io/business-ideas/restaurant-hype-map/`
