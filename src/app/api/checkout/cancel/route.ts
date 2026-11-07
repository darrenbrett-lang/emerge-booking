import { abandonHold } from "@/lib/stripe";
import { json, readJson, str } from "@/lib/request";

// The guest came back from Stripe without paying. Free the place now rather
// than in 40 minutes.
export async function POST(req: Request) {
  const body = await readJson(req);
  const hold = str(body.hold, 40);
  if (!/^[0-9a-f-]{36}$/i.test(hold)) return json({ released: false });
  try {
    return json({ released: await abandonHold(hold) });
  } catch (err) {
    console.error("cancel", err);
    return json({ released: false });
  }
}
