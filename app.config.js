/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Dynamic Expo config. Static fields live in `app.json`; this file only adjusts
 * values that must depend on compile-time environment (see Android cleartext below).
 */
const appJson = require('./app.json');

/**
 * Android `usesCleartextTraffic` (HTTP without TLS).
 *
 * - **Default / production / preview:** `false` — Play-safe; use `https://` for APIs.
 * - **Opt-in only:** set `EXPO_ANDROID_ALLOW_CLEARTEXT=1` at prebuild time when you
 *   intentionally need `http://` (e.g. LAN reference social server during dev).
 * - EAS `development` profile sets this in `eas.json`; **never** set it on the
 *   `production` profile.
 */
const allowAndroidCleartext = process.env.EXPO_ANDROID_ALLOW_CLEARTEXT === '1';

function applyExpoBuildProperties(plugins) {
  if (!Array.isArray(plugins)) return plugins;
  return plugins.map((entry) => {
    if (Array.isArray(entry) && entry[0] === 'expo-build-properties') {
      const [, opts = {}] = entry;
      const android = { ...(opts.android || {}) };
      android.usesCleartextTraffic = allowAndroidCleartext;
      return ['expo-build-properties', { ...opts, android }];
    }
    return entry;
  });
}

module.exports = () => ({
  expo: {
    ...appJson.expo,
    plugins: applyExpoBuildProperties(appJson.expo.plugins),
  },
});
