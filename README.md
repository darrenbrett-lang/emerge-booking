# Emerge booking site

The live booking site for Emerge · Maidenhead, Friday 27 November 2026, at
www.emergeunderground.com. Built from the approved invitation demo to
[spec.md](spec.md).

Next.js 16 on Vercel, Supabase Postgres, Stripe hosted Checkout, Resend.
Type: Unbounded for display, Work Sans for everything else, both from
Google Fonts (open licence), self-hosted by `next/font`.

## How it holds together

Every rule that protects a place is a Postgres function in
[`supabase/migrations/0001_booking.sql`](supabase/migrations/0001_booking.sql).
The app calls them; it never decides capacity itself.

| Rule | Where |
|---|---|
| Never more than 100 paid places plus live holds | `emerge_start_checkout` locks the event row, counts, then holds |
| 30-minute hold | Stripe session expires at 30 min; the hold has 10 min grace for a slow webhook |
| Only the webhook confirms | `/api/webhooks/stripe` verifies the signature, then `emerge_confirm_payment` |
| No duplicates | Unique Checkout Session and PaymentIntent IDs; confirm is idempotent; Stripe idempotency key per hold |
| Waiting list offers | `emerge_issue_offers`: 24 h, or 2 h in the final 48 h, capped at the 5:30 pm cutoff |
| Cutoffs, holding page | Read from the `events` row by the database clock on every request |
| Transfers | `emerge_request_transfer`, `emerge_accept_transfer`, lapse in `emerge_tick` at 6 pm |
| Email | Queued in `email_log` in the same transaction as the booking; sent by `flushEmails`; retried with backoff |
| Retention | `emerge_tick` anonymises non-consenting guests 90 days after the event |

Holds are judged by their expiry time, not by a sweep, so a late or missing
cron never oversells and never keeps a place locked. The minute tick only
sends the emails that follow from time passing.

## Pages

| Path | What |
|---|---|
| `/` | The invitation (main link) |
| `/i/<token>` | A personal invitation, "Sue’s invited you" |
| `/booked?session_id=` | Where Stripe returns. Shows the booking once the webhook has made it |
| `/waiting` | Joined the waiting list |
| `/offer/<token>` | A waiting list offer, with its deadline |
| `/pass/<token>` | Pass it on (transfer) |
| `/accept/<token>` | The new guest accepts a transfer and confirms 18+ |
| `/unsubscribe/<token>` | Stop future-event emails |
| `/privacy` | Privacy notice |
| `/organiser` | Darren and Suze: guest list, door check-in, exports |

From 12:30 am on 28 November every guest page shows the holding page.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

With no Supabase keys the page renders with a made-up count, for design work:
`PREVIEW_REMAINING=12 npm run dev`, or `PREVIEW_PHASE=holding`. Every email
is viewable at `/dev/emails/<kind>` (`?text=1` for the plain text); these
routes do not exist in production.

```bash
npm test               # booking rules against real Postgres (PGlite), webhook, emails
npm run check:launch   # fails on anything still open before go-live
```

## Setting up the services

Do these in order. Use Stripe **test mode** throughout until Darren approves
go-live.

### 1. Supabase

1. In the Emerge Underground organisation, create the project **Emerge
   Booking**, region **London (eu-west-2)**.
2. SQL editor: run `supabase/migrations/0001_booking.sql`. It creates the
   tables, functions, row-level security and the event row.
3. Add the organisers:
   ```sql
   insert into organisers (email) values ('darren@dabhands.delivery'), ('<suze’s email>');
   ```
4. Authentication > Users: invite both addresses. Authentication > Providers:
   turn off sign-ups. URL configuration: site URL
   `https://www.emergeunderground.com`, redirect URL
   `https://www.emergeunderground.com/auth/callback` (and
   `http://localhost:3000/auth/callback` for testing).
5. Authentication > SMTP: send through Resend (`smtp.resend.com`, port 465,
   user `resend`, password = a Resend API key), so sign-in links come from
   emergeunderground.com.
6. Vault: add `emerge_site_url` and `emerge_cron_secret` (see the top of
   `supabase/migrations/0002_schedule.sql`), then run that file. It calls
   `/api/cron/tick` every minute.

### 2. Stripe

1. Developers > API keys: copy the test secret key.
2. Developers > Webhooks: add `https://www.emergeunderground.com/api/webhooks/stripe`,
   listening to `checkout.session.completed`, `checkout.session.expired`,
   `checkout.session.async_payment_succeeded` and
   `checkout.session.async_payment_failed`. Copy its signing secret.
3. Settings > Public details: statement descriptor `EMERGE`.
4. Settings > Payment methods: Apple Pay and Google Pay on.

### 3. Resend

