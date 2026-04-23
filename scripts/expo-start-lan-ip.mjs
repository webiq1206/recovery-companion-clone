/**
 * Expo CLI uses `lan-network` to pick the packager network address. On some Windows setups
 * that call fails and the dev-client QR still embeds http://127.0.0.1:8081.
 * Setting REACT_NATIVE_PACKAGER_HOSTNAME first matches Expo's own override
 * (see @expo/cli UrlCreator.getDefaultHostname).
 *
 * Run via `npm start` / `npm run start:lan` / `npm run start:dev-client` — not plain
 * `npx expo start --lan`, or this file is never run and the QR URL may use 127.0.0.1.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pickBestLanIPv4 } from "./pick-lan-ipv4.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expoCli = path.join(root, "node_modules", "expo", "bin", "cli");
const forwarded = process.argv.slice(2);

/** Reject placeholders like 192.168.x.x from copy-pasted docs. */
function isValidIPv4(address) {
  if (!address || /[a-z]/i.test(address)) return false;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(address.trim());
  if (!m) return false;
  return m.slice(1).every((oct) => {
    const n = Number(oct);
    return n >= 0 && n <= 255;
  });
}

const useTunnel =
  forwarded.includes("--tunnel") ||
  forwarded.some((a) => a === "--host=tunnel") ||
  (() => {
    const i = forwarded.indexOf("--host");
    return i !== -1 && forwarded[i + 1] === "tunnel";
  })();

const useLocalhost =
  forwarded.includes("--localhost") ||
  forwarded.some((a) => a === "--host=localhost") ||
  (() => {
    const i = forwarded.indexOf("--host");
    return i !== -1 && forwarded[i + 1] === "localhost";
  })();

const env = { ...process.env };

if (!useTunnel && !useLocalhost) {
  const fromEnv = process.env.REACT_NATIVE_PACKAGER_HOSTNAME?.trim();
  const picked = pickBestLanIPv4();
  let packagerIpv4 = null;

  if (fromEnv && isValidIPv4(fromEnv)) {
    packagerIpv4 = fromEnv;
    console.log(`[expo] Using REACT_NATIVE_PACKAGER_HOSTNAME from environment: ${packagerIpv4}`);
  } else if (fromEnv) {
    console.warn(
      `[expo] Ignoring invalid REACT_NATIVE_PACKAGER_HOSTNAME="${fromEnv}" — use your PC's real Wi‑Fi IPv4 (e.g. 192.168.1.42), not the literal "x.x" from examples.`,
    );
  }

  if (!packagerIpv4 && picked) {
    packagerIpv4 = picked;
    console.log(`[expo] REACT_NATIVE_PACKAGER_HOSTNAME=${packagerIpv4}`);
  }

  if (packagerIpv4) {
    env.REACT_NATIVE_PACKAGER_HOSTNAME = packagerIpv4;
  } else {
    console.warn(
      "[expo] No usable LAN IPv4; QR may use 127.0.0.1. Run `ipconfig` (Windows) and set REACT_NATIVE_PACKAGER_HOSTNAME, or use: npm run start:dev-client:tunnel",
    );
  }
}

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
