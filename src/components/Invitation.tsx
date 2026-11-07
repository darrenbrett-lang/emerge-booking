/* eslint-disable @next/next/no-img-element */
import { EVENT } from "@/lib/event";
import type { Availability } from "@/lib/db";
import { Footer } from "./Footer";
import { RsvpForm } from "./RsvpForm";
import { Sticky } from "./Sticky";

type Props = {
  availability: Availability;
  inviter?: string | null; // first name of the guest who sent the invitation
  inviteToken?: string | null;
};

// The approved demo page, section for section. Copy is the demo's, with the
// spec's changes: £15, 02 / CULTURE, no demo strip or controls, no
// "Concept photography" label, and live availability.
export function Invitation({ availability, inviter, inviteToken }: Props) {
  const portrait = "/images/landscape-portrait-800.webp 800w, /images/landscape-portrait-1400.webp 1400w, /images/landscape-portrait-1672.webp 1672w";
  const thermal = "/images/thermal-800.webp 800w, /images/thermal-1400.webp 1400w, /images/thermal-1672.webp 1672w";

  return (
    <>
      <main id="landing">
        <section className="p1" aria-labelledby="campaign-heading">
          <div className="p1-panel">
            <img
              className="p1-portrait"
              src="/images/landscape-portrait-1672.webp"
              srcSet={portrait}
              sizes="100vw"
              alt="Close-up of a laughing woman, printed in black and ivory halftone, with an acid-yellow star on her tooth"
              fetchPriority="high"
            />
            <header className="web-header">
              <span>27.11.26 / MAIDENHEAD</span>
              <a href="#rsvp">GET YOUR NAME DOWN ↗</a>
            </header>
            <div className="p1-brand">
              <img src="/images/wordmark.webp" alt="Emerge" />
              <p>A night that stays with you.</p>
            </div>
            <div className="p1-copy">
              <p className="p1-invitation">{inviter ? `${inviter}’s invited you` : "You’re invited"}</p>
              <h1 id="campaign-heading">
                Be there for
                <br />
                <span>the beginning</span>
              </h1>
              <p className="p1-descriptor">Music, culture &amp; meaningful connection.</p>
            </div>
          </div>
          <a className="button p1-banner" id="hero-cta" href="#rsvp">
            <span>Put me on the list!</span>
            <span aria-hidden="true">↗</span>
          </a>
        </section>

        <section className="invitation-intro wrap">
          <div className="invite-copy">
            <p className="eyebrow" id="sender-line">
              {inviter ? `${inviter} thought you’d like it here.` : "Thought this might be your kind of night"}
            </p>
            <h2>
              Make room
              <br />
              for what’s
              <br />
              been missing<span>.</span>
            </h2>
            <p className="invite-body">Come as you are. Bring your people.</p>
            <p className="invite-body">
              Leave with a new favourite track, a new idea or someone you are glad you met.
            </p>
            <a className="invite-link" href="#rsvp">
              I’m coming! <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="date-punch">
            <p className="date-label">SAVE THE NIGHT</p>
            <p className="date-numerals">
              27<span>NOV</span>
            </p>
            <p className="date-time">FRIDAY · 8:30 PM</p>
            <div className="venue-punch">
              <p>
                BEN&amp;JACK
                <br />
                STUDIO.
              </p>
              <span>
                Unit B, Reform Road
                <br />
                Maidenhead, Berkshire SL6 8BT
              </span>
            </div>
            <a href="#rsvp">I’M COMING! ↗</a>
          </div>
        </section>

        <section className="thermal-experience" aria-labelledby="people-heading">
          <img
            className="thermal-room"
            src="/images/thermal-1672.webp"
            srcSet={thermal}
            sizes="100vw"
            alt="People connecting in a listening room, their warmth picked out in yellow against electric blue"
            loading="lazy"
          />
          <div className="thermal-overlay">
            <div className="thermal-lead">
              <p className="eyebrow">Culture for the curious</p>
              <h2 id="people-heading">
                Different people.
                <br />
                <span>Same curiosity.</span>
              </h2>
              <p>
                Follow the music. Get close to the art.
                <br />
                Talk to someone you haven’t met yet.
              </p>
            </div>
            <div className="experience-programme">
              <p className="eyebrow">An evening your way</p>
              <div className="programme-grid">
                <div>
                  <span className="programme-number">01 / MUSIC</span>
                  <h3>DJ Ti Balo</h3>
                  <p>An eclectic mix of house, disco, and Afro beats.</p>
                  <p>Plenty of vibe worth coming and staying for.</p>
                </div>
                <div>
                  <span className="programme-number">02 / CULTURE</span>
                  {/* Copy under 02 / Culture is to be rewritten by Darren. */}
                  <h3>
                    Get into
                    <br />
                    creativity.
                  </h3>
                  <p>
                    See new art up close.
                    <br />
                    Ask the person who made it.
                  </p>
                </div>
                <div>
                  <span className="programme-number">03 / COMPANY</span>
                  <h3>
                    Find
                    <br />
                    your people.
                  </h3>
                  <p>
                    Dance, talk, watch, listen, play
                    <br />
                    We don’t expect anything but you.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rsvp-section" id="rsvp" aria-labelledby="rsvp-heading">
          <div className="wrap rsvp-grid">
            <div>
              <p className="eyebrow">Your invitation</p>
              <h2 id="rsvp-heading">
                A night worth
                <br />
                going out for.
              </h2>
              <div className="event-details">
                <p>{EVENT.name}</p>
                <p>{EVENT.dateShort} · {EVENT.start}</p>
                <p>
                  BEN&amp;JACK STUDIO
                  <br />
                  Unit B, Reform Road
                  <br />
                  Maidenhead, Berkshire SL6 8BT
                </p>
                <p className="ticket-price">
                  {EVENT.priceLabel} <span>per person</span>
                </p>
                <p>Access details will follow in your confirmation email.</p>
              </div>
            </div>
            <RsvpForm
              initial={{
                remaining: availability.show_count ? availability.remaining : null,
                full: availability.remaining === 0,
                phase: availability.phase,
              }}
              inviteToken={inviteToken ?? null}
            />
          </div>
        </section>
      </main>
      <Footer />
      <Sticky />
    </>
  );
}
