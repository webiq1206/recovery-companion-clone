# App Store Connect — App Privacy (nutrition labels)

Use this checklist so **App Store Connect → App Privacy** matches the shipped binary and [`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md). Update it whenever you change environment variables, SDKs, or backends.

## Default consumer posture (reference: `eas.json` production profile)

- **`EXPO_PUBLIC_COMMUNITY_ENABLED=false`** (typical store build): Live community / recovery rooms do **not** send UGC to your HTTPS social API. Offline or demo social content stays on-device in development only (`__DEV__`).
- **Purchases:** When `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` (and/or Android key) is set in the native app, Apple/Google process payment; **RevenueCat** receives purchase-related data and the pseudonymous `rc_user_id` stored in AsyncStorage. Declare **Purchase History** (or Purchases) as collected for **App Functionality**, linked to the user (via store account + pseudonymous ID). **Data Used to Track:** No, unless you separately enable tracking-compatible SDK features (not done in this repo).
- **Health / wellness content:** Journal and check-ins are **on-device** for core features—do **not** declare off-device Health & Fitness / Sensitive Info collection for that content unless you ship a build that syncs it to your backend.
- **Contact info:** Support contacts and similar fields typed into the App remain on-device unless a feature transmits them—declare off-device **Contact Info** only if you actually send it to a server.
- **Identifiers:** If live social is **disabled**, the App does not send `clientBindingId` / session tokens to your social API—no off-device **Device ID** for that purpose. If live social is **enabled**, declare identifiers as collected for app functionality / account security per Apple’s categories.
- **User content:** Declare **Other User Content** (or applicable types) **only** when live social is enabled and users can post or message on the server.
- **Usage / diagnostics:** Security audit entries (when audit logging is enabled) stay **on-device**—do not declare off-device **Analytics** for them unless you add upload code. Optional local diagnostics caches cleared via Settings → Reset local diagnostics are also on-device only.
- **Device motion:** Shake-to-crisis uses the accelerometer **on-device only**—typically **Data Not Collected** off-device for Device Motion unless you transmit samples.

## Optional live social (State B)

When **`EXPO_PUBLIC_COMMUNITY_ENABLED=true`** and **`EXPO_PUBLIC_LIVE_SOCIAL_API_URL`** is `https://` in a release build:

- Declare data types actually sent: posts, comments, room messages, reports, profile fields, session tokens, and stable install binding as implemented in `services/liveSocialClient.ts` and `docs/LIVE_SOCIAL.md`.
- **Data Used to Track:** Still **No** for typical community use unless you enable ad tracking SDKs.

## Other code paths

- **tRPC / `EXPO_PUBLIC_API_BASE_URL`:** Client code exists under `lib/trpc.ts`, but **no production UI in this repository calls it**—do not declare collection for a backend API unless you wire features to it.
- **Provider / enterprise suite:** Gated by `EXPO_PUBLIC_INCLUDE_PROVIDER_SUITE`; data shown in those flows is still stored locally unless you add network export—match labels to what you actually transmit.

When in doubt, exercise the release binary with logging or a MITM proxy on a test device and reconcile every HTTPS origin with App Store answers.
