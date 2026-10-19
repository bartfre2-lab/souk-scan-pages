# SOUK-SCAN Pages

Static SOUK-SCAN landing page and existing app hosting. No build is needed.
Run `npm run dev` and open http://localhost:4173.

The website uses the real app logo and the intentional `[SOUK-SCAN]` scanner
wordmark, with the existing ivory, charcoal and muted-green palette. The Moroccan street and four vendor stalls remain the central interaction.
All four stalls remain visible in a virtual courtyard. Selecting one brings it
forward while the other three remain available behind it. Its stock is laid
out on the same continuous souk floor, without a separate product panel or
category bar. A small exploration indicator records the categories visited.
Touch swipes and keyboard controls also move between categories. Nothing
rotates automatically or forces vertical scrolling. Full wooden crates use clipped stock
chambers behind opaque fronts and corner posts, including the small crates in
the stall artwork. Product names, example price ranges and units stay upright
outside the art.

Prices on the landing page are explicitly labeled examples. The existing
`app/` contains real regional prices. No checkout or delivery is implied.

## Files

- `index.html`, `assets/landing.css`, `assets/landing.js`: the landing page.
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

Motion uses short curved paths for the incoming and outgoing vendors, with a
brief stock entrance. New selections retarget from the current visual position
and cancel previous motion, avoiding stacked animations. Reduced-motion
preferences disable the effects. Browser checks cover all four stalls fitting
without overlap, centered focus, exploration feedback, rapid changes and swipes.

`npm run art` regenerates the shared stall illustrations using Python 3, Pillow
and `/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf`. The signs embed
shaped Arabic artwork so browser font fallback cannot break their layout.

The review version is published under `/preview/souk/`. The separate app review
is under `/preview/souk-app/`; the current public homepage and `/app/` remain
separate from those review builds.
