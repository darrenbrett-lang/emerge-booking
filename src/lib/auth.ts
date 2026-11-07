import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { env } from "./env";

export async function authClient() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components cannot set cookies; the proxy refreshes them.
        }
      },
    },
  });
}

export async function isOrganiserEmail(email: string) {
  const { data } = await db().from("organisers").select("email").eq("email", email.toLowerCase()).maybeSingle();
  return Boolean(data);
}

// Darren and Suze only: a signed-in Supabase user whose email is in
// `organisers`. Everything under /organiser calls this first.
export async function requireOrganiser(): Promise<string> {
  const supabase = await authClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email || !(await isOrganiserEmail(email))) redirect("/organiser/login");
  return email;
}
