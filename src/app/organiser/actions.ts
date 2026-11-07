"use server";

import { revalidatePath } from "next/cache";
import { requireOrganiser } from "@/lib/auth";
import { db, rpc } from "@/lib/db";
import { flushEmails } from "@/lib/queue";

export async function checkIn(bookingId: string, on: boolean) {
  await requireOrganiser();
  await rpc("emerge_check_in", { p_booking: bookingId, p_in: on });
  revalidatePath("/organiser");
}

export async function resendEmail(id: string) {
  await requireOrganiser();
  await rpc("emerge_email_resend", { p_id: id });
  await flushEmails(5);
  revalidatePath("/organiser");
}

export async function transferTicket(bookingId: string, form: FormData) {
  await requireOrganiser();
  const r = await rpc("emerge_organiser_transfer", {
    p_booking: bookingId,
    p_to_name: String(form.get("name") ?? ""),
    p_to_email: String(form.get("email") ?? ""),
    p_age_checked: form.get("age") === "on",
  });
  await flushEmails(5);
  revalidatePath("/organiser");
  return String(r.result);
}

export async function cancelTransfer(bookingId: string) {
  await requireOrganiser();
  await rpc("emerge_cancel_transfer", { p_booking: bookingId });
  revalidatePath("/organiser");
}

export async function anonymiseGuest(guestId: string) {
  await requireOrganiser();
  await rpc("emerge_anonymise_guest", { p_guest: guestId });
  revalidatePath("/organiser");
}

export async function resolveIssue(id: string) {
  await requireOrganiser();
  await db().from("payment_issues").update({ resolved_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/organiser");
}

export async function signOut() {
  const { authClient } = await import("@/lib/auth");
  await (await authClient()).auth.signOut();
  const { redirect } = await import("next/navigation");
  redirect("/organiser/login");
}
