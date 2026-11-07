import { EVENT } from "@/lib/event";
import { rpc } from "@/lib/db";
import { flushEmails } from "@/lib/queue";

export const maxDuration = 60;

// Every minute, from Supabase pg_cron (and Vercel Cron as a backstop):
// sweep expired holds and offers, issue offers, lapse transfers at 6 pm,
// anonymise after the retention period, and send or retry email.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorised", { status: 401 });
  }
  const tick = await rpc("emerge_tick", { p_event: EVENT.id });
  const mail = await flushEmails(40);
  return Response.json({ tick, mail });
}
