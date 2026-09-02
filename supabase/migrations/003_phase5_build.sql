-- TipJar Phase 5 Build Migration — 003_phase5_build.sql
-- Supabase Postgres — idempotent, strict RLS, views, functions, indexes
-- Depends on: tipjar-phase1-schema.sql (001) + tipjar-phase2-migration.sql (002)
-- Fixes Phase 2 bugs (p_amount_kubo typo, invalid DENY syntax, duplicate policies)
-- Run: supabase db push / psql < this file

-- ============================================================
-- 0. Extensions / sanity
-- ============================================================
create extension if not exists pgcrypto;

-- ============================================================
-- 1. Schema — ensure all Phase 3/4 columns exist (additive only)
-- ============================================================

-- creators: phone + phone_confirmed_at (Phase 2) — verified for Phase 5
alter table creators
  add column if not exists phone text,
  add column if not exists phone_confirmed_at timestamptz,
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists tiktok_id text;

-- enforce unique phone where not null (partial unique index is safer than column constraint for nulls)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'creators_phone_unique') then
    -- use index not constraint for idempotency
    create unique index if not exists idx_creators_phone_unique on creators(phone) where phone is not null;
  end if;
exception when duplicate_object then null; end $$;

-- videos: published flag (Phase 2) + Phase 3/4 display columns
alter table videos
  add column if not exists published bool default true,
  add column if not exists tip_page_slug text,
  add column if not exists caption text,
  add column if not exists thumbnail_url text,
  add column if not exists view_count int default 0,
  add column if not exists detected_at timestamptz default now();

-- ensure tip_page_slug unique where not null
create unique index if not exists idx_videos_tip_page_slug_unique on videos(tip_page_slug) where tip_page_slug is not null;
create unique index if not exists idx_videos_tiktok_video_id_unique on videos(tiktok_video_id) where tiktok_video_id is not null;

-- tips: phone-era columns already present; ensure all exist
alter table tips
  add column if not exists tip_scope text,
  add column if not exists tipper_name text,
  add column if not exists tipper_handle text,
  add column if not exists tipper_email text,
  add column if not exists message text,
  add column if not exists is_anonymous bool default false,
  add column if not exists status tip_status not null default 'pending',
  add column if not exists net_amount int,
  add column if not exists platform_fee int;

-- webhook_events: Phase 2 additions
alter table webhook_events
  add column if not exists event_type text,
  add column if not exists amount_kobo int,
  add column if not exists ip_address inet,
  add column if not exists retry_count int default 0;

-- ratelimits table (Phase 2)
create table if not exists ratelimits (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  key_type text not null,
  request_at timestamptz not null default now()
);

-- ============================================================
-- 2. Constraints — tighten without breaking existing data
-- ============================================================

-- tips.amount max ₦50k (5_000_000 kobo) — drop old loose check then add
do $$ begin
  alter table tips drop constraint if exists tips_amount_check;
  alter table tips add constraint tips_amount_check check (amount > 0 and amount <= 5000000);
exception when others then null; end $$;

-- tips.tip_scope check
do $$ begin
  alter table tips drop constraint if exists tips_tip_scope_check;
  alter table tips add constraint tips_tip_scope_check check (tip_scope in ('video','profile'));
exception when others then null; end $$;

do $$ begin
  alter table tips drop constraint if exists tip_scope_check;
  alter table tips add constraint tip_scope_check check (
    (tip_scope = 'profile' and video_id is null) or
    (tip_scope = 'video' and video_id is not null)
  );
exception when others then null; end $$;

-- ============================================================
-- 3. RLS — enable on all tables, then strict policies
-- ============================================================

alter table creators enable row level security;
alter table videos enable row level security;
alter table tips enable row level security;
alter table webhook_events enable row level security;
alter table tiktok_tokens enable row level security;
alter table poller_state enable row level security;
alter table ratelimits enable row level security;

-- ------------------------------------------------------------
-- 3a. tips — anon INSERT only, NO SELECT for anon
-- ------------------------------------------------------------
-- Drop any permissive anon SELECT policies from Phase 1/2
drop policy if exists "anon_insert_tips" on tips;
drop policy if exists "anon_insert_tips_only" on tips;
drop policy if exists "public_select_tips" on tips;
drop policy if exists "anon_select_tips" on tips;

-- Revoke table-level SELECT from anon (belt and suspenders — RLS still governs)
revoke select on tips from anon;

-- Strict: anon can only INSERT
create policy "anon_insert_tips_only"
  on tips for insert to anon
  with check (true);

