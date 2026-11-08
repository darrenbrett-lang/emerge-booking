/* eslint-disable @next/next/no-img-element */
import { EVENT } from "@/lib/event";
import { Ticket } from "./Ticket";
import { PRICE_FROM } from "@/lib/price";
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
            </header>
            <div className="p1-brand">
              <img src="/images/wordmark.webp" alt="Emerge" />
              <p>A night that stays with you.</p>
            </div>
            <div className="p1-copy">
              <p className="p1-invitation">
                {inviter ? (
                  <>
                    <span className="p1-inviter">{inviter}</span> thought you’d like it here.
                  </>
                ) : (
                  "You’re invited"
                )}
              </p>
              <h1 id="campaign-heading">
                <span className="ln"><span className="ln-i">Be there for</span></span>
                <span className="ln"><span className="ln-i"><span>the beginning</span></span></span>
              </h1>
              <p className="p1-descriptor">{EVENT.descriptor}</p>
              <p className="p1-meta">
                Friday 27 Nov <span className="p1-slash" aria-hidden="true">/</span> {EVENT.start}{" "}
                <span className="p1-slash p1-meta-dot" aria-hidden="true">/</span>{" "}
                <span className="p1-meta-venue">{EVENT.venue}, Maidenhead</span>
              </p>
            </div>
          </div>
          <a className="button p1-banner" id="hero-cta" href="#rsvp">
            <span>Get me in!</span>
            <span className="p1-price">
              Tickets from {PRICE_FROM} <span aria-hidden="true">↗︎</span>
            </span>
          </a>
        </section>

        <section className="invitation-intro wrap" id="explore">
          <div className="invite-copy">
            <h2 data-reveal>
              <span className="ln"><span className="ln-i">Make room</span></span>
              <span className="ln"><span className="ln-i">for what’s</span></span>
              <span className="ln"><span className="ln-i">been missing<span>.</span></span></span>
            </h2>
            <p className="invite-body">
              Come on your own.
              <br />
              Or bring your people.
            </p>
            <p className="welcome-note">Either way, there will be a warm welcome waiting for you.</p>
            <p className="invite-body">Emerge with an easier feeling, new connections and ideas.</p>
            <a className="invite-link" href="#rsvp">
              I’m coming! <span aria-hidden="true">↗︎</span>
            </a>
          </div>
          <div className="date-punch" data-reveal>
            <p className="date-label">SAVE THE NIGHT</p>
            <p className="date-numerals">
              27<span>NOV</span>
            </p>
            <p className="date-time">FRIDAY / 8:30 PM</p>
            <div className="venue-punch">
              <p>
                BEN&amp;JACK
                <br />
                STUDIO.
              </p>
              <span>
                {EVENT.venueLine}
                <br />
                {EVENT.addressNote}
              </span>
            </div>
            <a href="#rsvp">I’M COMING! <span aria-hidden="true">↗︎</span></a>
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
              <h2 id="people-heading" data-reveal>
                <span className="ln"><span className="ln-i">Arrive with curiosity.</span></span>
                <span className="ln"><span className="ln-i"><span>Notice where it takes you.</span></span></span>
              </h2>
              <p>
                <span className="thermal-line">Be moved by music.</span>
                <span className="thermal-line">Take in other people’s creations.</span>
                <span className="thermal-line">Find something inspiring in a stranger.</span>
              </p>
            </div>
            <div className="experience-programme">
              <p className="eyebrow">On the night</p>
              <div className="programme-grid">
                <div>
                  <span className="programme-number">01 / MUSIC</span>
                  <h3>
                    Get your
                    <br />
                    groove on.
                  </h3>
                  <p>
                    DJ Ti Balo brings an eclectic mix of house, disco and Afrobass. A high-energy London DJ, mixing
                    sounds from all over the world.
                  </p>
                </div>
                <div>
                  <span className="programme-number">02 / CULTURE</span>
                  <h3>
                    Refresh
                    <br />
                    your outlook.
                  </h3>
                  <p>
                    Get the lowdown on Alice <span className="nowrap">Streames-Smith’s</span> confronting new magazine,{" "}
                    <strong className="mag-title">{"--Y"}</strong>. Accessorise your smile with WBB Grillz. And get an
                    I Ching reading from our resident sage, Charlie Castillo.
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
                    <span className="prog-line">Be yourself to inspire others.</span>
                    <span className="prog-line">Emerge through music, fashion, moves, art, ideas.</span>
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
              <Ticket price />
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
