import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRICE, formatPence, parsePricePence } from "@/lib/price";

// Flexible pricing: £10, £15 or £20, or any whole pound from £10 to £200.
// The server checks the amount before it holds a place, and Stripe is asked
// for exactly that amount.

describe("price rules", () => {
  it("accepts the three buttons and the default", () => {
    expect(PRICE.presets).toEqual([10, 15, 20]);
    expect(PRICE.defaultPounds).toBe(15);
    expect(parsePricePence("10")).toBe(1000);
    expect(parsePricePence("15")).toBe(1500);
    expect(parsePricePence("20")).toBe(2000);
  });

  it("accepts any whole pound from £10 to £200", () => {
    expect(parsePricePence("11")).toBe(1100);
    expect(parsePricePence("200")).toBe(20000);
    expect(parsePricePence(" 35 ")).toBe(3500);
    expect(parsePricePence("£40")).toBe(4000);
    expect(parsePricePence(55)).toBe(5500);
  });

  it("refuses anything below £10 or above £200", () => {
    for (const v of ["0", "9", "201", "1000", 9, 201, -15]) expect(parsePricePence(v)).toBeNull();
  });

  it("refuses pence, fractions and anything that isn't a number", () => {
    for (const v of ["15.50", "15.0", 15.5, "1e2", "0x10", "", " ", "fifteen", "15abc", null, undefined, {}, [], true, NaN, Infinity])
      expect(parsePricePence(v)).toBeNull();
  });

  it("formats what was paid", () => {
    expect(formatPence(1500)).toBe("£15");
    expect(formatPence(20000)).toBe("£200");
    expect(formatPence(1550)).toBe("£15.50");
  });
});

// The routes: a bad price never reaches the database, so it never holds a
// place; a good one is passed to Stripe as chosen.
vi.mock("server-only", () => ({}));
const rpc = vi.fn();
const createCheckout = vi.fn();
const openSessionAmount = vi.fn();
const abandonHold = vi.fn();
vi.mock("@/lib/db", () => ({ rpc: (...a: unknown[]) => rpc(...a), db: () => ({}) }));
vi.mock("@/lib/stripe", () => ({
  createCheckout: (...a: unknown[]) => createCheckout(...a),
  openSessionAmount: (...a: unknown[]) => openSessionAmount(...a),
  abandonHold: (...a: unknown[]) => abandonHold(...a),
}));
process.env.CLIENT_HASH_SALT = "test-salt";

const checkout = (await import("@/app/api/checkout/route")).POST;
const offer = (await import("@/app/api/offer/[token]/route")).POST;

const post = (url: string, body: object) =>
  new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const guest = { name: "Sue Example", email: "sue@example.com", age: true };

describe("checkout route", () => {
  beforeEach(() => {
    rpc.mockReset();
    createCheckout.mockReset();
    rpc.mockResolvedValue({ result: "held", hold_id: "h1", email: guest.email, stripe_expires_at: new Date().toISOString(), price_pence: 1500 });
    createCheckout.mockResolvedValue("https://checkout.stripe.com/x");
  });

  it("refuses a bad price before holding a place", async () => {
    for (const price of ["9", "201", "12.50", "", undefined]) {
      const r = await (await checkout(post("http://x/api/checkout", { ...guest, price }))).json();
      expect(r.result).toBe("invalid_price");
    }
    expect(rpc).not.toHaveBeenCalled();
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("charges the chosen amount", async () => {
    const r = await (await checkout(post("http://x/api/checkout", { ...guest, price: "35" }))).json();
    expect(r).toEqual({ result: "redirect", url: "https://checkout.stripe.com/x" });
    expect(rpc).toHaveBeenCalledWith("emerge_start_checkout", expect.objectContaining({ p_email: guest.email }));
    expect(createCheckout.mock.calls[0][2]).toBe(3500);
  });

  it("goes back to an open checkout at the same price", async () => {
    rpc.mockReset();
    rpc.mockResolvedValue({ result: "existing", hold_id: "h0", session_id: "cs_old", session_url: "https://checkout.stripe.com/old" });
    openSessionAmount.mockResolvedValue(2000);
    const r = await (await checkout(post("http://x/api/checkout", { ...guest, price: "20" }))).json();
    expect(r.url).toBe("https://checkout.stripe.com/old");
    expect(abandonHold).not.toHaveBeenCalled();
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("replaces an open checkout at a different price (chose £20, Stripe showed £15)", async () => {
    rpc.mockReset();
    abandonHold.mockReset();
    rpc
      .mockResolvedValueOnce({ result: "existing", hold_id: "h0", session_id: "cs_old", session_url: "https://checkout.stripe.com/old" })
      .mockResolvedValueOnce({ result: "held", hold_id: "h1", email: guest.email, stripe_expires_at: new Date().toISOString(), price_pence: 1500 });
    openSessionAmount.mockResolvedValue(1500);
    const r = await (await checkout(post("http://x/api/checkout", { ...guest, price: "20" }))).json();
    expect(abandonHold).toHaveBeenCalledWith("h0");
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(createCheckout.mock.calls[0][2]).toBe(2000);
    expect(r.url).toBe("https://checkout.stripe.com/x");
  });

  it("charges £15 when the guest keeps the pre-selected price", async () => {
    await checkout(post("http://x/api/checkout", { ...guest, price: "15" }));
    expect(createCheckout.mock.calls[0][2]).toBe(1500);
  });
});

describe("waiting list offer route", () => {
  beforeEach(() => {
    rpc.mockReset();
    createCheckout.mockReset();
    rpc.mockResolvedValue({ result: "held", hold_id: "h2", email: guest.email, stripe_expires_at: new Date().toISOString(), price_pence: 1500 });
    createCheckout.mockResolvedValue("https://checkout.stripe.com/y");
  });
  const ctx = { params: Promise.resolve({ token: "offer-token" }) };

  it("uses the same price rules", async () => {
    const r = await (await offer(post("http://x/api/offer/offer-token", { price: "5" }), ctx)).json();
    expect(r.result).toBe("invalid_price");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("charges the chosen amount", async () => {
    await offer(post("http://x/api/offer/offer-token", { price: "20" }), ctx);
    expect(rpc).toHaveBeenCalledWith("emerge_start_offer_checkout", { p_offer_token: "offer-token" });
    expect(createCheckout.mock.calls[0][2]).toBe(2000);
  });
});
