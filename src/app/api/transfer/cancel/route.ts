import { db, rpc } from "@/lib/db";
import { json, readJson, str } from "@/lib/request";

export async function POST(req: Request) {
  const body = await readJson(req);
  const { data } = await db().from("bookings").select("id").eq("pass_token", str(body.token, 100)).maybeSingle();
  if (!data) return json({ result: "invalid" });
  const ok = await rpc<boolean>("emerge_cancel_transfer", { p_booking: data.id });
  return json({ result: ok ? "cancelled" : "none" });
}
