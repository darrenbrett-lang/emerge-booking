"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EVENT } from "@/lib/event";
import { TicketMark } from "./TicketMark";
import { formatPlace } from "@/lib/format-place";
import { ShareSlots } from "./ShareSlots";
import { StateShell } from "./StateShell";

type Booking = { first: string; email: string; reference: string; place: number | null; passToken: string | null; invites: string[] };

export function Booked({ sessionId, booking }: { sessionId: string; booking: Booking | null }) {
  const router = useRouter();
  const [slow, setSlow] = useState(false);

  // Waiting for Stripe's webhook. Usually a second or two.
  useEffect(() => {
    if (booking) return;
    let n = 0;
    const id = setInterval(async () => {
      n++;
      if (n > 30) {
        setSlow(true);
        clearInterval(id);
        return;
      }
      try {
        const r = await fetch(`/api/booking-status?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        if ((await r.json()).status === "confirmed") {
          clearInterval(id);
          router.refresh();
        }
      } catch {}
    }, 2000);
    return () => clearInterval(id);
  }, [booking, sessionId, router]);

  if (!booking) {
    return (
      <StateShell>
        <p className="eyebrow">Payment received</p>
        <h1>
          Nearly
          <br />
          there.
        </h1>
        {slow ? (
          <p>
            We’re still confirming your place. Your confirmation email will follow in a few minutes. You can close
            this page.
          </p>
        ) : (
          <p>We’re confirming your place. This page updates by itself.</p>
        )}
      </StateShell>
    );
  }

  return (
    <StateShell>
      <p className="eyebrow">Your place is confirmed</p>
      <h1>
        You’re
        <br />
        in.
      </h1>
      {booking.place && (
        <p className="place-number" aria-label={`You are number ${booking.place} of ${EVENT.capacity}`}>
          {formatPlace(booking.place)} <span>of {EVENT.capacity}</span>
        </p>
      )}
      <p>Glad you’re coming, {booking.first}.</p>
      <p className="small muted">Your confirmation is on its way to {booking.email}.</p>
      <div className="event-details">
        <TicketMark dark />
        <p>{EVENT.dateLong} / {EVENT.start}</p>
        <p>
          {EVENT.venue}
          <br />
          {EVENT.addressLines[0]}
          <br />
          {EVENT.addressLines[1]}
        </p>
      </div>
      <p className="small payment-receipt">
        Paid / {EVENT.priceLabel}.00 / Booking reference {booking.reference}
      </p>
      {booking.invites.length > 0 && (
        <>
          <h2>Know someone who’d feel at home here?</h2>
          <p>You’ve got three invitations to pass on.</p>
          <ShareSlots tokens={booking.invites} from={booking.first} />
          <p className="urgency">They’ll need to RSVP too. Send it soon. When the list is full, it closes.</p>
        </>
      )}
      {booking.passToken && (
        <a className="button outline" href={`/pass/${booking.passToken}`}>
          I can’t make it <span aria-hidden="true">↗︎</span>
        </a>
      )}
    </StateShell>
  );
}
