# SOUK-SCAN Pages

Static SOUK-SCAN landing page and existing app hosting. No build is needed.
Run `npm run dev` and open http://localhost:4173.

The website uses the real app logo and the intentional `[SOUK-SCAN]` scanner
wordmark, with the existing ivory, charcoal and muted-green palette.
The website is a Moroccan souk courtyard: fruit and vegetables on the left,
meat and poultry on the right, with the real logo in the centre before selection.
The four stalls stay visible and fixed. Choosing one brings packed product crates
along curved paths from that stall into the central square. Switching returns
the previous stock to its vendor. The back control or Escape restores the logo.
The central display includes every example product in that category.

The paved Moroccan medina setting uses plaster facades, horseshoe arches and
zellij details. Right-hand stalls face the centre. Coordinated retro cartoon
sprite sheets supply the vendor and food art; shallow crate fronts leave the
product silhouettes visible. Only crates follow the delivery arcs. Names and
prices remain anchored in the centre.

Wooden crates use clipped stock chambers behind opaque fronts and corner posts.
Product names, example ranges and units stay upright outside the art. Mobile
layouts preserve the same two-sided composition. Touch, pointer and spatial
arrow-key navigation work without forced scrolling. Reduced motion removes
the delivery animations; changing preference or resizing also cancels in-flight
effects. Rapid switching cancels obsolete animation and removes temporary crates.

Prices on the landing page are explicitly labeled examples. The existing
`app/` contains real regional prices. No checkout or delivery is implied.

## Files

- `index.html`, `assets/landing.css`, `assets/landing.js`: the landing page.
- `assets/courtyard.css`, `assets/souk-world.css`: the courtyard layout and artwork styling.
- `assets/souk-medina-square.png`, `assets/souk-*-rubber-hose.png`: original generated artwork.
- `assets/brand/`: the actual SOUK-SCAN logo.
- `assets/products/ATTRIBUTION.md`: existing product art attribution.
- `downloads/`: original signed Android v1.0.2 APK and release checksums.
- `app/`, `privacy/`, `terms/`, `account-deletion/`: maintained separately.

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
