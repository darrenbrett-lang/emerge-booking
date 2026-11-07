import { renderEmail } from "@/lib/emails";

// Development only: see each email as it will arrive. /dev/emails/confirmation
// and so on; add ?text=1 for the plain-text version.
const SAMPLES: Record<string, Record<string, unknown>> = {
  confirmation: { name: "Sue Example", reference: "EM-7K3QX", pass_token: "pass-sample", invitations: ["inv-a", "inv-b", "inv-c"], transferred: false },
  confirmation_transferred: { name: "Pat New", reference: "EM-9RT2M", pass_token: "pass-sample", invitations: [], transferred: true, from_name: "Sue Example" },
  waitlist_joined: { name: "Alex Example" },
  waitlist_offer: { name: "Alex Example", offer_token: "offer-sample", deadline: "2026-11-21T14:15:00Z" },
  offer_expired: { name: "Alex Example" },
  transfer_offer: { to_name: "Pat New", from_name: "Sue Example", accept_token: "accept-sample", deadline: "2026-11-27T18:00:00Z" },
  transfer_complete: { name: "Sue Example", to_name: "Pat New", old_reference: "EM-7K3QX" },
  transfer_lapsed: { name: "Sue Example", to_name: "Pat New", reference: "EM-7K3QX" },
};

export async function GET(req: Request, ctx: { params: Promise<{ kind: string }> }) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  const { kind } = await ctx.params;
  const sample = SAMPLES[kind];
  if (!sample) return new Response(`Try: ${Object.keys(SAMPLES).join(", ")}`, { status: 404 });
  const url = new URL(req.url);
  const r = renderEmail(kind.replace("_transferred", ""), sample, {
    site: url.origin,
    unsubscribeUrl: url.searchParams.get("unsub") ? `${url.origin}/unsubscribe/sample` : null,
  });
  if (url.searchParams.get("text")) return new Response(`Subject: ${r.subject}\n\n${r.text}`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(r.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
