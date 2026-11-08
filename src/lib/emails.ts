// Branded emails in the Emerge design: night ground, ivory copy, acid
// button, pink accents, Unbounded headings where the client supports web
// fonts (Apple Mail, iOS) and a heavy system face where it does not
// (Gmail, Outlook). Table layout and inline styles throughout, so Outlook
// renders it. Every email has a plain-text version.

import { CONTROLLER, EVENT, firstName, formatLondon } from "./event";
import { formatPlace } from "./format-place";
import { googleCalendarUrl, icsUrl } from "./calendar";
import { PRICE_FROM } from "./price";

export type EmailKind =
  | "confirmation"
  | "waitlist_joined"
  | "waitlist_offer"
  | "offer_expired"
  | "transfer_offer"
  | "transfer_complete"
  | "transfer_lapsed";

export type Rendered = { subject: string; html: string; text: string };

type Ctx = { site: string; unsubscribeUrl?: string | null };

const C = {
  night: "#171713",
  ivory: "#F5F1E8",
  acid: "#EFFF00",
  pink: "#FF70BC",
  electric: "#354BFF",
  muted: "#c5c3bc",
  rule: "#3a3a33",
};
const HEAD = "'Unbounded','Arial Black','Helvetica Neue',Arial,sans-serif";
const BODY = "'Work Sans','Helvetica Neue',Arial,sans-serif";

// Longhand font styles: Gmail drops some shorthand. Sizes are set for a phone
// first (Darren, 8 Nov 2026: an Android reader found the copy too small).
const F = (weight: number, size: number, lh: number, family: string, italic = false) =>
  `font-family:${family};font-size:${size}px;line-height:${lh};font-weight:${weight}${italic ? ";font-style:italic" : ""}`;

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// ------------------------------------------------------------ building blocks

const eyebrow = (t: string) =>
  `<p style="margin:0 0 14px;${F(700,12,1.4,BODY)};letter-spacing:.16em;text-transform:uppercase;color:${C.acid}">${esc(t)}</p>`;

const h1 = (t: string) =>
  `<h1 style="margin:0 0 22px;${F(900,34,1.02,HEAD)};letter-spacing:-.04em;text-transform:uppercase;color:${C.ivory}">${t}</h1>`;

const h2 = (t: string) =>
  `<h2 style="margin:34px 0 12px;${F(800,22,1.15,HEAD)};letter-spacing:-.03em;color:${C.pink}">${esc(t)}</h2>`;

const p = (t: string, muted = false) =>
  `<p style="margin:0 0 14px;${F(400,17,1.55,BODY)};color:${muted ? C.muted : C.ivory}">${t}</p>`;

