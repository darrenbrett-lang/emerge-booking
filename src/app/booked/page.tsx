import { Booked } from "@/components/Booked";
import { Holding } from "@/components/Holding";
import { StateShell } from "@/components/StateShell";
import { db } from "@/lib/db";
import { firstName } from "@/lib/event";
import { gate } from "@/lib/gate";
import { placeNumber } from "@/lib/place";

// Stripe sends the guest here after paying. This page never confirms
// anything: it shows the booking once the webhook has made it, and waits
// politely until then.
export default async function BookedPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  if ((await gate()).phase === "holding") return <Holding />;
  const sessionId = (await searchParams).session_id ?? "";
  const valid = /^cs_[A-Za-z0-9_]+$/.test(sessionId);

  const { data } = valid
    ? await db()
        .from("bookings")
        .select("reference, pass_token, status, guest:guests(name, email), invitations!invitations_inviter_booking_id_fkey(slot, token)")
        .eq("stripe_session_id", sessionId)
        .maybeSingle()
    : { data: null };

  if (!valid) {
    return (
      <StateShell>
        <p className="eyebrow">Nothing to show</p>
        <h1>Lost the thread?</h1>
        <p>Your confirmation email has your booking reference and everything else you need.</p>
      </StateShell>
    );
  }

  const place = data ? await placeNumber({ sessionId }) : null;
  const guest = data?.guest as unknown as { name: string; email: string } | undefined;
  const invites = ((data?.invitations as unknown as { slot: number; token: string }[]) ?? [])
    .sort((a, b) => a.slot - b.slot)
    .map((i) => i.token);

  return (
    <Booked
      sessionId={sessionId}
      booking={
        data && guest
          ? {
              first: firstName(guest.name),
              email: guest.email,
              reference: data.reference,
              place,
              passToken: data.status === "confirmed" ? data.pass_token : null,
              invites,
            }
          : null
      }
    />
  );
}
