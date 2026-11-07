import { EventDetails } from "@/components/EventDetails";
import { Holding } from "@/components/Holding";
import { OfferPay } from "@/components/OfferPay";
import { StateShell } from "@/components/StateShell";
import { db } from "@/lib/db";
import { firstName, formatLondon } from "@/lib/event";
import { gate } from "@/lib/gate";

export default async function OfferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const a = await gate();
  if (a.phase === "holding") return <Holding />;

  const { data } = await db()
    .from("waitlist_entries")
    .select("status, offer_deadline, guest:guests(name)")
    .eq("offer_token", token)
    .maybeSingle();

  const name = (data?.guest as unknown as { name: string } | null)?.name ?? "";
  const live =
    data?.status === "offered" && new Date(data.offer_deadline) > new Date() && a.phase === "open";

  if (data?.status === "converted") {
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
  if (!data || !live) {
    return (
      <StateShell>
        <p className="eyebrow">Your offer has ended</p>
        <h1>
          Until
          <br />
          next time.
        </h1>
        <p>The place we held has passed to the next person on the list. You’re always welcome at another Emerge.</p>
      </StateShell>
    );
  }

  return (
    <StateShell>
      <p className="eyebrow">A place has opened up</p>
      <h1>
        It’s
        <br />
        yours.
      </h1>
      <p>
        We’re holding a place for you, {firstName(name)}. Pay by {formatLondon(data.offer_deadline)} to confirm it.
      </p>
      <EventDetails price />
      <OfferPay token={token} />
    </StateShell>
  );
}
