import { NextResponse } from "next/server";
import { authClient } from "@/lib/auth";

// The magic link lands here. Swap the code for a session, then go in.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await authClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/organiser", url.origin));
}
