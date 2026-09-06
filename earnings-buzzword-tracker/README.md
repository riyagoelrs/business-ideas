# SignalCall — Earnings Call Buzzword Tracker

SignalCall is a no-build browser app for tracking the words and narratives that spread across earnings calls.

## What it does

- Track custom phrases such as `AI`, `tariffs`, `consumer pressure`, `GLP-1`, `pricing`, or `inventory`.
- Compare phrase momentum across periods.
- See which companies are adopting a narrative.
- View a company × narrative heatmap.
- Rank the fastest-rising buzzwords.
- Pull matched-call data from the EarningsCalls.dev search API.
- Paste or upload transcript text and run exact phrase analysis locally in the browser.

## Modes

### Demo data

Loads an illustrative dataset immediately so the UI can be explored without an API key.

### Live API

Enter an EarningsCalls.dev API key, ticker watchlist, date range, and up to six tracked phrases. SignalCall calls the `/api/v1/search/by_ticker` endpoint across a set of periods and charts the number of calls matching each phrase.

The API key is never committed to GitHub and is not stored by SignalCall. It only exists in the current browser page and is sent directly to EarningsCalls.dev.

### Paste / upload

Paste a transcript or upload `.txt` / `.md` files. Analysis runs entirely in the browser and counts exact phrase occurrences. File names like `NVDA_2026_Q2.txt` are automatically interpreted as ticker `NVDA`, period `2026 Q2`.

## Live site

https://riyagoelrs.github.io/business-ideas/earnings-buzzword-tracker/

## Run locally

No build step is required.

```bash
python3 -m http.server 5173
```

Then open:

```text
http://localhost:5173/earnings-buzzword-tracker/
```

## Notes

- Demo numbers are illustrative, not historical claims.
- Live API mode measures transcript calls matching a phrase, not total word-frequency counts.
- Paste / upload mode measures exact phrase occurrences in the provided text.
- This tool is for research/education and is not investment advice.
