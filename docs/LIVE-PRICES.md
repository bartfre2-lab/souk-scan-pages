# Header and real price integration

The website header contains language and appearance controls on home and
legal/support pages. Desktop uses one row; compact layouts keep both rows inside
the same header. The appearance button names its next action, shows the matching
sun/moon icon and retains the existing preference/system-theme behavior.

The current 14 products and stall illustrations are retained. Every product maps
to its canonical app ID; the two egg types and two chicken types remain distinct.
There are no numeric sample-price constants in the active courtyard module.

## Price sources

| Source | App endpoint | Website behavior |
| --- | --- | --- |
| Community | `get_product_aggregate(p_product_id, p_region_id)` | Uses the selected region. Displays returned ranges and freshness; an empty result means insufficient data. The server owns aggregation, outlier handling, fallback dates and the sample threshold. |
| Wholesale | `get_latest_wholesale_reference(p_product_id)` | Independent of the selected region. Displays the product's own reference range and actual bulletin date, with Casa Prestations identified as the source. An empty result means no reference. |

Wholesale figures are Casablanca wholesale-market references, not regional
retail prices. They are never substituted into the community estimate. Reference
presentation follows the app: verified omission is required before claiming the
product is absent from the newest bulletin; old references keep their real date.
The app's 30-day old-reference and 14-day age-display rules are preserved in the
reference presentation metadata. The compact courtyard always shows the date;
additional source/age notes are available in its source description.

## Region, caching and failures

- The 12 canonical region IDs/names come from the original app catalog.
- On a new visit, the user chooses a region. Existing website preference, or an
  already selected app region, can initialize it. Only the website's separate
  `soukscan.website.region` key is written.
- Without a region, wholesale references can load but no community request is
  made. No GPS access, sign-in or account changes are performed.
- Like the app, successful results are cached in memory for 60 seconds.
  Community cache keys include product and region; wholesale keys include product.
  Identical in-flight reads share a request. Refresh forces a revalidation.
- A failed refresh retains the last successful value for that same key and
  clearly reports the failed refresh. A first-load error is distinct from
  insufficient data. There is no hardcoded-price or cross-region fallback.
- Responses from previous category/region selections cannot repaint the current
  selection. Price slots reserve their space while loading, keeping crate
  delivery animations stable.

## Configuration and permissions

`data/market.json` contains the existing app's **public client** configuration and
the region catalog. It is serialized into static pages. The build only accepts
a publishable key or a legacy JWT with the `anon` role; a secret/service-role key
must never be put there. Access remains controlled by the existing database
grants and policies. No schema changes, expanded grants, raw observation reads,
authenticated sessions or write endpoints are needed.

`assets/market-prices.js` implements the read/cache protocol. Build output
versions this module and rewrites its import in the versioned courtyard entry
module, so cached open pages can continue using their previous assets.

Privacy and support copy in all three languages describes website region
storage/transmission and real price reads. The owner approved promotion of the
website and its legal pages to the main domain on 20 October 2026. Production
pages are indexable; historical review pages retain noindex. The original
native/web app and backend are untouched.

## Verification

`npm test` contains 35 checks, including new cases for region races, cache
separation/deduplication/expiry, failed refreshes, first-load failures, no-region
behavior, malformed responses and the public-key/region configuration. Browser
fixtures intercept only the two read RPCs; tests never submit live observations.

Chromium, Firefox and WebKit each passed 120 responsive layouts, 36 automated
accessibility scans and two motion/cancellation scenarios with the populated
price rows. Long product names wrap within their tablet columns. Header renders
and real-price crate layouts were also inspected at desktop and phone sizes.

Separate live reads confirmed that the existing public endpoints return actual
references and honest empty aggregates. For example, at verification the potato
reference was 3.5–6 DH/kg from the 14 October 2026 bulletin, while the tested
Casablanca community aggregates for potato and live chicken were empty. These
are observations of the backend, not values stored in the website.
An additional browser check matched every displayed value/date for all 14
products against 36 successful live RPC responses, including Arabic navigation
with the region and theme retained; no browser exceptions were recorded.
