# PE Roll-Up Finder

A browser-based sourcing screen for private-equity buy-and-build ideas.

**Live demo:** https://riyagoelrs.github.io/business-ideas/pe-rollup-finder/

## What it does

- Search a city / metro and fragmented local-service industry.
- Pull public operators from OpenStreetMap using Nominatim + Overpass.
- Estimate independence / fragmentation and rank targets.
- Visualize every operator on an interactive map.
- Filter and export a target shortlist.
- Pressure-test a simplified five-year roll-up case with entry/exit multiples, leverage, and synergies.

## Industries

HVAC, plumbing, electrical contractors, landscaping, pest control, auto repair, car washes, veterinary clinics, dentists, physical therapy, laundromats, and self storage.

## Scoring

Market score:

- 50% estimated fragmentation
- 30% operator density
- 20% size of the target universe

Target score:

- independence / branding signal
- nearby operator density
- public contact completeness
- public address completeness

## Run locally

The hosted version is static and requires no build step.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/pe-rollup-finder/` from the repository root.

## Limitations

OpenStreetMap coverage varies materially by market and industry. The scores are sourcing heuristics, not valuation, diligence, or investment recommendations. A stronger V2 would enrich targets with reviews, owner/contact data, Secretary of State records, website data, headcount, estimated revenue/EBITDA, and sponsor-backed chain detection.
