import { shareCard } from "@/lib/og";

// /dev/og?name=Sue shows the invitation share card for a made-up sender.
// Not in production.
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  return shareCard(new URL(req.url).searchParams.get("name"));
}
