-- Emerge booking: schema and rules.
--
-- Every rule that protects a place lives in this file, so it cannot be
-- bypassed by a retry, a second tab or a slow webhook:
--   * capacity is paid places plus live holds, checked and claimed while the
--     event row is locked, so two buyers can never take the last place;
--   * a place is confirmed only by emerge_confirm_payment, which the Stripe
--     webhook calls, and which is idempotent on the Checkout Session ID;
--   * waiting list offers, transfers, check-in and retention run here too.
--
-- Functions take p_now so the tests can move the clock. The app never passes
-- it. All functions are callable by the service role only (see the end).

create table if not exists events (
  id               text primary key,
  name             text not null,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  capacity         int not null check (capacity > 0),
  price_pence      int not null check (price_pence > 0),
  checkout_cutoff  timestamptz not null,   -- no new checkouts after this
  sales_end        timestamptz not null,   -- no sales, offers or transfers after this
  holding_from     timestamptz not null,   -- site switches to the holding page
  show_count_at    int not null default 20,
  hold_minutes     int not null default 30,
  hold_grace_minutes int not null default 10,
  retention_days   int not null default 90,
  created_at       timestamptz not null default now(),
  check (checkout_cutoff < sales_end and sales_end <= starts_at and starts_at < ends_at)
);

create table if not exists guests (
  id                    uuid primary key default gen_random_uuid(),
  event_id              text not null references events(id),
  name                  text not null,
  email                 text not null,
  age_confirmed_at      timestamptz,
  marketing_consent     boolean not null default false,
  marketing_consent_at  timestamptz,
  unsubscribe_token     text not null unique,
  anonymised_at         timestamptz,
  created_at            timestamptz not null default now(),
  unique (event_id, email)
);

create table if not exists bookings (
  id                      uuid primary key default gen_random_uuid(),
  event_id                text not null references events(id),
  guest_id                uuid not null references guests(id),
  reference               text not null unique,
  status                  text not null check (status in ('confirmed','transferred','cancelled')),
  amount_pence            int not null default 0,
  stripe_session_id       text unique,
  stripe_payment_intent   text unique,
  pass_token              text unique,       -- the "Pass it on" link, single use
  invitation_id           uuid,              -- the invitation it was booked through
  invited_by_booking_id   uuid references bookings(id),
  transferred_from_id     uuid references bookings(id),
  checked_in_at           timestamptz,
  created_at              timestamptz not null default now()
);
-- One live ticket per person.
create unique index if not exists bookings_one_per_guest
  on bookings (event_id, guest_id) where status = 'confirmed';

create table if not exists invitations (
  id                   uuid primary key default gen_random_uuid(),
  event_id             text not null references events(id),
  inviter_booking_id   uuid not null references bookings(id),
  slot                 int not null check (slot between 1 and 3),
  token                text not null unique,
  used_by_booking_id   uuid references bookings(id),
  created_at           timestamptz not null default now(),
  unique (inviter_booking_id, slot)
);
alter table bookings drop constraint if exists bookings_invitation_fk;
alter table bookings add constraint bookings_invitation_fk
  foreign key (invitation_id) references invitations(id);

create table if not exists waitlist_entries (
  id              uuid primary key default gen_random_uuid(),
  event_id        text not null references events(id),
  guest_id        uuid not null references guests(id),
  position        bigint generated always as identity,
  status          text not null default 'waiting'
                  check (status in ('waiting','offered','expired','converted','removed')),
  offer_token     text unique,
  offered_at      timestamptz,
  offer_deadline  timestamptz,
  created_at      timestamptz not null default now(),
  unique (event_id, guest_id)
);

create table if not exists holds (
  id                  uuid primary key default gen_random_uuid(),
  event_id            text not null references events(id),
  guest_id            uuid not null references guests(id),
  kind                text not null check (kind in ('checkout','offer')),
  status              text not null default 'active'
                      check (status in ('active','converted','released','expired')),
  expires_at          timestamptz not null,
  stripe_session_id   text unique,
  stripe_session_url  text,
  stripe_expires_at   timestamptz,
  invitation_id       uuid references invitations(id),
  waitlist_entry_id   uuid references waitlist_entries(id),
  client_hash         text,                -- hashed IP, to stop one device holding many places
  created_at          timestamptz not null default now(),
  resolved_at         timestamptz
);
create index if not exists holds_live on holds (event_id, expires_at) where status = 'active';

create table if not exists transfers (
  id              uuid primary key default gen_random_uuid(),
  event_id        text not null references events(id),
  booking_id      uuid not null references bookings(id),
  to_name         text not null,
  to_email        text not null,
  accept_token    text not null unique,
  status          text not null default 'pending'
                  check (status in ('pending','accepted','cancelled','lapsed')),
  by_organiser    boolean not null default false,
  new_booking_id  uuid references bookings(id),
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);
create unique index if not exists transfers_one_pending
  on transfers (booking_id) where status = 'pending';

