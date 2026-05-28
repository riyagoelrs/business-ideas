# DeckCleaner

DeckCleaner is a browser-based deck cleanup editor for VC/startup decks. Upload a PDF, PPT, or PPTX and it returns a prioritized issue queue for the formatting problems founders and investors notice immediately:

- inconsistent fonts
- misaligned logos and slide furniture
- uneven chart spacing
- random capitalization
- messy spacing and weak contrast
- inconsistent page numbers, spelling, terminology, and footnotes

The app separates AI-fixable issues from manual review items, lets you apply fixes to a live slide preview, rescans the score, and exports a lightweight edit brief.

The full app now includes an optional backend. When you run it with `npm start`, uploads are parsed server-side, scan sessions are kept in memory, fixes are applied through API calls, and the app can export an edit brief, a cleaned preview, and a fixed PPTX for PPTX uploads.

## Use It

DeckCleaner can run as a static demo or as a local backend-backed editor. There is no account or API key.

Public link: https://raw.githack.com/riyagoelrs/business-ideas/main/deckcleaner-live.html

1. Open `deckcleaner-live.html` in a browser.
2. Upload a PDF, PPT, or PPTX.
3. Review the score, issue queue, AI-fixable items, and manual suggestions.
4. Click `Apply all AI fixes` or apply individual fixes to improve the score.
5. Use `Mark manual reviewed` for copy, story, or content judgment calls.
6. Click `Rescan current deck` to confirm the updated score.
7. Click `Export edit brief` to save a text audit.

You can also open `deckcleaner-live.html?sample=1` to load a sample messy seed deck scan.

## Run Locally

For the full backend workflow:

```bash
npm start
```

Then visit `http://127.0.0.1:8787`.

For a static frontend-only demo, open `index.html` directly in a browser, or serve the folder with any static server.

```bash
python3 -m http.server 5173
```

Then visit `http://localhost:5173`. In static mode, DeckCleaner falls back to local browser heuristics and cannot generate backend artifacts.

## Deploy

This repo can be hosted on any static host:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- any plain static file server

Point the host at the repository root. No build command is required.

## How It Works

With the backend running, the scanner accepts uploads through `/api/scan`, extracts PDF/PPT/PPTX text and metadata, then applies deterministic checks for:

- typeface drift
- recurring logo and footer alignment
- chart spacing and label contrast
- casing consistency
- spelling and terminology drift
- page number and footnote consistency
- vertical rhythm
- manual copy and narrative review

## Notes

- Built as a no-build frontend plus a dependency-light Node backend.
- With `npm start`, deck files are uploaded only to your local backend process and stored under `.deckcleaner-data/`.
- PPTX uploads can produce a fixed PPTX with font/spelling normalization. PDF/PPT uploads get a cleaned preview and edit brief because rewriting those source formats safely requires a heavier conversion service.

## License

MIT
