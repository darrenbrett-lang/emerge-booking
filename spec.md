# Emerge Booking Site — Build Spec

Version 1 · 7 November 2026 · updated 8 November 2026 (flexible pricing) · Owner: Darren Brett

> The spec as supplied, kept beside the code. Where the build makes a call
> the spec leaves open, it is listed in README.md under "Decisions the spec
> left open".

## 1. Summary

Turn the existing Emerge invitation demo into a live booking site at www.emergeunderground.com for the first Emerge event. Keep the demo's design, copy and images. Add real bookings, Stripe payments, confirmation emails, personal invitation links, a waiting list, an organiser view, and an automatic post-event holding page.

## 2. Event details (confirmed)

- Event: Emerge · Maidenhead
- Date: Friday 27 November 2026, 8:30 pm to 12:30 am
- Venue: BEN&JACK STUDIO, Unit B, Reform Road, Maidenhead, Berkshire SL6 8BT
- Price: flexibly priced, from £10 (changed 8 November 2026 from a fixed £15). See section 4a.
- Capacity: 100 places
- Descriptor: Music, culture & meaningful connection
- Over-18s only

## 3. Design and content (confirmed)

- Rebuild the demo's HTML as Next.js components, keeping layout, colours, typography and all existing page copy exactly as it is.
- Images are Emerge's own AI-generated images and are cleared for use.
- Remove the "Concept photography" label from the footer. Copy change: in the "An evening your way" section, rename "02 / ART" to "02 / CULTURE" (sections read 01 Music, 02 Culture, 03 Company).
- Remove any hard-coded "places left" text. Availability is hidden until 20 or fewer places remain, then a live count (e.g. "12 places left") is shown, read from the database and updated with every sale and released hold. When full, it shows the waiting list instead.

## 4. Booking rules (confirmed)

1. One ticket per person. No group bookings.
2. Open via main link. Anyone with the main link can book. The link is not publicly promoted.
3. Invitations. Each confirmed guest gets exactly three personal invitation links. An invitation link opens a personalised page (e.g. "Sue's invited you"). Invitees choose and pay their own price, as in section 4a. Invitations do not reserve places or bypass capacity or the waiting list. The system records who invited whom.
4. Age. Booking requires a tick box confirming the guest is 18 or over. ID is checked on the door.
5. Capacity. Never more than 100 paid places plus active holds. Capacity check and hold creation happen in a single database transaction to prevent overselling.
6. Checkout holds. Starting checkout holds a place for 30 minutes (matches Stripe Checkout minimum session length). Expired or abandoned holds release the place.
7. Confirmation. A place is confirmed only by a verified Stripe webhook reporting successful payment. Browser redirects never confirm a booking. Closing the browser after paying must still result in a confirmed booking.
8. No duplicates. Retries, repeated webhooks and double clicks must never create duplicate tickets or charges. Use Stripe idempotency keys and unique constraints on payment/session IDs.
9. Waiting list. When full, guests can join the waiting list. When a place frees up, the next person automatically receives an offer email with the exact payment deadline. Offer window: 24 hours, reducing to 2 hours within the final 48 hours before sales close. Unused offers pass to the next person.
10. Sales cutoff. New checkouts stop at 5:30 pm on 27 November. All sales and waiting list offers end at 6:00 pm on 27 November. No offer may be issued that cannot be used before 6:00 pm.
11. Holding page. At 12:30 am on 28 November the site automatically switches to a holding page saying Emerge will be in touch when the next event is happening.

## 4a. Flexible pricing (8 November 2026)

1. The booking form offers £10, £15 and £20 as buttons, with £15 pre-selected, and an "Other" option for any whole-pound amount from £10 to £200. Everyone gets the same night, whatever they pay.
2. The server checks the amount (whole pounds, £10 to £200) before it holds a place. A bad amount is refused with `invalid_price` and never reaches the database, so it never holds a place. The rules live in `src/lib/price.ts`, shared by the form and the server, and are tested in `tests/price.test.ts`.
3. Stripe Checkout charges exactly the chosen amount. The booking records the amount Stripe reports as paid (`amount_total`), and the booked page shows it ("Paid / £20").
4. Waiting list offers use the same choice: the offer page shows the same buttons and the server applies the same check before it opens checkout.
5. The event row's `price_pence` (1500) is no longer charged; it stays as the default the database knows about. No database change was needed.
6. If a guest already has an open checkout and starts again with a different amount, they are sent back to the open checkout at its original amount. Cancelling it (the back button on Stripe) frees the place at once, and they can choose again.
7. Wording: the hero reads "Tickets from £10"; the ticket reads "Flexibly priced tickets." above "From £10"; the waiting list offer email reads "From £10. You choose what you pay."
8. Transfers carry the amount the original guest paid. No refunds, whatever was paid.

Transfers and refunds (confirmed): No refunds. Tickets can be transferred free of charge until 6:00 pm on 27 November:

