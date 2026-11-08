import { EVENT } from "@/lib/event";
import { TicketMark } from "./TicketMark";

export function EventDetails({ price = false }: { price?: boolean }) {
  return (
    <div className="event-details">
      <TicketMark dark />
      <p>{EVENT.dateLong} / {EVENT.start}</p>
      <p>
        {EVENT.venue}
        <br />
        {EVENT.town}
        <br />
        {EVENT.addressNote}
      </p>
      <p className="venue-line">{EVENT.venueLine}</p>
      {price && (
        <p className="ticket-price">
          {EVENT.priceLabel} <span>per person</span>
        </p>
      )}
    </div>
  );
}
