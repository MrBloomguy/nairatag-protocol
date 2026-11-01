begin;

create table if not exists public.arc_identity_wallets (
  wallet_address text primary key check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  canonical_wallet text not null check (canonical_wallet ~ '^0x[0-9a-f]{40}$'),
  linked_at timestamptz not null default now()
);

insert into public.arc_identity_wallets(wallet_address, canonical_wallet)
select distinct lower(wallet), lower(wallet)
from (
  select wallet_address as wallet from public.arc_claims
  union all select wallet_address from public.arc_reward_accounts
  union all select wallet_address from public.arc_reward_events
  union all select wallet_address from public.arc_daily_spins
  union all select wallet_address from public.arc_payment_reward_receipts
  union all select referred_wallet from public.arc_referrals
  union all select referrer_wallet from public.arc_referrals
) wallets
where wallet ~* '^0x[0-9a-f]{40}$'
on conflict (wallet_address) do nothing;

create index if not exists arc_identity_wallets_canonical_idx
  on public.arc_identity_wallets(canonical_wallet, wallet_address);
alter table public.arc_identity_wallets enable row level security;

create or replace function public.arc_canonical_wallet(p_wallet text)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select canonical_wallet from public.arc_identity_wallets where wallet_address = lower(trim(p_wallet))),
    lower(trim(p_wallet))
  );
$$;

create or replace function public.arc_lock_identity_wallet(p_wallet text)
returns text language plpgsql volatile security definer set search_path = public as $$
declare v_canonical text; v_refreshed text;
begin
  loop
    v_canonical := public.arc_canonical_wallet(p_wallet);
    perform pg_advisory_xact_lock(hashtextextended('arc-account:' || v_canonical, 0));
    v_refreshed := public.arc_canonical_wallet(p_wallet);
    exit when v_refreshed = v_canonical;
    -- A link completed while this transaction waited. Lock the new root too
    -- before touching its ledger, so writes serialize with its other members.
    perform pg_advisory_xact_lock(hashtextextended('arc-account:' || v_refreshed, 0));
    v_canonical := public.arc_canonical_wallet(p_wallet);
    exit when v_canonical = v_refreshed;
  end loop;
  return v_canonical;
end;
$$;

create or replace function public.arc_lock_identity_pair(p_first_wallet text, p_second_wallet text)
returns text[] language plpgsql volatile security definer set search_path = public as $$
declare v_first text; v_second text; v_lock_wallet text;
begin
  loop
    v_first := public.arc_canonical_wallet(p_first_wallet);
    v_second := public.arc_canonical_wallet(p_second_wallet);
    for v_lock_wallet in
      select distinct wallet from unnest(array[v_first, v_second]) as roots(wallet) order by wallet
    loop
      perform pg_advisory_xact_lock(hashtextextended('arc-account:' || v_lock_wallet, 0));
    end loop;
    if v_first = public.arc_canonical_wallet(p_first_wallet)
       and v_second = public.arc_canonical_wallet(p_second_wallet) then
      return array[v_first, v_second];
    end if;
  end loop;
end;
$$;