create table if not exists email_log (
  id               uuid primary key default gen_random_uuid(),
  event_id         text not null references events(id),
  guest_id         uuid references guests(id),
  booking_id       uuid references bookings(id),
  kind             text not null,
  to_email         text not null,
  payload          jsonb not null default '{}'::jsonb,
  dedupe_key       text not null unique,
  status           text not null default 'queued'
                   check (status in ('queued','sending','sent','failed','dead')),
  attempts         int not null default 0,
  next_attempt_at  timestamptz not null default now(),
  locked_at        timestamptz,
  last_error       text,
  provider_id      text,
  created_at       timestamptz not null default now(),
  sent_at          timestamptz
);
create index if not exists email_log_due on email_log (next_attempt_at) where status in ('queued','failed','sending');

-- Money taken that needs a human: a second payment from someone already
-- booked, or a payment that landed after its hold had gone.
create table if not exists payment_issues (
  id                 uuid primary key default gen_random_uuid(),
  event_id           text not null references events(id),
  kind               text not null,
  stripe_session_id  text,
  booking_id         uuid references bookings(id),
  note               text,
  resolved_at        timestamptz,
  created_at         timestamptz not null default now()
);

create table if not exists organisers (
  email       text primary key,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- helpers

create or replace function emerge_token() returns text
language sql volatile as $$
  -- 256 bits from two v4 UUIDs (gen_random_uuid uses the strong RNG), url-safe.
  select rtrim(translate(encode(uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()), 'base64'), '+/', '-_'), '=');
$$;

create or replace function emerge_reference() returns text
language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  ref text;
begin
  loop
    bytes := uuid_send(gen_random_uuid());
    ref := 'EM-';
    for i in 0..4 loop
      ref := ref || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
    end loop;
    exit when not exists (select 1 from bookings where reference = ref);
  end loop;
  return ref;
end $$;

create or replace function emerge_clean_email(p_email text) returns text
language sql immutable as $$ select lower(btrim(coalesce(p_email, ''))) $$;

create or replace function emerge_valid_email(p_email text) returns boolean
language sql immutable as $$
  select length(p_email) between 3 and 254 and p_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
$$;

create or replace function emerge_first_name(p_name text) returns text
language sql immutable as $$ select split_part(btrim(p_name), ' ', 1) $$;

-- Paid places plus live holds. Holds count until expires_at even if no job
-- has swept them yet, so correctness never waits on a cron.
create or replace function emerge_taken(p_event text, p_now timestamptz default now())
returns int language sql stable as $$
  select
    (select count(*) from bookings where event_id = p_event and status = 'confirmed')::int
  + (select count(*) from holds where event_id = p_event and status = 'active' and expires_at > p_now)::int
$$;

create or replace function emerge_availability(p_event text, p_now timestamptz default now())
returns jsonb language plpgsql stable as $$
declare
  e events;
  taken int;
  waiting int;
begin
  select * into e from events where id = p_event;
  if not found then raise exception 'unknown event %', p_event; end if;
  taken := emerge_taken(p_event, p_now);
  select count(*) into waiting from waitlist_entries where event_id = p_event and status in ('waiting','offered');
  return jsonb_build_object(
    'capacity', e.capacity,
    'taken', taken,
    'remaining', greatest(e.capacity - taken, 0),
    'show_count', greatest(e.capacity - taken, 0) <= e.show_count_at,
    'waiting', waiting,
    'phase', case
      when p_now >= e.holding_from then 'holding'
      when p_now >= e.sales_end then 'closed'
      when p_now >= e.checkout_cutoff then 'checkout_closed'
      else 'open' end
  );
end $$;

create or replace function emerge_enqueue_email(
  p_event text, p_kind text, p_to text, p_guest uuid, p_booking uuid,
  p_payload jsonb, p_dedupe text, p_now timestamptz default now()
) returns void language sql volatile as $$
  insert into email_log (event_id, kind, to_email, guest_id, booking_id, payload, dedupe_key, next_attempt_at, created_at)
  values (p_event, p_kind, p_to, p_guest, p_booking, p_payload, p_dedupe, p_now, p_now)
  on conflict (dedupe_key) do nothing
$$;

create or replace function emerge_upsert_guest(
  p_event text, p_name text, p_email text, p_marketing boolean, p_now timestamptz
) returns guests language plpgsql volatile as $$
declare g guests;
begin
  insert into guests (event_id, name, email, age_confirmed_at, marketing_consent, marketing_consent_at, unsubscribe_token, created_at)
  values (p_event, btrim(p_name), p_email, p_now, coalesce(p_marketing, false),
          case when p_marketing then p_now end, emerge_token(), p_now)
  on conflict (event_id, email) do update set
    name = excluded.name,
    age_confirmed_at = p_now,
    anonymised_at = null,
    -- An unticked box on a later visit does not withdraw consent given earlier.
    marketing_consent = guests.marketing_consent or excluded.marketing_consent,
    marketing_consent_at = case when excluded.marketing_consent and not guests.marketing_consent
                                then p_now else guests.marketing_consent_at end
  returning * into g;
  return g;