-- Authenticated creators can SELECT own tips only
drop policy if exists "creator_select_own_tips" on tips;
create policy "creator_select_own_tips"
  on tips for select to authenticated
  using (auth.uid() = creator_id);

-- No other anon/authenticated policies on tips => deny by default for webhook_events read etc.

-- ------------------------------------------------------------
-- 3b. creators — anon SELECT public columns only
-- ------------------------------------------------------------
-- Phase 1 had "public_select_creators" using (true) exposing all columns.
-- Phase 5 hardens: drop permissive, replace with anon policy but restrict via view + revoke.
drop policy if exists "public_select_creators" on creators;
drop policy if exists "anon_select_creators_public" on creators;

-- Anon can SELECT creators but app MUST use creators_public view or filter columns.
-- Policy still USING true (row-level), column-level protection is via view + application.
-- We revoke sensitive columns from anon at table level where supported via column grants.
-- Postgres: revoke all then grant only safe columns to anon.
revoke all on creators from anon;
grant select (id, handle, display_name, avatar_url, tiktok_id, created_at) on creators to anon;
grant select on creators to authenticated; -- creators see own row fully via separate policy

-- Recreate anon policy for safe row access (column grants do the filtering)
create policy "anon_select_creators_public"
  on creators for select to anon
  using (true);

-- Authenticated can select own full row (bank etc.)
drop policy if exists "creator_select_own_profile" on creators;
create policy "creator_select_own_profile"
  on creators for select to authenticated
  using (auth.uid() = id);

-- Authenticated can update own row
drop policy if exists "creator_update_own_profile" on creators;
create policy "creator_update_own_profile"
  on creators for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Public view for frontend (ensures no bank/phone leakage even if policy misconfigured)
create or replace view creators_public as
  select id, handle, display_name, avatar_url, tiktok_id, created_at
  from creators;

-- ------------------------------------------------------------
-- 3c. videos — anon SELECT published only
-- ------------------------------------------------------------
drop policy if exists "public_select_videos" on videos;
drop policy if exists "anon_select_videos_published" on videos;

revoke all on videos from anon;
grant select on videos to anon;
grant select on videos to authenticated;

create policy "anon_select_videos_published"
  on videos for select to anon
  using (published = true);

drop policy if exists "creator_select_own_videos" on videos;
create policy "creator_select_own_videos"
  on videos for select to authenticated
  using (auth.uid() = creator_id);

drop policy if exists "creator_insert_own_videos" on videos;
create policy "creator_insert_own_videos"
  on videos for insert to authenticated
  with check (auth.uid() = creator_id);

-- Service/poller inserts via service_role bypass; no anon insert.
revoke insert, update, delete on videos from anon;

-- ------------------------------------------------------------
-- 3d. tiktok_tokens / poller_state / webhook_events / ratelimits — service_role only
-- ------------------------------------------------------------
-- Goal: NO anon or authenticated policies => denied by default.
-- service_role bypasses RLS in Supabase, so no policy needed.
-- Remove any anon/authenticated policies that may have been created.

-- tiktok_tokens
drop policy if exists "creator_select_own_tokens" on tiktok_tokens;
drop policy if exists "anon_select_tokens" on tiktok_tokens;
drop policy if exists "anon_insert_tokens" on tiktok_tokens;
revoke all on tiktok_tokens from anon, authenticated;

-- poller_state
drop policy if exists "anon_select_poller" on poller_state;
drop policy if exists "anon_insert_poller" on poller_state;
drop policy if exists "creator_select_own_poller" on poller_state;
revoke all on poller_state from anon, authenticated;

-- webhook_events
drop policy if exists "anon_select_webhook" on webhook_events;
drop policy if exists "anon_insert_webhook" on webhook_events;
revoke all on webhook_events from anon, authenticated;

-- ratelimits — service_role only as well (edge functions use service_role)
revoke all on ratelimits from anon, authenticated;
-- No policies => anon/authenticated get 0 rows; service_role bypasses.

-- ------------------------------------------------------------
-- 3e. Harden Phase 2 invalid DENY syntax (no-op clean)
-- ------------------------------------------------------------
-- Phase 2 had: deny insert, update, delete on tiktok_tokens to authenticated;
-- That is invalid Postgres (MSSQL syntax) — revocation above replaces it correctly.

-- ============================================================
-- 4. Views — tips_masked (masks is_anonymous), creators helpers
-- ============================================================

