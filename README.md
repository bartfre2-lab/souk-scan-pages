# SOUK-SCAN website

The official English, French and Arabic website at [soukscan.online](https://soukscan.online/).
Four fixed Moroccan souk stalls reveal real food-price information in the central
courtyard. The site preserves the app's logo, scanner wordmark, onboarding copy
and green/ivory palette. Language and light/dark controls are in every header.

**`main` is the maintained source and deployment branch.** GitHub Actions builds,
tests and publishes the website; generated production pages are not edited or
committed separately. The native app is maintained in its own repository.

## Work locally

Use Node 24 (`nvm use`), Python 3.9+ and npm:

```sh
npm ci
npx playwright install --with-deps chromium
npm run dev
```

Open `http://localhost:4173/`. Edit `index.html`, `assets/`, `locales/` and
`data/market.json`, then rebuild. `npm run dev` serves a build; it does not watch
files. English is `/`, French `/fr/` and Arabic `/ar/`. Each language includes
privacy, terms, account deletion and support pages. Translations, canonical and
hreflang links, sitemap and structured data are generated statically.

## Verify and deploy

```sh
npm test
npm run build -- --out-dir dist-production --asset-version local-check
npm run verify:build -- dist-production local-check
```

Tests cover region/cache races, failed refreshes, localized navigation, source
separation, accessibility, crate containment, keyboard/touch interaction, motion
cancellation and the signed APK. Artifact checks additionally verify production
SEO, imports, retained cached assets, exact app/review snapshots and absence of
source/environment files. The build refuses to overwrite source/release folders.

Open a short-lived branch and pull request for future changes. The **Website
checks and deployment** workflow runs on pull requests and `main`. After checks
pass, a main-branch update uploads only `dist-production/` and deploys it through
GitHub Pages Actions. The same workflow can be rerun with **Run workflow** on
`main`. No manual copying, deployment commits, external hosting service or new
secrets are required. Workflows use pinned action revisions and Node 24;
Dependabot checks npm and action updates monthly.

GitHub Pages must use **GitHub Actions** as its build source. Deployment requires
`pages: write` and `id-token: write`; build/test has read-only repository access.
The `github-pages` environment is restricted to the production branch. Never
publish the raw repository root or merge unbuilt HTML through legacy Jekyll.

## Repository layout

| Path | Purpose |
| --- | --- |
| `index.html`, `assets/` | Editable home template, styling, interactions, illustrations and fonts |
| `locales/` | English, French and Arabic website/legal copy |
| `data/market.json` | Existing public client configuration and canonical regions |
| `scripts/` | Static builder, deployment verification and read-only browser audit |
| `tests/` | Browser, data/cache and build regression checks |
| `app/` | Existing independently built web app, published unchanged at `/app/` |
| `public/assets/` | Previous versioned production JS/CSS, retained for cached open tabs |
| `downloads/` | Original signed Android v1.0.2 APK and release checksums |
| `CNAME`, `google*.html` | Custom-domain and Search Console verification |
| `dist*/` | Ignored generated output; only this output is deployed |
| `docs/` | Price integration, Google Play review, store drafts and historical audit evidence |

The builder includes the static `app/`, retained cache assets, domain
and verification file in production output. It does not rebuild an app or touch
the backend. App-only updates committed to `app/` also run the website checks and
publish through the same workflow. Keep old versioned assets while cached pages
may still request them. Product credits remain in `assets/products/ATTRIBUTION.md`;
`scripts/generate-art.py` is the historical SVG generator, not the current PNG art.

## Prices and privacy

The website calls the original app's public price functions. Community estimates
use the selected region; wholesale references retain their own date and Casa
Prestations attribution. Server aggregation is authoritative. Insufficient data,
missing references and network errors are distinct; no numeric sample fallback
is used. Only successful responses are cached for 60 seconds, with separate
product/region/source keys and shared in-flight requests.

Website preferences use separate local-storage keys. Region reads do not request
GPS, sign in, submit reports or change accounts. `data/market.json` contains an
intentional **public anon/publishable key**, never a service-role key or secret.
Database policies still control access. See [price integration](docs/LIVE-PRICES.md).

## Additional audits and recovery

With a generated site being served, run:

```sh
AUDIT_URL=http://localhost:4173/ node scripts/audit-site.cjs --layout --motion
AUDIT_URL=https://soukscan.online/ node scripts/audit-site.cjs --crawl
```

`AUDIT_BROWSER=firefox` or `webkit` selects another installed engine. Each layout
run covers 120 responsive layouts and 36 automated accessibility scans. Audit
reports/screenshots are ignored under `test-results/`; live crawls are read-only.
Physical-device and authenticated account actions are outside these checks.

The pre-cleanup production state is retained by the tag
`archive/pre-cleanup-2026-10-20`. All old branch work remains in merged Git history.
For a future regression, revert the relevant source change on `main` and let the
workflow redeploy; an existing successful Pages deployment can also be restored
from its Actions run. Do not switch back to publishing raw source from the branch.

[Google Play review](docs/GOOGLE-PLAY-REVIEW.md) and [listing drafts](docs/store-listings/)
are preparation documents, not Play Console submissions or approval guarantees.
[The original visual audit](docs/FINAL-WEBSITE-AUDIT.md) records the earlier preview
phase; current maintenance and publishing instructions are this README.
