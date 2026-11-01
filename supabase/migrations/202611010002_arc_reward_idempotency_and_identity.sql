begin;

-- Make reward writes replay-safe and make the tag claim reward part of the durable points balance.
-- All reward grants are server-side RPCs; browser clients cannot call the identity-enforcement RPC directly.

-- Silence duplicate unread tag-claim notices emitted by older retries while retaining their audit history.
with ranked_notices as (
  select id, row_number() over (partition by wallet_address, title, url order by created_at, id) as row_num
    from public.arc_reward_notifications
   where type = 'tag' and title = 'Your NairaTag is ready'
)
update public.arc_reward_notifications n set read_at = coalesce(n.read_at, now())
  from ranked_notices d where n.id = d.id and d.row_num > 1;

-- Repair tag rewards created by earlier migrations that wrote a ledger event but never updated balances.
update public.arc_reward_events set points = 20
 where event_type = 'tag_claimed' and points < 20 and idempotency_key like 'tag-claim:%';
insert into public.arc_reward_accounts(wallet_address)
 select distinct wallet_address from public.arc_reward_events where event_type = 'tag_claimed' and points > 0
 on conflict (wallet_address) do nothing;
with repaired as (
  insert into public.arc_reward_events(wallet_address, event_type, points, idempotency_key, metadata)
  select wallet_address, 'tag_claim_balance_repair', points,
         'tag-claim-balance-repair:' || substr(idempotency_key, length('tag-claim:') + 1), metadata
    from public.arc_reward_events where event_type = 'tag_claimed' and points > 0
  on conflict (wallet_address, idempotency_key) do nothing
  returning wallet_address, points
), totals as (
  select wallet_address, sum(points) as points from repaired group by wallet_address
)
update public.arc_reward_accounts a set points_balance = a.points_balance + totals.points, updated_at = now()
 from totals where a.wallet_address = totals.wallet_address;

