# SOUK-SCAN 1.2.0 — Google Play graphics

Six 1080 × 1920 phone screenshots and one 1024 × 500 feature graphic per language (English, French, Arabic), in the same style as [v1.1.0](../v1.1.0/): the campaign background, the graphite handset mockup, the arch title area. Upload files are under `graphics/en`, `graphics/fr`, `graphics/ar`; `graphics/icon-512.png` is the unchanged shared icon. `validation.json` lists sizes (all opaque RGB PNGs under 2.1 MB).

| # | File | Screen (real capture of the app on `release/1.2.0`) |
|---|---|---|
| 1 | `01-prices.png` | The souk tab: today's prices, wholesale reference next to community average |
| 2 | `02-alqoffa.png` | Al-Qoffa: the basket, week/month and person/family, indicative total |
| 3 | `03-calculator.png` | Calculator: two shops, subtotals, grand total |
| 4 | `04-line-price.png` | Calculator: the add-a-product pop-up with one-tap price and quantity buttons |
| 5 | `05-news.png` | Info tab: newest post, two earlier posts, "All news" |
| 6 | `06-guide.png` | First-run guide (step 1 of 14) |

`feature-1024x500.png` is the approved v1.1.0 feature graphic, copied unchanged (its slogan, "Know the prices. Before you buy.", is still accurate).

## Honest-data notes

* The captures come from the repository's local mock server (`scripts/mock-supabase.cjs`), not from production. Prices, dates and the two calculator shops are test fixtures, not live prices; the three news posts are sample text written for these captures (no claims beyond what the app does). The phone hardware and the 9:41 status bar are mockup elements.
* The mock gives every product the same community range (4.5–6 DH/kg) and a wholesale reference for only two of the ten basket items ("Priced 2 of 10 items" is visible on the Al-Qoffa capture). If the owner prefers live public data in the pictures, re-capture against the real read-only API.

## Re-render

Raw captures are in `source/{en,fr,ar}/` (390 × 830 CSS px at 3×). Serve this folder and render:

```sh
python -m http.server 5184 --directory docs/store-graphics/v1.2.0
NODE_PATH=<path to a node_modules containing playwright> node docs/store-graphics/v1.2.0/design/render.cjs
```

Set `CHROMIUM` to a Chromium executable if Playwright's own is not installed. The renderer shrinks a headline if it would leave the arch, and checks that text stays inside the header. Then normalise to opaque RGB PNG. Nothing was uploaded to Play Console, and no app code or website file was changed.
