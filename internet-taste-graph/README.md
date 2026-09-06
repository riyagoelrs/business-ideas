# Internet Taste Graph

Internet Taste Graph is a consent-first browser prototype that turns a person's digital and physical behavior into an editable taste model, then maps both what they already know and the cultural whitespace they have not explored yet.

Live app: https://riyagoelrs.github.io/business-ideas/internet-taste-graph/

## V3 product flow

The product now follows five steps:

1. **Connect / import signals** — Search, YouTube, social, places, browser history, or manually stated interests.
2. **Review the Signal Inbox** — Every detected interest is visible before it shapes the model. Users can boost, reduce, remove, mark as core taste, mark as current curiosity, or mute it.
3. **Build My World** — Known and adjacent entities are mapped across brands, places, creators, media, products, aesthetics and restaurants.
4. **Reveal My Whitespace** — Dashed ghost nodes represent high predicted affinity with low prior exposure.
5. **Enter a World** — Recommended nodes link outward to relevant YouTube, web, creator and Maps discovery routes.

## Signal model

The prototype combines source intent, user weighting and role:

- repeat places are high-signal offline evidence
- searches and watch history are high-intent curiosity signals
- following / saves / likes represent chosen cultural inputs
- generic browser history is broad but lower-confidence
- manual interests can capture things that are not present in an export yet
- **Core** signals represent persistent taste
- **Current** signals represent temporary or emerging curiosity and are discounted relative to core taste
- **Muted** signals do not influence the graph

Imported JSON, CSV, TXT and HTML files are parsed locally in the browser. ZIP support loads a browser-side ZIP helper only when the user actually selects a ZIP. Raw history is not uploaded by the GitHub Pages prototype; only derived signal weights are stored in local storage.

## Whitespace

Unknown does not automatically mean relevant. For each entity the prototype estimates:

- **Affinity** — similarity to the user's active signals
- **Bridge value** — whether the entity connects multiple strong parts of the taste profile
- **Exposure** — direct evidence that the user already knows or consumes it
- **Whitespace** — affinity × bridge value × novelty × (1 − exposure)

The UI renders:

- solid nodes = **Known**
- outlined nodes = **Adjacent**
- dashed translucent nodes = **Whitespace**

Users can also tell the graph “more like this,” “less like this,” or “I already know this,” and that feedback changes the model.

## Current architecture

- `index.html` — Connect → Review → Map → Whitespace product shell
- `styles.css` — responsive visual system
- `taste-data.js` — curated cross-category entity universe and demo profile
- `taste-engine.js` — signal ingestion, local persistence, affinity, exposure, bridge and whitespace scoring
- `taste-ui.js` — editable Signal Inbox, native SVG graph, feedback controls and discovery links

The core graph uses native SVG and has no visualization-library dependency. ZIP parsing is lazy-loaded only for ZIP imports.

## What a production version needs

The GitHub Pages build remains a prototype. A production version should add:

- approved OAuth / data-portability integrations for supported platforms
- a browser extension for ongoing user-consented browsing signals
- a larger entity and content index using embeddings, entity resolution and co-occurrence
- audience-overlap signals separated from the user's own consumption graph
- timestamps and proper recency decay so short-term obsessions do not overwrite long-term taste
- fresh content retrieval so every whitespace node resolves to specific videos, articles, creators, products and nearby places rather than search-result links
- encrypted user accounts, source-level privacy controls, export and deletion

## Privacy model

This product handles unusually intimate behavioral data. The intended design is explicit consent, source-level controls, visible explanations for every recommendation, user-editable signals, user-visible deletion and minimizing retention of raw history.

## License

MIT