end $$;

-- Stripe Checkout sessions must live at least 30 minutes. Stop at sales end
-- where that still leaves 30 minutes; otherwise give the 30 minutes.
create or replace function emerge_stripe_expiry(e events, p_now timestamptz)
returns timestamptz language sql immutable as $$
  select greatest(
    least(p_now + make_interval(mins => e.hold_minutes + 1), e.sales_end),
    p_now + make_interval(mins => e.hold_minutes, secs => 15)
  )
$$;

-- ------------------------------------------------------------- checkout

-- Claims a place for 30 minutes, or says why not. The event row lock makes
-- the capacity check and the hold one step.
create or replace function emerge_start_checkout(
  p_event text, p_name text, p_email text, p_age_confirmed boolean,
  p_marketing boolean default false, p_invite_token text default null,
  p_now timestamptz default now(), p_client text default null
) returns jsonb language plpgsql volatile as $$
declare
  e events;
  g guests;
  h holds;
  v_email text := emerge_clean_email(p_email);
  v_invitation uuid;
  v_stripe_exp timestamptz;
begin
  if coalesce(p_age_confirmed, false) is not true then
    return jsonb_build_object('result', 'age_required');
  end if;
  if length(btrim(coalesce(p_name, ''))) = 0 or length(p_name) > 100 then
    return jsonb_build_object('result', 'invalid_name');
  end if;
  if not emerge_valid_email(v_email) then
    return jsonb_build_object('result', 'invalid_email');
  end if;

  select * into e from events where id = p_event for update;
  if not found then raise exception 'unknown event %', p_event; end if;
  if p_now >= e.checkout_cutoff then
    return jsonb_build_object('result', 'closed');
  end if;

  g := emerge_upsert_guest(p_event, p_name, v_email, p_marketing, p_now);

  if exists (select 1 from bookings where guest_id = g.id and status = 'confirmed') then
    return jsonb_build_object('result', 'already_booked');
  end if;

  -- A second click or tab reuses the checkout already open for this person.
  select * into h from holds
   where guest_id = g.id and status = 'active' and expires_at > p_now
     and kind = 'checkout' and stripe_session_id is not null and stripe_expires_at > p_now
   order by created_at desc limit 1;
  if found then
    return jsonb_build_object('result', 'existing', 'hold_id', h.id,
      'session_id', h.stripe_session_id, 'session_url', h.stripe_session_url);
  end if;

  -- A hold that never reached Stripe (the request died in between), or whose
  -- Stripe session has already expired and can no longer be paid, is replaced
  -- rather than counted twice.
  update holds set status = 'released', resolved_at = p_now
   where guest_id = g.id and status = 'active' and kind = 'checkout'
     and (stripe_session_id is null or stripe_expires_at <= p_now);

  -- Someone holding a waiting list offer pays through the offer link, which
  -- already holds their place.
  if exists (select 1 from holds where guest_id = g.id and kind = 'offer' and status = 'active' and expires_at > p_now) then
    return jsonb_build_object('result', 'has_offer');
  end if;

  if emerge_taken(p_event, p_now) >= e.capacity then
    return jsonb_build_object('result', 'full');
  end if;

  -- Three open checkouts per connection at most, so a script cannot hold
  -- the whole list with made-up emails.
  if p_client is not null and (select count(*) from holds
      where client_hash = p_client and status = 'active' and kind = 'checkout' and expires_at > p_now) >= 3 then
    return jsonb_build_object('result', 'too_many');
  end if;

  if p_invite_token is not null then
    select id into v_invitation from invitations where token = p_invite_token and event_id = p_event;
  end if;

  v_stripe_exp := emerge_stripe_expiry(e, p_now);
  insert into holds (event_id, guest_id, kind, expires_at, stripe_expires_at, invitation_id, client_hash, created_at)
  values (p_event, g.id, 'checkout', v_stripe_exp + make_interval(mins => e.hold_grace_minutes),
          v_stripe_exp, v_invitation, p_client, p_now)
  returning * into h;

  return jsonb_build_object('result', 'held', 'hold_id', h.id, 'guest_id', g.id,
    'email', g.email, 'name', g.name, 'stripe_expires_at', v_stripe_exp, 'price_pence', e.price_pence);
end $$;

create or replace function emerge_attach_session(p_hold uuid, p_session_id text, p_session_url text)
returns void language sql volatile as $$
  update holds set stripe_session_id = p_session_id, stripe_session_url = p_session_url where id = p_hold
$$;

