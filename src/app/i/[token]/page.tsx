import { Holding } from "@/components/Holding";
import { Invitation } from "@/components/Invitation";
import { StateShell } from "@/components/StateShell";
import { db } from "@/lib/db";
import { firstName } from "@/lib/event";
import { gate } from "@/lib/gate";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const a = await gate();
  if (a.phase === "holding") return <Holding />;

  const { data } = await db()
    .from("invitations")
    .select("used_by_booking_id, inviter:bookings!invitations_inviter_booking_id_fkey(guest:guests(name, anonymised_at))")
    .eq("token", token)
    .maybeSingle();

  const inviter = (data?.inviter as unknown as { guest: { name: string; anonymised_at: string | null } } | null)?.guest;
  if (!data || data.used_by_booking_id || !inviter || inviter.anonymised_at) {
    return (
      <StateShell>
        <p className="eyebrow">A little word of mouth.</p>
        <h1>
          This invitation
          <br />
          isn’t available.
        </h1>
        <p>Ask the person who sent it to share a fresh invitation. We’d love to see you.</p>
      </StateShell>
    );
  }
  return <Invitation availability={a} inviter={firstName(inviter.name)} inviteToken={token} />;
}
