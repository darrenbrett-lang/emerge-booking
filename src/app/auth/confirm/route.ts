import { NextResponse } from "next/server";
import { authClient } from "@/lib/auth";

// The sign-in link lands here (Supabase's Magic link and Invite email
// templates point at /auth/confirm?token_hash=...&type=...). Unlike the code
// exchange in /auth/callback, a token hash needs nothing stored in the browser
// that asked for the link, so it works when the email is opened on another
// device, such as a phone's mail app.
const TYPES = ["email", "magiclink", "invite"] as const;
type LinkType = (typeof TYPES)[number];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get("token_hash");
  const raw = url.searchParams.get("type") ?? "email";
  const type: LinkType = (TYPES as readonly string[]).includes(raw) ? (raw as LinkType) : "email";
  if (tokenHash) {
    const supabase = await authClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL("/organiser", url.origin));
  }
  return NextResponse.redirect(new URL("/organiser/login?expired=1", url.origin));
}