create or replace function public.arc_link_wallet_identity(p_primary_wallet text, p_linked_wallet text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_primary text := public.arc_canonical_wallet(p_primary_wallet);
  v_linked text := public.arc_canonical_wallet(p_linked_wallet);
  v_primary_points bigint := 0;
  v_linked_points bigint := 0;
  v_duplicate_points bigint := 0;
  v_primary_streak integer := 0;
  v_linked_streak integer := 0;
  v_primary_day date;
  v_linked_day date;
  v_locked_roots text[];
begin
  if lower(trim(p_primary_wallet)) !~ '^0x[0-9a-f]{40}$' or lower(trim(p_linked_wallet)) !~ '^0x[0-9a-f]{40}$' then
    raise exception 'Both account wallets must be valid EVM addresses';
  end if;
  v_locked_roots := public.arc_lock_identity_pair(p_primary_wallet, p_linked_wallet);
  v_primary := v_locked_roots[1];
  v_linked := v_locked_roots[2];
  if v_primary = v_linked then
    return jsonb_build_object('canonicalWallet', v_primary, 'alreadyLinked', true,
      'wallets', (select coalesce(jsonb_agg(wallet_address order by wallet_address), '[]'::jsonb)
                    from public.arc_identity_wallets where canonical_wallet = v_primary));
  end if;
  -- A wallet may not be moved out of an identity that has already been linked elsewhere.
  if v_linked <> lower(trim(p_linked_wallet)) then
    raise exception 'That wallet is already linked to another account';
  end if;
  if v_primary = lower(trim(p_linked_wallet)) then
    raise exception 'Choose a different wallet to link';
  end if;

  -- Linking two already-claimed identities would leave one person with two tags.
  if (select count(distinct lower(tag)) from public.arc_claims c
       join public.arc_identity_wallets i on i.wallet_address = lower(c.wallet_address)
      where i.canonical_wallet in (v_primary, v_linked)) > 1 then
    raise exception 'These accounts already own different NairaTags. Contact support before linking them';
  end if;

  -- Referring yourself after a merge would corrupt the referral ledger.
  if exists (
    select 1 from public.arc_referrals r
    where public.arc_canonical_wallet(r.referred_wallet) in (v_primary, v_linked)
      and public.arc_canonical_wallet(r.referrer_wallet) in (v_primary, v_linked)
  ) then
    raise exception 'These accounts have a referral relationship that must be reviewed before linking';
  end if;
  if (select count(*) from public.arc_referrals r
       where public.arc_canonical_wallet(r.referred_wallet) in (v_primary, v_linked)) > 1 then
    raise exception 'Both accounts already have referral signup history. Contact support before linking';
  end if;

  insert into public.arc_identity_wallets(wallet_address, canonical_wallet)
  values (v_primary, v_primary), (v_linked, v_linked)
  on conflict (wallet_address) do nothing;

  insert into public.arc_reward_accounts(wallet_address) values(v_primary), (v_linked) on conflict do nothing;
  select points_balance, streak_count, last_streak_day into v_primary_points, v_primary_streak, v_primary_day
    from public.arc_reward_accounts where wallet_address = v_primary for update;
  select points_balance, streak_count, last_streak_day into v_linked_points, v_linked_streak, v_linked_day
    from public.arc_reward_accounts where wallet_address = v_linked for update;
  select coalesce(sum(e.points), 0) into v_duplicate_points
    from public.arc_reward_events e
   where e.wallet_address = v_linked
     and exists (select 1 from public.arc_reward_events p
                  where p.wallet_address = v_primary and p.idempotency_key = e.idempotency_key);

  update public.arc_reward_accounts
     set points_balance = greatest(0, v_primary_points + v_linked_points - v_duplicate_points),
         streak_count = case
           when v_primary_day is null then v_linked_streak
           when v_linked_day is null then v_primary_streak
           when v_linked_day > v_primary_day then v_linked_streak
           when v_linked_day = v_primary_day then greatest(v_primary_streak, v_linked_streak)
           else v_primary_streak end,
         last_streak_day = case
           when v_primary_day is null and v_linked_day is null then null
           else greatest(coalesce(v_primary_day, v_linked_day), coalesce(v_linked_day, v_primary_day)) end,
         updated_at = now()
   where wallet_address = v_primary;

  insert into public.arc_reward_events(wallet_address, event_type, points, idempotency_key, metadata, created_at)
  select v_primary, event_type, points, idempotency_key, metadata, created_at
    from public.arc_reward_events where wallet_address = v_linked
  on conflict (wallet_address, idempotency_key) do nothing;
  delete from public.arc_reward_events where wallet_address = v_linked;

  insert into public.arc_daily_spins as current_spins(wallet_address, reward_day, bonus_spins, spent_spins, updated_at)
  select v_primary, reward_day, least(1, sum(bonus_spins)), least(2, sum(spent_spins)), now()
    from public.arc_daily_spins where wallet_address in (v_primary, v_linked)
   group by reward_day
  on conflict (wallet_address, reward_day) do update
    set bonus_spins = greatest(current_spins.bonus_spins, excluded.bonus_spins),
        spent_spins = least(2, greatest(current_spins.spent_spins, excluded.spent_spins)),
        updated_at = now();
  delete from public.arc_daily_spins where wallet_address = v_linked;

  update public.arc_payment_reward_receipts set wallet_address = v_primary where wallet_address = v_linked;
  update public.arc_reward_notifications set wallet_address = v_primary where wallet_address = v_linked;
  with duplicate_notices as (
    select id, row_number() over (partition by title, body, type, url order by created_at, id) as row_number
      from public.arc_reward_notifications where wallet_address = v_primary
  )
  update public.arc_reward_notifications n set read_at = coalesce(n.read_at, now())
    from duplicate_notices d where n.id = d.id and d.row_number > 1;
  update public.arc_referrals set referrer_wallet = v_primary
   where public.arc_canonical_wallet(referrer_wallet) = v_linked;
  update public.arc_referrals set referred_wallet = v_primary
   where public.arc_canonical_wallet(referred_wallet) = v_linked;
  delete from public.arc_reward_accounts where wallet_address = v_linked;

  update public.arc_identity_wallets set canonical_wallet = v_primary where canonical_wallet = v_linked;
  insert into public.arc_identity_wallets(wallet_address, canonical_wallet)
  values (v_primary, v_primary), (v_linked, v_primary)
  on conflict (wallet_address) do update set canonical_wallet = excluded.canonical_wallet, linked_at = now();

  return jsonb_build_object(
    'canonicalWallet', v_primary,
    'linkedWallet', lower(trim(p_linked_wallet)),
    'alreadyLinked', false,
    'wallets', (select coalesce(jsonb_agg(wallet_address order by wallet_address), '[]'::jsonb)
                  from public.arc_identity_wallets where canonical_wallet = v_primary)
  );
end;
$$;

create or replace function public.arc_linked_identity_state(p_wallet text)
returns jsonb language sql stable security definer set search_path = public as $$
  with identity as (
    select public.arc_canonical_wallet(p_wallet) as canonical_wallet
  ), members as (
    select i.wallet_address from public.arc_identity_wallets i, identity x
     where i.canonical_wallet = x.canonical_wallet
    union
    select canonical_wallet from identity
  ), claim as (
    select c.tag, c.wallet_address, c.claimed_at
      from public.arc_claims c join members m on lower(c.wallet_address) = m.wallet_address
     order by c.claimed_at limit 1
  )
  select jsonb_build_object(
    'canonicalWallet', (select canonical_wallet from identity),
    'wallets', (select coalesce(jsonb_agg(wallet_address order by wallet_address), '[]'::jsonb) from members),
    'claim', (select jsonb_build_object('tag', tag, 'walletAddress', wallet_address, 'claimedAt', claimed_at) from claim)
  );
$$;

create or replace function public.arc_guard_linked_tag_claim()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_canonical text;
begin
  insert into public.arc_identity_wallets(wallet_address, canonical_wallet)
  values (lower(new.wallet_address), lower(new.wallet_address))
  on conflict (wallet_address) do nothing;
  v_canonical := public.arc_canonical_wallet(new.wallet_address);
  if exists (
    select 1 from public.arc_claims c
    where lower(c.wallet_address) <> lower(new.wallet_address)
      and public.arc_canonical_wallet(c.wallet_address) = v_canonical
      and lower(c.tag) <> lower(new.tag)
  ) then
    raise exception 'This linked account already owns a NairaTag';
  end if;
  return new;
end;
$$;

-- Every reward RPC resolves and locks the canonical account inside the same
-- database transaction. This prevents concurrent calls through two linked
-- wallets from spending the same spin or granting the same daily reward twice.
create or replace function public.arc_reward_state(p_wallet text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_wallet text := public.arc_lock_identity_wallet(p_wallet);
  v_day date := (now() at time zone 'Africa/Lagos')::date;
  v_account arc_reward_accounts%rowtype;
  v_spin arc_daily_spins%rowtype;
begin
  insert into arc_reward_accounts(wallet_address) values(v_wallet) on conflict do nothing;
  select * into v_account from arc_reward_accounts where wallet_address = v_wallet;
  insert into arc_daily_spins(wallet_address,reward_day) values(v_wallet,v_day) on conflict do nothing;
  select * into v_spin from arc_daily_spins where wallet_address = v_wallet and reward_day = v_day;
  return jsonb_build_object(
    'points', v_account.points_balance,
    'streakCount', case when v_account.last_streak_day >= v_day - 1 then v_account.streak_count else 0 end,
    'lastStreakDay', v_account.last_streak_day,
    'claimedToday', v_account.last_streak_day = v_day,
    'spins', jsonb_build_object('earned', 1 + v_spin.bonus_spins, 'spent', v_spin.spent_spins,
      'available', 1 + v_spin.bonus_spins - v_spin.spent_spins, 'paymentSpins', v_spin.bonus_spins),
    'referrals', (select jsonb_build_object('points', coalesce(sum(signup_points + payment_points),0),
      'joinedCount', count(*), 'completedCount', count(*) filter (where first_payment_hash is not null),
        'items', coalesce(jsonb_agg(jsonb_build_object('referredWallet',referred_wallet,'referredTag',referred_tag,
        'signupPoints',signup_points,'paymentPoints',payment_points,'firstPaymentHash',first_payment_hash,'createdAt',created_at)
        order by created_at desc),'[]'::jsonb)) from arc_referrals where public.arc_canonical_wallet(referrer_wallet) = v_wallet),
    'notifications', coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'body',body,'type',type,
      'actionLabel',action_label,'url',url,'timestamp',extract(epoch from created_at)*1000,
      'readAt',case when read_at is null then null else extract(epoch from read_at)*1000 end) order by created_at desc)
      from (select * from arc_reward_notifications where wallet_address=v_wallet order by created_at desc limit 50) n),'[]'::jsonb)
  );