-- tips_masked: masks PII when is_anonymous = true
-- - tipper_email => '[anonymous]' when anon
-- - tipper_name/handle => null when anon (so frontend cannot leak)
-- - message stays but is_anonymous flag preserved for logic
-- - show_tipper_info helper boolean
create or replace view tips_masked as
  select
    id,
    video_id,
    creator_id,
    amount,
    net_amount,
    platform_fee,
    paystack_ref,
    tip_scope,
    case when is_anonymous then null else tipper_name end as tipper_name,
    case when is_anonymous then null else tipper_handle end as tipper_handle,
    case when is_anonymous then '[anonymous]' else tipper_email end as tipper_email,
    case when is_anonymous then false else true end as show_tipper_info,
    message,
    is_anonymous,
    status,
    created_at
  from tips;

-- Ensure anon has NO direct select on tips_masked either (rely on authenticated creator flow)
revoke all on tips_masked from anon;
grant select on tips_masked to authenticated;

-- creators_unverified_phones (Phase 2 helper) — restrict to authenticated + service_role
create or replace view creators_unverified_phones as
  select id, handle, display_name, phone, phone_confirmed_at
  from creators
  where phone is not null and phone_confirmed_at is null;

revoke all on creators_unverified_phones from anon;
grant select on creators_unverified_phones to authenticated;

-- ============================================================
-- 5. Functions — check_rate_limit + upsert_tip_from_webhook (fixed)
-- ============================================================

