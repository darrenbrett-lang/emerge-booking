/* eslint-disable @next/next/no-img-element */
// The top of the ticket (Darren, 8 Nov 2026): the wordmark, the same drawing
// as the hero's, with the edition number beside it. Charcoal on the pink
// ticket; acid on the dark pages.
export function TicketMark({ dark = false }: { dark?: boolean }) {
  return (
    <p className={dark ? "ticket-mark on-dark" : "ticket-mark"}>
      <img src={dark ? "/images/wordmark.webp" : "/images/wordmark-charcoal-1.webp"} alt="Emerge" width={150} height={64} />
      <span>#1</span>
    </p>
  );
}
