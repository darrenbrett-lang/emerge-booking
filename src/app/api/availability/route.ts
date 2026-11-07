import { availability } from "@/lib/db";
import { json } from "@/lib/request";

export async function GET() {
  const a = await availability();
  // Only what the page shows: the count when it is 20 or fewer, and the phase.
  return json({ remaining: a.show_count ? a.remaining : null, full: a.remaining === 0, phase: a.phase });
}
