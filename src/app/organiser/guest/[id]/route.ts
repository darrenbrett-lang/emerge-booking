import { requireOrganiser } from "@/lib/auth";
import { db } from "@/lib/db";

// Subject access: everything held about one guest, as JSON.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireOrganiser();
  const { id } = await ctx.params;
  const [guest, bookings, holds, waits, emails] = await Promise.all([
    db().from("guests").select("name,email,age_confirmed_at,marketing_consent,marketing_consent_at,anonymised_at,created_at").eq("id", id).maybeSingle(),
    db().from("bookings").select("reference,status,amount_pence,stripe_payment_intent,checked_in_at,created_at").eq("guest_id", id),
    db().from("holds").select("kind,status,created_at,expires_at").eq("guest_id", id),
    db().from("waitlist_entries").select("status,offered_at,offer_deadline,created_at").eq("guest_id", id),
    db().from("email_log").select("kind,status,created_at,sent_at").eq("guest_id", id),
  ]);
  if (!guest.data) return new Response("Not found", { status: 404 });
  const body = {
    exported_at: new Date().toISOString(),
    controller: "DAB Hands Delivery Ltd",
    guest: guest.data,
    bookings: bookings.data,
    checkout_holds: holds.data,
    waiting_list: waits.data,
    emails_sent: emails.data,
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="emerge-guest-data.json"`,
      "Cache-Control": "no-store",
    },
  });
}
