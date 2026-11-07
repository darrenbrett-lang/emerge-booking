import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

const SQL = readFileSync(join(__dirname, "../supabase/migrations/0001_booking.sql"), "utf8");
const EV = "maidenhead-2026-11";

// London is on GMT in November, so these read as local times.
const T = (s: string) => new Date(s + "Z").toISOString();
const EARLY = T("2026-11-10 12:00"); // more than 48h before sales end
const LATE = T("2026-11-26 12:00"); // inside the final 48h

let db: PGlite;

async function q<R = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  return (await db.query<R>(sql, params)).rows;
}
async function fn(name: string, ...args: unknown[]) {
  const ph = args.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await q<{ r: unknown }>(`select ${name}(${ph}) as r`, args);
  return rows[0].r as Record<string, unknown> & { result?: string };
}
async function hold(n: number, now = EARLY, extra: { invite?: string; marketing?: boolean } = {}) {
  return fn("emerge_start_checkout", EV, `Guest ${n}`, `guest${n}@example.com`, true,
    extra.marketing ?? false, extra.invite ?? null, now);
}
async function book(n: number, now = EARLY, extra: { invite?: string } = {}) {
  const h = await hold(n, now, extra);
  expect(h.result).toBe("held");
  await fn("emerge_attach_session", h.hold_id, `cs_${n}`, `https://checkout.stripe.test/${n}`);
  const c = await fn("emerge_confirm_payment", `cs_${n}`, `pi_${n}`, 1500, now);
  expect(c.result).toBe("confirmed");
  return c;
}
async function avail(now = EARLY) {
  return fn("emerge_availability", EV, now) as Promise<{ remaining: number; show_count: boolean; phase: string }>;
}
async function emails(kind?: string) {
  return q<{ kind: string; to_email: string; payload: Record<string, unknown> }>(
    `select kind, to_email, payload from email_log ${kind ? "where kind = $1" : ""} order by created_at, kind`,
    kind ? [kind] : [],
  );
}
const minutes = (iso: string, m: number) => new Date(new Date(iso).getTime() + m * 60000).toISOString();

beforeEach(async () => {
  db = new PGlite();
  await db.exec(SQL);
  await db.exec(`update events set capacity = 3, show_count_at = 2 where id = '${EV}'`);
});

describe("capacity and holds", () => {
  it("never sells more than capacity, counting live holds", async () => {
    await book(1);
    await book(2);
    expect((await hold(3)).result).toBe("held");
    expect((await hold(4)).result).toBe("full");
    expect((await avail()).remaining).toBe(0);
  });

  it("releases an expired hold by the clock alone, with no sweep", async () => {
    await book(1);
    await book(2);
    await hold(3);
    expect((await hold(4)).result).toBe("full");
    const later = minutes(EARLY, 42); // 31 min Stripe session + 10 min grace
    expect((await hold(4, later)).result).toBe("held");
  });

  it("hides the count until the threshold, then shows it", async () => {
    expect((await avail()).show_count).toBe(false);
    await book(1);
    const a = await avail();
    expect(a.remaining).toBe(2);
    expect(a.show_count).toBe(true);
  });

  it("reuses an open checkout instead of holding a second place", async () => {
    const h = await hold(1);
    await fn("emerge_attach_session", h.hold_id, "cs_1", "https://checkout.stripe.test/1");
    const again = await hold(1, minutes(EARLY, 5));
    expect(again.result).toBe("existing");
    expect(again.session_id).toBe("cs_1");
    expect((await avail(minutes(EARLY, 5))).remaining).toBe(2);
  });

  it("replaces a hold whose Stripe session can no longer be paid", async () => {
    const h = await hold(1);
    await fn("emerge_attach_session", h.hold_id, "cs_1", "u");
    const again = await hold(1, minutes(EARLY, 32)); // Stripe expired, grace not yet over
    expect(again.result).toBe("held");
    expect((await avail(minutes(EARLY, 32))).remaining).toBe(2);
  });

  it("limits one connection to three open checkouts", async () => {
    await db.exec(`update events set capacity = 10 where id = '${EV}'`);
    for (let n = 1; n <= 3; n++) {
      const r = await fn("emerge_start_checkout", EV, `G${n}`, `g${n}@example.com`, true, false, null, EARLY, "ip-a");
      expect(r.result).toBe("held");
    }
    expect((await fn("emerge_start_checkout", EV, "G4", "g4@example.com", true, false, null, EARLY, "ip-a")).result).toBe("too_many");
    expect((await fn("emerge_start_checkout", EV, "G4", "g4@example.com", true, false, null, EARLY, "ip-b")).result).toBe("held");
  });

  it("refuses a booking without the 18+ confirmation", async () => {
    const r = await fn("emerge_start_checkout", EV, "Kid", "kid@example.com", false, false, null, EARLY);
    expect(r.result).toBe("age_required");
  });

  it("one ticket per person", async () => {
    await book(1);
    expect((await hold(1)).result).toBe("already_booked");
    expect((await fn("emerge_start_checkout", EV, "Guest", " GUEST1@Example.com ", true, false, null, EARLY)).result)
      .toBe("already_booked");
  });
});

