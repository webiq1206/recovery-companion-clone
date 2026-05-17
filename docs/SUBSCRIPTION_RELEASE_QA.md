# Subscription flows — release build QA

Run these checks on a **release** binary from EAS (or `expo run:ios --configuration Release` / `expo run:android --variant release`). Metro `__DEV__` must be **false** so local premium bypass and RevenueCat REST test purchases are disabled.

## RevenueCat dashboard checklist (project setup)

Complete this in the [RevenueCat dashboard](https://app.revenuecat.com/) before expecting prices or purchases to work in any native build:

1. **Apps** — Add your iOS app (`com.webiq.recoveryroad`) and Android app (`com.webiq.recoveryroad`) and upload store credentials as RevenueCat requires.
2. **Products** — Create subscription / non-consumable products that match identifiers in App Store Connect and Google Play (exact ID match).
3. **Entitlement** — Create an entitlement named **`RecoveryRoad Pro`** (must match `REVENUECAT_PRO_ENTITLEMENT_ID` in [`providers/SubscriptionProvider.tsx`](../providers/SubscriptionProvider.tsx)). Attach all premium products to this entitlement.
4. **Offering** — Create a **default** offering (marked current) with packages. The custom paywall maps friendly labels when packages use RevenueCat defaults **`$rc_monthly`**, **`$rc_annual`**, and optionally **`$rc_lifetime`**; other package identifiers still appear as generic plan rows using store metadata.
5. **Paywalls (optional)** — If you design a hosted paywall in RevenueCat, link it to that offering. The app can present it via **Preview RevenueCat dashboard paywall** on the Premium upgrade screen in development builds (`__DEV__`), using [`react-native-purchases-ui`](../package.json).

Canonical identifiers for docs are also listed in [`constants/revenueCatPublicConfig.ts`](../constants/revenueCatPublicConfig.ts).

## EAS / local environment variables

The Purchases SDK reads **public** API keys at build time:

| Variable | Platform |
|----------|----------|
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | iOS (`appl_…`) |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | Android (`goog_…`) |

- **EAS Build:** Create [EAS secrets](https://docs.expo.dev/build-reference/variables/) or project environment variables with these names so they are available during `eas build`. Do not commit real keys in [`eas.json`](../eas.json).
- **Local native runs:** Copy [`.env.example`](../.env.example) to `.env` and fill values, or export the variables in your shell before `expo run:ios` / `expo run:android`.

Without both keys (per platform build), `purchasesApiKeyConfigured` is false and the paywall cannot load offerings.

## Preview paywall on a development client

Subscriptions do **not** run in Expo Go. Use a **development build** or release-style binary:

1. Configure RevenueCat as above and set the `EXPO_PUBLIC_REVENUECAT_*` key for the platform you are testing.
2. Run `npm run start:dev-client` (or your usual LAN script) and open the app from a dev client install.
3. From **Settings → Upgrade to Premium** or **Plans & benefits → Upgrade to Premium**, confirm the **RevenueCat hosted paywall** opens with **localized prices** from the store.
4. In **`__DEV__`**, use **Preview RevenueCat dashboard paywall** to open the RevenueCat-hosted paywall modal (requires a paywall configured in the dashboard for the current offering).
5. Complete a purchase or restore with a **sandbox** App Store / Play account and confirm **`RecoveryRoad Pro`** becomes active in RevenueCat.

## Preconditions

- Production RevenueCat iOS/Android API keys are set for the release build.
- Native in-app purchases are integrated (e.g. RevenueCat Purchases SDK) so checkout and restore use **App Store / Google Play**, not the dev-only REST receipt path in `SubscriptionProvider`.

## Scenarios

1. **Upgrade (new subscriber)**  
   Open Premium / plans, complete purchase with a **sandbox** store account, confirm premium unlocks and the correct entitlement appears in RevenueCat.

2. **Restore**  
   After purchase, delete app data or reinstall, tap **Restore**, confirm premium returns when signed into the same store account.

3. **Expiration / lapse**  
   Let a sandbox subscription expire (or revoke in App Store Connect / Play Console), pull to refresh or reopen app, confirm premium gates reappear and `subscription` tier returns to free when RC reports inactive entitlement.

4. **Manage subscription**  
   From Settings (or Premium screen), open **App Store subscriptions** / **Play subscriptions** and confirm the subscription is listed and cancellable there.

5. **Negative: no local bypass**  
   With network off or invalid RC key, confirm **Restore** does **not** unlock premium and **no** “Premium Activated (dev)” style alerts appear.

6. **Premium upgrade screen**  
   With no native IAP wired, confirm **Start Premium** does not perform a fake checkout (dev-only REST path is blocked in release).
