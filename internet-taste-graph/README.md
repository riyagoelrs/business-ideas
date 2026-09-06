# Internet Taste Graph

Internet Taste Graph is a browser-based prototype for turning a person's digital and physical behavior into a navigable taste profile.

Live app: https://riyagoelrs.github.io/business-ideas/internet-taste-graph/

## V2: behavioral taste signals

The graph can now combine:

- typed accounts, interests and current obsessions
- Google/Search or My Activity exports
- YouTube search/watch-history exports
- social account exports containing following, followers, likes or saves
- Maps/Timeline/place-history exports
- browser-history exports

The static prototype accepts ZIP, JSON, CSV, TXT and HTML files. Files are parsed in the browser. It stores derived keyword weights in `localStorage`; the raw imported history is not uploaded by this demo.

Each source is intentionally weighted differently. High-intent or repeated behavior (places, saves/likes, searches and watch history) should matter more than generic browsing. Following is a better self-taste signal than followers; followers are eventually most useful for a separate audience graph.

## Personalized discovery feed

The behavioral layer generates a ranked discovery feed with:

- a taste-fit score
- a novelty score
- the signals that caused the recommendation
- direct routes to YouTube, Google, Instagram and Maps searches for the recommendation

The goal is not only to say “you may like X,” but to make the next rabbit hole one click away.

## Current architecture

`index.html` — product shell and graph UI  
`styles.css` — original graph design  
`app.js` — curated cross-category graph and interactive visualization  
`signals.css` — behavioral-ingestion and discovery-feed UI  
`signals.js` — local import parsing, signal weighting, evidence and recommendation ranking

## What a production version needs

The live GitHub Pages build is still a prototype. A production version should add a backend plus consented OAuth/data-portability integrations and a much larger entity/content index.

Recommended ingestion order:

1. Google Takeout / My Activity for Search + YouTube history
2. TikTok Data Portability where eligible and approved
3. Instagram account data export / approved Meta surfaces
4. browser extension for ongoing browser-history signals
5. Maps/Timeline or other user-provided place history
6. optional manual interests and account handles

The recommendation layer should then move from the small curated catalog to embeddings + entity resolution + co-occurrence + audience overlap + place affinity, with fresh content retrieval for each recommended node.

## Privacy model

This product handles unusually intimate behavioral data. The intended design is explicit consent, source-level controls, clear explanations of why every recommendation exists, user-visible deletion, and minimizing retention of raw history.

## License

MIT
