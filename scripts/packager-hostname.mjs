/**
 * Shared rules for REACT_NATIVE_PACKAGER_HOSTNAME (Expo + Metro / dev client URL).
 * Used by `expo-start-lan-ip.mjs` and `expo-with-packager-env.mjs` so all entry points
 * (e.g. `expo run:android`, which spawns Metro) do not default to 127.0.0.1 on Windows.
 */
import { execFileSync } from "node:child_process";
import { pickBestLanIPv4 } from "./pick-lan-ipv4.mjs";

export const ANDROID_EMULATOR_HOST = "10.0.2.2";

/** Reject placeholders like 192.168.x.x from copy-pasted docs. */
export function isValidIPv4(address) {
  if (!address || /[a-z]/i.test(address)) return false;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(address.trim());
  if (!m) return false;
  return m.slice(1).every((oct) => {
    const n = Number(oct);
    return n >= 0 && n <= 255;
  });
}

/**
 * @returns {string[]}
 */
export function getAdbReadyDeviceSerials() {
  try {
    const out = execFileSync("adb", ["devices"], { encoding: "utf8" });
    const serials = [];
    for (const line of out.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("List of")) continue;
      const parts = t.split(/\s+/);
      if (parts.length < 2 || parts[1] !== "device") continue;
      serials.push(parts[0]);
    }
    return serials;
  } catch {
    return [];
  }
}

/**
 * @param {string[]} serials
 */
export function onlyEmulatorsConnected(serials) {
  if (serials.length === 0) return false;
  return serials.every((s) => s.startsWith("emulator-"));
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {{ useTunnel: boolean, useLocalhost: boolean }} options
 */
export function applyPackagerHostnameToEnv(env, { useTunnel, useLocalhost }) {
  if (useTunnel || useLocalhost) {
    return;
  }

  const fromEnv = process.env.REACT_NATIVE_PACKAGER_HOSTNAME?.trim();
  const adbSerials = getAdbReadyDeviceSerials();
  const picked = pickBestLanIPv4();
  let host = null;

  if (fromEnv && isValidIPv4(fromEnv)) {
    host = fromEnv;
    console.log(`[expo] Using REACT_NATIVE_PACKAGER_HOSTNAME from environment: ${host}`);
  } else if (fromEnv) {
    console.warn(
      `[expo] Ignoring invalid REACT_NATIVE_PACKAGER_HOSTNAME="${fromEnv}" — use your PC's real Wi‑Fi IPv4 (e.g. 192.168.1.42), or ${ANDROID_EMULATOR_HOST} for emulator, not placeholder text from examples.`,
    );
  }

  if (!host && onlyEmulatorsConnected(adbSerials)) {
    host = ANDROID_EMULATOR_HOST;
    console.log(
      `[expo] Only Android emulator(s) in adb: REACT_NATIVE_PACKAGER_HOSTNAME=${host} (AVD host alias; LAN IP is wrong for the emulator)`,
    );
  }

  if (!host && picked) {
    host = picked;
    console.log(`[expo] REACT_NATIVE_PACKAGER_HOSTNAME=${host}`);
  }

  if (host) {
    env.REACT_NATIVE_PACKAGER_HOSTNAME = host;
  } else {
    console.warn(
      "[expo] No usable LAN IPv4; QR / dev URL may use 127.0.0.1. Set REACT_NATIVE_PACKAGER_HOSTNAME, or use: npm run start:dev-client:tunnel",
    );
  }
}

/**
 * @param {string[]} argv
 */
export function argvImpliesLocalhostMode(argv) {
  return (
    argv.includes("--localhost") ||
    argv.includes("--local") ||
    (() => {
      const i = argv.indexOf("--host");
      return i !== -1 && argv[i + 1] === "localhost";
    })() ||
    argv.some((a) => a === "--host=localhost")
  );
}

/**
 * @param {string[]} argv
 */
export function argvImpliesTunnelMode(argv) {
  return (
    argv.includes("--tunnel") ||
    (() => {
      const i = argv.indexOf("--host");
      return i !== -1 && argv[i + 1] === "tunnel";
    })() ||
    argv.some((a) => a === "--host=tunnel")
  );
}
