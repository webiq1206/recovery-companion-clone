# Subscription flows — release build QA

Run these checks on a **release** binary from EAS (or `expo run:ios --configuration Release` / `expo run:android --variant release`). Metro `__DEV__` must be **false** so local premium bypass and RevenueCat REST test purchases are disabled.

## RevenueCat dashboard checklist (project setup)

Complete this in the [RevenueCat dashboard](https://app.revenuecat.com/) before expecting prices or purchases to work in any native build:

1. **Apps** — Add your iOS app (`com.webiq.recoveryroad`) and Android app (`com.webiq.recoveryroad`) and upload store credentials as RevenueCat requires.
2. **Products** — Create subscription / non-consumable products that match identifiers in App Store Connect and Google Play (exact ID match).
3. **Entitlement** — Create an entitlement named **`RecoveryRoad Premium`** (must match `REVENUECAT_PRO_ENTITLEMENT_ID` in [`constants/revenueCatPublicConfig.ts`](../constants/revenueCatPublicConfig.ts)). Attach all premium products to this entitlement. If the dashboard id differs, set `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` in `.env` / EAS to the exact dashboard identifier.
4. **Offering** — Create a **default** offering (marked current) with packages. The custom paywall maps friendly labels when packages use RevenueCat defaults **`$rc_monthly`**, **`$rc_annual`**, and optionally **`$rc_lifetime`**; other package identifiers still appear as generic plan rows using store metadata.
5. **Paywalls (optional)** — If you design a hosted paywall in RevenueCat, link it to that offering. The app can present it via **Preview RevenueCat dashboard paywall** on the Premium upgrade screen in development builds (`__DEV__`), using [`react-native-purchases-ui`](../package.json).

Canonical identifiers for docs are also listed in [`constants/revenueCatPublicConfig.ts`](../constants/revenueCatPublicConfig.ts).

## EAS / local environment variables

The Purchases SDK reads **public** API keys at build time:

| Variable | Platform |
|----------|----------|
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | iOS (`appl_…`) |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | Android (`goog_…`) |
| `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` | Optional override if dashboard entitlement id differs from `RecoveryRoad Premium` |

- **EAS Build (TestFlight / App Store):** Variables must be on the **`production`** environment (not only a legacy project secret). Example:
  ```bash
  eas env:create --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value <appl_…> --environment production --visibility secret
  eas env:create --name EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID --value "RecoveryRoad Premium" --environment production --visibility plaintext
  ```
  After `eas build -p ios --profile production`, confirm **Settings → Subscription status** shows **Store key in build: yes**. If it shows **no**, the binary was built without the key—subscriptions will not unlock.
- **Local native runs:** Copy [`.env.example`](../.env.example) to `.env` and fill values, or export the variables in your shell before `expo run:ios` / `expo run:android`.

Without the platform key in the **build** that is installed, `purchasesApiKeyConfigured` is false and premium cannot sync from RevenueCat.

## Preview paywall on a development client

Subscriptions do **not** run in Expo Go. Use a **development build** or release-style binary:

1. Configure RevenueCat as above and set the `EXPO_PUBLIC_REVENUECAT_*` key for the platform you are testing.
2. Run `npm run start:dev-client` (or your usual LAN script) and open the app from a dev client install.
3. From **Settings → Upgrade to Premium** or **Plans & benefits → Upgrade to Premium**, confirm the **RevenueCat hosted paywall** opens with **localized prices** from the store.
4. In **`__DEV__`**, use **Preview RevenueCat dashboard paywall** to open the RevenueCat-hosted paywall modal (requires a paywall configured in the dashboard for the current offering).
5. Complete a purchase or restore with a **sandbox** App Store / Play account and confirm **`RecoveryRoad Premium`** becomes active in RevenueCat.
6. In **`__DEV__`**, open **Settings** and note **RevenueCat customer ID** to look up the same customer in the RevenueCat dashboard after purchase.

## Post-purchase verification (app)

After a sandbox purchase, the app syncs with the store (iOS when supported), then retries `getCustomerInfo` at **0 / 1s / 2.5s / 5s** before treating Premium as unlocked. Entitlements resolve from the configured id (`RecoveryRoad Premium`), short aliases (`premium`, `pro`), or a single active entitlement if only one exists.

If the paywall reports success but Settings still shows **Upgrade**:

1. Open **Settings → Subscription status** (visible when not premium) and compare **Active entitlements** vs **Expected entitlement**.
2. In RevenueCat → **Customers**, search the **RevenueCat customer ID** from Settings and confirm the entitlement is active.
3. Use **Restore purchases** once the dashboard shows the entitlement on that customer.

In **`__DEV__`**, Metro also logs active entitlement keys when purchase completes but tier stays free.

## Preconditions

- Production RevenueCat iOS/Android API keys are set for the release build.
- Native in-app purchases are integrated (e.g. RevenueCat Purchases SDK) so checkout and restore use **App Store / Google Play**, not the dev-only REST receipt path in `SubscriptionProvider`.

## Scenarios

1. **Upgrade (new subscriber)**  
   Open Premium / plans, complete purchase with a **sandbox** store account, confirm **Settings → Premium active** (not only the paywall success message), premium gates unlock, and the correct entitlement appears in RevenueCat for the dev customer id when applicable.

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
