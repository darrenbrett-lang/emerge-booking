/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

// The hero's lockup, small: the wordmark with the line set under it the same
// way, italic and right-aligned (Darren, 7 Nov 2026).
export function Footer() {
  return (
    <div className="wrap">
      <footer className="footer">
        <div className="footer-lockup">
          <img src="/images/wordmark.webp" alt="Emerge" width={220} height={94} loading="lazy" />
          <p>A night that stays with you.</p>
        </div>
        <div>
          <Link href="/privacy">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
