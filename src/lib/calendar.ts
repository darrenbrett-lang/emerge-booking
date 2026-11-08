// Add to calendar (Darren, 8 Nov 2026). Phones do not reliably turn a date in
// an email into a calendar event; Gmail on Android does not at all. So the
// confirmation carries two links: Google Calendar, and an .ics file that
// Apple Calendar and Outlook open.
//
// The .ics carries the full address, which is the secret. Its URL is signed,
// so it cannot be guessed; anyone who has it already has the confirmation
// email the address is printed in.
import { createHmac } from "node:crypto";
import { EVENT } from "./event";

// 27 November is GMT, so London time and UTC agree.
const START = "20261127T203000Z";
const END = "20261128T003000Z";
const TITLE = "Emerge";
const DETAILS = "Bring photo ID. Over-18s only. Your booking reference is in your confirmation email.";

const location = () => [EVENT.venue, ...EVENT.addressLines].join(", ");

function salt() {
  const s = process.env.CLIENT_HASH_SALT;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("Missing environment variable CLIENT_HASH_SALT");
  return "dev";
}

export const calendarSignature = () =>
  createHmac("sha256", salt()).update(`calendar:${EVENT.id}`).digest("hex").slice(0, 24);

export const icsUrl = (site: string) => `${site}/cal/${calendarSignature()}/emerge.ics`;

export function googleCalendarUrl(site: string) {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: TITLE,
    dates: `${START}/${END}`,
    ctz: "Europe/London",
    details: `${DETAILS}\n${site}`,
    location: location(),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

// RFC 5545 text: escape \ ; , and newlines.
const t = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export function icsFile(site: string) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Emerge//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${EVENT.id}@emergeunderground.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${START}`,
    `DTEND:${END}`,
    `SUMMARY:${t(TITLE)}`,
    `LOCATION:${t(location())}`,
    `DESCRIPTION:${t(DETAILS)}`,
    `URL:${site}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Emerge is tomorrow",
    "TRIGGER:-P1D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
