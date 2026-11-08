/* eslint-disable @next/next/no-img-element */
import { EVENT } from "@/lib/event";
import { PRICE_FROM } from "@/lib/price";
import { LaunchStamp } from "./LaunchStamp";

// The ticket (Darren's mock, 8 Nov 2026): wordmark and edition number across
// the top, the night's details with the Launch Night stamp beside them, then
// a rule and the price. On a narrow ticket the stamp moves beside the price,
// so the details keep the full width. One component for every ticket.
//
// address: "secret" before someone has a place, "full" once they have one.
// price: show "From £10" (booking form and offers).
// dark: on the dark and electric pages; the wordmark goes acid and the stamp
// pink, since an electric stamp would vanish on the electric ground.
export function Ticket({
  address = "secret",
  price = false,
  dark = false,
}: {
  address?: "secret" | "full";
  price?: boolean;
  dark?: boolean;
}) {
  return (
    <div className={`event-details ticket${dark ? " on-dark" : ""}${price ? " has-price" : ""}`}>
      <div className="ticket-top">
        <img
          src={dark ? "/images/wordmark.webp" : "/images/wordmark-charcoal-1.webp"}
          alt="Emerge"
          width={150}
          height={64}
        />
        <span className="ticket-no" aria-label="Number 1">
          Nº 01
        </span>
      </div>
      <div className="ticket-lines">
        <p>
          {EVENT.dateLong} <span className="ticket-slash">/</span> {EVENT.start}
        </p>
        <p>
          {EVENT.venue}
          <br />
          {address === "full" ? (
            <>
              {EVENT.addressLines[0]}
              <br />
              {EVENT.addressLines[1]}
            </>
          ) : (
            <>
              {EVENT.venueLine}
              <br />
              {EVENT.addressNote}
            </>
          )}
        </p>
      </div>
      <LaunchStamp />
      {price && (
        <div className="ticket-price-block">
          <p className="ticket-price-note">Flexibly priced tickets.</p>
          <p className="ticket-from">From {PRICE_FROM}</p>
        </div>
      )}
    </div>
  );
}
