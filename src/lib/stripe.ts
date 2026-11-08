import "server-only";
import Stripe from "stripe";
import { env } from "./env";
import { EVENT } from "./event";
import { db, rpc } from "./db";

let client: Stripe | null = null;
export function stripe(): Stripe {
  client ??= new Stripe(env.stripeSecret());
  return client;
}

type Held = { hold_id: string; email: string; stripe_expires_at: string; price_pence: number };

// Opens Stripe hosted Checkout for a hold. The idempotency key is the hold,
// so a retried request returns the same session rather than a second one.
// The amount is the guest's choice, already checked by parsePricePence; the
// event row's price_pence is only the default.
export async function createCheckout(h: Held, cancelPath: string, pricePence: number) {
  const site = env.siteUrl();
  const expiresAt = Math.floor(new Date(h.stripe_expires_at).getTime() / 1000);
  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        // Instant methods only (cards, with Apple Pay and Google Pay, and Link), so
        // a paid session is always paid by the time the webhook arrives.
        allowed_payment_method_types: ["card", "link"],
        customer_email: h.email,
        client_reference_id: h.hold_id,
        metadata: { hold_id: h.hold_id, event: EVENT.id },
        payment_intent_data: { metadata: { hold_id: h.hold_id, event: EVENT.id } },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "gbp",
              unit_amount: pricePence,
              product_data: {
                name: `Emerge, Maidenhead, ${EVENT.dateShort}`,
                description: `One place. ${EVENT.start} to ${EVENT.end}, ${EVENT.venue}. Over-18s only.`,
              },
            },
          },
        ],
        expires_at: expiresAt,
        success_url: `${site}/booked?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${site}${cancelPath}`,
      },
      { idempotencyKey: `checkout-${h.hold_id}-${expiresAt}` },
    );
    await rpc("emerge_attach_session", {
      p_hold: h.hold_id,
      p_session_id: session.id,
      p_session_url: session.url,
    });
    return session.url!;
  } catch (err) {
    // Stripe never opened, so the place goes straight back.
    await rpc("emerge_release_hold", { p_hold: h.hold_id });
    throw err;
  }
}

// Expire at Stripe first, so the session can no longer be paid, then free
// the place. If Stripe says it is already complete, the webhook books it.
export async function abandonHold(holdId: string) {
  const { data } = await db().from("holds").select("stripe_session_id,status").eq("id", holdId).maybeSingle();
  if (!data || data.status !== "active") return false;
  if (data.stripe_session_id) {
    try {
      const s = await stripe().checkout.sessions.retrieve(data.stripe_session_id);
      if (s.status === "complete") return false;
      if (s.status === "open") await stripe().checkout.sessions.expire(s.id);
    } catch {
      return false;
    }
  }
  return rpc<boolean>("emerge_release_hold", { p_hold: holdId });
}
