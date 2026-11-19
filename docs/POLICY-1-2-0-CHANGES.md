# Website policy for app release 1.2.0: what changed and what the owner must decide

Branch `policy-1-2-0` (local only: not pushed, no PR, not deployed). Written 2026-11-19 (machine date).
**Nothing here is legal advice. The owner approves all wording.** French and Arabic were written by the model
and **need a read by a native speaker before publishing**.

## 1. Read this first: the app does not yet match the owner's decision

The owner decided that Calculator data is collected on the server, linked to the account, visible to the owner per
account, and that users accept a new terms/privacy version. The website text now says exactly that. **The app
sources I could read still say the opposite**, so the website text must not go live until the app, the in-app
privacy text and the database match it:

| Where | What it says now | Needs |
| --- | --- | --- |
| Journal worktree `docs/GROCERY-PRIVACY-APPROVAL.md` and in-app `privacyPolicy.listBody` (`src/i18n/locales/*.json`) | "Only you can see the list: it is not shown to other users and it is not part of any administration screen." Title "Your shopping list", "private" | Rewrite in the app to the owner-visible model. The website uses the title "Your Calculator entries" |
| Journal worktree `SECURITY.md` §21 and `SPEC.md` §16a | "No administrator policy … The admin dashboard must not read them; adding that needs a new privacy decision" | The new privacy decision, the audited admin read functions, and the server-enforced consent (Journal chat stage 5, not on disk yet) |
| `src/lib/terms.ts` | `TERMS_VERSION = "2026-10-12"` (unchanged) | A new version value plus the matching SQL function, so users are asked once |
| Website `terms` page | "App terms version: 12 October 2026" | Update the date and, if the owner wants, mention the Calculator, when the app version is bumped. **I did not edit the terms page** (outside the brief) |

Sources I used (and their state when read, 2026-11-19 about 22:20 local):

- App repo `C:\Users\Sanam\Desktop\SOUK SCAN`, branch `release/1.2.0` at `d116b5c`: `SECURITY.md`, `SPEC.md` (§20b Al-Qoffa, §39 version gate, §40 rate prompt), `docs/RELEASE-1.2-PLAN.md` (incl. §16 and Wave 2 status).
- Journal worktree `.claude/worktrees/journal-tab-05ebb1`, branch `journal-tab` at `6e3c105` (committed) **plus uncommitted edits** to `SECURITY.md` and `SPEC.md` (file times 21:54) and the committed `docs/GROCERY-PRIVACY-APPROVAL.md` (21:41). The Journal chat was still working, so these may change. I used the **on-disk** version for the facts about the grocery tables and the offline copy, and the **owner's decision (from the brief)** for visibility and consent.
- Sibling notes in the shared notes folder (`calculator-offline-design-note.md`, `journal-to-grocery-calculator-design-note.md`) for the offline rules.

## 2. Facts checked against the app, and how the website says them

