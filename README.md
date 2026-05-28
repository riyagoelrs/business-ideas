# DeckCleaner

DeckCleaner is a browser-based deck cleanup editor for VC/startup decks. Upload a PDF, PPT, or PPTX and it returns a prioritized issue queue for the formatting problems founders and investors notice immediately:

- inconsistent fonts
- misaligned logos and slide furniture
- uneven chart spacing
- random capitalization
- messy spacing and weak contrast
- inconsistent page numbers, spelling, terminology, and footnotes

The app separates AI-fixable issues from manual review items, lets you apply fixes to a live slide preview, rescans the score, and exports a lightweight edit brief.

## Use It

DeckCleaner is a static web app. There is no account, backend, API key, or install step.

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

Open `index.html` directly in a browser, or serve the folder with any static server.

```bash
python3 -m http.server 5173
```

Then visit `http://localhost:5173`.

## Deploy

This repo can be hosted on any static host:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- any plain static file server

Point the host at the repository root. No build command is required.

## How It Works

The scanner runs locally in the browser. It reads file metadata and lightweight embedded text/structure signals, then applies deterministic checks for:

- typeface drift
- recurring logo and footer alignment
- page number consistency
- chart spacing and label contrast
- casing consistency
- spelling and terminology drift
- footnote/source-note consistency
- vertical rhythm
- manual copy and narrative review

## Notes

- Built as a no-build static frontend.
- Deck files are not uploaded anywhere by this app.
- The auto-fix flow is a product prototype: it applies fixes to the live preview and exports an edit brief rather than rewriting the source PPT/PDF file.

## License

MIT
