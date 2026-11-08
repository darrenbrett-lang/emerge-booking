import "server-only";
import { db } from "./db";
import { firstName } from "./event";

// The first name of whoever sent an invitation link, or null if the link is
// unknown, used, or its sender has been anonymised.
export async function inviterName(token: string): Promise<string | null> {
  const { data } = await db()
    .from("invitations")
    .select("used_by_booking_id, inviter:bookings!invitations_inviter_booking_id_fkey(guest:guests(name, anonymised_at))")
    .eq("token", token)
    .maybeSingle();
  const g = (data?.inviter as unknown as { guest: { name: string; anonymised_at: string | null } } | null)?.guest;
  if (!data || data.used_by_booking_id || !g || g.anonymised_at) return null;
  return firstName(g.name);
}
