import { inviterName } from "@/lib/inviter";
import { OG_SIZE, shareCard } from "@/lib/og";

export const alt = "Emerge. An invitation. Friday 27 November, Maidenhead.";
export const size = OG_SIZE;
export const contentType = "image/jpeg";

// The invitation link's own card, naming who sent it. A used or unknown link
// falls back to the plain "You're invited".
export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return shareCard(await inviterName(token).catch(() => null));
}
