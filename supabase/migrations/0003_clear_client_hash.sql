-- The privacy notice says the scrambled IP address is kept with an open
-- checkout and no longer. It is only there to stop one device holding many
-- places at once, so it goes the moment a hold stops being active: paid,
-- released, or expired by the tick (the hold lasts 41 minutes and the tick runs every
-- minute, so within 42 minutes of the checkout opening).
--
-- Run once in the Supabase SQL editor. Safe to run again.

create or replace function emerge_clear_client_hash()
returns trigger language plpgsql as $$
begin
  new.client_hash := null;
  return new;
end;
$$;

drop trigger if exists holds_clear_client_hash on holds;
create trigger holds_clear_client_hash
  before update on holds
  for each row
  when (new.status <> 'active' and new.client_hash is not null)
  execute function emerge_clear_client_hash();

-- Holds that ended before this ran.
update holds set client_hash = null where status <> 'active' and client_hash is not null;
