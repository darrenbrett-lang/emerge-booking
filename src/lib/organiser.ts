import "server-only";
import { db } from "./db";
import { EVENT } from "./event";

export type GuestRow = {
  guestId: string;
  name: string;
  email: string;
  status: "checked in" | "confirmed" | "pending transfer" | "offered" | "held" | "waiting" | "expired" | "transferred";
  bookingId: string | null;
  reference: string | null;
  invitedBy: string | null;
  transferredFrom: string | null;
  transferTo: string | null;
  waitPosition: number | null;
  deadline: string | null;
  marketing: boolean;
  anonymised: boolean;
  createdAt: string;
};

type B = {
  id: string; guest_id: string; reference: string; status: string; checked_in_at: string | null;
  invited_by_booking_id: string | null; transferred_from_id: string | null; created_at: string;
};

// One row per person, at their most important state. Everything is derived
// from the tables, never stored twice.
export async function loadDashboard() {
  const now = new Date();
  const [guests, bookings, holds, waits, transfers, emails, issues] = await Promise.all([
    db().from("guests").select("id,name,email,marketing_consent,anonymised_at,created_at").eq("event_id", EVENT.id),
    db().from("bookings").select("id,guest_id,reference,status,checked_in_at,invited_by_booking_id,transferred_from_id,created_at").eq("event_id", EVENT.id),
    db().from("holds").select("guest_id,kind,status,expires_at").eq("event_id", EVENT.id).eq("status", "active"),
    db().from("waitlist_entries").select("guest_id,status,position,offer_deadline").eq("event_id", EVENT.id),
    db().from("transfers").select("booking_id,to_name,to_email,status").eq("event_id", EVENT.id).eq("status", "pending"),
    db().from("email_log").select("id,kind,to_email,status,attempts,last_error,created_at").eq("event_id", EVENT.id).in("status", ["failed", "dead"]).order("created_at", { ascending: false }),
    db().from("payment_issues").select("id,kind,stripe_session_id,note,created_at").eq("event_id", EVENT.id).is("resolved_at", null),
  ]);
  for (const r of [guests, bookings, holds, waits, transfers, emails, issues]) if (r.error) throw new Error(r.error.message);

  const gById = new Map(guests.data!.map((g) => [g.id, g]));
  const bList = bookings.data as B[];
  const bById = new Map(bList.map((b) => [b.id, b]));
  const nameOfBooking = (id: string | null) => (id ? gById.get(bById.get(id)?.guest_id ?? "")?.name ?? null : null);
  const pendingBy = new Map(transfers.data!.map((t) => [t.booking_id, t]));
  const liveHolds = holds.data!.filter((h) => new Date(h.expires_at) > now);

  const rows: GuestRow[] = guests.data!.map((g) => {
    const live = bList.find((b) => b.guest_id === g.id && b.status === "confirmed");
    const past = bList.find((b) => b.guest_id === g.id && b.status === "transferred");
    const hold = liveHolds.find((h) => h.guest_id === g.id);
    const wait = waits.data!.find((w) => w.guest_id === g.id);
    const booking = live ?? past ?? null;
    const pending = live ? pendingBy.get(live.id) : undefined;

    let status: GuestRow["status"];
    if (live?.checked_in_at) status = "checked in";
    else if (live && pending) status = "pending transfer";
    else if (live) status = "confirmed";
    else if (hold?.kind === "offer" || wait?.status === "offered") status = "offered";
    else if (hold) status = "held";
    else if (wait?.status === "waiting") status = "waiting";
    else if (past) status = "transferred";
    else status = "expired";

    return {
      guestId: g.id,
      name: g.name,
      email: g.email,
      status,
      bookingId: booking?.id ?? null,
      reference: booking?.reference ?? null,
      invitedBy: nameOfBooking(booking?.invited_by_booking_id ?? null),
      transferredFrom: nameOfBooking(booking?.transferred_from_id ?? null),
      transferTo: pending ? `${pending.to_name} (${pending.to_email})` : null,
      waitPosition: wait?.status === "waiting" ? wait.position : null,
      deadline: wait?.status === "offered" ? wait.offer_deadline : null,
      marketing: g.marketing_consent,
      anonymised: Boolean(g.anonymised_at),
      createdAt: g.created_at,
    };
  });

  const order = ["checked in", "confirmed", "pending transfer", "offered", "held", "waiting", "transferred", "expired"];
  rows.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.name.localeCompare(b.name));

  const confirmed = bList.filter((b) => b.status === "confirmed").length;
  return {
    rows,
    stats: {
      confirmed,
      checkedIn: bList.filter((b) => b.status === "confirmed" && b.checked_in_at).length,
      held: liveHolds.filter((h) => h.kind === "checkout").length,
      offered: liveHolds.filter((h) => h.kind === "offer").length,
      waiting: waits.data!.filter((w) => w.status === "waiting").length,
    },
    emailProblems: emails.data!,
    issues: issues.data!,
  };
}
