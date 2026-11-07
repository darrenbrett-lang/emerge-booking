import { AcceptForm } from "@/components/AcceptForm";
import { EventDetails } from "@/components/EventDetails";
import { Holding } from "@/components/Holding";
import { StateShell } from "@/components/StateShell";
import { db } from "@/lib/db";
import { firstName } from "@/lib/event";
import { gate } from "@/lib/gate";

export default async function AcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const a = await gate();
  if (a.phase === "holding") return <Holding />;

  const { data: t } = await db()
    .from("transfers")
    .select("status, to_name, booking:bookings!transfers_booking_id_fkey(guest:guests(name))")
    .eq("accept_token", token)
    .maybeSingle();

  const from = (t?.booking as unknown as { guest: { name: string } } | null)?.guest?.name ?? "";

  if (t?.status === "accepted") {
    return (
      <StateShell>
        <p className="eyebrow">Your place is confirmed</p>
        <h1>
          You’re
          <br />
          in.
        </h1>
        <p>Your confirmation email has your booking reference and everything you need.</p>
      </StateShell>
    );
  }
  if (!t || t.status !== "pending" || a.phase === "closed") {
    return (
      <StateShell>
        <p className="eyebrow">A little word of mouth.</p>
        <h1>
          This place
          <br />
          isn’t available.
        </h1>
        <p>The transfer was cancelled or has closed. The place stays with the person who booked it.</p>
      </StateShell>
    );
  }

  return (
    <StateShell>
      <p className="eyebrow">A little word of mouth.</p>
      <h1>
        {firstName(from)}’s
        <br />
        passing it on.
      </h1>
      <p>
        {firstName(t.to_name)}, {from} can’t make it and would like you to have their place. It’s already paid for.
      </p>
      <EventDetails />
      <AcceptForm token={token} />
    </StateShell>
  );
}
