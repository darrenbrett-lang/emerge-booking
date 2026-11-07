import { EVENT } from "@/lib/event";
import { rpc } from "@/lib/db";
import { createCheckout } from "@/lib/stripe";
import { bool, clientHash, json, readJson, str } from "@/lib/request";

// Starts a booking: claims a place for 30 minutes and opens Stripe Checkout.
// Nothing here confirms a booking; only the Stripe webhook does.
export async function POST(req: Request) {
  const body = await readJson(req);
  if (str(body.website)) return json({ result: "ok" }); // honeypot: bots fill every field

  const r = await rpc("emerge_start_checkout", {
    p_event: EVENT.id,
    p_name: str(body.name, 100),
    p_email: str(body.email),
    p_age_confirmed: bool(body.age),
    p_marketing: bool(body.marketing),
    p_invite_token: str(body.invite, 100) || null,
    p_client: clientHash(req),
  });

  if (r.result === "existing") return json({ result: "redirect", url: r.session_url });
  if (r.result !== "held") return json({ result: r.result });

  try {
    const url = await createCheckout(
      r as never,
      `/?cancelled=${r.hold_id}${body.invite ? `&invite=${encodeURIComponent(str(body.invite, 100))}` : ""}`,
    );
    return json({ result: "redirect", url });
  } catch (err) {
    console.error("checkout", err);
    return json({ result: "error" }, 502);
  }
}
