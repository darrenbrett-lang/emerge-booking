-- 27 Nov 2026, owner: keep booking open until midnight on the night.
-- Sales may now run past the start time, up to the end of the event.

alter table events drop constraint if exists events_check;
alter table events add constraint events_check
  check (checkout_cutoff < sales_end and sales_end <= ends_at and starts_at < ends_at);

update events
   set checkout_cutoff = '2026-11-28 00:00 Europe/London',
       sales_end       = '2026-11-28 00:30 Europe/London'
 where id = 'maidenhead-2026-11'
returning id, checkout_cutoff, sales_end, holding_from;
