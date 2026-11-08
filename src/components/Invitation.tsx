/* eslint-disable @next/next/no-img-element */
import { EVENT } from "@/lib/event";
import { TicketMark } from "./TicketMark";
import type { Availability } from "@/lib/db";
import { Footer } from "./Footer";
import { Motion } from "./Motion";
import { ThermalTouch } from "./ThermalTouch";
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
  const portrait = "/images/landscape-portrait-2-800.webp 800w, /images/landscape-portrait-2-1400.webp 1400w, /images/landscape-portrait-2-1672.webp 1672w";
  const thermal = "/images/thermal-800.webp 800w, /images/thermal-1400.webp 1400w, /images/thermal-1672.webp 1672w";
  const heat = "/images/thermal-heat-1-800.webp 800w, /images/thermal-heat-1-1400.webp 1400w, /images/thermal-heat-1-1672.webp 1672w";

  return (
    <>
      <main id="landing">
        <section className="p1" aria-labelledby="campaign-heading">
          <div className="p1-panel">
            <img
              className="p1-portrait"
              src="/images/landscape-portrait-2-1672.webp"
              srcSet={portrait}
              sizes="100vw"
              alt="Close-up of a laughing woman, printed in black and ivory halftone, with an acid-yellow star on her tooth"
              fetchPriority="high"
            />
            {/* The star on her tooth, alone, glowing; pulses over the photo. */}
            <img className="p1-portrait p1-star" src="/images/tooth-star-glow-1.webp" alt="" aria-hidden="true" />
            <header className="web-header">
              <span>27 Nov 2026 / Maidenhead</span>
              <a href="#explore">
                Explore the night <span aria-hidden="true">↓</span>
              </a>
            </header>
            <div className="p1-brand">
              <img src="/images/wordmark.webp" alt="Emerge" />
              <p>A night that stays with you.</p>
            </div>
            <div className="p1-copy">
              <p className="p1-invitation">{inviter ? `${inviter}’s invited you` : "You’re invited"}</p>
              <h1 id="campaign-heading">
                <span className="ln"><span className="ln-i">Be there for</span></span>
                <span className="ln"><span className="ln-i"><span>the beginning</span></span></span>
              </h1>
              <p className="p1-descriptor">Music, culture &amp; meaningful connection.</p>
              <p className="p1-meta">
                Friday 27 Nov <span aria-hidden="true">·</span> {EVENT.start}{" "}
                <span aria-hidden="true">·</span> {EVENT.venue}, Maidenhead
              </p>
            </div>
          </div>
          <a className="button p1-banner" id="hero-cta" href="#rsvp">
            <span>Put me on the list!</span>
            <span className="p1-price">
              Tickets {EVENT.priceLabel} <span aria-hidden="true">↗</span>
            </span>
          </a>
        </section>

        <section className="invitation-intro wrap" id="explore">
          <div className="invite-copy">
            <p className="eyebrow" id="sender-line">
              {inviter ? `${inviter} thought you’d like it here.` : "Thought this might be your kind of night"}
            </p>
            <h2 data-reveal>
              <span className="ln"><span className="ln-i">Make room</span></span>
              <span className="ln"><span className="ln-i">for what’s</span></span>
              <span className="ln"><span className="ln-i">been missing<span>.</span></span></span>
            </h2>
            <p className="invite-body">Come as you are. Bring your people.</p>
            <p className="invite-body">
              Leave with a new favourite track, a new idea or someone you are glad you met.
            </p>
            <a className="invite-link" href="#rsvp">
              I’m coming! <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="date-punch" data-reveal>
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
                {EVENT.town}
                <br />
                {EVENT.addressNote}
              </span>
              <span className="venue-note">{EVENT.venueLine}</span>
            </div>
            <a href="#rsvp">I’M COMING! ↗</a>
          </div>
        </section>

        <section className="thermal-experience" aria-labelledby="people-heading" data-reveal>
          <img
            className="thermal-room"
            src="/images/thermal-1672.webp"
            srcSet={thermal}
            sizes="100vw"
            alt="People connecting in a listening room, their warmth picked out in yellow against electric blue"
            loading="lazy"
          />
          {/* The same room running a little warmer, breathing in over two
              groups, then the CCTV grain, scan lines and a slow scan band. */}
          <img className="thermal-room thermal-heat heat-a" src="/images/thermal-heat-1-1672.webp" srcSet={heat} sizes="100vw" alt="" aria-hidden="true" loading="lazy" />
          <img className="thermal-room thermal-heat heat-b" src="/images/thermal-heat-1-1672.webp" srcSet={heat} sizes="100vw" alt="" aria-hidden="true" loading="lazy" />
          <ThermalTouch />
          <div className="cctv" aria-hidden="true" />
          <div className="thermal-overlay">
            <div className="thermal-lead">
              <p className="eyebrow">Culture for the curious</p>
              <h2 id="people-heading" data-reveal>
                <span className="ln"><span className="ln-i">Come curious.</span></span>
                <span className="ln"><span className="ln-i"><span>See what happens.</span></span></span>
              </h2>
              <p>
                Let the music move you.
                <br />
                Spend time with what someone’s made.
                <br />
                Find something new in a stranger.
              </p>
            </div>
            <div className="experience-programme">
              <p className="eyebrow">On the night</p>
              <div className="programme-grid">
                <div>
                  <span className="programme-number">01 / MUSIC</span>
                  <h3>DJ Ti Balo</h3>
                  <p>House, disco and Afro beats.</p>
                  <p>Plenty of vibe worth coming and staying for.</p>
                </div>
                <div>
                  <span className="programme-number">02 / CULTURE</span>
                  <h3>
                    Get into
                    <br />
                    creativity.
                  </h3>
                  <p>
                    Grillz in the making.
                    <br />
                    Alice’s new magazine.
                    <br />
                    Tooth gems.
                    <br />
                    I Ching readings.
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
                    Dance, talk, watch, listen, play, drink, be happy.
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
              <h2 id="rsvp-heading" data-reveal>
                <span className="ln"><span className="ln-i">A night worth</span></span>
                <span className="ln"><span className="ln-i">going out for.</span></span>
              </h2>
              <div className="event-details">
                <TicketMark />
                <p>{EVENT.dateLong} · {EVENT.start}</p>
                <p>
                  BEN&amp;JACK STUDIO
                  <br />
                  {EVENT.town}
                  <br />
                  {EVENT.addressNote}
                </p>
                <p className="venue-line">{EVENT.venueLine}</p>
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
      <Motion />
    </>
  );
}
