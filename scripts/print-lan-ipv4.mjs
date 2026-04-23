import { pickBestLanIPv4 } from "./pick-lan-ipv4.mjs";

const address = pickBestLanIPv4();
if (address) {
  console.log(address);
} else {
  console.error("No non-internal IPv4 found.");
  process.exit(1);
}
