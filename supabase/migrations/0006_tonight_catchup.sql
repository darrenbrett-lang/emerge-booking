-- 27 Nov 2026, owner: send both tonight emails to anyone who books after the
-- main send. Every 10 minutes until 22:40 London, then the job removes itself.
-- Dedupe keys match the main send, so nobody gets either email twice.
select cron.schedule('emerge-tonight-catchup', '*/10 * * * *', $job$
  insert into email_log (event_id, kind, to_email, guest_id, booking_id, payload, dedupe_key)
  select b.event_id, k.kind, g.email, g.id, b.id, jsonb_build_object('name', g.name), k.kind || ':' || b.id
    from bookings b
    join guests g on g.id = b.guest_id
    cross join (values ('tonight'), ('tonight_plain')) k(kind)
   where b.event_id = 'maidenhead-2026-11' and b.status = 'confirmed'
     and now() < timestamptz '2026-11-27 22:40 Europe/London'
  on conflict (dedupe_key) do nothing;
  select cron.unschedule('emerge-tonight-catchup') where now() >= timestamptz '2026-11-27 22:40 Europe/London';
$job$);
