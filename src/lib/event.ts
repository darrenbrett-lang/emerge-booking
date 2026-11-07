// The confirmed event facts, in one place. Times are London time.
export const EVENT = {
  id: "maidenhead-2026-11",
  name: "Emerge · Maidenhead",
  descriptor: "Music, culture & meaningful connection",
  dateLong: "Friday 27 November 2026",
  dateShort: "27 November 2026",
  start: "8:30 pm",
  end: "12:30 am",
  venue: "BEN&JACK STUDIO",
  addressLines: ["Unit B, Reform Road", "Maidenhead, Berkshire SL6 8BT"],
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=BEN%26JACK%20STUDIO%2C%20Unit%20B%2C%20Reform%20Road%2C%20Maidenhead%20SL6%208BT",
  pricePence: 1500,
  priceLabel: "£15",
  dress: "Wear what feels like you. Just make it a night out.",
  // Open decision in the spec: entrance, parking and transport, door time.
  // Leave null until Darren confirms the wording. The confirmation email
  // leaves the block out while it is null, and `npm run check:launch` fails.
  access: null as string[] | null,
} as const;

// The privacy notice was drafted by Claude Code. Darren reviews it before
// launch, then sets this to true; until then the page is marked as a draft
// and `npm run check:launch` fails.
export const PRIVACY_REVIEWED: boolean = false;

// Emerge's Instagram profile, shown in the footer. Null hides the link.
export const INSTAGRAM: string | null = null;

export const CONTROLLER = {
  name: "DAB Hands Delivery Ltd",
  companyNumber: "17209121",
  office: "4 Bray Road, Maidenhead, England, SL6 1UE",
  ico: "ZC232396",
  email: "darren@dabhands.delivery",
} as const;

export function formatLondon(iso: string | Date, withDay = true) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: withDay ? "long" : undefined,
    day: "numeric",
    month: "long",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(d)
    .replace(":00", "")
    .replace(/\s?([ap])m/i, " $1m");
  return `${date}, ${time}`;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";
