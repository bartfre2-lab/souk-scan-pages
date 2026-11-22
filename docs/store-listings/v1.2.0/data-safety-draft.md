# Play Console: Data safety draft for SOUK-SCAN 1.2.0 (for the owner to read; nothing submitted yet)

Built from the code in `C:\Users\Sanam\Desktop\SOUK SCAN` (`src/`, `android/app/src/main/AndroidManifest.xml`, `package.json`, `SECURITY.md`,
`docs/GROCERY-PRIVACY-APPROVAL.md`) and the in-app privacy policy (`src/i18n/locales/en.json`, `privacyPolicy.*`). I will compare it with what the
console currently shows before entering anything, and will ask for a clear yes before the final submit.

## What the app really does with data (verified in code)

| What | Where it goes | Evidence |
|---|---|---|
| Email (and password, or Google sign-in) | Supabase Auth, account identifier | `src/auth/AuthContext.tsx` |
| Prices the user submits: product, price, region, local date | `observations` table, linked to the account; the public sees only combined ranges | `src/data/submitObservation.ts`, SECURITY.md §3-4 |
| Feedback messages (category + text) | `feedback` table, linked to the account | `src/data/submitFeedback.ts` |
| Calculator shops (optional label up to 40 chars) and lines (product, price, quantity) | `grocery_stops` / `grocery_lines`, linked to the account; owner sees products, prices, quantities, never shop names; each calculator price is also sent as a community price | `src/grocery/groceryRemote.ts`, GROCERY-PRIVACY-APPROVAL.md |
| Region (one of 12), chosen by hand or detected | sent with price requests and prices | `src/lib/detectRegion.ts` |
| Raw GPS position | read once on the phone, used to pick the nearest of 12 regions, never sent; permission is approximate location (fine location only on Android 11 and older) | AndroidManifest.xml comment, `enableHighAccuracy: false` |
| Terms acceptance (version, time) | `terms_acceptances`, linked to the account | `src/data/useTermsAcceptance.ts` |
| Al-Qoffa basket choices | phone only (local storage), nothing sent | SECURITY.md §4b |
| News images | loaded from the owner's own site soukscan.online (the site sees the device's internet address like any web request) | privacy policy "News and images" |
| Ads, third-party analytics, crash reporters, advertising ID | none in the app (`package.json` and Gradle have none) | `package.json`, `android/app/build.gradle` |

## Answers for the form

**Does your app collect or share any of the required user data types?** Yes (collect). **Is all of the user data encrypted in transit?** Yes (HTTPS to Supabase).
**Do you provide a way for users to request that their data be deleted?** Yes: in the app (Profile, Delete account) and at https://soukscan.online/account-deletion/.

**Data types to declare as COLLECTED** (none is SHARED with third parties; Supabase is a service provider processing on our behalf, not a recipient, and Google sign-in is
authentication by Google, not sharing by us):

| Category > type | Collected | Shared | Optional? | Purposes | Why |
|---|---|---|---|---|---|
| Personal info > Email address | Yes | No | Required (account) | App functionality; Account management | Sign-in and account |
| Personal info > Name | Yes | No | Required with Google sign-in (not collected for email sign-ups) | Account management | Supabase stores the Google display name (checked 2026-11-22: 29 of 29 Google accounts have it); the app itself never reads or shows it |
| Personal info > User IDs | Yes | No | Required | App functionality; Account management | Account id that owns prices and lists |
| Location > Approximate location | Yes | No | Optional | App functionality | Region (one of 12) sent with prices and price requests; raw GPS stays on the phone |
| App activity > Other user-generated content | Yes | No | Optional | App functionality; Analytics | Submitted prices, calculator shop labels and lines |
| Messages > Other in-app messages | Yes | No | Optional | App functionality | Feedback form text |
| Financial info > Purchase history | Yes | No | Optional | App functionality; Analytics | Calculator lines (what was bought, price, quantity); the owner studies what people buy. Nothing is purchased in the app and no payment data exists, but this is the closest literal category (decision recorded in GROCERY-PRIVACY-APPROVAL.md). |

For every collected type: **Linked to the user = Yes** (stored under the account). **Used for advertising, personalization or fraud prevention = No.**
**Data processed ephemerally = No** (it is stored).

**Not collected:** name, phone, address, exact location, photos, files, contacts, calendar, device or other IDs (no advertising ID), web browsing, app performance (crash logs, diagnostics), health, audio, SMS, installed apps.

**Security practices:** encrypted in transit = Yes; deletion request = Yes (in app + URL above); Families policy = No; independent security review = No (not done).

## Things I am not sure about (owner / architect to decide)

1. **Internet address (IP).** Supabase and soukscan.online receive the device's IP like any web request; the privacy policy says so for news images. Google treats standard request handling by a service provider as not needing a declaration, so I plan not to declare "Device or other IDs". Say if you want it declared.
2. **Google sign-in profile data (CHECKED 2026-11-22).** Supabase Auth stores the Google display name for all 29 Google accounts and a profile-picture link for 27 of them (aggregate counts only, no personal values read). The app code never reads either. So "Name" is declared above; the picture link is a stored URL, not an uploaded photo, so I propose declaring it under Personal info > Other info only if you want to be strictly cautious. The in-app privacy policy and the website policy say only that the Google email is shared: this under-describes what is stored and should be corrected by the architect.
3. **Purchase history.** If you prefer not to declare it, the calculator lines would still be covered by "Other user-generated content", but the approved privacy note chose to declare both.
4. **The form's current state.** I have not yet seen what the console currently says; if it differs from this draft I will show you the differences before changing anything.

## Other App content forms I will check

Privacy policy URL https://soukscan.online/privacy/; Ads = No; App access (a sign-in is needed: Play asks for a review login; I will not enter any password, you provide a test account or choose "no special access" only if the preview mode counts); Content rating questionnaire; Target audience (not for children); News app = No (Info tab is the developer's own announcements, not a news publisher: to confirm in the console); Government app = No; Financial features = none; Health = none; Account deletion URL https://soukscan.online/account-deletion/; Advertising ID = not used.
