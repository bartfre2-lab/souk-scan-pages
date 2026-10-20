# Final website audit — 20 October 2026

The fixes are implemented in the website design branch and published only under
`/preview/souk/`, following the user's preview-only instruction. The original
`/app/`, native application, backend, root homepage and root legal pages are not
changed. The review site is functional; promoting it to the main website remains
a separate decision.

## Findings and fixes by page / section

| Page / section                       | Finding                                                                                                                                                    | Implemented fix / verification                                                                                                                                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home hero                            | The previous headline and description replaced the app's message with slogans.                                                                             | Uses exactly “Know the recent local price” / “before you buy!” and the user-supplied description. French/Arabic hero text comes from the original app's onboarding translations.                                                               |
| Home navigation / CTAs               | “Take it with you” and “Step into the souk” obscured what the links do. The brand motto was repeated in the hero and scene.                                | CTAs say “Explore example prices” and “Get the app.” The motto remains once in the courtyard. All app links still open the original `/app/`.                                                                                                   |
| Souk courtyard                       | A Unicode arrow in the app link rendered as a broken glyph in the available font.                                                                          | Replaced it with the same SVG arrow used elsewhere. All four fixed stalls, inward-facing vendors, curved crate animation, complete product frames and anchored labels are retained.                                                            |
| Souk courtyard / no JavaScript       | Stall buttons looked usable without their interaction script.                                                                                              | Stalls start disabled and are enabled after initialization. A localized no-JavaScript message points to the original app; the artwork and logo remain visible.                                                                                 |
| How it works                         | Generic slogans hid the actual workflow and left wholesale references underexplained.                                                                      | Three direct steps: choose a region, compare community estimates / dated wholesale references, share a price. Copy explains optional detection and same-day report edits.                                                                      |
| Download                             | The screenshot depicted the alternate souk-app design, even though the CTA opened the original app.                                                        | New English/French/Arabic captures show the actual public `/app/` welcome screen. Caption and alt text identify it correctly. New filenames prevent cached old screenshots being presented under the new caption.                              |
| Download / files                     | A final audit must check the real file, rather than only whether a button exists.                                                                          | The original signed v1.0.2 APK is unchanged; download behavior and its SHA-256 are verified against the retained release checksum. No Play Store badge or new native release is implied.                                                       |
| FAQ                                  | Answers included marketing phrases and omitted the distinction between community and wholesale prices.                                                     | Concise factual answers explain both sources, insufficient observations, the absence of sales/delivery, and APK installation. Every accordion opens and closes; opening all answers creates no horizontal overflow.                            |
| Footer / legal navigation            | Legal links must retain the selected language and lead to actual documents.                                                                                | Privacy, terms, deletion and support links work in every language; language switching preserves the current document. There are no placeholder anchors.                                                                                        |
| Privacy / terms / deletion / support | Repeated navigation lacked a keyboard shortcut to the document. Deletion email links did not prefill the documented subject.                               | Added localized “Skip to content” links and focusable main content. Deletion links now prefill the exact localized subject shown in the instructions. No email was sent.                                                                       |
| Global dark mode                     | With storage blocked, an OS appearance change could overwrite a choice made in the current page. Invalid stored values could also suppress system changes. | An in-memory explicit preference survives OS changes. Only valid stored themes count as an override. Regression checks cover this.                                                                                                             |
| Global keyboard / no JavaScript      | A theme control without JavaScript could appear to work. The focused skip-link's light text on the dark theme's pale accent had poor contrast.             | Theme controls appear only after initialization. Focused skip links use a consistent dark-green background and light text in both themes. Native links, policies, FAQ and downloads remain usable without JavaScript.                          |
| SEO / utility pages                  | Preview indexing must stay separate from production SEO.                                                                                                   | Checked localized titles, descriptions, canonical and hreflang links, language/direction, structured app data, sitemap and robots file. Review pages deliberately remain `noindex, nofollow`. The Google verification page remains accessible. |

Final heading inspection also found “SOUK-SCAN” breaking at the hyphen in the
narrow Arabic download heading. Brand mentions in headings now use an isolated,
non-breaking inline unit, preserving the name and mixed-direction reading.

