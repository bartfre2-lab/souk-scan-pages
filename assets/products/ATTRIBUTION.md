# Attribution

All product icons in this folder are the "3D" style icons from
**Microsoft Fluent Emoji** (https://github.com/microsoft/fluentui-emoji),
licensed under the **MIT License**. Fetched directly from that repository,
unmodified.

(PNG raster assets can't carry an inline source comment the way the
project's other hand-authored/SVG assets do — this file is that
attribution instead.)

## File → source mapping

Exact matches:

| File | Fluent Emoji source |
|---|---|
| `tomato.png` | Tomato |
| `potato.png` | Potato |
| `onion.png` | Onion |
| `carrot.png` | Carrot |
| `cucumber.png` | Cucumber |
| `apple.png` | Red apple |
| `orange.png` | Orange |
| `banana.png` | Banana |
| `eggplant.png` | Eggplant |
| `avocado.png` | Avocado |
| `watermelon.png` | Watermelon |
| `strawberry.png` | Strawberry |
| `peach.png` | Peach |
| `pineapple.png` | Pineapple |
| `mango.png` | Mango |
| `tangerine.png` | Tangerine |
| `melon.png` | Melon |
| `grape.png` | Grapes |

## Deliberate approximations (added 2026-09-29)

No dedicated Fluent Emoji/Unicode emoji exists for squash, zucchini,
cabbage, cauliflower, or apricot — these use the closest available icon
instead of an invented one, documented here rather than left unexplained:

| Product | File used | Fluent Emoji source | Why |
|---|---|---|---|
| Courgette (zucchini) | `cucumber.png` (shared, no separate file) | Cucumber | Visually near-identical elongated green vegetable |
| Chou blanc (white cabbage) | `leafy_green.png` | Leafy green | Standard stand-in for cabbage-family vegetables — no dedicated cabbage emoji exists |
| Chou-fleur (cauliflower) | `broccoli.png` | Broccoli | Closest available; no cauliflower emoji exists |
| Abricot (apricot) | `peach.png` (shared, no separate file) | Peach | Visually similar stone fruit; no apricot emoji exists |
| Melon Souihla | `melon.png` | Melon | Generic melon; no icon exists for this specific Moroccan variety |
| Viande bovine (beef) | `cut_of_meat.png` | Cut of meat | — |
| Viande ovine (mutton) | `meat_on_bone.png` | Meat on bone | No separate beef/mutton emoji exist; these two are picked to look visually distinct from each other within the new Meat category, not because either is a literal match |

## Poultry and eggs (added 2026-10-12)

Same source and license as above (Microsoft Fluent Emoji, 3D, MIT, fetched
unmodified from the repository).

| File | Fluent Emoji | Used for |
|---|---|---|
| `chicken.png` | Chicken | Live chicken |
| `poultry_leg.png` | Poultry leg | Slaughtered chicken |
| `egg.png` | Egg | Beldi eggs and Roumi eggs (shared: no distinct local-egg emoji exists; the two are told apart by name) |

## Original illustrations (added 2026-10-12)

Microsoft Fluent Emoji has no pumpkin/squash, pomegranate or yellow-melon
emoji, and the earlier stand-ins were wrong (courge showed a roasted sweet
potato; pomegranate showed cherries). These three icons are original vector
illustrations drawn for this project in the same soft-3D style, with no third-party
artwork. Sources: `resources/icons-src/*.svg`; rendered to 256x256 transparent
PNGs by `node scripts/render-icons.cjs`.

| File | Product | Notes |
|---|---|---|
| `squash.png` | Courge / squash / pumpkin (`squash`) | Orange ribbed pumpkin with stem and leaf. Distinct from courgette (zucchini), which keeps the shared cucumber icon |
| `pomegranate.png` | Grenade / pomegranate (`pomegranate`) | Red fruit with its crown |
| `yellow_melon.png` | Melon jaune / yellow melon (`yellow_melon`) | Smooth yellow oval melon. Distinct from the Souihla melon, which uses `melon.png` |

