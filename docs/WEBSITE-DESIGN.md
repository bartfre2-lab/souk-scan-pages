# Public website design

The illustrated Moroccan souk is the focal point. The surrounding website should help people understand the prices and reach Google Play, with quiet, consistent typography and controls.

## Composition

- One compact header. Desktop section links share a baseline with the brand and preferences. Phones use a labelled navigation toggle; language links live in a native disclosure and the theme control stays visible.
- The introduction pairs the approved app wording with the main Google Play action. On phones the promise, explanation and actions follow in reading order.
- The souk is one surface: category heading, region toolbar, four-stall courtyard and price-source caption. Do not add repeated title bars or detach the products from their stalls.
- Supporting steps use a shared column grid and rules, rather than a separate card style for every item. The download panel, FAQ and footer continue the same spacing and type scale.
- Preserve the real logo, bracketed wordmark, exact app headline, language variants and the distinction between community estimates and wholesale references.

## Style ownership

`assets/landing.css` owns the design tokens, header, page layout, marketing sections and legal pages. Change the relevant component rule here; do not append a second marketing stylesheet or a second set of responsive overrides.

`assets/courtyard.css`, `assets/souk-world.css` and `assets/site.css` own the existing illustrated square, sprite framing and compact price layout. The courtyard's geometry is covered by regression tests. Keep its animations, crops, hit areas and price logic independent of the marketing layout.

`assets/site.js` handles theme preferences, the compact navigation and language-menu dismissal. All language destinations remain real links. Section links remain available without JavaScript; native language disclosure also works without JavaScript. Escape dismisses the current menu and restores focus.

## Review requirements

Review English, French and Arabic in both themes. Check phone, tablet and desktop layouts, including open menus, long French labels, RTL reading order, keyboard focus and reduced motion. Run the existing build, browser and artifact checks before deployment.

Google Play is the only app-distribution destination. The public site must not contain runnable app previews or hosted app packages. Keep the build's publishing guards intact.
