create table if not exists public.promo_codes (
  code          text primary key,
  campaign      text not null,
  grant_months  int  not null default 12,
  redeem_by     date not null,
  serial        int,
  redeemed_by   uuid references auth.users(id),
  redeemed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  id            uuid primary key default gen_random_uuid(),
  code          text not null references public.promo_codes(code),
  user_id       uuid not null references auth.users(id) on delete cascade,
  campaign      text not null,
  granted_until timestamptz not null,
  redeemed_at   timestamptz not null default now()
);

create unique index if not exists promo_one_per_user_per_campaign
  on public.promo_redemptions (user_id, campaign);

-- promo_codes: service role only (no anon/authenticated grants at all)
grant all on public.promo_codes to service_role;
grant all on public.promo_redemptions to service_role;
grant select on public.promo_redemptions to authenticated;

alter table public.promo_codes       enable row level security;
alter table public.promo_redemptions enable row level security;

drop policy if exists "Service role manages promo codes" on public.promo_codes;
create policy "Service role manages promo codes"
  on public.promo_codes for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Users read own promo redemptions" on public.promo_redemptions;
create policy "Users read own promo redemptions"
  on public.promo_redemptions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Service role manages promo redemptions" on public.promo_redemptions;
create policy "Service role manages promo redemptions"
  on public.promo_redemptions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.claim_promo_code(_code text, _user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code  public.promo_codes%rowtype;
  v_until timestamptz;
  v_sub_id text;
begin
  if _user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  select * into v_code
    from public.promo_codes
   where code = upper(btrim(_code))
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_code.redeemed_by is not null then
    if v_code.redeemed_by = _user_id then
      return jsonb_build_object('ok', false, 'error', 'already_claimed_by_user');
    end if;
    return jsonb_build_object('ok', false, 'error', 'already_redeemed');
  end if;

  if (now() at time zone 'utc')::date > v_code.redeem_by then
    return jsonb_build_object('ok', false, 'error', 'expired',
      'redeem_by', v_code.redeem_by);
  end if;

  if exists (
    select 1 from public.promo_redemptions
     where user_id = _user_id and campaign = v_code.campaign
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_claimed_by_user');
  end if;

  v_until := now() + make_interval(months => v_code.grant_months);

  update public.promo_codes
     set redeemed_by = _user_id, redeemed_at = now()
   where code = v_code.code;

  insert into public.promo_redemptions (code, user_id, campaign, granted_until)
  values (v_code.code, _user_id, v_code.campaign, v_until);

  v_sub_id := 'promo_' || v_code.code || '_' || _user_id::text;

  insert into public.subscriptions (
    user_id, stripe_subscription_id, stripe_customer_id,
    product_id, price_id, status,
    current_period_start, current_period_end,
    cancel_at_period_end, environment
  ) values (
    _user_id, v_sub_id, v_sub_id,
    'promo_' || v_code.campaign, 'promo_' || v_code.campaign, 'active',
    now(), v_until, false, 'live'
  )
  on conflict (stripe_subscription_id) do update
    set status = 'active',
        current_period_end = greatest(
          coalesce(public.subscriptions.current_period_end, now()),
          excluded.current_period_end),
        cancel_at_period_end = false,
        updated_at = now();

  return jsonb_build_object('ok', true, 'code', v_code.code,
    'campaign', v_code.campaign, 'granted_until', v_until);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'error', 'already_claimed_by_user');
end;
$$;

revoke all on function public.claim_promo_code(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_promo_code(text, uuid) to service_role;

insert into public.promo_codes (code, campaign, grant_months, redeem_by, serial)
values ('OBKC-20K-9A9P', 'obkc20k', 12, '2026-09-15', 1)
on conflict (code) do nothing;