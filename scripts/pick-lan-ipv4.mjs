/**
 * Pick the best local IPv4 for device ↔ Metro (LAN) on Windows/macOS/Linux.
 * Avoids the first "random" non-internal v4 (often a virtual switch / VPN) that
 * can make the dev-client URL point at an unreachable address (or 127.0.0.1
 * when Expo’s own LAN pick fails and REACT_NATIVE_PACKAGER_HOSTNAME is unset).
 */
import os from "node:os";

const VIRTUAL_NAME =
  /virtual|vethernet|vmware|vbox|hyper-v|wsl|docker|tun|tap|vpn|zerotier|tailscale|nord|hamachi|nordlynx|cisco|teamviewer|radmin|vboxnet|vEthernet/i;

/**
 * @returns {string | null}
 */
export function pickBestLanIPv4() {
  const nets = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      const v4 = net.family === "IPv4" || net.family === 4;
      if (!v4 || net.internal) continue;
      const address = net.address;
      if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(address)) continue;
      const score = scoreLanCandidate(name, address);
      candidates.push({ name, address, score });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].address;
}

/**
 * @param {string} ifName
 * @param {string} address
 */
function scoreLanCandidate(ifName, address) {
  if (VIRTUAL_NAME.test(ifName)) return 0;
  const oct = address.split(".").map((x) => Number(x));
  if (oct.length !== 4) return 0;

  if (address.startsWith("169.254.")) return 1;

  // Typical home/office Wi‑Fi / Ethernet
  if (oct[0] === 192 && oct[1] === 168) return 100;
  if (oct[0] === 10) return 90;
  if (oct[0] === 172 && oct[1] >= 16 && oct[1] <= 31) return 80;
  if (address.startsWith("100.") && oct[1] >= 64 && oct[1] <= 127) return 40; // CGNAT, sometimes carrier / hotspot

  return 10;
}
