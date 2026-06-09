# Reserve

Reserve is a static, browser-only guide to fertility costs, insurance coverage,
financing, savings, tracking, and perimenopause care.

## Run locally

From the repository root:

```bash
python3 -m http.server 5173
```

Then open `http://localhost:5173/reserve/`.

## Deploy

The repository's existing GitHub Pages workflow publishes this directory at:

`https://riyagoelrs.github.io/business-ideas/reserve/`

No build step, database, account, or API key is required. Calculator inputs stay
in the browser and are not persisted.

## Before a public launch

- Replace the numbered source list with direct links and access dates.
- Re-verify medical, state-mandate, lender-rate, price, and market-size claims.
- Add a social-sharing image and favicon.
- Add a privacy policy before introducing analytics, email capture, accounts, or
  any third-party data collection.
- Decide who owns the recurring content review and how often it happens.
- Test with screen readers and on physical iOS and Android devices.
