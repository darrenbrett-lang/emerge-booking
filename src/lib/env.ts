import "server-only";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export const env = {
  // Production sets SITE_URL. Preview deployments leave it unset and use
  // their own address, so Stripe and email links come back to the preview.
  siteUrl: () =>
    (
      process.env.SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    ).replace(/\/$/, ""),
  supabaseUrl: () => need("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => need("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceKey: () => need("SUPABASE_SERVICE_ROLE_KEY"),
  stripeSecret: () => need("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => need("STRIPE_WEBHOOK_SECRET"),
  resendKey: () => need("RESEND_API_KEY"),
  emailFrom: () => process.env.EMAIL_FROM ?? "Emerge <hello@emergeunderground.com>",
  emailReplyTo: () => process.env.EMAIL_REPLY_TO ?? "darren@dabhands.delivery",
  cronSecret: () => need("CRON_SECRET"),
  hashSalt: () => need("CLIENT_HASH_SALT"),
};