-- A guest who came back from Stripe without paying, or a session Stripe
-- expired. The app expires the Stripe session first, so it can no longer be
-- paid, then calls this.
create or replace function emerge_release_hold(p_hold uuid, p_now timestamptz default now())
returns boolean language plpgsql volatile as $$
declare h holds;
begin
  update holds set status = 'released', resolved_at = p_now
   where id = p_hold and status = 'active'
  returning * into h;
  if not found then return false; end if;
  if h.waitlist_entry_id is not null then
    -- An offer is used or lost once its checkout is abandoned after the deadline;
    -- before the deadline the offer stands, so put the hold back.
    if p_now < (select offer_deadline from waitlist_entries where id = h.waitlist_entry_id) then
      update holds set status = 'active', resolved_at = null,
             stripe_session_id = null, stripe_session_url = null, stripe_expires_at = null,
             expires_at = (select offer_deadline from waitlist_entries where id = h.waitlist_entry_id)
       where id = h.id;
      return true;
    end if;
    update waitlist_entries set status = 'expired' where id = h.waitlist_entry_id and status = 'offered';
    if found then
      perform emerge_enqueue_email(h.event_id, 'offer_expired', g.email, g.id, null,
                jsonb_build_object('name', g.name), 'offer_expired:' || h.waitlist_entry_id, p_now)
         from guests g where g.id = h.guest_id;
    end if;
  end if;
  perform emerge_issue_offers(h.event_id, p_now);
  return true;
end $$;

create or replace function emerge_release_session(p_session_id text, p_now timestamptz default now())
returns boolean language plpgsql volatile as $$
declare v_hold uuid;
begin
  select id into v_hold from holds where stripe_session_id = p_session_id;
  if v_hold is null then return false; end if;
  return emerge_release_hold(v_hold, p_now);
end $$;

-- Called only by the verified Stripe webhook. Safe to call any number of
-- times for the same session: the first call books, the rest return it.
create or replace function emerge_confirm_payment(
  p_session_id text, p_payment_intent text, p_amount int, p_now timestamptz default now()
) returns jsonb language plpgsql volatile as $$
declare
  e events;
  h holds;
  g guests;
  b bookings;
  v_inviter uuid;
  v_hold_was_live boolean;
  v_invites jsonb;
begin
  select * into b from bookings where stripe_session_id = p_session_id;
  if found then
    return jsonb_build_object('result', 'already_confirmed', 'booking_id', b.id, 'reference', b.reference);
  end if;

  select * into h from holds where stripe_session_id = p_session_id;
  if not found then
    raise exception 'no hold for session %', p_session_id;
  end if;

  select * into e from events where id = h.event_id for update;

  -- Re-check under the lock: a concurrent delivery may have just booked it.
  select * into b from bookings where stripe_session_id = p_session_id;
  if found then
    return jsonb_build_object('result', 'already_confirmed', 'booking_id', b.id, 'reference', b.reference);
  end if;

  select * into g from guests where id = h.guest_id;

  if exists (select 1 from bookings where guest_id = g.id and status = 'confirmed') then
    insert into payment_issues (event_id, kind, stripe_session_id, note, created_at)
    values (e.id, 'duplicate_payment', p_session_id,
            'Second payment from ' || g.email || '. Refund it in Stripe.', p_now)
    on conflict do nothing;
    update holds set status = 'converted', resolved_at = p_now where id = h.id;
    return jsonb_build_object('result', 'duplicate_payment');
  end if;

  v_hold_was_live := h.status = 'active';

  if h.invitation_id is not null then
    select inviter_booking_id into v_inviter from invitations where id = h.invitation_id;
  end if;

  insert into bookings (event_id, guest_id, reference, status, amount_pence, stripe_session_id,
                        stripe_payment_intent, pass_token, invitation_id, invited_by_booking_id, created_at)
  values (e.id, g.id, emerge_reference(), 'confirmed', coalesce(p_amount, e.price_pence), p_session_id,
          p_payment_intent, emerge_token(), h.invitation_id, v_inviter, p_now)
  returning * into b;

  update holds set status = 'converted', resolved_at = p_now where id = h.id;
  if h.waitlist_entry_id is not null then
    update waitlist_entries set status = 'converted' where id = h.waitlist_entry_id;
  end if;
  -- Anyone who books stops waiting.
  update waitlist_entries set status = 'converted' where guest_id = g.id and status in ('waiting','offered');
  if h.invitation_id is not null then
    update invitations set used_by_booking_id = b.id where id = h.invitation_id and used_by_booking_id is null;
  end if;

  insert into invitations (event_id, inviter_booking_id, slot, token, created_at)
  select e.id, b.id, s, emerge_token(), p_now from generate_series(1, 3) s;

  select jsonb_agg(token order by slot) into v_invites from invitations where inviter_booking_id = b.id;

  if not v_hold_was_live and emerge_taken(e.id, p_now) > e.capacity then
    insert into payment_issues (event_id, kind, stripe_session_id, booking_id, note, created_at)
    values (e.id, 'over_capacity', p_session_id, b.id,
            'Payment arrived after the hold had gone and took the list over capacity. The booking stands.', p_now);
  end if;

  perform emerge_enqueue_email(e.id, 'confirmation', g.email, g.id, b.id,
    jsonb_build_object('name', g.name, 'reference', b.reference, 'pass_token', b.pass_token,
                       'invitations', v_invites, 'transferred', false),
    'confirmation:' || b.id, p_now);

  return jsonb_build_object('result', 'confirmed', 'booking_id', b.id, 'reference', b.reference);
