import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "../backend/trpc/app-router";

/**
 * Typed tRPC client for optional operator / enterprise backends.
 *
 * **Shipping RecoveryRoad screens do not call this client today**, so no HTTP
 * traffic is sent to `EXPO_PUBLIC_API_BASE_URL` from the UI. If you wire procedures in
 * the app, set the env var and update App Store privacy answers, `docs/PRIVACY_POLICY.md`,
 * `constants/legalInAppCopy.ts`, and `public/privacy-policy.html` to describe what leaves the device.
 */
export const trpc = createTRPCReact<AppRouter>();

/** Set EXPO_PUBLIC_API_BASE_URL to your API origin (no trailing /api/trpc). */
const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (!url) {
    if (__DEV__) {
      console.warn("[tRPC] EXPO_PUBLIC_API_BASE_URL not set; tRPC requests use empty origin");
    }
    return "";
  }

  return url.replace(/\/$/, "");
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers: () => {
        return {
          "Content-Type": "application/json",
        };
      },
    }),
  ],
});