1. Add the domain `emergeunderground.com`, region **eu-west-1 (Ireland)**.
2. Add the SPF, DKIM and return-path records it gives you at the DNS host.
   Add DMARC: `_dmarc` TXT `v=DMARC1; p=quarantine; rua=mailto:darren@dabhands.delivery`.
3. Wait for Verified, then create an API key with sending access.

### 4. Vercel and GitHub

1. Create a private GitHub repo and push this folder.
2. Import it into Vercel. Functions run in London (`vercel.json`).
3. Environment variables: everything in `.env.example`. `SITE_URL` is
   `https://www.emergeunderground.com`. Generate `CRON_SECRET` and
   `CLIENT_HASH_SALT` with `openssl rand -hex 32`.
4. Domains: add `www.emergeunderground.com` and redirect the apex to it.

## Testing in Stripe test mode

Card `4242 4242 4242 4242`, any future date, any CVC. The spec's checks:

- **Payment**: book, pay, land on "You’re in", confirmation email arrives.
- **Abandoned checkout**: start, press back on Stripe. The place frees at once.
  Start and close the tab: it frees when Stripe expires the session at 30 min.
- **Browser closed after paying**: pay, close the tab before the redirect.
  The webhook still books it and the email still arrives.
- **Duplicate webhooks**: Stripe dashboard > the event > Resend. One booking.
- **Waiting list**: set capacity low (`update events set capacity = 2`), fill
  it, join the list, release a hold. The offer email arrives with its deadline.
  Let it lapse (`update holds set expires_at = now() where kind = 'offer'`)
  and the next person gets it.
- **Cutoffs and holding page**: move the clock by editing the event row, e.g.
  `update events set checkout_cutoff = now()` and
  `update events set holding_from = now()`. Put them back afterwards.
- **Email failure**: set `RESEND_API_KEY` to a wrong value in a preview
  deployment, book, watch it retry and then appear in the organiser view with
  Resend. Put the key back and press Resend.

## Before go-live

`npm run check:launch` must pass. Today it fails on:

1. **Privacy notice review.** Drafted in `src/app/privacy/page.tsx`. Darren
   reads it, then sets `PRIVACY_REVIEWED = true` in `src/lib/event.ts`.
2. **Access instructions.** Entrance, parking and transport, door time. Fill
   `EVENT.access` in `src/lib/event.ts`; the confirmation email shows them.

Also before go-live:

- **Clear the test bookings** made in the Stripe sandbox before sales open:
  `truncate email_log, payment_issues, transfers, invitations, holds,
  waitlist_entries, bookings, guests;` in the Supabase SQL editor (the events
  and organisers rows stay).
- **Payments go to Suze's Stripe account; DAB Hands Delivery Ltd runs the
  site and the guest data** (Darren, 7 Nov 2026). The privacy notice still
  names DAB Hands as controller, which stays. Add a line under "Who we share it
  with" saying payment is taken by Suze's business through her Stripe account,
  which receives the name, email and amount (her legal name needed). Receipts
  and card statements show her business. VAT and income are hers to account for.

- Suze's sign-off on refunds and transfers.
- Send every email to real Gmail, Outlook and Apple Mail accounts on a phone
  and a laptop (`/dev/emails/<kind>` locally; real sends in test mode).
- Switch Stripe keys and the webhook secret to live, and run one real
  payment end to end.

## Decisions the spec left open

Made in the build, each easy to change:

- **Invitation links are single use.** Once someone books through one, it
  shows "This invitation isn’t available". Several people can open it before
  that.
- **A transferred ticket brings no new invitation links.** The new guest gets
  their place and their own "Pass it on" link. Otherwise each transfer would
  mint three more invitations.
- **"Pass it on" can be used once.** A cancelled or lapsed transfer leaves the
  link working; a completed one retires it.
- **Waiting list offers end by 5:30 pm**, since paying needs a checkout and
  checkouts stop then. An offer is only made if at least 30 minutes are left
  to use it. Offers still open at 6 pm close without another email.
- **An offer holds the place** against the main link until its deadline.
  Abandoning the offer's checkout before the deadline keeps the offer.
- **Joining the waiting list closes at 5:30 pm**, with checkouts.
- **A payment that lands after its hold expired is honoured**, even if that
  takes the list to 101, and is flagged in the organiser view. Money taken is
  never refused. A second payment from someone already booked is also
  flagged, for a manual refund.
- **Three open checkouts per connection**, so a script cannot hold the list
  with made-up emails.
- **Extra emails**: transfer offer, transfer complete, and transfer lapsed,
  which the transfer rules need.
- **The organiser can transfer at once** by ticking "I’ve seen they’re 18 or
  over"; without the tick it goes through the normal accept step.
