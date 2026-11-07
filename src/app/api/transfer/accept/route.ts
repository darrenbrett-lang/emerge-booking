import { after } from "next/server";
import { rpc } from "@/lib/db";
import { flushEmails } from "@/lib/queue";
import { bool, json, readJson, str } from "@/lib/request";

export async function POST(req: Request) {
  const body = await readJson(req);
  const r = await rpc("emerge_accept_transfer", {
    p_accept_token: str(body.token, 100),
    p_age_confirmed: bool(body.age),
    p_marketing: bool(body.marketing),
  });
  after(() => flushEmails().catch((e) => console.error("flush", e)));
  return json({ result: r.result, reference: r.reference ?? null });
}
