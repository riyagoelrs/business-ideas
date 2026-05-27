# DeckCleaner

DeckCleaner is a browser-based formatting QA tool for VC/startup decks. Upload a PDF, PPT, or PPTX and it returns a prioritized issue queue for the formatting problems founders and investors notice immediately:

- inconsistent fonts
- misaligned logos and slide furniture
- uneven chart spacing
- random capitalization
- messy spacing and weak contrast

The app also previews an auto-fix pass and exports a lightweight HTML report with the issue list and cleanup recipe.

## Use It

DeckCleaner is a static web app. There is no account, backend, API key, or install step.

1. Open `index.html` in a browser.
2. Upload a PDF, PPT, or PPTX.
3. Review the score, issue queue, and suggested cleanup plan.
4. Click `Apply auto-fix` to preview a normalized deck style.
5. Click `Download report` to save a shareable HTML audit.

You can also open `index.html?sample=1` to load a sample messy seed deck scan.

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
- chart spacing and label contrast
- casing consistency
- vertical rhythm
- orphan bullets and ragged text blocks

## Notes

- Built as a no-build static frontend.
- Deck files are not uploaded anywhere by this app.
- The auto-fix flow is a product prototype: it previews the cleanup rules and exports a report rather than rewriting the source PPT/PDF file.

## License

MIT
