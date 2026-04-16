# Live community & recovery rooms

This app supports **three modes** (see `core/socialLiveConfig.ts`):

| Mode | When | Behavior |
|------|------|----------|
| **live** | `EXPO_PUBLIC_LIVE_SOCIAL_API_URL` is set to a valid `http(s)` origin | Community and Recovery Rooms load from your backend. Messages are **only** from real users on that server. Reports are stored server-side for moderation. |
| **local_demo** | Metro `__DEV__` and no live URL, and `EXPO_PUBLIC_ALLOW_LOCAL_SOCIAL_DEMO` is not `false` | Optional seeded AsyncStorage content and **simulated** room replies for engineering only. **Never** used in production release binaries (`__DEV__` is false). |
| **offline** | No live URL and not in local demo (typical App Store / Play release) | No sample users or posts; rooms list is empty until a backend is configured. |

## Reference server (MVP)

Run from the repo root:

```bash
npm run social-server
```

Defaults to port **3847**. Set `SOCIAL_ADMIN_SECRET` to enable:

`GET /v1/admin/reports?secret=<SOCIAL_ADMIN_SECRET>` — returns queued room and community moderation items (in-memory only until you wire persistence).

### App configuration

1. Start the server on a machine reachable from your phone (same Wi‑Fi).
2. Set in `.env` or EAS secrets:

```bash
EXPO_PUBLIC_LIVE_SOCIAL_API_URL=http://192.168.x.x:3847
```

For **Android** with an `http://` URL, the native app must allow cleartext traffic at **build** time. Release and preview builds keep cleartext **off** by default (`app.config.js`). Only enable it when you truly need HTTP:

- **EAS `development` profile** sets `EXPO_ANDROID_ALLOW_CLEARTEXT=1` in `eas.json` (internal dev client + LAN servers).
- **Local `expo run:android`:** set `EXPO_ANDROID_ALLOW_CLEARTEXT=1` in your shell or `.env` for that build.
- **Production / Play:** use **`https://`** for `EXPO_PUBLIC_LIVE_SOCIAL_API_URL` and do **not** set `EXPO_ANDROID_ALLOW_CLEARTEXT`.

3. Rebuild the dev client or release binary so the env var is embedded.

### What the MVP server provides

- Session: `POST /v1/auth/session` (device-scoped user record).
- Recovery rooms: join, leave, post messages (requires join), **no scripted peer replies**.
- Blocking: `GET/POST /v1/me/blocks` — pass `authorName` and/or `authorId` (at least one required). Returns `blockedAuthorNames` and `blockedUserIds`.
- Reporting: `POST /v1/rooms/reports` (message) and `POST /v1/rooms/user-reports` (participant) store items for admin review (`GET /v1/admin/reports`).
- Community: posts, comments, likes, follows, profile registration.

### What you must add for production

- **Persistence** (Postgres / DynamoDB, etc.) instead of in-memory maps.
- **Real auth** (Sign in with Apple / Google / passkeys) mapped to stable user IDs.
- **Moderation tooling** (queues, SLA, appeals) and **human review** for high-risk categories.
- **Rate limits**, **spam detection**, **legal / crisis** escalation paths and retention policies.
- **Availability** targets (uptime, incident response) documented for users.
- **TLS** termination in front of the API; never ship production bearer tokens over plain HTTP.

The mobile app **polls** the API on an interval in live mode; for large communities, add WebSockets or push and adjust battery/network expectations accordingly.