## Page and link coverage

The public crawl reached **22 pages / entry points**:

- The 15 review routes: home, privacy, terms, deletion and support in English,
  French and Arabic.
- The existing root homepage and its three production legal documents.
- `/app/` and `/preview/souk-app/`.
- The existing Google verification HTML file.

It checked **23 unique HTTP link targets**, **171 unique assets**, same-page
anchors, email-link syntax and preview utility files. CSS URLs, fonts, images,
scripts, stylesheets and dynamically selected food artwork are included.
All checked targets returned successful responses. No broken images, placeholder
anchors, JavaScript exceptions or HTTP resource failures were found. Email
syntax is checked; mailbox deliverability is not established by a browser audit.

One subsequent crawl received a transient HTTP 503 for the unchanged alternate
app's JavaScript bundle. An immediate direct retry returned 200, and a fresh
browser visit loaded that app with no resource or console errors. This was not
a missing link; the temporary response is recorded here rather than treated as
a code defect that this website change fixed.

The original app's language, welcome, community, wholesale, sign-in,
password-reset form, registration form and terms views were also exercised in
all three languages. Terms opening and returning to registration worked.
No login, OAuth redirect, reset-email send, registration, report submission,
feedback submission or account deletion was performed.

## Visual / responsive verification

Chromium, Firefox and WebKit each completed:

- **48 home layouts**: three languages × two themes × eight viewport sizes,
  including 320px phones, 768px tablets, 1024px tablets/laptops, a short
  1366×650 laptop, 1920px desktop and phone landscape.
- **72 legal/support layouts**: all four documents × three languages × two
  themes × three widths.
- **36 automated accessibility scans**, covering WCAG A/AA rule tags through
  WCAG 2.2, including target-size checks.

Total: **360 layouts and 108 accessibility scans**, with no detected failures.
Checks cover horizontal overflow, overlapping controls, clipped text, all four
category states, stalls intersecting stock, food escaping its chamber, scene
containment and expanded FAQ answers. Representative full-page phone and laptop
renders were visually inspected for spacing, typography, image fit and hierarchy.
The compact courtyard dimensions and architecture remain unchanged by this pass.

The **28-scenario regression suite** also passes, covering spatial keyboard
controls, touch scrolling, reset/focus, rapid retargeting, animation cleanup,
resize, reduced motion, storage restrictions, theme persistence, localized
static metadata/routes, resource loading and the original download checksum.
The static site's production dependency audit reports no vulnerabilities.
Additional Firefox and WebKit motion runs pass at phone and desktop sizes,
including rapid selection, completion, resize, changed motion preferences and
Escape/focus return. Localized skip links and deletion subjects were checked
in all three engines; WebKit also verifies the exact English hero copy.

## Production decisions and verification limits

1. **Main-site promotion:** the current production homepage and English legal
   documents are older than the review site. Production terms still show
   19 September 2026; the reviewed app uses terms version 12 October 2026.
   Promote the approved matching legal documents with the website before
   treating the root URLs as the new policy release. This audit does not
   silently replace pages the user asked to keep unchanged for review.
2. **Authenticated app actions:** public entry views and routes work, but
   successful Google/email login, private screens, live submissions, password
   recovery and deletion require a controlled account/device test. These are
   not represented as end-to-end verified by this website audit.
3. **Browser coverage:** WebKit/Firefox/Chromium automation is completed;
   this is not a physical iPhone/Android device test or an exhaustive assistive
   technology audit. Automated accessibility scans complement the keyboard and
   visual checks.
4. **Image transfer budget:** the illustrated first visit transfers several
   megabytes. A public phone-sized baseline run recorded roughly 4.6 MB,
   LCP around 1.18 s and CLS below 0.001 in this environment. These are a
   single synthetic observation, not field Core Web Vitals or a slow-network
   guarantee. Responsive image encoding remains an opportunity to reduce data
   use without changing the approved artwork.

## Reproducing the audit

Run `npm test` and the commands documented in the README under “Final website
audit.” The script writes structured JSON and representative screenshots to
ignored `test-results/`. The public crawl is read-only and can be repeated
against the deployed preview after publication.
