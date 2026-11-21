# SOUK-SCAN 1.2.0 — three Instagram carousels (November 2026)

Three posts, each **one carousel of five 1080 × 1080 JPEG slides**. Upload each folder's five images in numeric order as a single Instagram carousel; `caption.md` has the caption (Arabic first, then French and English).

| Slide | What it is |
| --- | --- |
| 1 | Grid-safe **Arabic cover** |
| 2–3 | The two key messages in **Arabic**, each with an app screen |
| 4–5 | The same two messages in **English and Français together** on one slide each |

| Post | Folder | Messages (slides 2–3, repeated in 4–5) |
| --- | --- | --- |
| 1 | [posts/01-news](posts/01-news/) | News in the Info tab: newest post + a dot for anything new; "All news" lists every post |
| 2 | [posts/02-alqoffa](posts/02-alqoffa/) | Al-Qoffa: an indicative range for a basket (week/month, 1 or 4 people); ranges, not promises |
| 3 | [posts/03-calculator](posts/03-calculator/) | Calculator: add up your shopping shop by shop with subtotals and total; price and quantity in one tap |

Contact sheets and the grid check: [previews/](previews/). `manifest.json` has sizes, bytes and alt text per slide; `layout-checks.json` records the checks every slide passed (logo safe area, no overflow, no collision with the phone; covers also stay inside the grid-safe column).

The look reuses the October 2026 campaign (logo, forest green and gold, souk artwork, phone mockup, layouts), so these sit with the earlier carousels in [../2026-10](../2026-10/).

## Instagram profile grid

Instagram's profile grid shows each post as a centred 3:4 crop, so only x 135–945 of a 1080 × 1080 slide is visible there. Slide 1 of every carousel is therefore a centred **cover** using the October campaign's grid-safe cover layout (from `claude/brave-dirac-a2052i`, commit `628d6a4`): logo, text, URL and swipe button all sit inside that column, and the renderer fails if anything leaves it. The covers are in Arabic, the main audience, with an Arabic swipe button that names the three languages. [previews/profile-grid-simulation.jpg](previews/profile-grid-simulation.jpg) shows the covers as the grid will crop them.

## Data and wording notes (for the owner)

* The phone screens are real captures of the app on `release/1.2.0` (Arabic is real RTL) taken against the repository's local mock server, not production. Prices, dates and the two calculator shops are test fixtures; the three news posts are sample text written for these captures. Nothing claims a live price. The Al-Qoffa capture shows "Priced 2 of 10 items", which is the mock's coverage, not the real one. The phone screens on all slides are the English app UI.
* Wording sticks to what the app does and repeats that totals are indicative. The Arabic and French text are drafts and need a native read before posting.
* The Calculator slides say nothing about privacy or what happens to entered prices on purpose. Per the app's tests, calculator prices are also sent as today's community price; decide how to describe that before any post says more about it.
* Counters and the phone mockup/status bar (9:41) are promotional elements.

## Re-render

Edit `design/copy.json`, serve this folder and render:

```sh
python -m http.server 5283 --directory docs/social-media/2026-11-release-1.2.0
NODE_PATH=<a node_modules with playwright> node docs/social-media/2026-11-release-1.2.0/design/render.cjs
```

Raw captures are in `source/{en,fr,ar}/` (390 × 830 CSS px at 3×). Set `CHROMIUM` for a custom browser. Nothing was posted or published, and no app code, website file or earlier campaign file was changed.
