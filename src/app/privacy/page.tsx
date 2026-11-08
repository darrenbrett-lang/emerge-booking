import Link from "next/link";
import { Footer } from "@/components/Footer";
import { CONTROLLER, PRIVACY_REVIEWED, SELLER, sellerName } from "@/lib/event";

export const metadata = { title: "Emerge · Privacy notice" };

export default function Privacy() {
  return (
    <>
      <main className="doc">
        <Link className="back" href="/">
          ← Back to the invitation
        </Link>
        {!PRIVACY_REVIEWED && <p className="eyebrow">Draft for review</p>}
        <h1>Privacy notice</h1>
        <p>
          This explains what we do with your details when you book a place at Emerge, join the waiting list, or are
          passed a place by someone else. Last updated 8 November 2026.
        </p>

        <h2>Who we are</h2>
        <p>
          This website and the guest list are run by {CONTROLLER.name}, the data controller for your details. Company number{" "}
          {CONTROLLER.companyNumber}. Registered office: {CONTROLLER.office}. Registered with the Information
          Commissioner’s Office under {CONTROLLER.ico}.
        </p>
        <p>
          Contact: <a href={`mailto:${CONTROLLER.email}`}>{CONTROLLER.email}</a>
        </p>
        <p>
          Tickets are sold by {sellerName()}, trading as {SELLER.tradingAs}. She takes payment through her own Stripe
          account. {CONTROLLER.name} runs the website and bookings for her, and is not the seller.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>Your name and email address.</li>
          <li>Your confirmation that you are 18 or over, and when you gave it.</li>
          <li>Whether you asked to hear about future Emerge events, and when.</li>
          <li>
            Your booking: its reference, its status, whether you were invited by another guest and who, any transfer
            of your place, and whether you were checked in on the door.
          </li>
          <li>
            A record of the emails we send you, and whether they were delivered.
          </li>
          <li>
            A one-way scrambled version of your internet connection’s address, kept only while your checkout is
            open, at most 45 minutes, to stop one device holding many places. We cannot turn it back into the address.
          </li>
        </ul>
        <p>
          We do not see or store your card details. Payment happens on Stripe’s own checkout page, and Stripe tells us
          only that you have paid, the amount, and its payment reference.
        </p>

        <h2>Why we use it, and on what basis</h2>
        <ul>
          <li>
            <strong>To run your booking</strong>: holding your place, taking payment, sending your confirmation,
            running the waiting list and transfers, and checking you in. The lawful basis is contract: we need these
            details to give you the place you booked.
          </li>
          <li>
            <strong>To check age</strong>: Emerge is for over-18s. We record your confirmation, and check photo ID on
            the door. The lawful basis is contract, and our legitimate interest in running a lawful over-18s event.
          </li>
          <li>
            <strong>To tell you about future Emerge events</strong>: only if you tick the box to ask. The emails come
            from Emerge and we send them. The lawful basis is your consent. Every email has a link to stop them, and
            you can email us at any time.
          </li>
          <li>
            <strong>To keep records</strong>: a record of each booking and payment, so we can deal with questions,
            refunds and chargebacks, and so the seller can account for her sales. The lawful basis is our legitimate
            interest, and the seller&rsquo;s, in keeping accurate records.
          </li>
        </ul>
        <p>Without your name and email we cannot take your booking. Hearing about future events is up to you.</p>

        <h2>Who we share it with</h2>
        <p>
          We do not sell your details. We share them with the seller, and use these services to run bookings, under
          contracts that protect your data:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> stores the guest list, in its European data centre.
          </li>
          <li>
            <strong>{sellerName()}</strong>, who sells the tickets, takes payment through her own Stripe account. She
            receives your name, email and the amount you paid, and keeps the payment record for her tax return. Your
            card statement shows {SELLER.statementDescriptor}.
          </li>
          <li>
            <strong>Stripe</strong> processes the payment. Stripe also has its own legal duties for payment data; see{" "}
            <a href="https://stripe.com/gb/privacy">Stripe’s privacy policy</a>.
          </li>
          <li>
            <strong>Resend</strong> sends our emails.
          </li>
          <li>
            <strong>Vercel</strong> hosts this website.
          </li>
        </ul>
        <p>
          We choose UK or EU hosting wherever a service offers it. Where a service may handle data in the United
          States, the transfer is covered by the UK extension to the EU–US Data Privacy Framework or by the UK’s
          approved transfer contracts.
        </p>
        <p>
          If you pass on an invitation, the person you send it to sees your first name, on the invitation and in the
          preview when the link is shared. The guest who invited you can see that you booked only if you tell them. On the night, the door list shows
          your name and booking reference.
        </p>

        <h2>How long we keep it</h2>
        <ul>
          <li>
            If you did not ask to hear about future events, or stop them later, we anonymise your name and email 90
            days after the event. The gap covers questions, disputes and card chargebacks.
          </li>
          <li>
            If you asked to hear about future events, we keep your name and email until you tell us to stop, then
            stop emailing you straight away.
          </li>
          <li>
            Booking and payment records, without your name or email, are kept for six years. The seller keeps her
            own payment records for as long as the tax rules require.
          </li>
        </ul>

        <h2>Your rights</h2>
        <p>
          You can ask for a copy of your details, ask us to correct them, ask us to delete or anonymise them, object to
          how we use them, or withdraw consent. Email{" "}
          <a href={`mailto:${CONTROLLER.email}`}>{CONTROLLER.email}</a> and we will reply within one month. If you ask
          us to delete your details before the event, we will talk to you about your place first, because your name
          needs to be on the door list.
        </p>
        <p>
          If you are unhappy with how we have handled your details, you can complain to the Information Commissioner’s
          Office at <a href="https://ico.org.uk/make-a-complaint/">ico.org.uk</a> or on 0303 123 1113. We would like
          the chance to put it right first.
        </p>

        <h2>Cookies and storage</h2>
        <p>
          This site uses no tracking or analytics cookies. The confirmation page remembers on your own device which of
          your three invitations you have shared, so it can show you. The organiser login uses a cookie to keep
          organisers signed in. Both are needed for the service to work.
        </p>

        <h2>Security</h2>
        <p>
          Your details travel encrypted and are stored encrypted. Only the two organisers can see the guest list, and
          they sign in to do so.
        </p>
      </main>
      <Footer />
    </>
  );
}
