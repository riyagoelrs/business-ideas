# Internet Taste Graph

A browser-based cultural discovery prototype that maps adjacent brands, creators, restaurants, products, places, media and aesthetics from a handful of taste signals.

## What works in this MVP

- Enter 3–5 interests or a seed account/name.
- Generates a taste profile and “Taste DNA.”
- Interactive D3 force-directed graph.
- Click any node to re-center the graph around it.
- Taste-distance control: Safe → Adjacent → Weird.
- Toggle categories on/off.
- “Surprise Me” wildcard discovery.
- Explainable recommendations in the side inspector.
- Share-card text copied to clipboard.
- Responsive, no-build static site.

## Run

Open `index.html`, or serve the folder:

```bash
python3 -m http.server 5173
```

Then visit `http://localhost:5173/internet-taste-graph/` if serving from the repository root.

## Current data model

The MVP uses a curated local entity graph with category, tags and descriptions. Similarity is calculated from direct seed matches plus tag overlap, semantic-style adjacency and a novelty target controlled by the taste-distance slider.

This intentionally avoids pretending the prototype has live Instagram/TikTok audience data. A production version should add embeddings, audience-overlap signals, co-mentions, geospatial data and account ingestion.

## Next build

1. Replace curated-only matching with embeddings.
2. Add a real entity database and search/autocomplete.
3. Add account ingestion where APIs permit it.
4. Add location-aware discovery and map mode for restaurants/places.
5. Generate shareable PNG graph cards.
6. Persist user graphs and compare two taste profiles.