| # | Fact | Verified in | Website wording |
| --- | --- | --- | --- |
| a | Al-Qoffa choices stay on the device | SPEC §20b "The user's own basket (device only)", key `soukscan.alqoffa.v1`; SECURITY §4b ("never leaves the device") | New section "Al-Qoffa basket". Also says the app **downloads** the owner-published default basket (public tables `basket_default_lines`/`basket_default_factors`) and sends nothing of the user's basket |
| b | Calculator data: products, price per kg (per egg), quantity (kg or pieces for eggs), optional shop label (≤ 40 chars), stored on the server per account, editable on the day made, device copy for offline, sent when online, lost if uninstall/clear data before sending, deleted with the account | SECURITY §21, §21a, SPEC §16a, `GROCERY-PRIVACY-APPROVAL.md` (journal-tab) | New section "Your Calculator entries" |
| b2 | Owner can see it per account, to improve the service and understand what people buy; not shown to other users | **Owner's decision only. Not in the app yet** (see section 1) | Stated plainly in the same section; "not sold or used for advertising" is added (consistent with the existing "we do not sell personal data, run ads" sentence; owner to confirm) |
| b3 | Prices become community prices | SPEC §16a "Prices are collected": **every price added or changed in the Calculator is sent automatically as today's community price. There is no switch.** Quantity, total and shop name are never sent. The user cannot withdraw it (no delete policy on `observations`); same-day correction is possible | Written as automatic. The brief said "prices the user **chooses** to share"; the app has no choice, so I did not write that |
| b4 | Totals stored on the server | SECURITY/approval doc: "Totals are computed in the app and not stored" | The website says totals are worked out in the app and not stored separately. The brief said totals are stored; they are not. (Per-account totals can still be computed by the owner's screen from the stored lines) |
| c | News and version check come from our backend | `useNewsPosts.ts` uses the shared Supabase client; SECURITY §4a, §20; SPEC §39 (build numbers read at start/resume; update dismissal kept per `latest_build` in `soukscan.updatePrompt.v1`; images only from `https://soukscan.online/`) | New section "News, update checks and the rating pop-up". It adds one honest sentence: like every backend request, these carry technical connection info and, while signed in, the session token the app uses for all requests (supabase-js attaches it). The brief said "no personal data beyond a normal network request"; the website says the same in plain words, and none of the user's entries or details are added |
| d | Rate pop-up state is device only | SPEC §40 "State": `soukscan.ratePrompt.v1`, recent open days, last shown, outcome; "Nothing is sent anywhere" | Same section. The Play button opens Google Play (Google handles that) |
| e | Reminders | `docs/RELEASE-1.2-PLAN.md` §16: "Reminders (F7) … Not started"; no `@capacitor/local-notifications` in `package.json`, `src` or the Android project | **Not claimed. Owner decision**: when reminders are built, add one sentence (see section 5) |
| f | New policy version users must accept; date today | Website date set to 19 November 2026; `terms_acceptances` keeps the accepted version per user (baseline migration), `TERMS_VERSION` gate (`src/lib/terms.ts`) | "Changes and contact" says the app asks users to accept the new version and that release 1.2.0 asks once. Also "We record … which version you accepted". True only after the app bumps `TERMS_VERSION` |

Existing statements on location, accounts, contributions, providers, security and retention were kept, with the
Calculator added to the lists of data that are kept and deleted. Nothing in the app repo contradicted them.

## 3. Files changed

- `locales/legal-en.json`, `locales/legal-fr.json`, `locales/legal-ar.json`: the privacy page (3 new sections, 8 edited paragraphs, 1 added paragraph, new date and meta description) and the account-deletion page (what deletion removes, what may remain, new date). Real RTL for Arabic comes from the existing builder; nothing in the markup changed.
- `scripts/build-site.py`: sitemap `lastmod` for `/privacy/` and `/account-deletion/` (all three languages) is now 2026-11-19, so search engines see the change.
- `docs/POLICY-1-2-0-CHANGES.md`: this file.
- Not changed: terms page, support page, the home page, `docs/GOOGLE-PLAY-REVIEW.md` (historical), the app.

## 4. Google Play Data safety: answers the owner must change

I cannot see the Play Console form. These are the answers that this release changes, compared with
`docs/GOOGLE-PLAY-REVIEW.md` ("Proposed Data safety answers") and the journal-tab approval document.

1. **Other user-generated content (App activity):** still "collected" and "optional", but now also covers the Calculator entries: shop names the user types, products, prices, quantities. Update the description if the form has one.
2. **Purpose:** keep **App functionality**. Because the owner now reads the entries "to improve the service and understand what people buy", also tick **Analytics** for this data. The journal-tab approval document said "not analytics"; that was written for the private model and is now wrong.
3. **Purchase history question (owner/Play decision):** the approval document chose "Other user-generated content" because nothing is bought through the app and there is no payment data. With quantities and spend now visible to the owner, a reviewer could read it as purchase history (Financial info). I recommend keeping "Other user-generated content" but this is the owner's call; check Google's current definitions.
4. **Shared with third parties:** unchanged ("No", processor exception for Supabase). The owner seeing the data is not sharing with a third party.
5. **Data deletion:** keep the in-app deletion answer; account deletion now also deletes Calculator entries. Make sure the Play "data deletion" description lists them. Note that unsent entries on the phone are removed on sign-out/uninstall.
6. **Encrypted in transit:** unchanged (HTTPS).
7. **On-device only items need no new entry:** Al-Qoffa choices, rate pop-up state, news cache, update-dismissal marker and the offline copy before it is sent are not "collected". The news and version requests carry no new data type (IP and request information as already declared for providers).
8. **Privacy policy link in the listing:** `https://soukscan.online/privacy/` stays, but check it only **after** this branch is published, because the app and listing must not point to text that is not yet live.
9. **Reminders:** nothing to declare (not built).

## 5. Decisions the owner still has to make

1. **Do not publish this branch before the app matches** (section 1): in-app privacy text, `SECURITY.md`, admin read functions and consent, `TERMS_VERSION`.
2. Approve the English wording, then have a native speaker read the French and Arabic. Terms I chose: FR "Calculette", "commerçants", "Infos"; AR «الحاسبة», «القفة», «معلومات» (all copied from the app's own strings; the FR "Infos" follows the new News text).
3. "Not sold and not used for advertising" and "improve the service and understand what people buy" (the owner's own purpose). Keep, change or drop.
4. Community price: it is **automatic and cannot be withdrawn** by the user. If the owner wants a choice or a withdrawal, that is an app and database change, then the text changes.
5. Reminders: when built, add to the "News, update checks and the rating pop-up" section something like: "If you turn on reminders, they are notifications scheduled on your phone itself; nothing is sent to us for them." Do not add before they exist.
6. Terms page: update the version date and decide whether the Calculator needs its own paragraph in the terms.
7. Retention: the policy says Calculator entries are kept until account deletion. If the owner wants a limit (for example delete after N months), say so and build it first.
8. The home page says "Your reports stay private. Other users see estimates, not your individual reports or account details." It is still true for other users; the owner may prefer to soften "private" now that the owner can see Calculator entries (the sentence is about price reports, not Calculator entries).
9. Check the "visible to the app owner" wording against the real admin screen (per-account kg and spend totals, "Groceries"). If the dashboard shows more or less, change the sentence.

## 6. What I ran

All on branch `policy-1-2-0`, Node 24-compatible toolchain from `npm ci`, Python 3.14 on Windows with `PYTHONUTF8=1` (the build script reads files with the Windows default encoding and fails without it; that is how the repo behaves on this PC, not something I changed).

- `npm test` (builds, then `node --test tests/*.test.cjs`, Playwright Chromium incl. axe accessibility scans of the privacy and deletion pages at 390px in light and dark): **44 tests, 44 pass, 0 fail**.
- `npm run build -- --out-dir dist-production --asset-version local-check`: built 15 localized pages.
- `npm run verify:build -- dist-production local-check`: **Verified 15 production pages, SEO, assets/imports, cached assets and store-only app distribution** (this is the repo's own link/SEO/asset check; there is no separate link checker).
- By hand on the built output: no unreplaced `@@` placeholders in the three privacy pages, Arabic page is `lang="ar" dir="rtl"`, internal links point to the right-language pages, sitemap `lastmod` for the privacy pages is 2026-11-19.
- **Not run:** a native-speaker review (FR/AR), a visual check in a real browser of the longer page, and any live-site crawl (`audit-site.cjs --crawl` hits production; nothing is deployed).

## 7. Every changed text, in all three languages

"Before" is the text on `main`, "After" is this branch. New sections are shown in full. Generated from the JSON
files by a script so that nothing is missed.

### English

#### `privacy` page

- **updated** — before: Last updated: 20 October 2026
  - after: Last updated: 19 November 2026
- **description** — before: How SOUK-SCAN handles account information, food-price reports, region data, location permissions and account deletion.
  - after: How SOUK-SCAN handles account information, food-price reports, Calculator entries, region data, location permissions and account deletion.

**Changed in section “Information the app processes” (paragraph 1)**

- Before: Account information includes your email address, account identifier and authentication records. Google sign-in may also provide account profile information to the authentication provider. We record acceptance of the app’s terms.
- After: Account information includes your email address, account identifier and authentication records. Google sign-in may also provide account profile information to the authentication provider. We record your acceptance of the app’s terms and which version you accepted.

**Changed in section “Information the app processes” (paragraph 3)**

- New paragraph: If you use the Calculator tab, we also store what you enter there, linked to your account: see “Your Calculator entries” below.

**New section: Your Calculator entries**

> The Calculator tab is a grocery calculator. For each day you use it, you can enter shops (with an optional name of up to 40 characters that you choose), the products you buy, the price per kilo (or per egg) and the quantity, in kilos or in pieces for eggs. The app works out the line, shop and grand totals on your phone from these entries; the totals are not stored separately.
>
> These entries are stored on our servers and are linked to your account. The app owner can see them, account by account, so that we can improve the service and understand what people buy. They are not shown to other users, and they are not sold or used for advertising.
>
> When you add or change a price in the Calculator, the app also sends that price, with the product, your region and the date, as a community price, in the same way as any price you submit. The quantity, the total and the shop name are not sent with it. Other users only see community prices as aggregated estimates. You cannot withdraw a community price that was sent, but you can correct it on the same day.
>
> You can change a Calculator list on the day you make it; afterwards it is read-only. The Calculator also keeps a copy on your phone so that it works without a connection, and sends it when your phone is online again. A list that reaches us late is still accepted for up to two days. Use it on one phone at a time. If you uninstall the app or clear its data, what has not been sent yet is lost. Signing out removes the copy from your phone (the app asks first if something has not been sent).
>
> Your Calculator entries are deleted when you delete your account.

**New section: Al-Qoffa basket**

> The Al-Qoffa tab shows a typical reference basket priced with data the app already has. The products, quantities and week, month and household choices you set stay on your device only and are never sent to our servers. To show the default basket, the app downloads the list and factors that we publish, like other public information; nothing from your own basket is sent.

**Changed in section “What other users can see” (paragraph 1)**

- Before: Public community prices are aggregated estimates. Your email, account identity and individual reports are not displayed publicly. Feedback is private to the service’s maintainers. Dated wholesale reference figures, where available, are a separate source.
- After: Public community prices are aggregated estimates. Your email, account identity and individual reports are not displayed publicly. Feedback is private to the service’s maintainers. Your Calculator entries and your Al-Qoffa basket are not shown to other users; the app owner can see the Calculator entries, as described below. Dated wholesale reference figures, where available, are a separate source.

**New section: News, update checks and the rating pop-up**

> The Info tab shows news that we publish. The app downloads it from our backend (Supabase), and the pictures are loaded from our own website, <bdi>soukscan.online</bdi>, which GitHub Pages hosts. Like any web request, this shows your device’s internet address to those services. The app keeps the latest news on your device so that the tab opens without a connection, and a marker of the last post you saw so that it can show a dot for new ones.
>
> When it starts and when you return to it, the app reads two public numbers from our backend (the newest version and the oldest version still allowed) to tell you if an update is available or required. It remembers on your device that you dismissed an update notice. The update button opens the SOUK-SCAN page on Google Play, which Google handles.
>
> These requests ask for public information only and add none of your entries or personal details. Like every request to our backend, they carry the technical connection information described above and, while you are signed in, the session token the app uses for all its requests.
>
> Occasionally the app may ask, in a pop-up, whether you would rate it on Google Play. What it keeps for this (your recent open days, when the pop-up was last shown, and your answer) stays on your device only; nothing is sent to us. If you choose to rate, Google Play opens and Google handles what you do there.

**Changed in section “Storage on your device” (paragraph 1)**

- Before: The app stores preferences such as language, appearance, selected region and favourites on your device, along with the session information needed to keep you signed in. This website stores language, appearance and selected-region preferences on your device. It sends the selected region to Supabase when requesting community estimates; it does not ask for GPS access or sign you in. You can remove local preferences through your device or browser storage settings.
- After: The app stores preferences such as language, appearance, selected region and favourites on your device, along with the session information needed to keep you signed in. It also stores on your device your Al-Qoffa basket choices, a copy of your recent Calculator entries (including any not sent yet), the latest news we published and a marker of the last post you saw, the update notice you dismissed, and the state of the rating pop-up. This website stores language, appearance and selected-region preferences on your device. It sends the selected region to Supabase when requesting community estimates; it does not ask for GPS access or sign you in. You can remove local preferences through your device or browser storage settings.

**Changed in section “Retention and deletion” (paragraph 1)**

- Before: Account information, linked reports, feedback and terms-acceptance records are kept while needed to operate your account and the service, until account deletion or earlier removal. A limited display window for prices is not a promise that underlying reports are automatically erased after that window.
- After: Account information, linked reports, Calculator entries, feedback and terms-acceptance records are kept while needed to operate your account and the service, until account deletion or earlier removal. A limited display window for prices is not a promise that underlying reports are automatically erased after that window.

**Changed in section “Retention and deletion” (paragraph 2)**

- Before: Confirmed in-app deletion removes the active account and its linked reports and feedback. Email deletion requests are completed within 30 calendar days after a valid request is received. See <a href="@@account-deletion@@">account deletion</a> for the steps and scope.
- After: Confirmed in-app deletion removes the active account and its linked reports, Calculator entries and feedback. Email deletion requests are completed within 30 calendar days after a valid request is received. See <a href="@@account-deletion@@">account deletion</a> for the steps and scope.

**Changed in section “Retention and deletion” (paragraph 3)**

- Before: Operational logs or backup copies retained by service providers follow their retention policies. Active-account deletion does not promise immediate removal of every provider log or backup. Local device preferences can remain until you clear the app or browser storage.
- After: Operational logs or backup copies retained by service providers follow their retention policies. Active-account deletion does not promise immediate removal of every provider log or backup. Local device preferences (including your Al-Qoffa basket) can remain until you clear the app or browser storage.

**Changed in section “Security and your choices” (paragraph 2)**

- Before: You can deny location permission, choose a region manually, change language or appearance, sign out, or request account deletion. For access, correction or other privacy questions, contact <a href="mailto:sanamdev@soukscan.online">sanamdev@soukscan.online</a>.
- After: You can deny location permission, choose a region manually, change language or appearance, choose not to use the Calculator, sign out, or request account deletion. For access, correction or other privacy questions, contact <a href="mailto:sanamdev@soukscan.online">sanamdev@soukscan.online</a>.

**Changed in section “Changes and contact” (paragraph 1)**

- Before: We update this page when the service’s data practices change. The date above identifies this website policy revision. Contact the SOUK-SCAN maintainers at <a href="mailto:sanamdev@soukscan.online">sanamdev@soukscan.online</a>.
- After: We update this page when the service’s data practices change. The date above identifies this website policy revision. When the terms or this policy change materially, the app asks you to review and accept the new version before you continue; release 1.2.0 asks you to accept the updated version once. Contact the SOUK-SCAN maintainers at <a href="mailto:sanamdev@soukscan.online">sanamdev@soukscan.online</a>.

#### `account-deletion` page

- **updated** — before: Last updated: 20 October 2026
  - after: Last updated: 19 November 2026

**Changed in section “What deletion removes” (paragraph 1)**

- Before: Deletion removes your active account and sign-in identity, submitted price reports, feedback and linked terms-acceptance records. Removed reports no longer contribute to estimates computed from the remaining reports. Individual reports and account identities were not displayed publicly.
- After: Deletion removes your active account and sign-in identity, submitted price reports, Calculator entries, feedback and linked terms-acceptance records. Removed reports no longer contribute to estimates computed from the remaining reports. Individual reports and account identities were not displayed publicly.

**Changed in section “What may remain” (paragraph 1)**

- Before: Service-provider technical logs and backups, if retained, follow the providers’ retention policies rather than immediate active-account deletion. Preferences saved only on your device may remain until you clear the app’s storage or browser data.
- After: Service-provider technical logs and backups, if retained, follow the providers’ retention policies rather than immediate active-account deletion. Preferences and Al-Qoffa basket choices saved only on your device may remain until you clear the app’s storage or browser data.


### Français (machine-written, needs native read)

#### `privacy` page

- **updated** — before: Dernière mise à jour : 20 octobre 2026
  - after: Dernière mise à jour : 19 novembre 2026
- **description** — before: Traitement des données de compte, des prix signalés, de la région, des autorisations de localisation et des demandes de suppression dans SOUK-SCAN.
  - after: Traitement des données de compte, des prix signalés, des saisies de la Calculette, de la région, des autorisations de localisation et des demandes de suppression dans SOUK-SCAN.

**Changed in section “Informations traitées par l’application” (paragraph 1)**

- Before: Les informations de compte comprennent votre adresse e-mail, votre identifiant de compte et les données nécessaires à l’authentification. La connexion Google peut aussi transmettre des informations de profil au prestataire d’authentification. Nous enregistrons l’acceptation des conditions de l’application.
- After: Les informations de compte comprennent votre adresse e-mail, votre identifiant de compte et les données nécessaires à l’authentification. La connexion Google peut aussi transmettre des informations de profil au prestataire d’authentification. Nous enregistrons l’acceptation des conditions de l’application et la version acceptée.

**Changed in section “Informations traitées par l’application” (paragraph 3)**

- New paragraph: Si vous utilisez l’onglet Calculette, nous enregistrons aussi ce que vous y saisissez, rattaché à votre compte : voir « Vos saisies dans la Calculette » ci-dessous.

**New section: Vos saisies dans la Calculette**

> L’onglet Calculette est une calculette de courses. Chaque jour où vous l’utilisez, vous pouvez saisir des commerçants (avec un nom facultatif de 40 caractères au plus que vous choisissez), les produits achetés, le prix au kilo (ou à l’œuf) et la quantité, en kilos ou en pièces pour les œufs. L’application calcule sur votre téléphone les totaux par ligne, par commerçant et le total général à partir de ces saisies ; ces totaux ne sont pas enregistrés séparément.
>
> Ces saisies sont enregistrées sur nos serveurs et rattachées à votre compte. Le propriétaire de l’application peut les consulter, compte par compte, afin d’améliorer le service et de comprendre ce que les gens achètent. Elles ne sont pas affichées aux autres utilisateurs, ni vendues, ni utilisées à des fins publicitaires.
>
> Lorsque vous ajoutez ou modifiez un prix dans la Calculette, l’application l’envoie aussi, avec le produit, votre région et la date, comme prix participatif, de la même façon que tout prix que vous signalez. La quantité, le total et le nom du commerçant ne sont pas envoyés avec lui. Les autres utilisateurs ne voient les prix participatifs que sous forme d’estimations agrégées. Vous ne pouvez pas retirer un prix participatif déjà envoyé, mais vous pouvez le corriger le jour même.
>
> Vous pouvez modifier une liste de la Calculette le jour où vous l’avez faite ; ensuite elle est en lecture seule. La Calculette garde aussi une copie sur votre téléphone pour fonctionner sans connexion, et l’envoie dès que le téléphone est de nouveau en ligne. Une liste qui nous parvient en retard est encore acceptée pendant deux jours au plus. Utilisez-la sur un seul téléphone à la fois. Si vous désinstallez l’application ou effacez ses données, ce qui n’a pas encore été envoyé est perdu. La déconnexion supprime la copie de votre téléphone (l’application vous prévient d’abord si des éléments n’ont pas été envoyés).
>
> Vos saisies de la Calculette sont supprimées lorsque vous supprimez votre compte.

**New section: Panier Al-Qoffa**

> L’onglet Al-Qoffa présente un panier de référence typique, chiffré avec des données que l’application possède déjà. Les produits, les quantités et vos choix de semaine, de mois et de foyer restent uniquement sur votre appareil et ne sont jamais envoyés à nos serveurs. Pour afficher le panier par défaut, l’application télécharge la liste et les facteurs que nous publions, comme toute information publique ; rien de votre propre panier n’est envoyé.

**Changed in section “Informations visibles par les autres utilisateurs” (paragraph 1)**

- Before: Les prix participatifs publics sont des estimations agrégées. Votre adresse e-mail, votre identité et vos contributions individuelles ne sont pas affichées publiquement. Les commentaires restent réservés aux responsables du service. Les références de gros datées, lorsqu’elles sont disponibles, constituent une source distincte.
- After: Les prix participatifs publics sont des estimations agrégées. Votre adresse e-mail, votre identité et vos contributions individuelles ne sont pas affichées publiquement. Les commentaires restent réservés aux responsables du service. Vos saisies de la Calculette et votre panier Al-Qoffa ne sont pas affichés aux autres utilisateurs ; le propriétaire de l’application peut consulter les saisies de la Calculette, comme indiqué ci-dessous. Les références de gros datées, lorsqu’elles sont disponibles, constituent une source distincte.

**New section: Actualités, vérification de version et fenêtre de notation**

> L’onglet Infos affiche les actualités que nous publions. L’application les télécharge depuis notre serveur (Supabase) et les images sont chargées depuis notre propre site, <bdi>soukscan.online</bdi>, hébergé par GitHub Pages. Comme toute requête web, cela révèle l’adresse internet de votre appareil à ces services. L’application conserve sur votre appareil les dernières actualités, pour que l’onglet s’ouvre sans connexion, ainsi qu’un repère de la dernière actualité vue, pour signaler les nouvelles.
>
> Au démarrage et quand vous revenez dans l’application, elle lit deux numéros publics sur notre serveur (la version la plus récente et la plus ancienne encore autorisée) pour vous indiquer si une mise à jour est disponible ou nécessaire. Elle mémorise sur l’appareil que vous avez fermé un avis de mise à jour. Le bouton de mise à jour ouvre la page de SOUK-SCAN sur Google Play, dont le traitement relève de Google.
>
> Ces requêtes demandent uniquement des informations publiques et n’y ajoutent ni vos saisies ni données personnelles. Comme toute requête vers notre serveur, elles comportent les informations techniques de connexion décrites plus haut et, lorsque vous êtes connecté, le jeton de session que l’application utilise pour toutes ses requêtes.
>
> De temps en temps, l’application peut vous proposer, dans une fenêtre, de la noter sur Google Play. Ce qu’elle retient pour cela (vos jours d’ouverture récents, la date du dernier affichage et votre réponse) reste uniquement sur votre appareil ; rien ne nous est envoyé. Si vous choisissez de la noter, Google Play s’ouvre et Google traite ce que vous y faites.

**Changed in section “Stockage sur votre appareil” (paragraph 1)**

- Before: L’application conserve sur votre appareil des préférences telles que la langue, l’apparence, la région et les favoris, ainsi que les informations de session nécessaires à votre connexion. Ce site conserve les préférences de langue, d’apparence et de région et l’envoie à Supabase pour consulter les estimations régionales. Il ne demande pas votre position GPS et ne vous connecte pas à un compte. Vous pouvez les effacer dans les paramètres de stockage de l’appareil ou du navigateur.
- After: L’application conserve sur votre appareil des préférences telles que la langue, l’apparence, la région et les favoris, ainsi que les informations de session nécessaires à votre connexion. Elle y conserve aussi vos choix du panier Al-Qoffa, une copie de vos saisies récentes de la Calculette (y compris celles qui n’ont pas encore été envoyées), les dernières actualités publiées et un repère de la dernière actualité vue, l’avis de mise à jour que vous avez fermé et l’état de la fenêtre de notation. Ce site conserve les préférences de langue, d’apparence et de région et l’envoie à Supabase pour consulter les estimations régionales. Il ne demande pas votre position GPS et ne vous connecte pas à un compte. Vous pouvez les effacer dans les paramètres de stockage de l’appareil ou du navigateur.

**Changed in section “Conservation et suppression” (paragraph 1)**

- Before: Les informations du compte, les prix liés au compte, les commentaires et les acceptations des conditions sont conservés tant qu’ils sont nécessaires à la gestion du compte et du service, jusqu’à la suppression du compte ou à leur retrait anticipé. Une période limitée d’affichage des prix ne signifie pas que les contributions sources sont automatiquement effacées à son terme.
- After: Les informations du compte, les prix liés au compte, les saisies de la Calculette, les commentaires et les acceptations des conditions sont conservés tant qu’ils sont nécessaires à la gestion du compte et du service, jusqu’à la suppression du compte ou à leur retrait anticipé. Une période limitée d’affichage des prix ne signifie pas que les contributions sources sont automatiquement effacées à son terme.

**Changed in section “Conservation et suppression” (paragraph 2)**

- Before: La suppression confirmée dans l’application retire le compte actif, les prix qui lui sont liés et ses commentaires. Les demandes valides envoyées par e-mail sont traitées dans les 30 jours calendaires suivant leur réception. Consultez la page <a href="@@account-deletion@@">de suppression du compte</a> pour connaître la procédure.
- After: La suppression confirmée dans l’application retire le compte actif, les prix qui lui sont liés, ses saisies de la Calculette et ses commentaires. Les demandes valides envoyées par e-mail sont traitées dans les 30 jours calendaires suivant leur réception. Consultez la page <a href="@@account-deletion@@">de suppression du compte</a> pour connaître la procédure.

**Changed in section “Conservation et suppression” (paragraph 3)**

- Before: Les journaux techniques et les copies de sauvegarde éventuellement conservés par les prestataires suivent leurs règles de conservation. La suppression du compte actif ne garantit pas l’effacement immédiat de chaque journal ou sauvegarde. Les préférences locales peuvent rester jusqu’à l’effacement du stockage de l’application ou du navigateur.
- After: Les journaux techniques et les copies de sauvegarde éventuellement conservés par les prestataires suivent leurs règles de conservation. La suppression du compte actif ne garantit pas l’effacement immédiat de chaque journal ou sauvegarde. Les préférences locales (dont votre panier Al-Qoffa) peuvent rester jusqu’à l’effacement du stockage de l’application ou du navigateur.

**Changed in section “Sécurité et choix disponibles” (paragraph 2)**

- Before: Vous pouvez refuser la localisation, choisir une région manuellement, modifier la langue ou l’apparence, vous déconnecter ou demander la suppression du compte. Pour une demande d’accès, de rectification ou toute autre question, écrivez à <a href="mailto:sanamdev@soukscan.online">sanamdev@soukscan.online</a>.
- After: Vous pouvez refuser la localisation, choisir une région manuellement, modifier la langue ou l’apparence, ne pas utiliser la Calculette, vous déconnecter ou demander la suppression du compte. Pour une demande d’accès, de rectification ou toute autre question, écrivez à <a href="mailto:sanamdev@soukscan.online">sanamdev@soukscan.online</a>.

**Changed in section “Modifications et contact” (paragraph 1)**

- Before: Nous mettons cette page à jour lorsque les pratiques du service évoluent. La date ci-dessus identifie cette révision de la politique du site. Vous pouvez joindre les responsables de SOUK-SCAN à <a href="mailto:sanamdev@soukscan.online">sanamdev@soukscan.online</a>.
- After: Nous mettons cette page à jour lorsque les pratiques du service évoluent. La date ci-dessus identifie cette révision de la politique du site. Lorsque les conditions ou cette politique changent de façon importante, l’application vous demande d’examiner et d’accepter la nouvelle version avant de continuer ; la version 1.2.0 vous demande d’accepter la version mise à jour une fois. Vous pouvez joindre les responsables de SOUK-SCAN à <a href="mailto:sanamdev@soukscan.online">sanamdev@soukscan.online</a>.

#### `account-deletion` page

- **updated** — before: Dernière mise à jour : 20 octobre 2026
  - after: Dernière mise à jour : 19 novembre 2026

**Changed in section “Données supprimées” (paragraph 1)**

- Before: La suppression retire le compte actif, l’identité de connexion, les prix que vous avez signalés, vos commentaires et les acceptations des conditions qui lui sont liées. Vos prix cessent de contribuer aux estimations calculées à partir des contributions restantes. Votre identité et vos contributions individuelles n’étaient pas affichées publiquement.
- After: La suppression retire le compte actif, l’identité de connexion, les prix que vous avez signalés, vos saisies de la Calculette, vos commentaires et les acceptations des conditions qui lui sont liées. Vos prix cessent de contribuer aux estimations calculées à partir des contributions restantes. Votre identité et vos contributions individuelles n’étaient pas affichées publiquement.

**Changed in section “Données pouvant subsister” (paragraph 1)**

- Before: Les éventuels journaux techniques et sauvegardes des prestataires suivent leurs politiques de conservation, distinctes de la suppression du compte actif. Les préférences locales peuvent subsister jusqu’à l’effacement du stockage de l’application ou des données du navigateur.
- After: Les éventuels journaux techniques et sauvegardes des prestataires suivent leurs politiques de conservation, distinctes de la suppression du compte actif. Les préférences locales et vos choix du panier Al-Qoffa peuvent subsister jusqu’à l’effacement du stockage de l’application ou des données du navigateur.


### العربية (machine-written, needs native read; real RTL)

#### `privacy` page

- **updated** — before: آخر تحديث: 20 أكتوبر 2026
  - after: آخر تحديث: 19 نوفمبر 2026
- **description** — before: كيفية تعامل SOUK-SCAN مع بيانات الحساب والبلاغات عن الأسعار والجهة وإذن الموقع وطلبات حذف الحساب.
  - after: كيفية تعامل SOUK-SCAN مع بيانات الحساب والبلاغات عن الأسعار ومدخلات الحاسبة والجهة وإذن الموقع وطلبات حذف الحساب.

**Changed in section “المعلومات التي يعالجها التطبيق” (paragraph 1)**

- Before: تشمل بيانات الحساب عنوان بريدك الإلكتروني ومعرّف حسابك وسجلات المصادقة. وقد يوفّر تسجيل الدخول عبر Google معلومات من ملف الحساب لمزوّد المصادقة. نسجّل أيضًا قبول شروط استخدام التطبيق.
- After: تشمل بيانات الحساب عنوان بريدك الإلكتروني ومعرّف حسابك وسجلات المصادقة. وقد يوفّر تسجيل الدخول عبر Google معلومات من ملف الحساب لمزوّد المصادقة. نسجّل أيضًا قبولك لشروط استخدام التطبيق والنسخة التي قبلتها.

**Changed in section “المعلومات التي يعالجها التطبيق” (paragraph 3)**

- New paragraph: وإذا استخدمت تبويب «الحاسبة»، فإننا نخزّن أيضًا ما تدخله فيه، مرتبطًا بحسابك: راجع قسم «ما تدخله في الحاسبة» أدناه.

**New section: ما تدخله في الحاسبة**

> تبويب «الحاسبة» آلة حاسبة للمشتريات. في كل يوم تستخدمها فيه يمكنك إدخال المتاجر (باسم اختياري لا يزيد على 40 حرفًا تختاره بنفسك)، والمنتجات التي تشتريها، وسعر الكيلوغرام (أو سعر البيضة)، والكمية بالكيلوغرام أو بالحبّات في حالة البيض. يحسب التطبيق على هاتفك مجاميع الأسطر والمتاجر والمجموع العام انطلاقًا من هذه المدخلات، ولا تُخزَّن هذه المجاميع بشكل منفصل.
>
> تُخزَّن هذه المدخلات على خوادمنا وترتبط بحسابك. ويستطيع مالك التطبيق الاطلاع عليها حسابًا بحساب، بهدف تحسين الخدمة وفهم ما يشتريه الناس. ولا تُعرض على المستخدمين الآخرين، ولا تُباع ولا تُستخدم في الإعلانات.
>
> عندما تضيف سعرًا في الحاسبة أو تعدّله، يرسل التطبيق هذا السعر أيضًا، مع المنتج وجهتك والتاريخ، بوصفه سعرًا مجتمعيًا، بالطريقة نفسها التي يُرسل بها أي سعر تبلّغ عنه. ولا تُرسل معه الكمية ولا المجموع ولا اسم المتجر. ولا يرى المستخدمون الآخرون الأسعار المجتمعية إلا في صورة تقديرات مجمّعة. ولا يمكنك سحب سعر مجتمعي أُرسل، لكن يمكنك تصحيحه في اليوم نفسه.
>
> يمكنك تعديل قائمة الحاسبة في اليوم الذي أنشأتها فيه، وبعد ذلك تصبح للقراءة فقط. وتحتفظ الحاسبة أيضًا بنسخة على هاتفك لتعمل دون اتصال، وترسلها عندما يعود الهاتف إلى الاتصال. وما يصلنا متأخرًا من قائمة يُقبل حتى يومين. استخدمها على هاتف واحد في كل مرة. وإذا حذفت التطبيق أو مسحت بياناته، فإن ما لم يُرسل بعد يضيع. ويؤدي تسجيل الخروج إلى حذف النسخة من هاتفك (ويسألك التطبيق أولًا إذا كانت هناك عناصر لم تُرسل).
>
> تُحذف مدخلاتك في الحاسبة عند حذف حسابك.

**New section: سلة القفة**

> يعرض تبويب «القفة» سلة مرجعية نموذجية تُحسب أسعارها من بيانات موجودة أصلًا في التطبيق. تبقى المنتجات والكميات واختياراتك للأسبوع أو الشهر ولحجم الأسرة على جهازك وحده، ولا تُرسل أبدًا إلى خوادمنا. ولعرض السلة الافتراضية ينزّل التطبيق القائمة والمعاملات التي ننشرها، كأي معلومات عامة؛ ولا يُرسل أي شيء من سلتك أنت.

**Changed in section “ما يمكن أن يراه الآخرون” (paragraph 1)**

- Before: الأسعار المجتمعية المتاحة للعموم تقديرات مجمّعة. لا يُعرض بريدك أو هويتك أو بلاغك الفردي للعموم. وتبقى الملاحظات خاصة بالقائمين على الخدمة. أما مراجع أسعار الجملة المؤرخة، عند توفرها، فهي مصدر منفصل.
- After: الأسعار المجتمعية المتاحة للعموم تقديرات مجمّعة. لا يُعرض بريدك أو هويتك أو بلاغك الفردي للعموم. وتبقى الملاحظات خاصة بالقائمين على الخدمة. ولا تُعرض مدخلاتك في الحاسبة ولا سلة القفة الخاصة بك على المستخدمين الآخرين؛ أما مالك التطبيق فيمكنه الاطلاع على مدخلات الحاسبة كما هو موضح أدناه. أما مراجع أسعار الجملة المؤرخة، عند توفرها، فهي مصدر منفصل.

**New section: الأخبار والتحقق من الإصدار ونافذة التقييم**

> يعرض تبويب «معلومات» أخبارًا ننشرها. ينزّلها التطبيق من خادمنا (Supabase)، وتُحمَّل صورها من موقعنا <bdi>soukscan.online</bdi> الذي تستضيفه GitHub Pages. وكأي طلب ويب، يُظهر ذلك عنوان الإنترنت لجهازك لهذه الخدمات. ويحتفظ التطبيق على جهازك بآخر الأخبار ليفتح التبويب دون اتصال، وبعلامة على آخر خبر شاهدته ليُظهر نقطة عند وجود أخبار جديدة.
>
> عند بدء التطبيق وعند عودتك إليه، يقرأ التطبيق رقمين عامين من خادمنا (أحدث إصدار وأقدم إصدار لا يزال مسموحًا به) ليخبرك إن كان هناك تحديث متاح أو مطلوب. ويتذكر على الجهاز أنك أغلقت إشعار تحديث. ويفتح زر التحديث صفحة SOUK-SCAN في Google Play، وتتولى Google معالجة ما يجري فيها.
>
> تطلب هذه الطلبات معلومات عامة فقط، ولا تضيف إليها أيًّا من مدخلاتك أو بياناتك الشخصية. وكأي طلب إلى خادمنا، تحمل معلومات الاتصال التقنية الموصوفة أعلاه، وتحمل أيضًا، ما دمت مسجّلًا للدخول، رمز الجلسة الذي يستخدمه التطبيق في جميع طلباته.
>
> قد يسألك التطبيق من حين إلى آخر، في نافذة منبثقة، إن كنت تريد تقييمه في Google Play. وما يحتفظ به لهذا الغرض (أيام فتح التطبيق الأخيرة وتاريخ آخر ظهور للنافذة وإجابتك) يبقى على جهازك وحده، ولا يُرسل إلينا شيء منه. وإذا اخترت التقييم فسيُفتح Google Play وتتولى Google معالجة ما تفعله هناك.

**Changed in section “التخزين على جهازك” (paragraph 1)**

- Before: يحفظ التطبيق على جهازك تفضيلات مثل اللغة والمظهر والجهة والمفضّلات، إلى جانب معلومات الجلسة اللازمة لبقائك مسجّلًا. ويحفظ هذا الموقع تفضيلات اللغة والمظهر والجهة المختارة ويرسلها إلى Supabase لقراءة التقديرات الإقليمية. لا يطلب الموقع إحداثيات GPS ولا يسجّلك في حساب. يمكنك مسحها من إعدادات تخزين الجهاز أو المتصفح.
- After: يحفظ التطبيق على جهازك تفضيلات مثل اللغة والمظهر والجهة والمفضّلات، إلى جانب معلومات الجلسة اللازمة لبقائك مسجّلًا. ويحفظ عليه أيضًا اختياراتك في سلة القفة، ونسخة من مدخلاتك الأخيرة في الحاسبة (بما فيها ما لم يُرسل بعد)، وآخر الأخبار التي ننشرها وعلامة آخر خبر شاهدته، وإشعار التحديث الذي أغلقته، وحالة نافذة التقييم. ويحفظ هذا الموقع تفضيلات اللغة والمظهر والجهة المختارة ويرسلها إلى Supabase لقراءة التقديرات الإقليمية. لا يطلب الموقع إحداثيات GPS ولا يسجّلك في حساب. يمكنك مسحها من إعدادات تخزين الجهاز أو المتصفح.

**Changed in section “الاحتفاظ بالبيانات وحذفها” (paragraph 1)**

- Before: نحتفظ ببيانات الحساب والبلاغات والملاحظات وسجلات قبول الشروط ما دامت ضرورية لإدارة الحساب والخدمة، إلى حين حذف الحساب أو إزالة البيانات قبل ذلك. ولا تعني فترة عرض الأسعار المحدودة أن البلاغات الأصلية تُحذف تلقائيًا عند انتهائها.
- After: نحتفظ ببيانات الحساب والبلاغات ومدخلات الحاسبة والملاحظات وسجلات قبول الشروط ما دامت ضرورية لإدارة الحساب والخدمة، إلى حين حذف الحساب أو إزالة البيانات قبل ذلك. ولا تعني فترة عرض الأسعار المحدودة أن البلاغات الأصلية تُحذف تلقائيًا عند انتهائها.

**Changed in section “الاحتفاظ بالبيانات وحذفها” (paragraph 2)**

- Before: يحذف التأكيد داخل التطبيق الحساب النشط والبلاغات والملاحظات المرتبطة به. وننفّذ طلبات الحذف الصحيحة عبر البريد خلال 30 يومًا تقويميًا من استلامها. راجع <a href="@@account-deletion@@">صفحة حذف الحساب</a> لمعرفة الخطوات ونطاق الحذف.
- After: يحذف التأكيد داخل التطبيق الحساب النشط والبلاغات ومدخلات الحاسبة والملاحظات المرتبطة به. وننفّذ طلبات الحذف الصحيحة عبر البريد خلال 30 يومًا تقويميًا من استلامها. راجع <a href="@@account-deletion@@">صفحة حذف الحساب</a> لمعرفة الخطوات ونطاق الحذف.

**Changed in section “الاحتفاظ بالبيانات وحذفها” (paragraph 3)**

- Before: تخضع السجلات التقنية أو النسخ الاحتياطية التي قد يحتفظ بها مزوّدو الخدمة لسياسات الاحتفاظ الخاصة بهم. ولا يعني حذف الحساب النشط حذف كل سجل أو نسخة احتياطية فورًا. وقد تبقى التفضيلات المحلية إلى أن تمسح بيانات التطبيق أو المتصفح.
- After: تخضع السجلات التقنية أو النسخ الاحتياطية التي قد يحتفظ بها مزوّدو الخدمة لسياسات الاحتفاظ الخاصة بهم. ولا يعني حذف الحساب النشط حذف كل سجل أو نسخة احتياطية فورًا. وقد تبقى التفضيلات المحلية (ومنها سلة القفة) إلى أن تمسح بيانات التطبيق أو المتصفح.

**Changed in section “الأمان والخيارات المتاحة لك” (paragraph 2)**

- Before: يمكنك رفض إذن الموقع واختيار الجهة يدويًا، وتغيير اللغة والمظهر، وتسجيل الخروج أو طلب حذف الحساب. لطلبات الوصول إلى البيانات أو تصحيحها أو لأي استفسار آخر، اكتب إلى <a href="mailto:sanamdev@soukscan.online">sanamdev@soukscan.online</a>.
- After: يمكنك رفض إذن الموقع واختيار الجهة يدويًا، وتغيير اللغة والمظهر، وعدم استخدام الحاسبة، وتسجيل الخروج أو طلب حذف الحساب. لطلبات الوصول إلى البيانات أو تصحيحها أو لأي استفسار آخر، اكتب إلى <a href="mailto:sanamdev@soukscan.online">sanamdev@soukscan.online</a>.

**Changed in section “التعديلات والتواصل” (paragraph 1)**

- Before: نحدّث هذه الصفحة عند تغيّر ممارسات الخدمة المتعلقة بالبيانات. يحدّد التاريخ أعلاه مراجعة سياسة الموقع هذه. يمكنك التواصل مع القائمين على SOUK-SCAN عبر <a href="mailto:sanamdev@soukscan.online">sanamdev@soukscan.online</a>.
- After: نحدّث هذه الصفحة عند تغيّر ممارسات الخدمة المتعلقة بالبيانات. يحدّد التاريخ أعلاه مراجعة سياسة الموقع هذه. وعندما تتغير الشروط أو هذه السياسة تغيّرًا جوهريًا، يطلب منك التطبيق مراجعة النسخة الجديدة وقبولها قبل المتابعة؛ ويطلب منك الإصدار 1.2.0 قبول النسخة المحدّثة مرة واحدة. يمكنك التواصل مع القائمين على SOUK-SCAN عبر <a href="mailto:sanamdev@soukscan.online">sanamdev@soukscan.online</a>.

#### `account-deletion` page

- **updated** — before: آخر تحديث: 20 أكتوبر 2026
  - after: آخر تحديث: 19 نوفمبر 2026

**Changed in section “البيانات التي تُحذف” (paragraph 1)**

- Before: يُحذف الحساب النشط وهوية تسجيل الدخول والبلاغات عن الأسعار والملاحظات وسجلات قبول الشروط المرتبطة بالحساب. وتتوقف بلاغاتك عن المساهمة في التقديرات المحسوبة من البلاغات المتبقية. لم تكن هويتك أو بلاغاتك الفردية معروضة للعموم.
- After: يُحذف الحساب النشط وهوية تسجيل الدخول والبلاغات عن الأسعار ومدخلات الحاسبة والملاحظات وسجلات قبول الشروط المرتبطة بالحساب. وتتوقف بلاغاتك عن المساهمة في التقديرات المحسوبة من البلاغات المتبقية. لم تكن هويتك أو بلاغاتك الفردية معروضة للعموم.

**Changed in section “البيانات التي قد تبقى” (paragraph 1)**

- Before: تخضع السجلات التقنية والنسخ الاحتياطية التي قد يحتفظ بها مزوّدو الخدمة لسياسات الاحتفاظ الخاصة بهم، وهي منفصلة عن حذف الحساب النشط. وقد تبقى التفضيلات المحلية إلى أن تمسح تخزين التطبيق أو بيانات المتصفح.
- After: تخضع السجلات التقنية والنسخ الاحتياطية التي قد يحتفظ بها مزوّدو الخدمة لسياسات الاحتفاظ الخاصة بهم، وهي منفصلة عن حذف الحساب النشط. وقد تبقى التفضيلات المحلية واختيارات سلة القفة إلى أن تمسح تخزين التطبيق أو بيانات المتصفح.


