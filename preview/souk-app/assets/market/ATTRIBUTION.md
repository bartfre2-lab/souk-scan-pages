# Market illustrations

The medina and four vendor stalls are original SOUK-SCAN website artwork,
reused here for the alternate souk app UI. Vendor figures are decorative,
fictional illustrations; they are not individual contributors or real vendor
profiles. Category and product information still comes from the app catalog.

The stalls embed copies of the app's food artwork. Microsoft Fluent Emoji
3D food illustrations are MIT licensed; see `../emojis/ATTRIBUTION.md` for
sources. The original pomegranate and other custom product artwork keeps its
existing attribution. SVGs are self-contained so their embedded images work
in mobile WebViews without additional external requests.

`stalls.png`, `souk-background.png` and `food.png` are exact copies of the
approved `souk-vendors-rubber-hose.png`, `souk-medina-panorama.png` and
`souk-food-rubber-hose.png` in the souk-scan-pages website repository.
`food-extended.png` was generated for SOUK-SCAN on 20 October 2026 to match
that food sheet. It supplies cucumber, squash, zucchini, cabbage, cauliflower,
clementine, avocado, watermelon, Souihla melon, yellow melon, strawberry,
peach, apricot, pineapple, mango and grapes. Source generation:
`generated_images/exec-cbb3c2df-378e-4fec-8634-4f50ed3e2c29.png`.

SVG medina/stall illustrations and the original 3D emoji remain for older
bundles and legacy components. The current market uses generated food artwork
for all 31 products; its atlas viewports are in `src/market/foodArt.ts`.
