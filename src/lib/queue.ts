import "server-only";
import { Resend } from "resend";
import { db, rpc } from "./db";
import { env } from "./env";
import { renderEmail } from "./emails";
import { placeNumber } from "./place";

type Row = {
  id: string;
  kind: string;
  to_email: string;
  guest_id: string | null;
  payload: Record<string, unknown>;
  attempts: number;
};

let resend: Resend | null = null;
const client = () => (resend ??= new Resend(env.resendKey()));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Sends whatever is due. Every send is logged; a failure is retried with
// backoff by the database (1, 5, 15, 60, 240 minutes), and after six
// attempts it shows in the organiser view with a resend button.
export async function flushEmails(limit = 20) {
  const { data, error } = await db().rpc("emerge_claim_emails", { p_limit: limit });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Row[];
  let sent = 0;
  for (const row of rows) {
    try {
      let unsubscribeUrl: string | null = null;
      if (row.guest_id) {
        const { data: g } = await db()
          .from("guests")
          .select("marketing_consent,unsubscribe_token")
          .eq("id", row.guest_id)
          .maybeSingle();
        if (g?.marketing_consent) unsubscribeUrl = `${env.siteUrl()}/unsubscribe/${g.unsubscribe_token}`;
      }
      let payload = row.payload;
      if (row.kind === "confirmation" && typeof payload.reference === "string") {
        const place = await placeNumber({ reference: payload.reference }).catch(() => null);
        if (place) payload = { ...payload, place };
      }
      const email = renderEmail(row.kind, payload, { site: env.siteUrl(), unsubscribeUrl });
      const headers: Record<string, string> = {};
      if (unsubscribeUrl) {
        headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
      }
      const res = await client().emails.send(
        {
          from: env.emailFrom(),
          to: row.to_email,
          replyTo: env.emailReplyTo(),
          subject: email.subject,
          html: email.html,
          text: email.text,
          headers,
          tags: [{ name: "kind", value: row.kind }],
        },
        { idempotencyKey: `${row.id}-${row.attempts}` },
      );
      if (res.error) throw new Error(`${res.error.name}: ${res.error.message}`);
      await rpc("emerge_email_sent", { p_id: row.id, p_provider_id: res.data?.id ?? null });
      sent++;
    } catch (err) {
      await rpc("emerge_email_failed", { p_id: row.id, p_error: err instanceof Error ? err.message : String(err) });
    }
    await sleep(250); // stay inside Resend's per-second limit
  }
  return { claimed: rows.length, sent };
}
