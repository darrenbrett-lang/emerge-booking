import { EVENT } from "@/lib/event";

export function EventDetails({ price = false }: { price?: boolean }) {
  return (
    <div className="event-details">
      <p>{EVENT.name}</p>
      <p>{EVENT.dateShort} · {EVENT.start}</p>
      <p>
        {EVENT.venue}
        <br />
        {EVENT.addressLines[0]}
        <br />
        {EVENT.addressLines[1]}
      </p>
      {price && (
        <p className="ticket-price">
          {EVENT.priceLabel} <span>per person</span>
        </p>
      )}
    </div>
  );
}