end $$;

-- ---------------------------------------------------------- waiting list

create or replace function emerge_offer_window(e events, p_now timestamptz)
returns interval language sql immutable as $$
  select case when e.sales_end - p_now <= interval '48 hours' then interval '2 hours' else interval '24 hours' end
$$;

-- Offers every free place to the next person in line. An offer must leave
-- at least 30 minutes before checkouts stop at the cutoff, so it can always
-- be used before sales end.
create or replace function emerge_issue_offers(p_event text, p_now timestamptz default now())
returns int language plpgsql volatile as $$
declare
  e events;
  w waitlist_entries;
  g guests;
  v_deadline timestamptz;
  v_token text;
  v_hold uuid;
  issued int := 0;
begin
  select * into e from events where id = p_event for update;
  loop
    exit when emerge_taken(p_event, p_now) >= e.capacity;
    v_deadline := least(p_now + emerge_offer_window(e, p_now), e.checkout_cutoff);
    exit when v_deadline - p_now < interval '30 minutes';

    select * into w from waitlist_entries
     where event_id = p_event and status = 'waiting'
     order by position limit 1 for update skip locked;
    exit when not found;

    select * into g from guests where id = w.guest_id;
    if exists (select 1 from bookings where guest_id = g.id and status = 'confirmed') then
      update waitlist_entries set status = 'converted' where id = w.id;
      continue;
    end if;

    v_token := emerge_token();
    insert into holds (event_id, guest_id, kind, expires_at, waitlist_entry_id, created_at)
    values (p_event, g.id, 'offer', v_deadline, w.id, p_now)
    returning id into v_hold;

    update waitlist_entries
       set status = 'offered', offer_token = v_token, offered_at = p_now, offer_deadline = v_deadline
     where id = w.id;

    perform emerge_enqueue_email(p_event, 'waitlist_offer', g.email, g.id, null,
      jsonb_build_object('name', g.name, 'offer_token', v_token, 'deadline', v_deadline),
      'offer:' || w.id, p_now);
    issued := issued + 1;
  end loop;
  return issued;
end $$;

create or replace function emerge_join_waitlist(
  p_event text, p_name text, p_email text, p_age_confirmed boolean,
  p_marketing boolean default false, p_now timestamptz default now()
) returns jsonb language plpgsql volatile as $$
declare
  e events;
  g guests;
  w waitlist_entries;
  v_email text := emerge_clean_email(p_email);
begin
  if coalesce(p_age_confirmed, false) is not true then return jsonb_build_object('result', 'age_required'); end if;
  if length(btrim(coalesce(p_name, ''))) = 0 or length(p_name) > 100 then return jsonb_build_object('result', 'invalid_name'); end if;
  if not emerge_valid_email(v_email) then return jsonb_build_object('result', 'invalid_email'); end if;

  select * into e from events where id = p_event for update;
  if p_now >= e.checkout_cutoff then return jsonb_build_object('result', 'closed'); end if;

  g := emerge_upsert_guest(p_event, p_name, v_email, p_marketing, p_now);
  if exists (select 1 from bookings where guest_id = g.id and status = 'confirmed') then
    return jsonb_build_object('result', 'already_booked');
  end if;

  select * into w from waitlist_entries where guest_id = g.id;
  if found and w.status in ('waiting','offered') then
    return jsonb_build_object('result', 'already_waiting');
  end if;

  if emerge_taken(p_event, p_now) < e.capacity
     and not exists (select 1 from waitlist_entries where event_id = p_event and status = 'waiting') then
    return jsonb_build_object('result', 'available');
  end if;

  if found then
    -- Rejoining after an offer lapsed goes to the back of the line.
    delete from waitlist_entries where id = w.id;
  end if;
  insert into waitlist_entries (event_id, guest_id, created_at) values (p_event, g.id, p_now) returning * into w;

  perform emerge_enqueue_email(p_event, 'waitlist_joined', g.email, g.id, null,
    jsonb_build_object('name', g.name), 'waitlist_joined:' || w.id, p_now);
  perform emerge_issue_offers(p_event, p_now);
  return jsonb_build_object('result', 'waiting', 'entry_id', w.id);
end $$;

-- The offer link: hands back the place held for this person, ready for Stripe.
create or replace function emerge_start_offer_checkout(p_offer_token text, p_now timestamptz default now())
returns jsonb language plpgsql volatile as $$
declare
  e events;
  w waitlist_entries;
  g guests;
  h holds;
  v_stripe_exp timestamptz;
