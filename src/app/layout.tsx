import type { Metadata, Viewport } from "next";
import { Unbounded, Work_Sans } from "next/font/google";
import "./emerge.css";
import "./additions.css";
import { env } from "@/lib/env";

const unbounded = Unbounded({ subsets: ["latin"], variable: "--font-unbounded", display: "swap" });
const work = Work_Sans({ subsets: ["latin"], variable: "--font-work", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl()),
  title: "Emerge · You’ve been invited",
  description: "Emerge. A night that stays with you.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#171713", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${unbounded.variable} ${work.variable}`}>
      <body>{children}</body>
    </html>
  );
}
