# RecoveryRoad

Native iOS and Android app (Expo Router, React Native, TypeScript) for recovery support: check-ins, journaling, connection tools, accountability, and related flows. Configuration lives in [`app.json`](app.json) (Expo name **RecoveryRoad**).

## Requirements

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm (ships with Node)

Optional: [Bun](https://bun.sh/) if you run `bun test` as defined in [`package.json`](package.json).

## Local development

```bash
npm install
npm run start              # LAN dev server (see scripts/expo-start-lan-ip.mjs)
npm run start:localhost    # plain expo start
npm run start-web          # web preview
npm run start:dev-client   # development client + LAN
```

Use **Expo Go** or a **development build** on device; this project uses native capabilities (subscriptions, notifications, and so on) that typically need a dev client or store build rather than Expo Go alone for full parity.

## Scripts (selected)

| Command | Purpose |
|--------|---------|
| `npm run lint` | Expo lint |
| `npm run test` | Unit tests (Bun) |
| `npm run audit:nav` | Navigation audit: router targets vs `app/` routes |
| `npm run qa:ia-strict` | Prints strict IA redirect QA steps |
| `npm run doctor` | `expo-doctor` |
| `npm run social-server` | Local social / recovery rooms backend ([`docs/LIVE_SOCIAL.md`](docs/LIVE_SOCIAL.md)) |

## Documentation

- Privacy policy (keep in sync with in-app Settings → Privacy Policy): [`docs/PRIVACY_POLICY.md`](docs/PRIVACY_POLICY.md); static web export: [`public/privacy-policy.html`](public/privacy-policy.html) (host at your public `https://` URL; set `EXPO_PUBLIC_PRIVACY_POLICY_URL` in production builds for the in-app browser link)
- Subscription release QA: [`docs/SUBSCRIPTION_RELEASE_QA.md`](docs/SUBSCRIPTION_RELEASE_QA.md)
- Live community / recovery rooms: [`docs/LIVE_SOCIAL.md`](docs/LIVE_SOCIAL.md)
- Strict IA redirect smoke checklist: [`docs/ia-strict-redirect-smoke.md`](docs/ia-strict-redirect-smoke.md)

## App Store and Google Play disclosure (accounts and data)

The canonical policy text lives in **`constants/legalInAppCopy.ts`** (`PRIVACY_POLICY_SECTIONS`), surfaced in **Settings → Privacy Policy**, mirrored in [`docs/PRIVACY_POLICY.md`](docs/PRIVACY_POLICY.md) and [`public/privacy-policy.html`](public/privacy-policy.html). **App Store Connect → App Privacy** must match that policy for the same binary (see [`docs/APP_STORE_PRIVACY_LABELS.md`](docs/APP_STORE_PRIVACY_LABELS.md)).

- **No RecoveryRoad cloud account:** The app does not create a separate server-side user account or hosted profile for you to sign into for core features.
- **Data on your device:** Recovery information and preferences are stored on the device; deleting your “account” in Settings means **permanently erasing locally stored app data** on that device (see in-app delete confirmation for the full list).
- **Store billing is separate:** Subscription or purchase history may still exist under your **Apple ID or Google account** and with **RevenueCat** when the SDK is configured; manage or cancel in App Store / Google Play settings.

## Consumer vs internal builds

Store-facing **production** and **preview** EAS profiles set `EXPO_PUBLIC_INCLUDE_PROVIDER_SUITE=0`. That hides care-partner / enterprise entry points, disables related premium marketing, and keeps those flows unreachable in normal use (the app is positioned as self-help wellness, not a clinical or provider product).

**Development** client builds set `EXPO_PUBLIC_INCLUDE_PROVIDER_SUITE=1` so optional workspace screens can still be exercised. To match a consumer binary locally, run Expo without that variable (or set it to `0`).

## Deployment (EAS)

Install the EAS CLI (`npm i -g eas-cli` or use `npx eas-cli`), then from the project root:

```bash
eas build:configure   # first time only
eas build --platform ios
eas build --platform android
```

Submit with `eas submit`. See [Expo submit docs](https://docs.expo.dev/submit/introduction/) for iOS and Android. Web export: `npx expo export` (see [Expo Router web](https://docs.expo.dev/router/introduction/)).

## Project layout (high level)

```
├── app/                 # Screens and layouts (Expo Router)
├── assets/              # Images and static assets
├── backend/social/      # Optional local social server
├── components/          # Shared UI
├── constants/           # Theme and static config
├── core/                # Domain hooks and contracts
├── docs/                # Policies, QA, and ops notes
├── features/            # Feature modules (e.g. tools registry)
├── hooks/               # Shared hooks
├── providers/           # React context providers
├── scripts/             # Dev helpers and audits
├── stores/              # Client state
├── utils/               # Utilities (routing, wizard engine, etc.)
├── app.json             # Expo config
├── eas.json             # EAS build profiles
└── package.json
```

## Troubleshooting

- **Device cannot load the dev bundle:** Same Wi‑Fi as the machine running Metro, or try `npm run start:dev-client:tunnel` / tunnel options in [`package.json`](package.json).
- **Stale Metro cache:** `npm run start:clear` or `npx expo start --clear`.
- **Build errors:** [Expo troubleshooting](https://docs.expo.dev/troubleshooting/build-errors/) and `npm run doctor`.