describe("confirmation", () => {
  it("is idempotent across repeated webhooks", async () => {
    const h = await hold(1);
    await fn("emerge_attach_session", h.hold_id, "cs_1", "u");
    const a = await fn("emerge_confirm_payment", "cs_1", "pi_1", 1500, EARLY);
    const b = await fn("emerge_confirm_payment", "cs_1", "pi_1", 1500, EARLY);
    expect(a.result).toBe("confirmed");
    expect(b.result).toBe("already_confirmed");
    expect(b.reference).toBe(a.reference);
    expect(await q("select * from bookings")).toHaveLength(1);
    expect(await emails("confirmation")).toHaveLength(1);
    expect(await q("select * from invitations")).toHaveLength(3);
  });

  it("still books a payment that lands after the hold lapsed, and flags overcapacity", async () => {
    const h = await hold(1);
    await fn("emerge_attach_session", h.hold_id, "cs_1", "u");
    const late = minutes(EARLY, 45);
    await fn("emerge_tick", EV, late);
    await book(2, late);
    await book(3, late);
    await book(4, late);
    const c = await fn("emerge_confirm_payment", "cs_1", "pi_1", 1500, late);
    expect(c.result).toBe("confirmed");
    expect(await q("select kind from payment_issues")).toEqual([{ kind: "over_capacity" }]);
  });

  it("flags a second payment from someone already booked", async () => {
    const h1 = await hold(1);
    await fn("emerge_attach_session", h1.hold_id, "cs_a", "u");
    // Simulate a second session for the same person slipping through.
    await q(`insert into holds (event_id, guest_id, kind, expires_at, stripe_session_id)
             select event_id, guest_id, 'checkout', expires_at, 'cs_b' from holds where id = $1`, [h1.hold_id]);
    await fn("emerge_confirm_payment", "cs_a", "pi_a", 1500, EARLY);
    const second = await fn("emerge_confirm_payment", "cs_b", "pi_b", 1500, EARLY);
    expect(second.result).toBe("duplicate_payment");
    expect(await q("select * from bookings")).toHaveLength(1);
    expect(await q("select kind from payment_issues")).toEqual([{ kind: "duplicate_payment" }]);
  });

  it("records who invited whom", async () => {
    const sue = await book(1);
    const [inv] = await q<{ token: string }>(
      "select token from invitations where inviter_booking_id = $1 and slot = 1", [sue.booking_id]);
    const guest = await book(2, EARLY, { invite: inv.token });
    const [row] = await q<{ invited_by_booking_id: string }>(
      "select invited_by_booking_id from bookings where id = $1", [guest.booking_id]);
    expect(row.invited_by_booking_id).toBe(sue.booking_id);
    const [used] = await q<{ used_by_booking_id: string }>(
      "select used_by_booking_id from invitations where token = $1", [inv.token]);
    expect(used.used_by_booking_id).toBe(guest.booking_id);
  });
});