begin
  select * into w from waitlist_entries where offer_token = p_offer_token;
  if not found then return jsonb_build_object('result', 'invalid'); end if;
  select * into e from events where id = w.event_id for update;
  select * into w from waitlist_entries where id = w.id;
  select * into g from guests where id = w.guest_id;

  if w.status = 'converted' then return jsonb_build_object('result', 'already_booked'); end if;
  if w.status <> 'offered' or w.offer_deadline <= p_now or p_now >= e.checkout_cutoff then
    return jsonb_build_object('result', 'expired');
  end if;

  select * into h from holds where waitlist_entry_id = w.id and status = 'active' order by created_at desc limit 1;
  if not found then return jsonb_build_object('result', 'expired'); end if;

  if h.stripe_session_id is not null and h.stripe_expires_at > p_now then
    return jsonb_build_object('result', 'existing', 'hold_id', h.id,
      'session_id', h.stripe_session_id, 'session_url', h.stripe_session_url);
  end if;

  v_stripe_exp := emerge_stripe_expiry(e, p_now);
  update holds set stripe_session_id = null, stripe_session_url = null, stripe_expires_at = v_stripe_exp,
         expires_at = greatest(w.offer_deadline, v_stripe_exp + make_interval(mins => e.hold_grace_minutes))
   where id = h.id;

  return jsonb_build_object('result', 'held', 'hold_id', h.id, 'guest_id', g.id, 'email', g.email,
    'name', g.name, 'stripe_expires_at', v_stripe_exp, 'price_pence', e.price_pence);
end $$;

-- -------------------------------------------------------------- transfers

create or replace function emerge_request_transfer(
  p_booking uuid, p_to_name text, p_to_email text, p_by_organiser boolean default false,
  p_now timestamptz default now()
) returns jsonb language plpgsql volatile as $$
declare
  e events;
  b bookings;
  g guests;
  t transfers;
  v_email text := emerge_clean_email(p_to_email);
begin
  select * into b from bookings where id = p_booking;
  if not found or b.status <> 'confirmed' then return jsonb_build_object('result', 'invalid'); end if;
  select * into e from events where id = b.event_id for update;
  if p_now >= e.sales_end then return jsonb_build_object('result', 'closed'); end if;
  if length(btrim(coalesce(p_to_name, ''))) = 0 or length(p_to_name) > 100 then return jsonb_build_object('result', 'invalid_name'); end if;
  if not emerge_valid_email(v_email) then return jsonb_build_object('result', 'invalid_email'); end if;

  select * into g from guests where id = b.guest_id;
  if g.email = v_email then return jsonb_build_object('result', 'same_person'); end if;
  if exists (select 1 from bookings bk join guests gg on gg.id = bk.guest_id
              where bk.event_id = e.id and bk.status = 'confirmed' and gg.email = v_email) then
    return jsonb_build_object('result', 'already_booked');
  end if;
  if exists (select 1 from transfers where booking_id = b.id and status = 'pending') then
    return jsonb_build_object('result', 'pending_exists');
  end if;

  insert into transfers (event_id, booking_id, to_name, to_email, accept_token, by_organiser, created_at)
  values (e.id, b.id, btrim(p_to_name), v_email, emerge_token(), coalesce(p_by_organiser, false), p_now)
  returning * into t;

  perform emerge_enqueue_email(e.id, 'transfer_offer', v_email, null, b.id,
    jsonb_build_object('to_name', t.to_name, 'from_name', g.name, 'accept_token', t.accept_token,
                       'deadline', e.sales_end),
    'transfer_offer:' || t.id, p_now);
  return jsonb_build_object('result', 'pending', 'transfer_id', t.id, 'accept_token', t.accept_token);
end $$;

create or replace function emerge_request_transfer_by_pass(
  p_pass_token text, p_to_name text, p_to_email text, p_now timestamptz default now()
) returns jsonb language plpgsql volatile as $$
declare v_booking uuid;
begin
  select id into v_booking from bookings where pass_token = p_pass_token and status = 'confirmed';
  if v_booking is null then return jsonb_build_object('result', 'invalid'); end if;
  return emerge_request_transfer(v_booking, p_to_name, p_to_email, false, p_now);
end $$;

create or replace function emerge_cancel_transfer(p_booking uuid, p_now timestamptz default now())
returns boolean language plpgsql volatile as $$
begin
  update transfers set status = 'cancelled', resolved_at = p_now
   where booking_id = p_booking and status = 'pending';
  return found;
end $$;

create or replace function emerge_accept_transfer(
  p_accept_token text, p_age_confirmed boolean, p_marketing boolean default false,
  p_now timestamptz default now()
) returns jsonb language plpgsql volatile as $$
declare
  e events;
  t transfers;
  old_b bookings;
  old_g guests;
  g guests;
  b bookings;
