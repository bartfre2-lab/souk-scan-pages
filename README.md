# SOUK-SCAN Pages

Static website for SOUK-SCAN. The landing page uses the app’s warm ivory
`#F7F4EE`, charcoal `#2B2621`, and muted green `#4A6B53` palette, with original
Moroccan medina and vendor artwork, animated transitions, and food illustrations
from the app. No build step, runtime package dependency, or backend configuration
is needed to host it on GitHub Pages.

## Preview

Run `npm run dev` (Python 3 required), then open http://localhost:4173.

- `index.html`: landing page, download, FAQ, and navigation.
- `assets/landing.css` and `assets/landing.js`: responsive styling and stall interactions.
- `assets/stall-*.svg` and `assets/medina.svg`: original illustrations.
- `scripts/generate-art.py`: regenerate the original SVG artwork with `npm run art`.
- `assets/products/ATTRIBUTION.md`: reused product artwork attribution.
- `app/`: existing web app bundle; maintained separately.
- `privacy/`, `terms/`, `account-deletion/`: existing policy pages.

## Prices and interaction

Selecting a vendor updates the product crates and scrolls to the preview.
Category buttons also move the illustrated stall into view on small screens.
Keyboard users can use Tab, Enter/Space, and optional Left/Right/Home/End keys.
Stall selections are announced to screen readers. Reduced-motion preferences
turn off decorative motion and smooth scrolling. Core page content, FAQ,
download, and web-app links work without JavaScript.

**All landing-page prices are illustrative, explicitly labeled sample ranges.**
The page does not request or imply live market data. Real regional prices,
freshness, and insufficient-data states remain in the app. Meat previews contain
only the two meat products supported by the app. Eggs use MAD per egg, while
other products use MAD per kg.

## Android download

`downloads/SOUK-SCAN-v1.0.2.apk` is the existing signed v1.0.2 release APK,
verified against its published `SHA256SUMS.txt`. It is hosted here so visitors
can download without access to the private source repository. No new Android
build or signing changes were made. There is no implied Play Store or iOS release.

For a future release, obtain the approved signed APK and its checksum, verify
with `sha256sum -c SHA256SUMS.txt --ignore-missing` in `downloads/`, and update
the download filename, version and size in `index.html` and the test assertion.
The checksum file also lists the AAB from the original release; that file is not
hosted on this website.

## Browser verification

```sh
npm ci
npx playwright install chromium  # if a system Chromium is unavailable
npm test
```

Tests use system `/usr/bin/chromium` when present, the `CHROMIUM_PATH` override,
or the browser installed by Playwright. They start their own local static server
on an available port and cover four viewport widths (320, 390, 768, 1440), all
four categories, keyboard selection, images, JS/resource errors, horizontal
overflow, FAQ controls, WCAG A/AA axe checks, internal links, APK download and
checksum, motion reveals, and the no-JavaScript fallback.

To publish, merge the website branch through the normal GitHub Pages workflow.
This change does not update the app bundle or the policy pages.
