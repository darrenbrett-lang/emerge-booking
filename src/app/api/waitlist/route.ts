import { after } from "next/server";
import { EVENT } from "@/lib/event";
import { rpc } from "@/lib/db";
import { flushEmails } from "@/lib/queue";
import { bool, json, readJson, str } from "@/lib/request";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (str(body.website)) return json({ result: "waiting" });
  const r = await rpc("emerge_join_waitlist", {
    p_event: EVENT.id,
    p_name: str(body.name, 100),
    p_email: str(body.email),
    p_age_confirmed: bool(body.age),
    p_marketing: bool(body.marketing),
  });
  after(() => flushEmails().catch((e) => console.error("flush", e)));
  return json({ result: r.result });
}
