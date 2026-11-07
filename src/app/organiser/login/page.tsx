import { authClient, isOrganiserEmail } from "@/lib/auth";
import { env } from "@/lib/env";

export const metadata = { title: "Emerge · Organisers" };

// Sign in by emailed link. Only addresses in `organisers` are sent one, and
// the reply is the same either way, so the page does not reveal who is.
export default async function Login({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;

  async function send(form: FormData) {
    "use server";
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    if (email && (await isOrganiserEmail(email))) {
      const supabase = await authClient();
      await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: `${env.siteUrl()}/auth/callback` },
      });
    }
    const { redirect } = await import("next/navigation");
    redirect("/organiser/login?sent=1");
  }

  return (
    <main className="org" style={{ maxWidth: 480 }}>
      <h1>Organisers</h1>
      {sent ? (
        <p>If that email belongs to an organiser, a sign-in link is on its way. It works once, for an hour.</p>
      ) : (
        <form action={send}>
          <p className="muted">Darren and Suze only. We’ll email you a sign-in link.</p>
          <p>
            <label htmlFor="email">Email</label>
          </p>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <p>
            <button className="btn primary" type="submit">
              Email me a link
            </button>
          </p>
        </form>
      )}
    </main>
  );
}
