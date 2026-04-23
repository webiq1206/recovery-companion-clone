/**
 * Run arbitrary Expo CLI commands with the same packager host env as `npm start`
 * (avoids 127.0.0.1 in "Metro waiting on" when the CLI is not launched via
 * `expo-start-lan-ip.mjs` — e.g. `npx expo run:android` starts Metro in a sub-process).
 *
 *   npm run android
 *   node ./scripts/expo-with-packager-env.mjs run:android --device
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

if (forwarded.length === 0) {
  console.error("Usage: node ./scripts/expo-with-packager-env.mjs <expo args…>");
  process.exit(1);
}

const env = { ...process.env };
const useLocalhost = argvImpliesLocalhostMode(forwarded);
const useTunnel = argvImpliesTunnelMode(forwarded);
applyPackagerHostnameToEnv(env, { useLocalhost, useTunnel });

const child = spawn(process.execPath, [expoCli, ...forwarded], {
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
