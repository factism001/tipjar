-- Fix ambiguous column reference in upsert_tip_from_webhook
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
  if p_tip_scope not in ('video','profile') then
    raise exception 'invalid tip_scope: %', p_tip_scope;
  end if;
  if p_tip_scope = 'profile' and p_video_id is not null then
    raise exception 'profile tip must have null video_id';
  end if;
  if p_tip_scope = 'video' and p_video_id is null then
    raise exception 'video tip must have non-null video_id';
  end if;
  select count(*) into v_prior_count
  from webhook_events
  where paystack_ref = p_paystack_ref
    and created_at > now() - interval '24 hours';
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
    update tips
    set status = case when p_event_type in ('success','failed','pending') then p_event_type::tip_status else tips.status end,
        tipper_name = coalesce(tips.tipper_name, p_tipper_name),
        tipper_handle = coalesce(tips.tipper_handle, p_tipper_handle),
        tipper_email = coalesce(tips.tipper_email, p_tipper_email),
        message = coalesce(tips.message, p_message)
    where paystack_ref = p_paystack_ref
      and tips.status = 'pending'
    returning id, tips.status::text into v_tip_id, v_status;
    select id, tips.status::text, tips.net_amount, tips.platform_fee
    into v_tip_id, v_status, v_net_amount, v_platform_fee
    from tips
    where paystack_ref = p_paystack_ref;
    if v_prior_count > 2 then
      update tips set status = 'failed'
      where paystack_ref = p_paystack_ref and tips.status = 'pending';
      select tips.status::text into v_status from tips where paystack_ref = p_paystack_ref;
    end if;
  end;
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
