import { rpc } from "@/lib/db";
import { createCheckout } from "@/lib/stripe";
import { json } from "@/lib/request";

// Pays for the place held by a waiting list offer.
export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const r = await rpc("emerge_start_offer_checkout", { p_offer_token: token });
  if (r.result === "existing") return json({ result: "redirect", url: r.session_url });
  if (r.result !== "held") return json({ result: r.result });
  try {
    const url = await createCheckout(r as never, `/offer/${encodeURIComponent(token)}?cancelled=${r.hold_id}`);
    return json({ result: "redirect", url });
  } catch (err) {
    console.error("offer checkout", err);
    return json({ result: "error" }, 502);
  }
}