describe("cutoffs", () => {
  it("stops new checkouts at 5:30 pm", async () => {
    expect((await hold(1, T("2026-11-27 17:29"))).result).toBe("held");
    expect((await hold(2, T("2026-11-27 17:30"))).result).toBe("closed");
  });

  it("ends Stripe sessions at 6 pm where 30 minutes allows", async () => {
    const h = await hold(1, T("2026-11-27 17:20"));
    expect(new Date(h.stripe_expires_at as string).toISOString()).toBe(T("2026-11-27 17:51"));
    const h2 = await hold(2, T("2026-11-27 17:29:50"));
    expect(new Date(h2.stripe_expires_at as string).getTime())
      .toBeGreaterThanOrEqual(new Date(T("2026-11-27 18:00")).getTime());
  });

  it("reports the phase for the page", async () => {
    expect((await avail(T("2026-11-27 17:31"))).phase).toBe("checkout_closed");
    expect((await avail(T("2026-11-27 18:00"))).phase).toBe("closed");
    expect((await avail(T("2026-11-28 00:30"))).phase).toBe("holding");
  });
});

describe("waiting list", () => {
  async function fill(now = EARLY) {
    await book(1, now);
    await book(2, now);
    await book(3, now);
  }
  const join = (n: number, now = EARLY) =>
    fn("emerge_join_waitlist", EV, `Wait ${n}`, `wait${n}@example.com`, true, false, now);

  it("is only offered when full", async () => {
    expect((await join(1)).result).toBe("available");
    await fill();
    expect((await join(1)).result).toBe("waiting");
    expect((await join(1)).result).toBe("already_waiting");
    expect(await emails("waitlist_joined")).toHaveLength(1);
  });

  it("offers a freed place to the next person with a 24 hour window", async () => {
    const h = await hold(1);
    await fn("emerge_attach_session", h.hold_id, "cs_1", "u");
    await book(2);
    await book(3);
    await join(1);
    await join(2);
    await fn("emerge_release_session", "cs_1", EARLY);
    const [o] = await emails("waitlist_offer");
    expect(o.to_email).toBe("wait1@example.com");
    expect(new Date(o.payload.deadline as string).toISOString()).toBe(minutes(EARLY, 24 * 60));
    // The offer holds the place against the main link.
    expect((await hold(9)).result).toBe("full");
  });

  it("shortens the window to 2 hours in the final 48 hours", async () => {
    await fill(LATE);
    await join(1, LATE);
    await q("update bookings set status = 'cancelled' where reference = (select min(reference) from bookings)");
    await fn("emerge_tick", EV, LATE);
    const [o] = await emails("waitlist_offer");
    expect(new Date(o.payload.deadline as string).toISOString()).toBe(minutes(LATE, 120));
  });

  it("caps the deadline at the checkout cutoff and stops offering when under 30 minutes are left", async () => {
    const now = T("2026-11-27 16:30");
    await fill(now);
    await join(1, now);
    await join(2, now);
    await q("update bookings set status = 'cancelled' where reference = (select min(reference) from bookings)");
    await fn("emerge_tick", EV, now);
    const [o] = await emails("waitlist_offer");
    expect(new Date(o.payload.deadline as string).toISOString()).toBe(T("2026-11-27 17:30"));
    // First offer lapses at 17:30; nothing further is offered.
    await fn("emerge_tick", EV, T("2026-11-27 17:31"));
    expect(await emails("waitlist_offer")).toHaveLength(1);
    expect(await emails("offer_expired")).toHaveLength(1);
  });

  it("passes an unused offer to the next person", async () => {
    await fill();
    await join(1);
    await join(2);
    await q("update bookings set status = 'cancelled' where reference = (select min(reference) from bookings)");
    await fn("emerge_tick", EV, EARLY);
    await fn("emerge_tick", EV, minutes(EARLY, 24 * 60 + 1));
    const offers = await emails("waitlist_offer");
    expect(offers.map((o) => o.to_email)).toEqual(["wait1@example.com", "wait2@example.com"]);
    expect((await emails("offer_expired"))[0].to_email).toBe("wait1@example.com");
  });

  it("books through the offer link", async () => {
    await fill();
    await join(1);
    await q("update bookings set status = 'cancelled' where reference = (select min(reference) from bookings)");
    await fn("emerge_tick", EV, EARLY);
    const [o] = await emails("waitlist_offer");
    const later = minutes(EARLY, 60);
    const h = await fn("emerge_start_offer_checkout", o.payload.offer_token, later);
    expect(h.result).toBe("held");
    await fn("emerge_attach_session", h.hold_id, "cs_w1", "u");
    expect((await fn("emerge_confirm_payment", "cs_w1", "pi_w1", 1500, later)).result).toBe("confirmed");
    const [w] = await q<{ status: string }>("select status from waitlist_entries");
    expect(w.status).toBe("converted");
    expect((await fn("emerge_start_offer_checkout", o.payload.offer_token, later)).result).toBe("already_booked");
  });

  it("keeps the offer if its checkout is abandoned before the deadline", async () => {
    await fill();
    await join(1);
    await q("update bookings set status = 'cancelled' where reference = (select min(reference) from bookings)");
    await fn("emerge_tick", EV, EARLY);
    const [o] = await emails("waitlist_offer");
    const h = await fn("emerge_start_offer_checkout", o.payload.offer_token, EARLY);
    await fn("emerge_attach_session", h.hold_id, "cs_w1", "u");
    await fn("emerge_release_session", "cs_w1", minutes(EARLY, 10));
    expect((await fn("emerge_start_offer_checkout", o.payload.offer_token, minutes(EARLY, 11))).result).toBe("held");
    expect((await hold(9, minutes(EARLY, 11))).result).toBe("full");
  });
});

