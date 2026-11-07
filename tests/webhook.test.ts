import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: () => {} }));
const rpc = vi.fn();
const state = vi.hoisted(() => ({ dbDown: false }));
vi.mock("@/lib/db", () => ({
  rpc: async (...a: unknown[]) => {
    if (state.dbDown) throw new Error("db down");
    return rpc(...a);
  },
  db: () => ({}),
}));
vi.mock("@/lib/queue", () => ({ flushEmails: async () => ({}) }));

process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

const { POST } = await import("@/app/api/webhooks/stripe/route");
const stripe = new Stripe("sk_test_dummy");

function signed(event: object, secret = "whsec_test_secret") {
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://x/api/webhooks/stripe", { method: "POST", body: payload, headers: { "stripe-signature": header } });
}
const completed = (paid = true) => ({
  id: "evt_1",
  object: "event",
  type: "checkout.session.completed",
  data: { object: { id: "cs_test_1", object: "checkout.session", payment_status: paid ? "paid" : "unpaid", payment_intent: "pi_1", amount_total: 1500 } },
});

beforeEach(() => rpc.mockReset());

describe("Stripe webhook", () => {
  it("confirms a paid session", async () => {
    rpc.mockResolvedValue({ result: "confirmed" });
    const res = await POST(signed(completed()));
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("emerge_confirm_payment", { p_session_id: "cs_test_1", p_payment_intent: "pi_1", p_amount: 1500 });
  });

  it("refuses an event that is not signed by Stripe", async () => {
    const res = await POST(signed(completed(), "whsec_wrong"));
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does not confirm an unpaid session", async () => {
    await POST(signed(completed(false)));
    expect(rpc).not.toHaveBeenCalled();
  });

  it("asks Stripe to retry when the database fails", async () => {
    state.dbDown = true;
    const res = await POST(signed(completed()));
    state.dbDown = false;
    expect(res.status).toBe(500);
  });

  it("releases the place when a session expires", async () => {
    rpc.mockResolvedValue(true);
    await POST(signed({ ...completed(), type: "checkout.session.expired" }));
    expect(rpc).toHaveBeenCalledWith("emerge_release_session", { p_session_id: "cs_test_1" });
  });
});
