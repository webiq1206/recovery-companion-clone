# Live community & recovery rooms

This app supports **three modes** (see `core/socialLiveConfig.ts`):

| Mode | When | Behavior |
|------|------|----------|
| **live** | `EXPO_PUBLIC_LIVE_SOCIAL_API_URL` is set to a valid `http(s)` origin | Community and Recovery Rooms load from your backend. Messages are **only** from real users on that server. Reports, blocks, and moderation actions are handled by that backend. |
| **local_demo** | Metro `__DEV__` and no live URL, and `EXPO_PUBLIC_ALLOW_LOCAL_SOCIAL_DEMO` is not `false` | Optional seeded AsyncStorage content and **simulated** room replies for engineering only. **Never** used in production release binaries (`__DEV__` is false). |
| **offline** | No live URL and not in local demo (typical App Store / Play release) | No sample users or posts; rooms list is empty until a backend is configured. |

## Social API server

Run from the repo root:

```bash
npm run social-server
```

Defaults to port **3847**. State is persisted under `backend/social/data/social-state.json` (overridable with `SOCIAL_DATA_DIR`). Set `SOCIAL_ADMIN_SECRET` to enable moderation and admin routes.

### User safety (implemented in this server)

- **Rate limits** — room messages, community posts/comments, and reports are throttled per account (see `backend/social/server.mjs`).
- **Spam / abuse** — rapid duplicate identical content from the same account is rejected.
- **Posting restriction** — admins can restrict an account from creating new posts or messages.
- **Reporting** — room message and user reports include **snapshots** (message body, author ids) when the message still exists, so moderators can review without guessing.
- **Community reports** — `POST /v1/community/reports` for posts or comments with `targetType`, `targetId`, optional `postId`, `reason`, `description`.

### Admin & moderation (requires `SOCIAL_ADMIN_SECRET`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/admin/reports?secret=…` | List moderation queue items |
| PATCH | `/v1/admin/reports/:id?secret=…` | Body: `{ "status": "reviewed" \| "resolved", "notes": "…" }` |
| POST | `/v1/admin/moderation/hide-room-message?secret=…` | Body: `{ "roomId", "messageId" }` — redacts message |
| POST | `/v1/admin/moderation/hide-community-post?secret=…` | Body: `{ "postId" }` |
| POST | `/v1/admin/moderation/hide-community-comment?secret=…` | Body: `{ "commentId" }` |
| POST | `/v1/admin/moderation/restrict-user?secret=…` | Body: `{ "userId", "restrict": true \| false }` |

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

### Production hardening checklist

- Replace JSON file persistence with your **database** and backups.
- Add **authenticated identities** (e.g. Sign in with Apple) mapped to stable user IDs.
- Run **TLS** in front of the API; do not ship production bearer tokens over plain HTTP.
- Connect admin routes to your **internal tooling**, SSO, and audit logging.
- Define **retention**, appeals, and crisis escalation** with your legal and clinical teams.

The mobile app **polls** the API on an interval in live mode; for large communities, add WebSockets or push and adjust battery/network expectations accordingly.
