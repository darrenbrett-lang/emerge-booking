/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CONTROLLER, INSTAGRAM } from "@/lib/event";

// The hero's lockup, small, then who runs the site and the credit. Darren
// chose (7 Nov 2026) to leave out the company number and registered office.
export function Footer() {
  return (
    <div className="wrap">
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-lockup">
            <img src="/images/wordmark.webp" alt="Emerge" width={220} height={94} loading="lazy" />
            <p>A night that stays with you.</p>
          </div>
          <nav className="footer-links" aria-label="Footer">
            {INSTAGRAM && (
              <a className="footer-instagram" href={INSTAGRAM} aria-label="Emerge on Instagram">
                <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
                  <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="12" cy="12" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="17.4" cy="6.6" r="1.25" fill="currentColor" />
                </svg>
              </a>
            )}
            <Link href="/privacy">Privacy</Link>
          </nav>
        </div>
        <div className="footer-legal">
          <p>
            © 2026 Emerge. This website is run by {CONTROLLER.name}.
          </p>
          <p>
            Website developed by <a href="https://dabhands.delivery">DAB Hands</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