create or replace function public.arc_enforce_claim(
  p_tag text,
  p_wallet text,
  p_email text default null,
  p_tx_hash text default null,
  p_auth_provider text default 'wallet',
  p_avatar_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean_tag text := lower(trim(regexp_replace(p_tag, '^[^a-zA-Z0-9]+', '')));
  v_wallet text := lower(trim(p_wallet));
  v_email text := nullif(lower(trim(p_email)), '');
  v_existing_email_claim record;
  v_existing_wallet_claim record;
  v_existing_tag_claim record;
  v_reward_inserted integer := 0;
begin
  -- 1. Validate tag format
  if v_clean_tag is null or length(v_clean_tag) < 3 or length(v_clean_tag) > 32 or v_clean_tag !~ '^[a-z0-9_]+$' then
    return jsonb_build_object('ok', false, 'error', 'NairaTag must be 3-32 characters (letters, numbers, underscores).');
  end if;

  -- 2. Reject reserved protocol agent names for regular users
  if v_clean_tag in ('nairatag', 'bloom', 'defillama', 'meteo', 'coingecko', 'arc') then
    if (v_clean_tag = 'bloom' and v_wallet <> '0x7c26a1f03339e2ea74d261d97f5ab9c38181af26') or
       (v_clean_tag = 'nairatag' and v_wallet <> '0x653f773c9062e71a6554b42a9525fcd47fcc1693') then
      return jsonb_build_object('ok', false, 'error', format('%s%s is an official sovereign protocol agent on Arc.', chr(8358), upper(v_clean_tag)));
    end if;
  end if;

  -- 3. Check if this tag is already claimed by someone else
  select * into v_existing_tag_claim from public.arc_claims where lower(tag) = v_clean_tag;
  if v_existing_tag_claim.id is not null and lower(v_existing_tag_claim.wallet_address) <> v_wallet then
    return jsonb_build_object('ok', false, 'error', format('%s%s has already been claimed on Arc.', chr(8358), upper(v_clean_tag)));
  end if;

  -- 4. Check if this wallet already claimed a DIFFERENT tag
  select * into v_existing_wallet_claim from public.arc_claims where lower(wallet_address) = v_wallet;
  if v_existing_wallet_claim.id is not null and lower(v_existing_wallet_claim.tag) <> v_clean_tag then
    return jsonb_build_object('ok', false, 'error', format('This wallet already owns %s%s. Limit is strictly 1 NairaTag per account.', chr(8358), upper(v_existing_wallet_claim.tag)));
  end if;

  -- 5. Check if this email already claimed a DIFFERENT tag
  if v_email is not null and v_email <> '' then
    select * into v_existing_email_claim from public.arc_claims where lower(email) = v_email;
    if v_existing_email_claim.id is not null and (lower(v_existing_email_claim.tag) <> v_clean_tag or lower(v_existing_email_claim.wallet_address) <> v_wallet) then
      return jsonb_build_object('ok', false, 'error', format('This email address (%s) already claimed %s%s. Limit is strictly 1 NairaTag per account.', v_email, chr(8358), upper(v_existing_email_claim.tag)));
    end if;
  end if;

  -- 6. Insert or update the claim in arc_claims
  insert into public.arc_claims (tag, wallet_address, email, auth_provider, tx_hash, avatar_url, claimed_at)
  values (v_clean_tag, v_wallet, v_email, coalesce(p_auth_provider, 'wallet'), p_tx_hash, p_avatar_url, now())
  on conflict (tag) do update
    set wallet_address = excluded.wallet_address,
        email = coalesce(excluded.email, public.arc_claims.email),
        tx_hash = coalesce(excluded.tx_hash, public.arc_claims.tx_hash),
        avatar_url = coalesce(excluded.avatar_url, public.arc_claims.avatar_url);

  -- 7. Sync into public.arc_agents so it IMMEDIATELY appears on the /agents page!
  insert into public.arc_agents (
    tag, display_name, category, description,
    owner_type, owner_wallet, runtime_type, runtime_version,
    status, is_public, entity_type, provenance,
    avatar_url, updated_at
  ) values (
    v_clean_tag,
    '₦' || upper(v_clean_tag),
    'User Agent',
    'Sovereign NairaTag user on Arc Mainnet',
    'user',
    v_wallet,
    'nairatag-managed',
    '1.0.0',
    'active',
    true,
    'autonomous_agent',
    'community',
    coalesce(p_avatar_url, 'https://api.dicebear.com/7.x/identicon/svg?seed=' || v_clean_tag),
    now()
  )
  on conflict (tag) do update
    set owner_wallet = excluded.owner_wallet,
        status = 'active',
        is_public = true,
        updated_at = now();

  -- 8. Backwards compatibility sync to user_claims
  insert into public.user_claims (tag, clean_tag, wallet_address, network, is_sub, tx_hash, reputation, claimed_at, metadata)
  values (
    '₦' || upper(v_clean_tag),
    v_clean_tag,
    v_wallet,
    'Arc Mainnet',
    false,
    p_tx_hash,
    100,
    now(),
    jsonb_build_object('email', v_email, 'auth_provider', p_auth_provider)
  )
  on conflict do nothing;

  -- Record the tag reward once. The balance and notification follow the inserted ledger row.
  insert into public.arc_reward_accounts(wallet_address) values(v_wallet) on conflict do nothing;
  insert into public.arc_reward_events(wallet_address, event_type, points, idempotency_key, metadata)
    values(v_wallet, 'tag_claimed', 20, 'tag-claim:' || v_clean_tag, jsonb_build_object('tag', v_clean_tag, 'email', v_email))
    on conflict (wallet_address, idempotency_key) do nothing;
  get diagnostics v_reward_inserted = row_count;
  if v_reward_inserted = 1 then
    update public.arc_reward_accounts
       set points_balance = points_balance + 20, updated_at = now()
     where wallet_address = v_wallet;
    insert into public.arc_reward_notifications(wallet_address, title, body, type, action_label, url)
    values(v_wallet, 'Your NairaTag is ready',
      format('Your %s%s is claimed and active on Arc. Share it with friends and earn points.', chr(8358), upper(v_clean_tag)),
      'tag', 'View Profile', '/tag/' || upper(v_clean_tag));
  end if;

  return jsonb_build_object(
    'ok', true,
    'tag', v_clean_tag,
    'wallet', v_wallet,
    'email', v_email,
    'pointsAwarded', case when v_reward_inserted = 1 then 20 else 0 end,
    'alreadyClaimed', v_reward_inserted = 0,
    'message', format('%s%s successfully registered to %s.', chr(8358), upper(v_clean_tag), v_wallet)
  );
end;
$$;

create or replace function public.arc_claim_daily_streak(p_wallet text, p_reward integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_wallet text := lower(p_wallet);
  v_day date := (now() at time zone 'Africa/Lagos')::date;
  v_count integer;
  v_points integer;
  v_last_day date;
  v_previous arc_reward_events%rowtype;
begin
  insert into arc_reward_accounts(wallet_address) values(v_wallet) on conflict do nothing;
  select last_streak_day, streak_count into v_last_day, v_count
    from arc_reward_accounts where wallet_address=v_wallet for update;
  if v_last_day = v_day then
    select * into v_previous from arc_reward_events where wallet_address=v_wallet and idempotency_key='streak:'||v_day;
    return jsonb_build_object('points',coalesce(v_previous.points,0),'streakCount',v_count,
      'claimedToday',true,'lastStreakDay',v_day,'alreadyClaimed',true);
  end if;
  v_count := case when v_last_day = v_day - 1 then v_count + 1 else 1 end;
  v_points := (array[10,15,20,25,30,40,50])[((v_count - 1) % 7) + 1];
  if p_reward <> v_points then raise exception 'Reward amount mismatch'; end if;
  update arc_reward_accounts set points_balance=points_balance+v_points, streak_count=v_count,
    last_streak_day=v_day, updated_at=now() where wallet_address=v_wallet;
  insert into arc_reward_events(wallet_address,event_type,points,idempotency_key,metadata)
    values(v_wallet,'daily_streak',v_points,'streak:'||v_day,jsonb_build_object('streakCount',v_count));
  insert into arc_reward_notifications(wallet_address,title,body)
    values(v_wallet,'Daily streak claimed',format('Day %s streak: %s Protocol Points added. Come back tomorrow to keep your streak alive.',v_count,v_points));
  return jsonb_build_object('points',v_points,'streakCount',v_count,'claimedToday',true,'lastStreakDay',v_day,'alreadyClaimed',false);
end $$;

revoke all on function public.arc_claim_daily_streak(text,integer) from public, anon, authenticated;
grant execute on function public.arc_claim_daily_streak(text,integer) to service_role;

create or replace function public.arc_consume_spin(p_wallet text,p_prize_id text,p_prize_points integer,p_request_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_wallet text := lower(p_wallet); v_day date := (now() at time zone 'Africa/Lagos')::date; v_spin arc_daily_spins%rowtype; v_previous arc_reward_events%rowtype; v_expected_points integer;
begin
  if p_request_id is null or p_request_id !~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$' then raise exception 'Invalid spin request ID'; end if;
  v_expected_points := case p_prize_id when 'p0' then 50 when 'p1' then 25 when 'p2' then 100 when 'p3' then 20 when 'p4' then 10 when 'p5' then 75 when 'p6' then 250 when 'p7' then 150 else null end;
  if v_expected_points is null or p_prize_points <> v_expected_points then raise exception 'Invalid spin prize'; end if;
  select * into v_previous from arc_reward_events where wallet_address=v_wallet and idempotency_key='spin-request:'||p_request_id;
  if found then
    return jsonb_build_object('prizeId',v_previous.metadata->>'prizeId','points',v_previous.points,
      'alreadyClaimed',true,'earned',1,'spent',0,'available',0,'paymentSpins',0);
  end if;
  insert into arc_reward_accounts(wallet_address) values(v_wallet) on conflict do nothing;
  insert into arc_daily_spins(wallet_address,reward_day) values(v_wallet,v_day) on conflict do nothing;
  select * into v_spin from arc_daily_spins where wallet_address=v_wallet and reward_day=v_day for update;
  -- Recheck after the per-day row lock so concurrent retries of the same click replay its original prize.
  select * into v_previous from arc_reward_events where wallet_address=v_wallet and idempotency_key='spin-request:'||p_request_id;
  if found then
    return jsonb_build_object('prizeId',v_previous.metadata->>'prizeId','points',v_previous.points,
      'alreadyClaimed',true,'earned',1+v_spin.bonus_spins,'spent',v_spin.spent_spins,
      'available',1+v_spin.bonus_spins-v_spin.spent_spins,'paymentSpins',v_spin.bonus_spins);
  end if;
  if v_spin.spent_spins >= 1 + v_spin.bonus_spins then raise exception 'No spins available'; end if;
  update arc_daily_spins set spent_spins=spent_spins+1,updated_at=now() where wallet_address=v_wallet and reward_day=v_day;
  update arc_reward_accounts set points_balance=points_balance+p_prize_points,updated_at=now() where wallet_address=v_wallet;
  insert into arc_reward_events(wallet_address,event_type,points,idempotency_key,metadata) values(v_wallet,'wheel_spin',p_prize_points,'spin-request:'||p_request_id,jsonb_build_object('prizeId',p_prize_id,'rewardDay',v_day));
  insert into arc_reward_notifications(wallet_address,title,body) values(v_wallet,format('%s Protocol Points won',p_prize_points),format('Your Arc wheel reward of %s Points has been added. Daily spins refresh at midnight Lagos time.',p_prize_points));
  return jsonb_build_object('prizeId',p_prize_id,'points',p_prize_points,'earned',1+v_spin.bonus_spins,'spent',v_spin.spent_spins+1,'available',1+v_spin.bonus_spins-v_spin.spent_spins-1,'paymentSpins',v_spin.bonus_spins);
end $$;

create or replace function public.arc_record_payment_rewards(p_wallet text,p_tx_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_wallet text:=lower(p_wallet); v_day date:=(now() at time zone 'Africa/Lagos')::date; v_ref arc_referrals%rowtype; v_bonus integer:=0; v_referred boolean:=false; v_inserted integer:=0;
begin
  insert into arc_reward_accounts(wallet_address) values(v_wallet) on conflict do nothing;
  insert into arc_payment_reward_receipts(tx_hash,wallet_address) values(lower(p_tx_hash),v_wallet)
    on conflict (tx_hash) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    if not exists(select 1 from arc_payment_reward_receipts where tx_hash=lower(p_tx_hash) and wallet_address=v_wallet) then
      raise exception 'This payment receipt is already linked to another wallet';
    end if;
    return jsonb_build_object('alreadyProcessed',true,'bonusSpin',false,'referralFirstPayment',false);
  end if;
  insert into arc_reward_notifications(wallet_address,title,body) values(v_wallet,'Arc payment confirmed','Your USDC payment is confirmed. Check Rewards for your daily streak and any available spin.');
  insert into arc_daily_spins(wallet_address,reward_day) values(v_wallet,v_day) on conflict do nothing;
  update arc_daily_spins set bonus_spins=1,updated_at=now() where wallet_address=v_wallet and reward_day=v_day and bonus_spins=0 and spent_spins+bonus_spins < 2;
  if found then v_bonus:=1; end if;
  select * into v_ref from arc_referrals where referred_wallet=v_wallet and first_payment_hash is null for update;
  if found then
    v_referred:=true;
    update arc_referrals set first_payment_hash=lower(p_tx_hash),payment_points=250,first_payment_at=now() where referred_wallet=v_wallet;
    update arc_reward_accounts set points_balance=points_balance+250,updated_at=now() where wallet_address in (v_wallet,v_ref.referrer_wallet);
    insert into arc_reward_events(wallet_address,event_type,points,idempotency_key,metadata) values(v_wallet,'referral_first_payment',250,'referral-payment:'||v_wallet,jsonb_build_object('txHash',lower(p_tx_hash))),(v_ref.referrer_wallet,'referral_first_payment',250,'referral-payment:'||v_wallet,jsonb_build_object('txHash',lower(p_tx_hash)));
    insert into arc_reward_notifications(wallet_address,title,body) values(v_ref.referrer_wallet,'Your referral made their first payment','You and your friend each earned 250 Protocol Points after a confirmed Arc USDC payment.'),(v_wallet,'First payment referral reward','You earned 250 Protocol Points for completing your first Arc USDC payment.');
  end if;
  if v_bonus=1 then insert into arc_reward_notifications(wallet_address,title,body) values(v_wallet,'Arc payment unlocked a bonus spin','A confirmed Arc USDC payment unlocked your extra wheel spin before midnight Lagos time.'); end if;
  return jsonb_build_object('bonusSpin',v_bonus=1,'referralFirstPayment',v_referred);
end $$;

create or replace function public.arc_record_tag_claim(p_wallet text, p_tag text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_result jsonb;
begin
  v_result := public.arc_enforce_claim(p_tag, p_wallet, null, null, 'wallet', null);
  if coalesce((v_result->>'ok')::boolean, false) is not true then
    raise exception '%', coalesce(v_result->>'error', 'Tag claim could not be verified.');
  end if;
  return jsonb_build_object('recorded', not coalesce((v_result->>'alreadyClaimed')::boolean, false),
    'pointsAwarded', coalesce((v_result->>'pointsAwarded')::integer, 0), 'claim', v_result);
end $$;

revoke all on function public.arc_enforce_claim(text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.arc_enforce_claim(text,text,text,text,text,text) to service_role;
revoke all on function public.arc_record_tag_claim(text,text) from public, anon, authenticated;
grant execute on function public.arc_record_tag_claim(text,text) to service_role;

revoke all on function public.arc_consume_spin(text,text,integer,text) from public, anon, authenticated;
grant execute on function public.arc_consume_spin(text,text,integer,text) to service_role;
revoke all on function public.arc_record_payment_rewards(text,text) from public, anon, authenticated;
grant execute on function public.arc_record_payment_rewards(text,text) to service_role;

commit;