1. The confirmation email includes a "Pass it on" link (secure, single-use token).
2. The guest enters the new person's name and email and confirms.
3. Once the new person accepts (step 5), the original booking reference is cancelled and the original guest is notified.
4. The new person receives their own confirmation email with a new booking reference. Invitation links do not transfer; any already sent by the original guest remain valid.
5. The new person must tick the 18+ box to activate the ticket; until they do, the ticket stays with the original guest and shows as pending transfer in the organiser view. If the new person has not accepted by 6:00 pm on 27 November, the transfer lapses and the original booking stands. The original guest can cancel a pending transfer at any time.
6. The door list shows the new name; ID is checked on the door as normal.
7. Organisers can also transfer a ticket manually from the organiser view.

## 5. Guest journey

1. Land on invitation page (main link or personal invite link).
2. Click "Get your name down"; enter name and email; tick 18+ box.
3. Place held for 30 minutes; continue to Stripe Checkout.
4. On successful payment (webhook), booking confirmed and reference generated.
5. Confirmation email sent with booking reference, event details, access instructions and three personal invitation links.
6. If full: join waiting list; receive offer email if a place frees up.

## 6. Emails

- Sent via Resend from the emergeunderground.com domain (SPF, DKIM and DMARC configured). All emails are branded HTML in the Emerge design (colours, wordmark, typography), with a plain-text fallback, and tested across Gmail, Outlook and Apple Mail on mobile and desktop.
- Types: booking confirmation, waiting list joined, waiting list offer (with deadline), offer expired.
- Durable retry queue: failed sends retry automatically with backoff; persistent failures are flagged in the organiser view with a one-click resend.
- All sends logged with status.

Confirmation email content: booking reference, guest name, event date and times, venue address with map link, access instructions (details to confirm: entrance, parking/transport, door time), bring photo ID (18+), "Pass it on" transfer link, three personal invitation links, a short "What's on" reminder mirroring the page (01 Music: DJ Ti Balo, house, disco and Afro beats; 02 Culture; 03 Company), and the dress note: "Wear what feels like you. Just make it a night out."

## 7. Organiser view (confirmed)

- Access: Darren and Suze only, behind secure login.
- Guest list with status: held, paid/confirmed, waiting, offered, expired, checked in.
- Who invited whom.
- Door check-in by booking reference or name.
- CSV export.
- Email failures list with resend.
- Live capacity counter.

## 8. Tech stack (recommended)

- Next.js with TypeScript, hosted on Vercel.
- Supabase Postgres, project "Emerge Booking" in the Emerge Underground organisation (Pro), Europe region.
- Supabase Auth for organiser login.
- Row-level security on all tables; service keys server-side only.
- Stripe hosted Checkout; webhook signature verification.
- Resend for email.
- Scheduled jobs (Vercel Cron or Supabase pg_cron) for hold expiry, waiting list offers, email retries, sales cutoff and holding page switch.
- Code in a private GitHub repo, with this spec as spec.md beside the code.

## 9. Data model (outline)

- events (settings, capacity, cutoff times)
- guests (name, email, 18+ confirmation)
- bookings (status, reference, Stripe session and payment IDs, unique)
- holds (expiry)
- invitations (inviter, token, used by)
- waitlist_entries (position, offer status, deadline)
- email_log (type, status, attempts)

## 10. Privacy (UK GDPR)

- Short privacy notice linked from booking form.
- Collect only name, email and age confirmation.
- Data retained to invite guests to future Emerge events; guests can ask to be removed.

Full UK GDPR compliance is a requirement. The build must include:

- Data controller is DAB Hands Delivery Ltd (company number 17209121, registered office 4 Bray Road, Maidenhead, England, SL6 1UE; ICO registration ZC232396). The privacy notice shows all of these plus the contact email darren@dabhands.delivery.
- Lawful basis stated: contract for bookings; legitimate interest or consent for future event invitations.
- Future-event emails (changed 8 November 2026, soft opt-in): guests who book or join the waiting list are emailed about future Emerge events unless they tick "Don't email me about future Emerge events." (unticked by default). Every email carries a link to stop them, and so does the List-Unsubscribe header. Guests who accept a passed-on place keep the old opt-in tick, since they have not bought. The database column is still `marketing_consent`; it now means "may email about future events".
- Unsubscribe link in every non-transactional email.
- Data subject rights: organiser view can export a guest's data and delete or anonymise a guest on request.
- Retention: guests without marketing consent are anonymised a set period after the event (proposed 90 days, to cover disputes and chargebacks).
- Processors: privacy notice lists Supabase, Stripe, Resend and Vercel; data hosted in the EU/UK where offered.
- Cookies: essential cookies only; no tracking or analytics cookies without a consent banner.
- Security: encryption in transit and at rest, row-level security, secret keys server-side only, organiser login protected.
- Card data never touches the site; Stripe hosted Checkout handles it.
- Privacy notice drafted by Claude Code and reviewed by Darren before launch.

## 11. Testing and launch

- Full journey tested with Stripe test mode: payment, abandoned checkout, browser closed after payment, duplicate webhooks, waiting list offer and expiry, cutoffs, holding page switch.
- Simulated email failures and resend.
- Darren approves before go-live.

## 12. Open decisions

- Refunds and transfers: resolved, see Booking rules (pending Suze's final sign-off).
- Access instructions wording for the confirmation email (entrance, parking/transport, door time).
  - Copy under 02 / Culture to be rewritten by Darren during the build.
