/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CONTROLLER, INSTAGRAM } from "@/lib/event";

// The hero's lockup, small, then the company line. A company's website has to
// show its registered name, number, place of registration and office
// (Companies Act trading disclosures, 2015), and the site is run by
// DAB Hands Delivery Ltd.
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
            {INSTAGRAM && <a href={INSTAGRAM}>Instagram</a>}
            <Link href="/privacy">Privacy</Link>
          </nav>
        </div>
        <div className="footer-legal">
          <p>
            © 2026 Emerge. This website is run by {CONTROLLER.name}, registered in England and Wales, company
            number {CONTROLLER.companyNumber}. Registered office: {CONTROLLER.office}.
          </p>
          <p>
            Website developed by <a href="https://dabhands.delivery">DAB Hands</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
