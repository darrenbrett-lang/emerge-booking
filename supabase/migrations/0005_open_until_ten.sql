-- 27 Nov 2026, owner: booking open until 10 pm on the night (was midnight).
update events
   set checkout_cutoff = '2026-11-27 22:00 Europe/London',
       sales_end       = '2026-11-27 22:30 Europe/London'
 where id = 'maidenhead-2026-11'
returning id, checkout_cutoff, sales_end, holding_from;