begin
  if coalesce(p_age_confirmed, false) is not true then return jsonb_build_object('result', 'age_required'); end if;
  select * into t from transfers where accept_token = p_accept_token;
  if not found then return jsonb_build_object('result', 'invalid'); end if;
  select * into e from events where id = t.event_id for update;
  select * into t from transfers where id = t.id for update;
  if t.status = 'accepted' then
    return jsonb_build_object('result', 'already_accepted', 'booking_id', t.new_booking_id);
  end if;
  if t.status <> 'pending' then return jsonb_build_object('result', t.status); end if;
  if p_now >= e.sales_end then return jsonb_build_object('result', 'lapsed'); end if;

  select * into old_b from bookings where id = t.booking_id for update;
  if old_b.status <> 'confirmed' then return jsonb_build_object('result', 'invalid'); end if;
  select * into old_g from guests where id = old_b.guest_id;

  g := emerge_upsert_guest(e.id, t.to_name, t.to_email, p_marketing, p_now);
  if exists (select 1 from bookings where guest_id = g.id and status = 'confirmed') then
    return jsonb_build_object('result', 'already_booked');
  end if;

  update bookings set status = 'transferred', pass_token = null where id = old_b.id;

  insert into bookings (event_id, guest_id, reference, status, amount_pence, pass_token,
                        invited_by_booking_id, transferred_from_id, created_at)
  values (e.id, g.id, emerge_reference(), 'confirmed', old_b.amount_pence, emerge_token(),
          old_b.invited_by_booking_id, old_b.id, p_now)
  returning * into b;

  update transfers set status = 'accepted', resolved_at = p_now, new_booking_id = b.id where id = t.id;

  -- Invitation links stay with the person who was sent them, so the new
  -- guest gets their place and their own "Pass it on" link, not new invites.
  perform emerge_enqueue_email(e.id, 'confirmation', g.email, g.id, b.id,
    jsonb_build_object('name', g.name, 'reference', b.reference, 'pass_token', b.pass_token,
                       'invitations', '[]'::jsonb, 'transferred', true, 'from_name', old_g.name),
    'confirmation:' || b.id, p_now);
  perform emerge_enqueue_email(e.id, 'transfer_complete', old_g.email, old_g.id, old_b.id,
    jsonb_build_object('name', old_g.name, 'to_name', g.name, 'old_reference', old_b.reference),
    'transfer_complete:' || t.id, p_now);

  return jsonb_build_object('result', 'accepted', 'booking_id', b.id, 'reference', b.reference);
end $$;

-- From the organiser view. With p_age_checked the organiser has confirmed the
-- new guest is 18 or over and the transfer completes at once.
create or replace function emerge_organiser_transfer(
  p_booking uuid, p_to_name text, p_to_email text, p_age_checked boolean,
  p_now timestamptz default now()
) returns jsonb language plpgsql volatile as $$
declare r jsonb;
begin
  perform emerge_cancel_transfer(p_booking, p_now);
  r := emerge_request_transfer(p_booking, p_to_name, p_to_email, true, p_now);
  if r->>'result' <> 'pending' or not coalesce(p_age_checked, false) then return r; end if;
  return emerge_accept_transfer(r->>'accept_token', true, false, p_now);
end $$;

-- ------------------------------------------------------------ door, GDPR

create or replace function emerge_check_in(p_booking uuid, p_in boolean, p_now timestamptz default now())
returns boolean language plpgsql volatile as $$
begin
  update bookings set checked_in_at = case when p_in then coalesce(checked_in_at, p_now) end
   where id = p_booking and status = 'confirmed';
  return found;
end $$;

create or replace function emerge_anonymise_guest(p_guest uuid, p_now timestamptz default now())
returns boolean language plpgsql volatile as $$
declare g guests;
begin
  select * into g from guests where id = p_guest for update;
  if not found then return false; end if;
  update guests set name = 'Removed guest', email = 'removed-' || id || '@invalid',
         marketing_consent = false, marketing_consent_at = null, age_confirmed_at = null,
         unsubscribe_token = emerge_token(), anonymised_at = p_now
   where id = p_guest;
  update email_log set to_email = 'removed@invalid', payload = '{}'::jsonb,
         status = case when status in ('queued','failed','sending') then 'dead' else status end
   where guest_id = p_guest or to_email = g.email;
  update transfers set to_name = 'Removed guest', to_email = 'removed@invalid'
   where to_email = g.email and event_id = g.event_id;
  return true;
end $$;

create or replace function emerge_unsubscribe(p_token text, p_now timestamptz default now())
returns boolean language plpgsql volatile as $$
begin
  update guests set marketing_consent = false, marketing_consent_at = null where unsubscribe_token = p_token;
  return found;
end $$;

-- ------------------------------------------------------------- the tick

-- Runs every minute. Correctness never depends on it (live holds are judged
-- by expires_at), but it sends the emails that follow from time passing:
-- expired offers, new offers, lapsed transfers, and retention.
create or replace function emerge_tick(p_event text, p_now timestamptz default now())
returns jsonb language plpgsql volatile as $$
declare
  e events;
  r record;
  n_holds int := 0;
  n_offers_expired int := 0;
  n_transfers int := 0;
  n_offers int;
  n_anon int := 0;
