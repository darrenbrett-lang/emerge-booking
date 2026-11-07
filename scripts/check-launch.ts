// Run before go-live: `npm run check:launch`. Fails on anything the spec
// leaves open or that must change between test and live.
import { EVENT, PRIVACY_REVIEWED } from "../src/lib/event";

const problems: string[] = [];
if (!PRIVACY_REVIEWED) problems.push("Privacy notice not yet reviewed by Darren (PRIVACY_REVIEWED in src/lib/event.ts).");
if (!EVENT.access) problems.push("Access instructions for the confirmation email are not set (src/lib/event.ts, EVENT.access).");
const key = process.env.STRIPE_SECRET_KEY ?? "";
if (process.env.VERCEL_ENV === "production" && !key.startsWith("sk_live_")) problems.push("Production is not using a live Stripe key.");
if (process.env.SITE_URL && !process.env.SITE_URL.startsWith("https://www.emergeunderground.com")) problems.push(`SITE_URL is ${process.env.SITE_URL}.`);

if (problems.length) {
  console.error("Not ready to launch:\n" + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log("Launch checks pass.");