-- 5a. check_rate_limit(identifier, key_type, max_count, window_seconds)
-- Returns true if within limit, false if exceeded. Logs request on success.
create or replace function check_rate_limit(
  p_key text,
  p_key_type text default 'ip',
  p_max_count int default 5,
  p_window_seconds int default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- Lazy sweep of old entries (>1 hour) with low probability to avoid every-call delete
  delete from ratelimits
  where request_at < now() - interval '1 hour'
    and random() < 0.001;

  select count(*) into v_count
  from ratelimits
  where "key" = p_key
    and key_type = p_key_type
    and request_at > now() - (p_window_seconds || ' seconds')::interval;

  if v_count >= p_max_count then
    return false;
  end if;

  insert into ratelimits ("key", key_type)
  values (p_key, p_key_type);

  return true;
end;
$$;

revoke all on function check_rate_limit(text, text, int, int) from anon, authenticated;
grant execute on function check_rate_limit(text, text, int, int) to service_role;
grant execute on function check_rate_limit(text, text, int, int) to anon, authenticated; -- edge functions call as anon

-- 5b. upsert_tip_from_webhook — idempotent, pending-only update, suspicious retry guard
-- Fixed: p_amount_kubo typo -> p_amount_kobo
create or replace function upsert_tip_from_webhook(
  p_paystack_ref text,
  p_amount_kobo int,
  p_creator_id uuid,
  p_video_id uuid default null,
  p_tipper_name text default null,
  p_tipper_handle text default null,
  p_tipper_email text default null,
  p_message text default null,
  p_is_anonymous boolean default false,
  p_tip_scope text default 'video',
  p_event_type text default 'success',
  p_ip_address inet default null,
  p_payload jsonb default '{}'::jsonb
)
returns table (
  tip_id uuid,
  status text,
  net_amount int,
  platform_fee int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tip_id uuid;
  v_status text;
  v_net_amount int;
  v_platform_fee int;
  v_prior_count int;
begin
  -- Validate tip_scope
  if p_tip_scope not in ('video','profile') then
    raise exception 'invalid tip_scope: %', p_tip_scope;
  end if;
  if p_tip_scope = 'profile' and p_video_id is not null then
    raise exception 'profile tip must have null video_id';
  end if;
  if p_tip_scope = 'video' and p_video_id is null then
    raise exception 'video tip must have non-null video_id';
  end if;

  -- Count prior webhook events for this ref in last 24h (suspicious retry)
  select count(*) into v_prior_count
  from webhook_events
  where paystack_ref = p_paystack_ref
    and created_at > now() - interval '24 hours';

  -- Calculate split: 10% platform, 90% creator (paystack 1.5% + ₦100 handled at payout)
  v_platform_fee := (p_amount_kobo * 0.10)::int;
  v_net_amount := p_amount_kobo - v_platform_fee;

  begin
    insert into tips (
      paystack_ref, creator_id, video_id, amount,
      net_amount, platform_fee, tip_scope,
      tipper_name, tipper_handle, tipper_email,
      message, is_anonymous, status
    ) values (
      p_paystack_ref, p_creator_id, p_video_id, p_amount_kobo,
      v_net_amount, v_platform_fee, p_tip_scope,
      p_tipper_name, p_tipper_handle, p_tipper_email,
      p_message, p_is_anonymous, 'pending'
    )
    returning id, tips.status::text into v_tip_id, v_status;

  exception when unique_violation then
    -- Duplicate paystack_ref: only update if still pending (idempotency)
    update tips
    set status = case when p_event_type in ('success','failed','pending') then p_event_type::tip_status else status end,
        tipper_name = coalesce(tips.tipper_name, p_tipper_name),
        tipper_handle = coalesce(tips.tipper_handle, p_tipper_handle),
        tipper_email = coalesce(tips.tipper_email, p_tipper_email),
        message = coalesce(tips.message, p_message)
    where paystack_ref = p_paystack_ref
      and status = 'pending'
    returning id, tips.status::text into v_tip_id, v_status;

    -- Fetch current values regardless
    select id, tips.status::text, tips.net_amount, tips.platform_fee
    into v_tip_id, v_status, v_net_amount, v_platform_fee
    from tips
    where paystack_ref = p_paystack_ref;

    -- Flag suspicious retry (>2 prior events in 24h) — mark failed if still pending
    if v_prior_count > 2 then
      update tips set status = 'failed'
      where paystack_ref = p_paystack_ref and status = 'pending';
      -- re-read after suspicious update
      select tips.status::text into v_status from tips where paystack_ref = p_paystack_ref;
    end if;
  end;

  -- Log webhook event (always) — hmac_valid=true here because route verifies HMAC first; mismatch logged separately as false in route.ts and never calls RPC
  insert into webhook_events (
    paystack_ref, payload, hmac_valid,
    event_type, amount_kobo, ip_address, retry_count
  ) values (
    p_paystack_ref, p_payload, true,
    p_event_type, p_amount_kobo, p_ip_address, coalesce(v_prior_count, 0)
  );

  return query select v_tip_id, v_status, v_net_amount, v_platform_fee;
end;
$$;

revoke all on function upsert_tip_from_webhook(text, int, uuid, uuid, text, text, text, text, boolean, text, text, inet, jsonb) from anon, authenticated;
grant execute on function upsert_tip_from_webhook(text, int, uuid, uuid, text, text, text, text, boolean, text, text, inet, jsonb) to service_role;

-- ============================================================
-- 6. Indexes — add if missing (idempotent)
-- ============================================================

create index if not exists idx_tips_creator_created on tips(creator_id, created_at desc);
create index if not exists idx_tips_paystack_ref on tips(paystack_ref);
create index if not exists idx_videos_creator on videos(creator_id);
create index if not exists idx_tips_video on tips(video_id);
create index if not exists idx_webhook_paystack_ref on webhook_events(paystack_ref);
create index if not exists idx_poller_last_checked on poller_state(last_checked_at);
create index if not exists idx_ratelimits_key_type on ratelimits("key", key_type);
create index if not exists idx_ratelimits_request_at on ratelimits(request_at);
create index if not exists idx_videos_published on videos(published) where published = true;
create index if not exists idx_creators_handle on creators(handle);
create index if not exists idx_creators_tiktok_id on creators(tiktok_id) where tiktok_id is not null;
create index if not exists idx_webhook_created_at on webhook_events(created_at desc);
create index if not exists idx_tips_status on tips(status);

-- ============================================================
-- 7. Phone column verification helper (raises notice on check)
-- ============================================================
do $$
declare
  v_has_phone bool;
  v_has_confirmed bool;
begin
  select exists(
    select 1 from information_schema.columns
    where table_name='creators' and column_name='phone'
  ) into v_has_phone;
  select exists(
    select 1 from information_schema.columns
    where table_name='creators' and column_name='phone_confirmed_at'
  ) into v_has_confirmed;
  if not v_has_phone or not v_has_confirmed then
    raise exception 'creators phone columns missing: phone=% phone_confirmed_at=%', v_has_phone, v_has_confirmed;
  else
    raise notice 'creators phone columns verified: phone + phone_confirmed_at exist';
  end if;
end $$;

-- ============================================================
-- 8. Re-assert RLS enabled (defensive)
-- ============================================================
alter table creators enable row level security;
alter table videos enable row level security;
alter table tips enable row level security;
alter table webhook_events enable row level security;
alter table tiktok_tokens enable row level security;
alter table poller_state enable row level security;
alter table ratelimits enable row level security;
