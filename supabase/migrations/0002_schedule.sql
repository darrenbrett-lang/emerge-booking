-- Runs the tick every minute from inside Supabase (pg_cron + pg_net), so it
-- does not depend on the Vercel plan (Hobby allows only daily crons). Before
-- running this, put the site URL and the CRON_SECRET in the
-- vault (Database > Vault in the Supabase dashboard, or):
--
--   select vault.create_secret('https://www.emergeunderground.com', 'emerge_site_url');
--   select vault.create_secret('<the CRON_SECRET from Vercel>', 'emerge_cron_secret');

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('emerge-tick') where exists (select 1 from cron.job where jobname = 'emerge-tick');

select cron.schedule(
  'emerge-tick',
  '* * * * *',
  $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'emerge_site_url') || '/api/cron/tick',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'emerge_cron_secret')
    ),
    timeout_milliseconds := 55000
  );
  $$
);
