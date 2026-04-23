/**
 * When QR / "Open link" fails on Android, open the dev session via adb (USB debugging).
 * Copy the full line after "Metro waiting on" from the Expo terminal
 * (e.g. exp+recoveryroad://expo-development-client/?url=... or recoveryroad://expo-development-client/...).
 *
 *   npm run android:open-dev-url -- "exp+recoveryroad://expo-development-client/?url=..."
 */
import { spawn } from "node:child_process";

const url = process.argv[2];
if (!url || !url.includes("://")) {
  console.error(
    'Usage: npm run android:open-dev-url -- "exp+recoveryroad://expo-development-client/?url=..."',
  );
  process.exit(1);
}

const child = spawn(
  "adb",
  ["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", url],
  { stdio: "inherit" },
);

child.on("exit", (code) => process.exit(code ?? 1));
