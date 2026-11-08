import { rpc } from "@/lib/db";
import { parsePricePence } from "@/lib/price";
import { createCheckout } from "@/lib/stripe";
import { json, readJson } from "@/lib/request";

// Pays for the place held by a waiting list offer, at the price the guest
// chose: the same rules as the main booking form, checked before anything else.
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const body = await readJson(req);
  const price = parsePricePence(body.price);
  if (price === null) return json({ result: "invalid_price" });

  const r = await rpc("emerge_start_offer_checkout", { p_offer_token: token });
  if (r.result === "existing") return json({ result: "redirect", url: r.session_url });
  if (r.result !== "held") return json({ result: r.result });
  try {
    const url = await createCheckout(r as never, `/offer/${encodeURIComponent(token)}?cancelled=${r.hold_id}`, price);
    return json({ result: "redirect", url });
  } catch (err) {
    console.error("offer checkout", err);
    return json({ result: "error" }, 502);
  }
}
