import { EventDetails } from "@/components/EventDetails";
import { Holding } from "@/components/Holding";
import { StateShell } from "@/components/StateShell";
import { gate } from "@/lib/gate";

export default async function Waiting() {
  if ((await gate()).phase === "holding") return <Holding />;
  return (
    <StateShell>
      <p className="eyebrow">We’ve got your name.</p>
      <h1>
        You’re on
        <br />
        the waiting list.
      </h1>
      <p>If a place opens up, we’ll let you know.</p>
      <p className="small muted">
        You haven’t booked a place yet. If one comes free, we’ll email you a link to pay and a deadline to use it.
      </p>
      <EventDetails />
    </StateShell>
  );
}
