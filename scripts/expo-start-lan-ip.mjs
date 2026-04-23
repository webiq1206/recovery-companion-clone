/**
 * Expo CLI uses `lan-network` to pick the packager network address. On some Windows setups
 * that call fails and the dev-client QR still embeds http://127.0.0.1:8081.
 * Setting REACT_NATIVE_PACKAGER_HOSTNAME first matches Expo's own override
 * (see @expo/cli UrlCreator.getDefaultHostname).
 *
 * Run via `npm start` / `npm run start:lan` / `npm run start:dev-client` — not plain
 * `npx expo start --lan`, or this file is never run and the QR URL may use 127.0.0.1.
 *
 * For `expo run:android` / Metro spawned outside this script, use
 * `npm run android` (see `expo-with-packager-env.mjs`).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  applyPackagerHostnameToEnv,
  argvImpliesLocalhostMode,
  argvImpliesTunnelMode,
} from "./packager-hostname.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expoCli = path.join(root, "node_modules", "expo", "bin", "cli");
const forwarded = process.argv.slice(2);

const useTunnel = argvImpliesTunnelMode(forwarded);
const useLocalhost = argvImpliesLocalhostMode(forwarded);

const env = { ...process.env };
applyPackagerHostnameToEnv(env, { useTunnel, useLocalhost });

const child = spawn(process.execPath, [expoCli, "start", ...forwarded], {
  cwd: root,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
