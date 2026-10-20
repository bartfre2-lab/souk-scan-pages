# SOUK-SCAN Google Play review — 20 October 2026

This is a source-based review and proposed submission material. It does not
change Play Console, build a new AAB, certify Google approval or replace a
separate human native-language review.

## Drafts located on GitHub

The English draft and proposed Data safety answers were found in
[`docs/PLAY-CONSOLE-PREP.md`](https://github.com/bartfre2-lab/SOUK-SCAN/blob/claude/gifted-maxwell-lzry1e/docs/PLAY-CONSOLE-PREP.md).
That branch is one documentation-only commit ahead of `supabase-backend`.
Its introduction says it was prepared from the repository, not the live Console.
It contains no Arabic or French listing drafts. Answers currently saved in
Play Console cannot be established from GitHub.

Reviewed app revision: `b190fe2e22b33a9535bad1ea5c9ed574ac511e44`.
This task leaves app code and backend unchanged.

## Listings and language review

Proposed descriptions: [English](store-listings/en.txt),
[French](store-listings/fr.txt), [Arabic](store-listings/ar.txt).
Short descriptions are under 80 characters; full descriptions under 4,000.
Arabic uses Modern Standard Arabic. French distinguishes community estimates
from wholesale reference prices.

The original English short description called community reports “wholesale
produce prices.” Revised copy separates community estimates from dated Casa
Prestations references, avoids guaranteed/current-price claims, includes meat
and eggs, and distinguishes DH/kg from DH/egg. It does not claim government
status, a Casa Prestations partnership or an unpublished Play release.

Deletion labels match `src/i18n/locales/{en,fr,ar}.json`:

| Language | In-app navigation            |
| -------- | ---------------------------- |
| English  | Profile → Delete account     |
| French   | Profil → Supprimer le compte |
| Arabic   | حسابي ← حذف الحساب           |

Localized terms preserve the app's **12 October 2026** terms version from
`src/lib/terms.ts`; the website policy revision has its own date.

## Proposed Data safety answers

Google defines collection as transmission off the device, including relevant
SDK/provider processing. Permission access alone is a different question.

| Data type / question         | Recommendation                                                                           | Evidence and limits                                                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Approximate location         | **Keep “collected.”** App functionality; not purely ephemeral.                           | `detectRegion.ts` calculates a region locally, but `aggregates.ts` sends `p_region_id` and `submitObservation.ts` stores `region_id` with the account's report.                               |
| Optional location            | Automatic physical-location detection is optional; manual region selection is available. | A region is required, but users can select a market region without supplying device location. Validate the manual path in the submitted release before using Play's “optional” answer.        |
| Precise location             | No off-device collection found in reviewed app code.                                     | Raw coordinates are not transmitted, persisted or logged. The legacy fine-location permission on Android ≤30 does not itself mean off-device collection. Recheck the final SDK/AAB behavior.  |
| Email and user ID            | Collected for account management; required for production sign-in.                       | Supabase email/password and Google authentication in `AuthContext.tsx`; IDs link reports, feedback and terms acceptance.                                                                      |
| Name / profile photo         | **Verify before finalizing; do not simply mark “No.”**                                   | Google OAuth can return profile metadata to Supabase even if the UI only uses email/ID. Check configured scopes/provider identity payload, then map actual fields to Play's types.            |
| Other user-generated content | Collected, optional, for app functionality.                                              | Voluntary price reports in `submitObservation.ts` and feedback in `submitFeedback.ts`. Product prices are not the user's payment/financial information.                                       |
| Sharing                      | A processor exception may apply; verify final providers/SDKs.                            | Supabase provides auth/database; Google handles chosen sign-in. Play's sharing exceptions differ from privacy disclosure. “Not shared” must not imply no provider receives data.              |
| Encryption in transit        | Yes for reviewed backend requests.                                                       | Backend uses HTTPS. This does not establish end-to-end encryption or encryption at rest.                                                                                                      |
| Account deletion             | In app and via public web/email instructions.                                            | `delete_my_account` removes active reports, feedback and auth account; linked terms/auth records cascade. Sign-out follows successful deletion. Admin accounts require maintainer assistance. |
| Ads / analytics              | None found in reviewed dependencies/code.                                                | No advertising SDK, AD_ID permission or third-party analytics integration found. Recheck final release dependencies.                                                                          |

`src/lib/diagnostics.ts` builds a local report rather than automatically uploading
telemetry; users can deliberately copy/share it. Provider connection metadata
and technical logs still need a provider-specific retention review.

The app's broad in-app privacy wording about never sharing should be reconciled
with provider processing in a future app text update. The new website policies
describe these providers explicitly; native app text is unchanged here.

## Privacy and deletion pages

The three languages cover account data, reports, feedback, local preferences,
raw coordinates, transmitted regions, providers, HTTPS, retention and deletion.
Deletion instructions are accessible without login, using the established
support address. Active-account deletion is distinguished from provider logs,
backups and local preferences. Email deletion retains the existing public
page's 30-calendar-day timeframe; the operator must continue honoring it.

| Language | Official privacy path | Official deletion path |
| -------- | --------------------------- | ------------------------------------ |
| English  | `/privacy/`    | `/account-deletion/`    |
| French   | `/fr/privacy/` | `/fr/account-deletion/` |
| Arabic   | `/ar/privacy/` | `/ar/account-deletion/` |

The owner approved and published these policies to the official domain on
20 October 2026. Proposed listings use the stable production URLs
`https://soukscan.online/privacy/` and
`https://soukscan.online/account-deletion/`. The historical website review
remains available under `/preview/souk/` with noindex metadata.

## Remaining release checks

1. Reconcile recommendations with actual Play Console answers and the final
   signed release, especially Google OAuth profile fields.
2. Test permission denial/manual region selection on a device; verify submitted
   reports contain the intended region rather than coordinates.
3. Test successful deletion and failure/retry on a non-admin test account in the
   submitted release, verifying linked database/auth removal.
4. Confirm mailbox operation and provider log/backup retention. Keep production
   privacy/deletion pages public, unrestricted and consistent with app text.
5. Confirm developer identity/contact, target audience/content rating and all
   Console declarations. The earlier draft's proposed age is not a saved setting.

## Official references reviewed

- [Data safety definitions](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Account deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [User data / privacy policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
