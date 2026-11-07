import Link from "next/link";

export function Footer() {
  return (
    <div className="wrap">
      <footer className="footer">
        <div>Emerge. A night that stays with you.</div>
        <div>
          <Link href="/privacy">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