begin
  select * into e from events where id = p_event for update;

  update holds set status = 'expired', resolved_at = p_now
   where event_id = p_event and status = 'active' and kind = 'checkout' and expires_at <= p_now;
  get diagnostics n_holds = row_count;

  for r in
    update holds h set status = 'expired', resolved_at = p_now
     where h.event_id = p_event and h.status = 'active' and h.kind = 'offer' and h.expires_at <= p_now
    returning h.waitlist_entry_id, h.guest_id
  loop
    update waitlist_entries set status = 'expired' where id = r.waitlist_entry_id and status = 'offered';
    perform emerge_enqueue_email(p_event, 'offer_expired', g.email, g.id, null,
              jsonb_build_object('name', g.name), 'offer_expired:' || r.waitlist_entry_id, p_now)
       from guests g where g.id = r.guest_id;
    n_offers_expired := n_offers_expired + 1;
  end loop;

  if p_now >= e.sales_end then
    for r in
      update transfers set status = 'lapsed', resolved_at = p_now
       where event_id = p_event and status = 'pending'
      returning id, booking_id, to_name
    loop
      perform emerge_enqueue_email(p_event, 'transfer_lapsed', g.email, g.id, b.id,
                jsonb_build_object('name', g.name, 'to_name', r.to_name, 'reference', b.reference),
                'transfer_lapsed:' || r.id, p_now)
         from bookings b join guests g on g.id = b.guest_id where b.id = r.booking_id;
      n_transfers := n_transfers + 1;
    end loop;
    -- Offers still out when sales end are closed without another email.
    update waitlist_entries set status = 'expired' where event_id = p_event and status = 'offered';
  end if;

  n_offers := emerge_issue_offers(p_event, p_now);

  if p_now >= e.ends_at + make_interval(days => e.retention_days) then
    for r in select id from guests where event_id = p_event and not marketing_consent and anonymised_at is null loop
      perform emerge_anonymise_guest(r.id, p_now);
      n_anon := n_anon + 1;
    end loop;
  end if;

  return jsonb_build_object('holds_expired', n_holds, 'offers_expired', n_offers_expired,
    'transfers_lapsed', n_transfers, 'offers_issued', n_offers, 'anonymised', n_anon);
end $$;

-- ------------------------------------------------------------ email queue

create or replace function emerge_claim_emails(p_limit int default 20, p_now timestamptz default now())
returns setof email_log language sql volatile as $$
  update email_log set status = 'sending', locked_at = p_now, attempts = attempts + 1
   where id in (
     select id from email_log
      where (status in ('queued','failed') and next_attempt_at <= p_now)
         or (status = 'sending' and locked_at < p_now - interval '10 minutes')
      order by created_at
      limit p_limit
      for update skip locked)
  returning *
$$;

create or replace function emerge_email_sent(p_id uuid, p_provider_id text, p_now timestamptz default now())
returns void language sql volatile as $$
  update email_log set status = 'sent', provider_id = p_provider_id, sent_at = p_now,
         locked_at = null, last_error = null
   where id = p_id
$$;

-- Backoff: 1, 5, 15, 60, 240 minutes. After the sixth attempt it is flagged
-- in the organiser view for a one-click resend.
create or replace function emerge_email_failed(p_id uuid, p_error text, p_now timestamptz default now())
returns void language sql volatile as $$
  update email_log set
    status = case when attempts >= 6 then 'dead' else 'failed' end,
    last_error = left(p_error, 1000),
    locked_at = null,
    next_attempt_at = p_now + (array[1,5,15,60,240,240])[least(greatest(attempts,1),6)] * interval '1 minute'
   where id = p_id
$$;

create or replace function emerge_email_resend(p_id uuid, p_now timestamptz default now())
returns boolean language plpgsql volatile as $$
begin
  update email_log set status = 'queued', attempts = 0, next_attempt_at = p_now, last_error = null
   where id = p_id and to_email <> 'removed@invalid';
  return found;
end $$;

-- ----------------------------------------------------------------- access

-- Row-level security on every table. The site reads and writes through the
-- service role on the server only; the browser never holds a key that can
-- read guest data. Organisers are checked on the server against `organisers`.
do $$
declare t text;
begin
  foreach t in array array['events','guests','bookings','invitations','waitlist_entries','holds',
                           'transfers','email_log','payment_issues','organisers'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on table %I from public', t);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table %I from anon, authenticated', t);
    end if;
  end loop;
end $$;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'emerge\_%'
  loop
    execute format('revoke all on function %s from public', f.sig);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %s from anon, authenticated', f.sig);
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', f.sig);
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------------ seed

insert into events (id, name, starts_at, ends_at, capacity, price_pence,
                    checkout_cutoff, sales_end, holding_from)
values ('maidenhead-2026-11', 'Emerge · Maidenhead',
        '2026-11-27 20:30 Europe/London', '2026-11-28 00:30 Europe/London',
        100, 1500,
        '2026-11-27 17:30 Europe/London', '2026-11-27 18:00 Europe/London',
        '2026-11-28 00:30 Europe/London')
on conflict (id) do nothing;
