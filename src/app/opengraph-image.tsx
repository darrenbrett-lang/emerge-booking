import { OG_SIZE, shareCard } from "@/lib/og";

export const alt = "Emerge. You’re invited. Friday 27 November, Maidenhead.";
export const size = OG_SIZE;
export const contentType = "image/jpeg";

export default function Image() {
  return shareCard(null);
}
