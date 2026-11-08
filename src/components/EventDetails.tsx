import { Ticket } from "./Ticket";

// The ticket on the dark pages (waiting list, offer, accepting a passed-on
// place): the address stays a secret until the place is theirs.
export function EventDetails({ price = false }: { price?: boolean }) {
  return <Ticket dark price={price} />;
}
