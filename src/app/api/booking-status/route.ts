import { db } from "@/lib/db";
import { json } from "@/lib/request";

// Polled by the page Stripe returns to. It reports; it never confirms.
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id") ?? "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return json({ status: "unknown" });
  const { data } = await db()
    .from("bookings")
    .select("status")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  return json({ status: data ? "confirmed" : "pending" });
}
