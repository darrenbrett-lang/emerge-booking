import "server-only";
import { db } from "./db";

// "No. 047 of 100" (Darren, 8 Nov 2026). A place's number is its order among
// the original purchases for the event, by when they were paid. A place that
// was passed on keeps the number of the place it came from, so numbers never
// move. Refunded places keep their number too, so there can be gaps. Nothing
// is stored: it is worked out from the bookings each time.
type Row = { id: string; reference: string; created_at: string; transferred_from_id: string | null };

export async function placeNumber(where: { reference?: string; sessionId?: string }): Promise<number | null> {
  const { data: rows } = await db()
    .from("bookings")
    .select("id, reference, created_at, transferred_from_id, stripe_session_id, event_id");
  if (!rows?.length) return null;
  const all = rows as (Row & { stripe_session_id: string | null; event_id: string })[];
  let b = all.find((r) => (where.reference && r.reference === where.reference) || (where.sessionId && r.stripe_session_id === where.sessionId));
  if (!b) return null;
  const byId = new Map(all.map((r) => [r.id, r]));
  for (let i = 0; i < 200 && b.transferred_from_id; i++) {
    const prev = byId.get(b.transferred_from_id);
    if (!prev) break;
    b = prev;
  }
  const originals = all
    .filter((r) => r.event_id === b!.event_id && !r.transferred_from_id)
    .sort((x, y) => x.created_at.localeCompare(y.created_at) || x.id.localeCompare(y.id));
  const n = originals.findIndex((r) => r.id === b!.id);
  return n < 0 ? null : n + 1;
}

export { formatPlace } from "./format-place";
