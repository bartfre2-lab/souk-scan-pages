# SOUK-SCAN Pages

Static English, French and Arabic website, with the existing app hosted separately.
Run `npm ci`, then `npm run dev` and open http://localhost:4173.

Python 3 builds 15 static pages into ignored `dist/`: home, privacy, terms,
account deletion and support for each language. English uses `/`, French `/fr/`
and Arabic `/ar/`. Language links preserve the current section. Pages contain
their translated content and metadata without requiring client-side translation.
The interactive courtyard needs JavaScript.

Edit the English source template `index.html` and the translation/legal catalogs
in `locales/`, then rebuild with `npm run build`. Missing home translations fail
the build. `scripts/build-site.py` handles routes, canonical/hreflang links,
social metadata, structured data and the sitemap. Do not edit generated HTML.

The website uses the real app logo and the intentional `[SOUK-SCAN]` scanner
wordmark, with the existing ivory, charcoal and muted-green palette.
The website is a Moroccan souk courtyard: fruit and vegetables on the left,
meat and poultry on the right, with the real logo in the centre before selection.
The four stalls stay visible and fixed. Choosing one brings packed product crates
along curved paths from that stall into the central square. Switching returns
the previous stock to its vendor. The back control or Escape restores the logo.
The central display includes every product configured for that stall.

The paved Moroccan medina setting uses plaster facades, horseshoe arches and
zellij details. Right-hand stalls face the centre. Coordinated retro cartoon
sprite sheets supply the vendor and food art; shallow crate fronts leave the
product silhouettes visible. Only crates follow the delivery arcs. Names and
prices remain anchored in the centre.

Wooden crates use contained stock chambers behind opaque fronts and corner posts.
Product names, real source ranges and units stay upright outside the art. Mobile
layouts preserve the same two-sided composition. Touch, pointer and spatial
arrow-key navigation work without forced scrolling. Reduced motion removes
the delivery animations; changing preference or resizing also cancels in-flight
effects. Rapid switching cancels obsolete animation and removes temporary crates.

The courtyard reads the same public price RPCs as the original app. Choose a
region for community estimates; wholesale references keep their own bulletin
date and source. Insufficient data and errors are shown explicitly, with no
sample values. No checkout or delivery is implied. See [live price integration](docs/LIVE-PRICES.md).

## Files

- `index.html`, `assets/landing.css`, `assets/landing.js`: the landing page.
- `assets/courtyard.css`, `assets/souk-world.css`: the courtyard layout and artwork styling.
- `assets/souk-medina-panorama.png`, `assets/souk-*-rubber-hose.png`: original generated artwork.
- `assets/site.css`, `assets/site.js`: compact layout, localization and persistent dark mode.
- `assets/market-prices.js`, `data/market.json`: the public price read/cache protocol and region configuration.
- `locales/`, `scripts/build-site.py`: static translated pages and metadata.
- `assets/brand/`: the actual SOUK-SCAN logo.
- `assets/products/ATTRIBUTION.md`: existing product art attribution.
- `downloads/`: original signed Android v1.0.2 APK and release checksums.
- `app/`: maintained separately. Root legal directories are legacy production sources;
  generated review policies come from `locales/legal-*.json`.

The download is hosted here because the app's GitHub release is private. Its
SHA-256 matches the release checksum. This does not imply a new Android release.

## Verification

```sh
npm ci
npx playwright install chromium  # if system Chromium is unavailable
npm test
```

Browser checks cover four screen widths, category selection, product labels,
keyboard controls, accessibility, resource errors, image loading, overflow,
page links, download behavior/checksum, no-JavaScript access and reduced motion.
They complement visual inspection; passing them is not a claim of visual quality.

Browser checks cover the branded idle state, all four category displays, fixed
stall positions, separation between stalls and stock, reset/Escape and focus
return, spatial keyboard selection, rapid changes during delivery, animation
cleanup, resizing and changed motion preferences. Mobile tests check category
taps without page movement and normal vertical touch scrolling.

`npm run art` regenerates the older SVG stalls. The website now uses PNG sprite
sheets and native category labels. The app's artwork and carousel remain separate
from this website change.

The review version is published under `/preview/souk/`. The separate app review
is under `/preview/souk-app/`; the current public homepage and `/app/` remain
separate from those review builds.

## Localized review publication

```sh
npm run build -- --base /preview/souk/ --out-dir dist-review --preview --asset-version COMMIT
```

Copy `dist-review/` into **only** `preview/souk/` on the Pages publishing branch.
Keep older versioned assets and legacy scripts for cached open tabs. Preview
HTML is deliberately `noindex, nofollow`; production builds contain indexable
metadata. Production legal pages remain unchanged until approved.

The compact desktop courtyard is 430–500px high (440px on short laptops), about
40% shorter than the previous 780px scene. Four products share a central desktop
row; phones use two columns. The panorama retains the roofline and sky.
Food fits completely inside the visible chamber above the crate front.

Appearance follows the system until changed, persists between localized pages
and works when storage is blocked. Arabic has RTL text and a local Arabic font.
The 35 automated checks also cover all 15 static routes, localized SEO/legal links,
food containment and accessibility in both themes.

See [Google Play review](docs/GOOGLE-PLAY-REVIEW.md) for code evidence, Data safety
recommendations and remaining release checks. Revised English and new French/
Arabic descriptions are in [store-listings](docs/store-listings/).
This website implementation does not build or release a new native app.

## Final website audit

The hero follows the original app's onboarding copy. Section copy uses direct
product descriptions, and the download section shows the original app's actual
welcome screen rather than the alternate souk-app preview.

`scripts/audit-site.cjs` provides a read-only crawl and extended layout audit:

```sh
# Serve the generated site first (npm run dev uses port 4173).
AUDIT_URL=http://localhost:4173/ node scripts/audit-site.cjs --layout
AUDIT_URL=http://localhost:4173/ node scripts/audit-site.cjs --motion
AUDIT_BROWSER=firefox AUDIT_URL=http://localhost:4173/ node scripts/audit-site.cjs --layout
AUDIT_BROWSER=webkit AUDIT_URL=http://localhost:4173/ node scripts/audit-site.cjs --layout
AUDIT_URL=https://soukscan.online/preview/souk/ node scripts/audit-site.cjs --crawl
```

Install the selected browser and its host dependencies with Playwright as needed.
Each engine checks 48 home and 72 legal/support layouts and runs 36 automated
accessibility scans, including WCAG 2.2 target-size rules. Reports and screenshots
go into ignored `test-results/`; `AUDIT_OUTPUT` sets another directory.
The remote crawl follows public navigation, CSS resources and sitemap URLs and
also includes the root site, existing legal pages, app entry points and Google
verification file. It does not create accounts or submit forms.
`--motion` checks rapid retargeting, completion, resizing, motion preference
changes and Escape/focus return at phone and desktop sizes in the chosen engine.

See [the final audit report](docs/FINAL-WEBSITE-AUDIT.md) for findings by section,
implemented fixes, verification results and the remaining production-promotion
and authenticated-flow limits.