describe("transfers", () => {
  async function passToken(bookingId: unknown) {
    const [r] = await q<{ pass_token: string }>("select pass_token from bookings where id = $1", [bookingId]);
    return r.pass_token;
  }

  it("moves the ticket once the new person ticks 18+", async () => {
    const b = await book(1);
    const pt = await passToken(b.booking_id);
    const t = await fn("emerge_request_transfer_by_pass", pt, "Pat New", "pat@example.com", EARLY);
    expect(t.result).toBe("pending");
    // Until accepted, the ticket stays with the original guest.
    expect((await q<{ status: string }>("select status from bookings where id = $1", [b.booking_id]))[0].status)
      .toBe("confirmed");
    expect((await fn("emerge_accept_transfer", t.accept_token, false, false, EARLY)).result).toBe("age_required");
    const a = await fn("emerge_accept_transfer", t.accept_token, true, false, EARLY);
    expect(a.result).toBe("accepted");
    expect(a.reference).not.toBe(b.reference);
    const rows = await q<{ status: string; email: string }>(
      "select b.status, g.email from bookings b join guests g on g.id = b.guest_id order by b.created_at, b.status");
    expect(rows).toEqual(expect.arrayContaining([
      { status: "transferred", email: "guest1@example.com" },
      { status: "confirmed", email: "pat@example.com" },
    ]));
    const conf = (await emails("confirmation")).find((e) => e.to_email === "pat@example.com")!;
    expect(conf.payload.invitations).toEqual([]);
    expect(await emails("transfer_complete")).toHaveLength(1);
    // The pass link was single use.
    expect((await fn("emerge_request_transfer_by_pass", pt, "X", "x@example.com", EARLY)).result).toBe("invalid");
    // Capacity unchanged.
    expect((await avail()).remaining).toBe(2);
  });

  it("lapses at 6 pm and the original booking stands", async () => {
    const b = await book(1);
    const t = await fn("emerge_request_transfer_by_pass", await passToken(b.booking_id), "Pat", "pat@example.com", EARLY);
    await fn("emerge_tick", EV, T("2026-11-27 18:00"));
    expect((await fn("emerge_accept_transfer", t.accept_token, true, false, T("2026-11-27 18:01"))).result).toBe("lapsed");
    expect(await emails("transfer_lapsed")).toHaveLength(1);
    expect((await q<{ status: string }>("select status from bookings"))[0].status).toBe("confirmed");
  });

  it("can be cancelled by the original guest", async () => {
    const b = await book(1);
    const t = await fn("emerge_request_transfer_by_pass", await passToken(b.booking_id), "Pat", "pat@example.com", EARLY);
    expect(await fn("emerge_cancel_transfer", b.booking_id, EARLY)).toBe(true);
    expect((await fn("emerge_accept_transfer", t.accept_token, true, false, EARLY)).result).toBe("cancelled");
  });

  it("an organiser can transfer at once", async () => {
    const b = await book(1);
    const r = await fn("emerge_organiser_transfer", b.booking_id, "Door Person", "door@example.com", true, EARLY);
    expect(r.result).toBe("accepted");
  });

  it("will not transfer to someone already booked", async () => {
    const b = await book(1);
    await book(2);
    const r = await fn("emerge_request_transfer_by_pass", await passToken(b.booking_id), "G2", "guest2@example.com", EARLY);
    expect(r.result).toBe("already_booked");
  });
});