end $$;

create or replace function public.arc_claim_daily_streak(p_wallet text, p_reward integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_wallet text := public.arc_lock_identity_wallet(p_wallet);
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

create or replace function public.arc_consume_spin(p_wallet text,p_prize_id text,p_prize_points integer,p_request_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_wallet text := public.arc_lock_identity_wallet(p_wallet);
  v_day date := (now() at time zone 'Africa/Lagos')::date;
  v_spin arc_daily_spins%rowtype;
  v_previous arc_reward_events%rowtype;
  v_expected_points integer;
begin
  if p_request_id is null or p_request_id !~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$' then raise exception 'Invalid spin request ID'; end if;
  v_expected_points := case p_prize_id when 'p0' then 50 when 'p1' then 25 when 'p2' then 100 when 'p3' then 20 when 'p4' then 10 when 'p5' then 75 when 'p6' then 250 when 'p7' then 150 else null end;
  if v_expected_points is null or p_prize_points <> v_expected_points then raise exception 'Invalid spin prize'; end if;
  select * into v_previous from arc_reward_events where wallet_address=v_wallet and idempotency_key='spin-request:'||p_request_id;
  if found then return jsonb_build_object('prizeId',v_previous.metadata->>'prizeId','points',v_previous.points,'alreadyClaimed',true); end if;
  insert into arc_reward_accounts(wallet_address) values(v_wallet) on conflict do nothing;
  insert into arc_daily_spins(wallet_address,reward_day) values(v_wallet,v_day) on conflict do nothing;
  select * into v_spin from arc_daily_spins where wallet_address=v_wallet and reward_day=v_day for update;
  if v_spin.spent_spins >= 1 + v_spin.bonus_spins then raise exception 'No spins available'; end if;
  update arc_daily_spins set spent_spins=spent_spins+1,updated_at=now() where wallet_address=v_wallet and reward_day=v_day;
  update arc_reward_accounts set points_balance=points_balance+p_prize_points,updated_at=now() where wallet_address=v_wallet;
  insert into arc_reward_events(wallet_address,event_type,points,idempotency_key,metadata)
    values(v_wallet,'wheel_spin',p_prize_points,'spin-request:'||p_request_id,jsonb_build_object('prizeId',p_prize_id,'rewardDay',v_day));
  insert into arc_reward_notifications(wallet_address,title,body)
    values(v_wallet,format('%s Protocol Points won',p_prize_points),format('Your Arc wheel reward of %s Points has been added. Daily spins refresh at midnight Lagos time.',p_prize_points));
  return jsonb_build_object('prizeId',p_prize_id,'points',p_prize_points,'alreadyClaimed',false,
    'earned',1+v_spin.bonus_spins,'spent',v_spin.spent_spins+1,'available',1+v_spin.bonus_spins-v_spin.spent_spins-1,'paymentSpins',v_spin.bonus_spins);
end $$;

create or replace function public.arc_register_referral(p_referred_wallet text,p_referrer_wallet text,p_referrer_tag text,p_referred_tag text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_roots text[] := public.arc_lock_identity_pair(p_referred_wallet,p_referrer_wallet);
  v_referred text := v_roots[1];
  v_referrer text := v_roots[2];
  v_inserted integer;
begin
  if v_referred = v_referrer then raise exception 'You cannot refer your own wallet'; end if;
  insert into arc_reward_accounts(wallet_address) values(v_referred),(v_referrer) on conflict do nothing;
  insert into arc_referrals(referred_wallet,referrer_wallet,referrer_tag,referred_tag)
    values(v_referred,v_referrer,lower(p_referrer_tag),lower(p_referred_tag)) on conflict(referred_wallet) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    if not exists(select 1 from arc_referrals where referred_wallet=v_referred and referrer_wallet=v_referrer) then
      raise exception 'This wallet has already joined through a different referral';
    end if;
    return jsonb_build_object('pointsEach',100,'referrerWallet',v_referrer,'referredWallet',v_referred,'alreadyRegistered',true);
  end if;
  update arc_reward_accounts set points_balance=points_balance+100,updated_at=now() where wallet_address in (v_referred,v_referrer);
  insert into arc_reward_events(wallet_address,event_type,points,idempotency_key,metadata) values
    (v_referred,'referral_joined',100,'referral-signup:'||v_referred,jsonb_build_object('referrerTag',lower(p_referrer_tag))),
    (v_referrer,'referral_signup',100,'referral-signup:'||v_referred,jsonb_build_object('referredTag',lower(p_referred_tag)));
  insert into arc_reward_notifications(wallet_address,title,body) values
    (v_referrer,'A friend joined with your NairaTag','You and your friend each earned 100 Protocol Points. Their first confirmed Arc payment unlocks another referral reward.'),
    (v_referred,'You joined with a referral','You earned 100 Protocol Points for joining through a friend.');
  return jsonb_build_object('pointsEach',100,'referrerWallet',v_referrer,'referredWallet',v_referred,'alreadyRegistered',false);
end $$;

create or replace function public.arc_mark_reward_notifications_read(p_wallet text,p_ids uuid[] default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_wallet text := public.arc_lock_identity_wallet(p_wallet);
begin
  update arc_reward_notifications set read_at=coalesce(read_at,now())
   where wallet_address=v_wallet and (p_ids is null or id=any(p_ids));
end $$;

create or replace function public.arc_record_payment_rewards(p_wallet text,p_tx_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_wallet text;
  v_day date := (now() at time zone 'Africa/Lagos')::date;
  v_ref arc_referrals%rowtype;
  v_roots text[];
  v_bonus integer := 0;
  v_referred boolean := false;
  v_inserted integer := 0;
begin
  if p_wallet is null or lower(trim(p_wallet)) !~ '^0x[0-9a-f]{40}$' then raise exception 'Invalid wallet address'; end if;
  if p_tx_hash is null or lower(trim(p_tx_hash)) !~ '^0x[0-9a-f]{64}$' then raise exception 'Invalid payment transaction hash'; end if;
  v_wallet := public.arc_canonical_wallet(p_wallet);
  select * into v_ref from arc_referrals r where public.arc_canonical_wallet(r.referred_wallet)=v_wallet
    and r.first_payment_hash is null order by r.created_at limit 1;
  if found then
    v_roots := public.arc_lock_identity_pair(p_wallet,v_ref.referrer_wallet);
    v_wallet := v_roots[1];
  else
    v_wallet := public.arc_lock_identity_wallet(p_wallet);
  end if;
  insert into arc_reward_accounts(wallet_address) values(v_wallet) on conflict do nothing;
  insert into arc_payment_reward_receipts(tx_hash,wallet_address) values(lower(p_tx_hash),v_wallet) on conflict(tx_hash) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    if not exists(select 1 from arc_payment_reward_receipts r where r.tx_hash=lower(p_tx_hash)
      and public.arc_canonical_wallet(r.wallet_address)=v_wallet) then raise exception 'This payment receipt is already linked to another wallet'; end if;
    return jsonb_build_object('alreadyProcessed',true,'bonusSpin',false,'referralFirstPayment',false);
  end if;
  insert into arc_reward_notifications(wallet_address,title,body) values(v_wallet,'Arc payment confirmed','Your USDC payment is confirmed. Check Rewards for your daily streak and any available spin.');
  insert into arc_daily_spins(wallet_address,reward_day) values(v_wallet,v_day) on conflict do nothing;
  update arc_daily_spins set bonus_spins=1,updated_at=now() where wallet_address=v_wallet and reward_day=v_day and bonus_spins=0 and spent_spins+bonus_spins<2;
  if found then v_bonus:=1; end if;
  select * into v_ref from arc_referrals r where public.arc_canonical_wallet(r.referred_wallet)=v_wallet
    and r.first_payment_hash is null order by r.created_at limit 1 for update;
  if found then
    v_referred:=true;
    update arc_referrals set first_payment_hash=lower(p_tx_hash),payment_points=250,first_payment_at=now() where referred_wallet=v_ref.referred_wallet;
    insert into arc_reward_accounts(wallet_address) values(public.arc_canonical_wallet(v_ref.referrer_wallet)) on conflict do nothing;
    with inserted_events as (
      insert into arc_reward_events(wallet_address,event_type,points,idempotency_key,metadata) values
      (v_wallet,'referral_first_payment',250,'referral-payment:'||v_wallet,jsonb_build_object('txHash',lower(p_tx_hash))),
      (public.arc_canonical_wallet(v_ref.referrer_wallet),'referral_first_payment',250,'referral-payment:'||v_wallet,jsonb_build_object('txHash',lower(p_tx_hash)))
      on conflict(wallet_address,idempotency_key) do nothing
      returning wallet_address, points
    ), account_totals as (
      select wallet_address, sum(points) as points from inserted_events group by wallet_address
    )
    update arc_reward_accounts a set points_balance=a.points_balance+t.points,updated_at=now()
      from account_totals t where a.wallet_address=t.wallet_address;
    insert into arc_reward_notifications(wallet_address,title,body) values
      (public.arc_canonical_wallet(v_ref.referrer_wallet),'Your referral made their first payment','You and your friend each earned 250 Protocol Points after a confirmed Arc USDC payment.'),
      (v_wallet,'First payment referral reward','You earned 250 Protocol Points for completing your first Arc USDC payment.');
  end if;
  if v_bonus=1 then insert into arc_reward_notifications(wallet_address,title,body)
    values(v_wallet,'Arc payment unlocked a bonus spin','A confirmed Arc USDC payment unlocked your extra wheel spin before midnight Lagos time.'); end if;
  return jsonb_build_object('alreadyProcessed',false,'bonusSpin',v_bonus=1,'referralFirstPayment',v_referred);
end $$;

drop trigger if exists arc_claims_linked_identity_guard on public.arc_claims;
create trigger arc_claims_linked_identity_guard
before insert or update on public.arc_claims
for each row execute function public.arc_guard_linked_tag_claim();

create or replace function public.arc_enforce_claim(
  p_tag text,
  p_wallet text,
  p_email text default null,
  p_tx_hash text default null,
  p_auth_provider text default 'wallet',
  p_avatar_url text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_clean_tag text := lower(trim(regexp_replace(p_tag, '^[^a-zA-Z0-9]+', '')));
  v_wallet text := lower(trim(p_wallet));
  v_identity_wallet text;
  v_email text := nullif(lower(trim(p_email)), '');
  v_existing_email_claim record;
  v_existing_wallet_claim record;
  v_existing_tag_claim record;
  v_reward_inserted integer := 0;
begin
  if v_wallet !~ '^0x[0-9a-f]{40}$' then
    return jsonb_build_object('ok', false, 'error', 'A valid wallet address is required.');
  end if;
  v_identity_wallet := public.arc_lock_identity_wallet(v_wallet);
  if v_clean_tag is null or length(v_clean_tag) < 3 or length(v_clean_tag) > 32 or v_clean_tag !~ '^[a-z0-9_]+$' then
    return jsonb_build_object('ok', false, 'error', 'NairaTag must be 3-32 characters (letters, numbers, underscores).');
  end if;
  if v_clean_tag in ('nairatag', 'bloom', 'defillama', 'meteo', 'coingecko', 'arc') then
    if (v_clean_tag = 'bloom' and v_wallet <> '0x7c26a1f03339e2ea74d261d97f5ab9c38181af26') or
       (v_clean_tag = 'nairatag' and v_wallet <> '0x653f773c9062e71a6554b42a9525fcd47fcc1693') then
      return jsonb_build_object('ok', false, 'error', format('%s%s is an official sovereign protocol agent on Arc.', chr(8358), upper(v_clean_tag)));
    end if;
  end if;

  select * into v_existing_tag_claim from public.arc_claims where lower(tag) = v_clean_tag;
  if v_existing_tag_claim.id is not null
     and public.arc_canonical_wallet(v_existing_tag_claim.wallet_address) <> v_identity_wallet then
    return jsonb_build_object('ok', false, 'error', format('%s%s has already been claimed on Arc.', chr(8358), upper(v_clean_tag)));
  end if;

  select * into v_existing_wallet_claim
    from public.arc_claims c
   where public.arc_canonical_wallet(c.wallet_address) = v_identity_wallet
   order by c.claimed_at limit 1;
  if v_existing_wallet_claim.id is not null and lower(v_existing_wallet_claim.tag) <> v_clean_tag then
    return jsonb_build_object('ok', false, 'error', format('This linked account already owns %s%s. Limit is one NairaTag per account.', chr(8358), upper(v_existing_wallet_claim.tag)));
  end if;

  if v_email is not null then
    select * into v_existing_email_claim from public.arc_claims where lower(trim(email)) = v_email;
    if v_existing_email_claim.id is not null
       and (lower(v_existing_email_claim.tag) <> v_clean_tag
         or public.arc_canonical_wallet(v_existing_email_claim.wallet_address) <> v_identity_wallet) then
      return jsonb_build_object('ok', false, 'error', format('This email address (%s) already claimed %s%s. Limit is one NairaTag per account.', v_email, chr(8358), upper(v_existing_email_claim.tag)));
    end if;
  end if;

  if v_existing_tag_claim.id is null then
    insert into public.arc_claims (tag, wallet_address, email, auth_provider, tx_hash, avatar_url, claimed_at)
    values (v_clean_tag, v_wallet, v_email, coalesce(p_auth_provider, 'wallet'), p_tx_hash, p_avatar_url, now());
  end if;

  insert into public.arc_agents (
    tag, display_name, category, description, owner_type, owner_wallet, runtime_type, runtime_version,
    status, is_public, entity_type, provenance, avatar_url, updated_at
  ) values (
    v_clean_tag, chr(8358) || upper(v_clean_tag), 'User Agent', 'Sovereign NairaTag user on Arc Mainnet',
    'user', v_wallet, 'nairatag-managed', '1.0.0', 'active', true, 'autonomous_agent', 'community',
    coalesce(p_avatar_url, 'https://api.dicebear.com/7.x/identicon/svg?seed=' || v_clean_tag), now()
  ) on conflict (tag) do update set owner_wallet = excluded.owner_wallet, status = 'active', is_public = true, updated_at = now();

  insert into public.user_claims (tag, clean_tag, wallet_address, network, is_sub, tx_hash, reputation, claimed_at, metadata)
  values (chr(8358) || upper(v_clean_tag), v_clean_tag, v_wallet, 'Arc Mainnet', false, p_tx_hash, 100, now(),
    jsonb_build_object('email', v_email, 'auth_provider', p_auth_provider))
  on conflict do nothing;

  insert into public.arc_reward_accounts(wallet_address) values(v_identity_wallet) on conflict do nothing;
  insert into public.arc_reward_events(wallet_address, event_type, points, idempotency_key, metadata)
  values(v_identity_wallet, 'tag_claimed', 20, 'tag-claim:' || v_clean_tag, jsonb_build_object('tag', v_clean_tag, 'email', v_email))
  on conflict (wallet_address, idempotency_key) do nothing;
  get diagnostics v_reward_inserted = row_count;
  if v_reward_inserted = 1 then
    update public.arc_reward_accounts set points_balance = points_balance + 20, updated_at = now()
     where wallet_address = v_identity_wallet;
    insert into public.arc_reward_notifications(wallet_address, title, body, type, action_label, url)
    values(v_identity_wallet, 'Your NairaTag is ready',
      format('Your %s%s is claimed and active on Arc. Share it with friends and earn points.', chr(8358), upper(v_clean_tag)),
      'tag', 'View Profile', '/tag/' || upper(v_clean_tag));
  end if;

  return jsonb_build_object('ok', true, 'tag', v_clean_tag, 'wallet', v_wallet,
    'canonicalWallet', v_identity_wallet, 'email', v_email,
    'pointsAwarded', case when v_reward_inserted = 1 then 20 else 0 end,
    'alreadyClaimed', v_reward_inserted = 0,
    'message', format('%s%s successfully registered to %s.', chr(8358), upper(v_clean_tag), v_wallet));
end;
$$;

revoke all on function public.arc_canonical_wallet(text) from public, anon, authenticated;
revoke all on function public.arc_lock_identity_wallet(text) from public, anon, authenticated;
revoke all on function public.arc_lock_identity_pair(text, text) from public, anon, authenticated;
revoke all on function public.arc_link_wallet_identity(text, text) from public, anon, authenticated;
revoke all on function public.arc_linked_identity_state(text) from public, anon, authenticated;
revoke all on function public.arc_guard_linked_tag_claim() from public, anon, authenticated;
grant execute on function public.arc_canonical_wallet(text), public.arc_link_wallet_identity(text, text), public.arc_linked_identity_state(text) to service_role;

commit;
