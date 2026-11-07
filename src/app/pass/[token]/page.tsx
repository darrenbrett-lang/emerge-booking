import { Holding } from "@/components/Holding";
import { PassForm } from "@/components/PassForm";
import { StateShell } from "@/components/StateShell";
import { db } from "@/lib/db";
import { gate } from "@/lib/gate";

export default async function PassPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const a = await gate();
  if (a.phase === "holding") return <Holding />;

  const { data: booking } = await db()
    .from("bookings")
    .select("id, reference, status")
    .eq("pass_token", token)
    .maybeSingle();

  if (!booking || booking.status !== "confirmed") {
    return (
      <StateShell>
        <p className="eyebrow">Passed on</p>
        <h1>
          This link
          <br />
          has been used.
        </h1>
        <p>This place has already been passed on. The new guest has their own confirmation.</p>
      </StateShell>
    );
  }

  if (a.phase === "closed") {
    return (
      <StateShell>
        <p className="eyebrow">Transfers have closed</p>
        <h1>
          Your place
          <br />
          stands.
        </h1>
        <p>Places could be passed on until 6 pm on Friday 27 November. Booking {booking.reference} is still yours.</p>
      </StateShell>
    );
  }

  const { data: pending } = await db()
    .from("transfers")
    .select("to_name, to_email")
    .eq("booking_id", booking.id)
    .eq("status", "pending")
    .maybeSingle();

  return <PassForm token={token} reference={booking.reference} pending={pending ?? null} />;
}
