import { after } from "next/server";
import type Stripe from "stripe";
import { rpc } from "@/lib/db";
import { env } from "@/lib/env";
import { flushEmails } from "@/lib/queue";
import { stripe } from "@/lib/stripe";

// The only place a booking is confirmed. Stripe signs every event; anything
// unsigned is refused. Stripe retries until it gets a 2xx, and the database
// call is idempotent on the session ID, so repeats never double-book.
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig ?? "", env.stripeWebhookSecret());
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.payment_status !== "paid") break;
        const pi = typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null);
        const r = await rpc("emerge_confirm_payment", {
          p_session_id: s.id,
          p_payment_intent: pi,
          p_amount: s.amount_total,
        });
        console.log("webhook confirm", s.id, r.result);
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const s = event.data.object as Stripe.Checkout.Session;
        await rpc("emerge_release_session", { p_session_id: s.id });
        break;
      }
    }
  } catch (err) {
    // A 500 makes Stripe retry, with backoff, for up to three days.
    console.error("webhook", event.type, err);
    return new Response("Retry", { status: 500 });
  }

  after(() => flushEmails().catch((e) => console.error("flush", e)));
  return new Response("ok");
}