describe("email queue", () => {
  it("retries with backoff, then flags for resend", async () => {
    await book(1);
    for (let i = 1; i <= 6; i++) {
      const now = minutes(EARLY, i * 300);
      const claimed = await q<{ id: string }>("select id from emerge_claim_emails(20, $1)", [now]);
      expect(claimed).toHaveLength(1);
      await fn("emerge_email_failed", claimed[0].id, "boom", now);
    }
    const [row] = await q<{ id: string; status: string; attempts: number }>("select id, status, attempts from email_log");
    expect(row.status).toBe("dead");
    expect(row.attempts).toBe(6);
    expect(await q("select * from emerge_claim_emails(20, $1)", [minutes(EARLY, 99999)])).toHaveLength(0);
    await fn("emerge_email_resend", row.id, EARLY);
    const again = await q<{ id: string }>("select id from emerge_claim_emails(20, $1)", [EARLY]);
    await fn("emerge_email_sent", again[0].id, "re_123", EARLY);
    expect((await q<{ status: string }>("select status from email_log"))[0].status).toBe("sent");
  });

  it("does not hand the same email to two workers", async () => {
    await book(1);
    expect(await q("select * from emerge_claim_emails(20, $1)", [EARLY])).toHaveLength(1);
    expect(await q("select * from emerge_claim_emails(20, $1)", [minutes(EARLY, 1)])).toHaveLength(0);
    // A worker that died mid-send is retried after ten minutes.
    expect(await q("select * from emerge_claim_emails(20, $1)", [minutes(EARLY, 11)])).toHaveLength(1);
  });
});

describe("privacy", () => {
  it("anonymises guests without marketing consent after the retention period", async () => {
    await book(1);
    await book(2, EARLY, {});
    await q("update guests set marketing_consent = true where email = 'guest2@example.com'");
    await fn("emerge_tick", EV, T("2026-12-20 12:00"));
    expect((await q("select * from guests where anonymised_at is not null"))).toHaveLength(0);
    await fn("emerge_tick", EV, T("2027-02-27 12:00"));
    const rows = await q<{ email: string }>("select email from guests order by email");
    expect(rows.map((r) => r.email)).toContain("guest2@example.com");
    expect(rows.filter((r) => r.email.startsWith("removed-"))).toHaveLength(1);
    expect(await q("select * from email_log where to_email = 'guest1@example.com'")).toHaveLength(0);
  });

  it("records marketing consent only when ticked, and unsubscribes", async () => {
    await hold(1, EARLY, { marketing: true });
    const [g] = await q<{ marketing_consent: boolean; unsubscribe_token: string }>(
      "select marketing_consent, unsubscribe_token from guests");
    expect(g.marketing_consent).toBe(true);
    await fn("emerge_unsubscribe", g.unsubscribe_token, EARLY);
    expect((await q<{ marketing_consent: boolean }>("select marketing_consent from guests"))[0].marketing_consent).toBe(false);
  });
});
