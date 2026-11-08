// Flexibly priced tickets (Darren, 8 Nov 2026). The guest picks £10, £15 or
// £20, or any whole-pound amount from £10 to £200. Everyone gets the same
// night. The server checks the amount before it holds a place, and Stripe
// charges exactly that; the booking records what Stripe took.
//
// No server-only import: the form uses the same rules to check as you type.

export const PRICE = {
  minPounds: 10,
  maxPounds: 200,
  presets: [10, 15, 20] as const,
  defaultPounds: 15,
};

export const PRICE_FROM = `£${PRICE.minPounds}`;

// A chosen price, in pence, or null when it breaks the rules. Accepts whole
// pounds as a number or a string ("15", "£15", " 25 "); never pence, never
// fractions, never anything outside £10 to £200.
export function parsePricePence(input: unknown): number | null {
  let pounds: number;
  if (typeof input === "number") {
    pounds = input;
  } else if (typeof input === "string") {
    const s = input.trim().replace(/^£/, "");
    if (!/^\d{1,4}$/.test(s)) return null;
    pounds = Number(s);
  } else {
    return null;
  }
  if (!Number.isInteger(pounds) || pounds < PRICE.minPounds || pounds > PRICE.maxPounds) return null;
  return pounds * 100;
}

// "£15", or "£15.50" if Stripe ever records pence.
export function formatPence(pence: number) {
  return pence % 100 === 0 ? `£${pence / 100}` : `£${(pence / 100).toFixed(2)}`;
}
