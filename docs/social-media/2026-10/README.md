# SOUK-SCAN social media campaign — October 2026

**63 final graphics**, each a 1080 × 1080 RGB JPEG exported at quality 97:

- Six square post designs × Arabic, French and English = **18 posts**.
- Three carousel topics × three languages = **nine carousels**, with five slides each = **45 slides**.

[Download the complete posting pack](souk-scan-social-media.zip).

## Find the graphics

| Language | Six square posts | Three carousels | Preview |
| --- | --- | --- | --- |
| English | [posts/en](posts/en/) | [carousels/en](carousels/en/) | [All graphics](previews/all-en.jpg) |
| French | [posts/fr](posts/fr/) | [carousels/fr](carousels/fr/) | [All graphics](previews/all-fr.jpg) |
| Arabic | [posts/ar](posts/ar/) | [carousels/ar](carousels/ar/) | [All graphics](previews/all-ar.jpg) |

The six standalone themes are: know before you buy, everyday food categories,
choosing a region, understanding the two price sources, contributing a price,
and keeping favorite products close. Each language's post folder includes
`captions.md` with suggested text and alt text.

The three carousel topics are:

1. `01-why-souk-scan`: what the app does and why it exists.
2. `02-understand-the-prices`: community estimates, dated wholesale references,
   units and insufficient data.
3. `03-contribute-a-price`: choosing the product and region, entering a genuine
   observation, the daily submission rule and same-day corrections.

Each carousel folder contains `01-...jpg` through `05-...jpg` plus `caption.md`.
Upload those five images in numeric order as one carousel, using one language
per post. The filenames preserve the same order in Arabic; its layouts and
copy are genuinely RTL. Do not upload the preview/contact-sheet images as
individual campaign posts.

## Brand and layout

The original app logo is used unchanged in the upper-left header for English
and French and the upper-right header for Arabic, with a 64px horizontal safe
margin and clear separation from the copy and illustrations. The scanner
wordmark, forest green, gold, illustrated four-stall souk, food artwork and
realistic front-facing Android mockup follow the approved store campaign.
There is no isolated seller portrait, tilted handset or extra text panel
covering a pre-existing text area. New square artwork leaves a designated
clean region for typography. The official URL is `soukscan.online`.

JPEGs are the final posting files. The editable HTML and local font/art assets
allow lossless PNGs to be regenerated if needed; PNG copies are not duplicated
in this repository. `manifest.json` includes dimensions, byte counts, SHA-256
hashes, alt text and suggested image captions. `layout-checks.json` records
logo bounds, font sizes and checks against overflow and collisions. All 63
images were visually reviewed in addition to these checks.

## Product accuracy and capture provenance

The app was checked against SOUK-SCAN main at
`322bc4b` (version **1.1.1**, released code merged at `0234ea7`). The website
repository's base was `6d14fe2`, which serves the 1.1.1 Android download and web
app. Source screenshots were freshly captured from the unchanged 1.1.1 React
app at 390 × 830 CSS pixels, at 3× density, in all three languages.

Screenshot-only local authentication fixtures were used to render the actual
price-entry form, with an empty observation state for the synthetic fixture
identity. Price/aggregate/calendar requests were real, read-only public backend
requests. No real account was accessed or created; no private observations,
price submissions or other production writes were made. Favorites are local
choices. Original reference dates and insufficient community-data states are
retained. The mockup hardware and sample status bar are promotional elements.

Copy distinguishes selected-region community estimates from the separate dated
Casa Prestations wholesale references for Casablanca. It does not imply
wholesale references are regional retail prices, guarantee current prices or
savings, claim a partnership, or advertise an unverified Google Play release.
The contribution guide describes one report per product per day and same-day
edits, and asks for real observations. Captions link to the official website.

The new square backgrounds were generated from the approved store feature
graphic and original app market artwork. Other assets (logo, food sprite and
handset) are reused from the app and established campaign. Inter and IBM Plex
Sans Arabic licenses are included beside the local font files.

## Re-render locally

From the repository root, install its existing dependencies with `npm ci`, then:

```sh
python3 -m http.server 5281 --directory docs/social-media/2026-10
```

In another terminal:

```sh
node docs/social-media/2026-10/design/render.cjs
```

The renderer uses the repository's Playwright package and `/usr/bin/chromium`.
Set `CHROMIUM` if your browser is elsewhere. `SOCIAL_PREVIEW_ORIGIN` overrides
the local preview origin. Rendering uses supplied local captures; it does not
sign in or contact the application backend. Edit `design/copy.json` to change
localized wording. Run with `SOCIAL_CHECK=1` for a layout preflight without
replacing final images. Revalidate and repackage outputs after changes.

These files live under `docs/`, outside the website deployment output. This
change saves the campaign; it does not publish to social platforms or change
the live app, existing Play Store graphics or website.