const button = (href: string, label: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0 8px">
  <tr><td bgcolor="${C.acid}" style="background:${C.acid}">
    <a href="${esc(href)}" style="display:block;padding:18px 20px;${F(800,16,1.2,HEAD)};text-transform:uppercase;letter-spacing:-.01em;color:${C.night};text-decoration:none">${esc(label)} &#8599;&#xFE0E;</a>
  </td></tr>
</table>`;

const detailsBlock = (rows: string[]) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0">
  <tr><td bgcolor="${C.pink}" style="background:${C.pink};padding:22px 22px 8px">
    ${rows.map((r) => `<p style="margin:0 0 14px;${F(500,17,1.45,BODY)};color:${C.night}">${r}</p>`).join("")}
  </td></tr>
</table>`;

// Two calendar links, one row each so a thumb can hit them. Google for Android
// and Gmail; the .ics for Apple Calendar and Outlook.
const calendarLinks = (site: string) => {
  const row = (href: string, label: string) => `
<tr><td style="border:2px solid ${C.ivory};padding:0">
  <a href="${esc(href)}" style="display:block;padding:15px 18px;${F(700, 17, 1.3, BODY)};color:${C.ivory};text-decoration:none">${esc(label)} &#8599;&#xFE0E;</a>
</td></tr>
<tr><td style="height:10px;line-height:10px;font-size:0">&nbsp;</td></tr>`;
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px">
  ${row(googleCalendarUrl(site), "Add to Google Calendar")}
  ${row(icsUrl(site), "Add to Apple or Outlook")}
</table>`;
};
const calendarText = (site: string) =>
  `Add to Google Calendar: ${googleCalendarUrl(site)}\nAdd to Apple or Outlook calendar: ${icsUrl(site)}`;

// secret: for people without a place yet, the town and a note, not the street.
function eventRows(secret = false) {
  return [
    `<strong style="${F(800,19,1.2,HEAD)};letter-spacing:-.02em">${esc(EVENT.name)}</strong>`,
    `${esc(EVENT.dateLong)}<br>${esc(EVENT.start)} to ${esc(EVENT.end)}`,
    secret
      ? `${esc(EVENT.venue)}<br>${esc(EVENT.venueLine)}<br>${esc(EVENT.addressNote)}`
      : `${esc(EVENT.venue)}<br>${EVENT.addressLines.map(esc).join("<br>")}<br><a href="${esc(EVENT.mapUrl)}" style="color:${C.night}">Open in maps</a>`,
  ];
}

function eventText(secret = false) {
  return [
    EVENT.name,
    `${EVENT.dateLong}, ${EVENT.start} to ${EVENT.end}`,
    EVENT.venue,
    ...(secret ? [EVENT.venueLine, EVENT.addressNote] : [...EVENT.addressLines, `Map: ${EVENT.mapUrl}`]),
  ].join("\n");
}

function layout(ctx: Ctx, preheader: string, inner: string) {
  const unsub = ctx.unsubscribeUrl
    ? `<br><a href="${esc(ctx.unsubscribeUrl)}" style="color:${C.muted}">Stop emails about future Emerge events</a>`
    : "";
  return `<!doctype html>
<html lang="en-GB"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>Emerge</title>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;800;900&family=Work+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  body{margin:0;padding:0;background:${C.night}}
  a{color:${C.pink}}
  @media (max-width:620px){ .pad{padding-left:20px!important;padding-right:20px!important} h1{font-size:31px!important} }
</style>
</head>
<body style="margin:0;padding:0;background:${C.night};-webkit-text-size-adjust:100%;text-size-adjust:100%" bgcolor="${C.night}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.night}" style="background:${C.night}">
<tr><td align="center" style="padding:0">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" class="shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto">
    <tr><td class="pad" style="padding:36px 32px 8px">
      <img src="${esc(ctx.site)}/images/wordmark-email.png" width="220" alt="Emerge" style="display:block;width:220px;max-width:70%;height:auto;border:0">
      <p style="margin:6px 0 0;${F(700,17,1.3,BODY,true)};color:${C.ivory}">A night that stays with you.</p>
    </td></tr>
    <tr><td class="pad" style="padding:30px 32px 10px">${inner}</td></tr>
    <tr><td class="pad" style="padding:26px 32px 40px;border-top:1px solid ${C.rule}">
      <p style="margin:0;${F(400,14,1.6,BODY)};color:${C.muted}">
        Emerge. A night that stays with you.<br>
        Bookings are run by ${esc(CONTROLLER.name)}. Questions: reply to this email.<br>
        <a href="${esc(ctx.site)}/privacy" style="color:${C.muted}">Privacy notice</a>${unsub}
      </p>
    </td></tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body></html>`;
}

function textFooter(ctx: Ctx) {
  return [
    "",
    "Emerge. A night that stays with you.",
    `Bookings are run by ${CONTROLLER.name}. Questions: reply to this email.`,
    `Privacy notice: ${ctx.site}/privacy`,
    ctx.unsubscribeUrl ? `Stop emails about future Emerge events: ${ctx.unsubscribeUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// --------------------------------------------------------------- templates

type P = Record<string, unknown>;

function confirmation(pl: P, ctx: Ctx): Rendered {
  const name = String(pl.name ?? "");
  const ref = String(pl.reference ?? "");
  const passUrl = `${ctx.site}/pass/${pl.pass_token}`;
  const invites = (Array.isArray(pl.invitations) ? pl.invitations : []) as string[];
  const inviteUrls = invites.map((t) => `${ctx.site}/i/${t}`);
  const transferred = pl.transferred === true;

  const accessHtml = EVENT.access ? h2("Getting in") + EVENT.access.map((a) => p(esc(a))).join("") : "";
  const accessText = EVENT.access ? `\nGETTING IN\n${EVENT.access.join("\n")}\n` : "";

  const invitesHtml = inviteUrls.length
    ? h2("Know someone who’d feel at home here?") +
      p("You’ve got three invitations to pass on. Each link is for one person. They book and pay for their own place, so send it soon. When the list is full, it closes.") +
      inviteUrls
        .map(
          (u, i) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${C.rule}">
  <tr><td style="padding:14px 0">
    <p style="margin:0 0 4px;${F(700,15,1.4,BODY)};color:${C.ivory}">Invitation ${i + 1} of 3</p>
    <a href="${esc(u)}" style="${F(400,16,1.5,BODY)};color:${C.pink};word-break:break-all">${esc(u)}</a>
  </td></tr>
</table>`,
        )
        .join("")
    : "";
  const invitesText = inviteUrls.length
    ? `\nKNOW SOMEONE WHO’D FEEL AT HOME HERE?\nYou’ve got three invitations to pass on. Each link is for one person. They book and pay for their own place.\n${inviteUrls
        .map((u, i) => `Invitation ${i + 1} of 3: ${u}`)
        .join("\n")}\n`
    : "";

  const lead = transferred
    ? `${esc(firstName(String(pl.from_name ?? "")))} has passed their place on to you. Glad you're coming, ${esc(firstName(name))}.`
    : `Glad you're coming, ${esc(firstName(name))}.`;

  const html = layout(
    ctx,
    `You're in. Booking reference ${ref}.`,
    eyebrow("Your place is confirmed") +
      h1("You&rsquo;re<br>in.") +
      p(lead) +
      detailsBlock([
        ...(typeof pl.place === "number"
          ? [`<strong style="${F(800,44,1,HEAD)};letter-spacing:-.04em">${esc(formatPlace(pl.place))}</strong><br><span style="${F(700,12,1.4,BODY)};letter-spacing:.14em;text-transform:uppercase">of ${EVENT.capacity}</span>`]
          : []),
        `<span style="${F(700,12,1.4,BODY)};letter-spacing:.14em;text-transform:uppercase">Booking reference</span><br><strong style="${F(800,26,1.1,HEAD)};letter-spacing:-.02em">${esc(ref)}</strong><br>${esc(name)}`,
        ...eventRows(),
      ]) +
      calendarLinks(ctx.site) +
      p(`<strong>Bring photo ID.</strong> Over-18s only. ID is checked on the door, and the name on your booking is the name on the list.`) +
      accessHtml +
      h2("What's on") +
      p(`<strong style="color:${C.acid}">01 / MUSIC</strong><br><strong>Get your groove on.</strong> DJ Ti Balo brings an eclectic mix of house, disco and Afrobass. A high-energy London DJ, mixing sounds from all over the world.`) +
      p(`<strong style="color:${C.acid}">02 / CULTURE</strong><br><strong>Refresh your outlook.</strong> Get the lowdown on Alice <span style="white-space:nowrap">Streames-Smith’s</span> confronting new magazine, <strong style="white-space:nowrap">&#45;&#45;Y</strong>. Accessorise your smile with WBB Grillz. And get an I Ching reading from our resident sage, Charlie Castillo.`) +
      p(`<strong style="color:${C.acid}">03 / COMPANY</strong><br><strong>Find your people.</strong> Dance, talk, watch, listen, play, drink, be happy. We don’t expect anything but you.`) +
      p(esc(EVENT.dress), true) +
      invitesHtml +
      h2("Can't make it?") +
      p("There are no refunds, but you can pass your place on to someone else for free until 6 pm on Friday 27 November. They will get their own confirmation and booking reference.") +
      button(passUrl, "Pass it on"),
  );

  const text = [
    "YOUR PLACE IS CONFIRMED",
    "You're in.",
    transferred ? `${firstName(String(pl.from_name ?? ""))} has passed their place on to you.` : "",
    `Glad you're coming, ${firstName(name)}.`,
    "",
    typeof pl.place === "number" ? `You're ${formatPlace(pl.place)} of ${EVENT.capacity}.` : "",
    `Booking reference: ${ref}`,
    `Name: ${name}`,
    "",
    eventText(),
    calendarText(ctx.site),
    "",
    "Bring photo ID. Over-18s only. ID is checked on the door.",
    accessText,
    "WHAT'S ON",
    "01 / MUSIC: Get your groove on. DJ Ti Balo brings an eclectic mix of house, disco and Afrobass. A high-energy London DJ, mixing sounds from all over the world.",
    "02 / CULTURE: Refresh your outlook. Get the lowdown on Alice Streames-Smith’s confronting new magazine, --Y. Accessorise your smile with WBB Grillz. And get an I Ching reading from our resident sage, Charlie Castillo.",
    "03 / COMPANY: Find your people. Dance, talk, watch, listen, play, drink, be happy. We don’t expect anything but you.",
    EVENT.dress,
    invitesText,
    "CAN'T MAKE IT?",
    "There are no refunds, but you can pass your place on for free until 6 pm on Friday 27 November.",
    `Pass it on: ${passUrl}`,
    textFooter(ctx),
  ]
    .filter((l) => l !== "")
    .join("\n");

  return { subject: `You're in. Emerge, 27 November. Ref ${ref}`, html, text };
}

function waitlistJoined(pl: P, ctx: Ctx): Rendered {
  const name = firstName(String(pl.name ?? ""));
  const html = layout(
    ctx,
    "You're on the waiting list for Emerge.",
    eyebrow("We've got your name.") +
      h1("You&rsquo;re on<br>the waiting list.") +
      p(`Thanks, ${esc(name)}. If a place opens up, we'll email you straight away with a link to pay and a deadline to use it.`) +
      p("You haven't booked a place yet.", true) +
      detailsBlock(eventRows(true)),
  );
  const text = [
    "WE'VE GOT YOUR NAME.",
    "You're on the waiting list.",
    `Thanks, ${name}. If a place opens up, we'll email you straight away with a link to pay and a deadline to use it.`,
    "You haven't booked a place yet.",
    "",
    eventText(true),
    textFooter(ctx),
  ].join("\n");
  return { subject: "You're on the waiting list for Emerge", html, text };
}

function waitlistOffer(pl: P, ctx: Ctx): Rendered {
  const name = firstName(String(pl.name ?? ""));
  const deadline = formatLondon(String(pl.deadline));
  const url = `${ctx.site}/offer/${pl.offer_token}`;
  const html = layout(
    ctx,
    `A place has opened up. Yours until ${deadline}.`,
    eyebrow("A place has opened up") +
      h1("It&rsquo;s<br>yours.") +
      p(`Good news travels, ${esc(name)}. We're holding a place for you at Emerge.`) +
      detailsBlock([
        `<span style="${F(700,12,1.4,BODY)};letter-spacing:.14em;text-transform:uppercase">Pay by</span><br><strong style="${F(800,22,1.15,HEAD)};letter-spacing:-.02em">${esc(deadline)}</strong><br>Flexibly priced, from ${PRICE_FROM}`,
        ...eventRows(true),
      ]) +
      button(url, "Pay and confirm my place") +
      p("If you haven't paid by then, the place goes to the next person on the list.", true),
  );
  const text = [
    "A PLACE HAS OPENED UP",
    `${name}, we're holding a place for you at Emerge.`,
    "",
    `Pay by: ${deadline}`,
    `Flexibly priced, from ${PRICE_FROM}`,
    `Pay and confirm: ${url}`,
    "",
    eventText(true),
    "",
    "If you haven't paid by then, the place goes to the next person on the list.",
    textFooter(ctx),
  ].join("\n");
  return { subject: `A place at Emerge is yours until ${deadline}`, html, text };
}

function offerExpired(pl: P, ctx: Ctx): Rendered {
  const name = firstName(String(pl.name ?? ""));
  const html = layout(
    ctx,
    "Your offer for Emerge has ended.",
    eyebrow("Your offer has ended") +
      h1("Until<br>next time.") +
      p(`Sorry, ${esc(name)}. The place we held for you has passed to the next person on the list.`) +
      p("If another place opens up, you can join the waiting list again from your invitation link."),
  );
  const text = [
    "YOUR OFFER HAS ENDED",
    `Sorry, ${name}. The place we held for you has passed to the next person on the list.`,
    "If another place opens up, you can join the waiting list again from your invitation link.",
    textFooter(ctx),
  ].join("\n");
  return { subject: "Your Emerge offer has ended", html, text };
}

function transferOffer(pl: P, ctx: Ctx): Rendered {
  const to = firstName(String(pl.to_name ?? ""));
  const from = String(pl.from_name ?? "");
  const deadline = formatLondon(String(pl.deadline));
  const url = `${ctx.site}/accept/${pl.accept_token}`;
  const html = layout(
    ctx,
    `${from} wants to pass their Emerge place to you.`,
    eyebrow("A little word of mouth") +
      h1(`${esc(firstName(from))}&rsquo;s<br>passing it on.`) +
      p(`${esc(to)}, ${esc(from)} can't make it and would like you to have their place at Emerge. It's already paid for.`) +
      detailsBlock(eventRows(true)) +
      p(`To take it, confirm you're 18 or over. Do it by ${esc(deadline)}, or the place stays with ${esc(firstName(from))}.`) +
      button(url, "Take the place"),
  );
  const text = [
    "A LITTLE WORD OF MOUTH",
    `${to}, ${from} can't make it and would like you to have their place at Emerge. It's already paid for.`,
    "",
    eventText(true),
    "",
    `To take it, confirm you're 18 or over by ${deadline}: ${url}`,
    textFooter(ctx),
  ].join("\n");
  return { subject: `${from} is passing their Emerge place to you`, html, text };
}

function transferComplete(pl: P, ctx: Ctx): Rendered {
  const name = firstName(String(pl.name ?? ""));
  const to = String(pl.to_name ?? "");
  const html = layout(
    ctx,
    `${to} has your place.`,
    eyebrow("Passed on") +
      h1("Thanks for<br>letting us know.") +
      p(`${esc(name)}, ${esc(to)} has accepted your place. Booking ${esc(pl.old_reference)} is now cancelled and they have their own.`) +
      p("Any invitation links you sent still work. You're always welcome at another Emerge."),
  );
  const text = [
    "PASSED ON",
    `${name}, ${to} has accepted your place. Booking ${pl.old_reference} is now cancelled and they have their own.`,
    "Any invitation links you sent still work.",
    textFooter(ctx),
  ].join("\n");
  return { subject: `${to} has your Emerge place`, html, text };
}

function transferLapsed(pl: P, ctx: Ctx): Rendered {
  const name = firstName(String(pl.name ?? ""));
  const to = String(pl.to_name ?? "");
  const html = layout(
    ctx,
    "Your place is still yours.",
    eyebrow("Still yours") +
      h1("Your place<br>stands.") +
      p(`${esc(name)}, ${esc(to)} didn't take your place before transfers closed, so booking ${esc(pl.reference)} is still yours.`) +
      detailsBlock(eventRows()) +
      calendarLinks(ctx.site),
  );
  const text = [
    "STILL YOURS",
    `${name}, ${to} didn't take your place before transfers closed, so booking ${pl.reference} is still yours.`,
    "",
    eventText(),
    calendarText(ctx.site),
    textFooter(ctx),
  ].join("\n");
  return { subject: "Your Emerge place is still yours", html, text };
}

const TEMPLATES: Record<EmailKind, (pl: P, ctx: Ctx) => Rendered> = {
  confirmation,
  waitlist_joined: waitlistJoined,
  waitlist_offer: waitlistOffer,
  offer_expired: offerExpired,
  transfer_offer: transferOffer,
  transfer_complete: transferComplete,
  transfer_lapsed: transferLapsed,
};

export function renderEmail(kind: string, payload: P, ctx: Ctx): Rendered {
  const t = TEMPLATES[kind as EmailKind];
  if (!t) throw new Error(`No template for ${kind}`);
  return t(payload, ctx);
}

export const EMAIL_KINDS = Object.keys(TEMPLATES) as EmailKind[];
