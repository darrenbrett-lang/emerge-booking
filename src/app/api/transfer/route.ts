import { after } from "next/server";
import { rpc } from "@/lib/db";
import { flushEmails } from "@/lib/queue";
import { json, readJson, str } from "@/lib/request";

export async function POST(req: Request) {
  const body = await readJson(req);
  const r = await rpc("emerge_request_transfer_by_pass", {
    p_pass_token: str(body.token, 100),
    p_to_name: str(body.name, 100),
    p_to_email: str(body.email),
  });
  after(() => flushEmails().catch((e) => console.error("flush", e)));
  return json({ result: r.result });
}
