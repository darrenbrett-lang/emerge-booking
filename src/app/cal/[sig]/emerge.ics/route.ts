import { timingSafeEqual } from "node:crypto";
import { calendarSignature, icsFile } from "@/lib/calendar";
import { env } from "@/lib/env";

export async function GET(_req: Request, { params }: { params: Promise<{ sig: string }> }) {
  const { sig } = await params;
  const want = Buffer.from(calendarSignature());
  const got = Buffer.from(sig);
  if (got.length !== want.length || !timingSafeEqual(got, want)) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(icsFile(env.siteUrl()), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="emerge.ics"',
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
