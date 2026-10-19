-- Arc rewards are kept in a separate ledger from Celo/cNGN rewards.
create table if not exists public.arc_reward_accounts (
  wallet_address text primary key,
  points_balance bigint not null default 0 check (points_balance >= 0),
  streak_count integer not null default 0,
  last_streak_day date,
  updated_at timestamptz not null default now()
);

create table if not exists public.arc_reward_events (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  event_type text not null,
  points bigint not null default 0,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(wallet_address, idempotency_key)
);

create table if not exists public.arc_daily_spins (
  wallet_address text not null,
  reward_day date not null,
  bonus_spins integer not null default 0 check (bonus_spins between 0 and 1),
  spent_spins integer not null default 0 check (spent_spins between 0 and 2),
  updated_at timestamptz not null default now(),
  primary key(wallet_address, reward_day)
);

create table if not exists public.arc_payment_reward_receipts (
  tx_hash text primary key,
  wallet_address text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.arc_referrals (
  referred_wallet text primary key,
  referrer_wallet text not null,
  referrer_tag text not null,
  referred_tag text not null,
  signup_points integer not null default 100,
  first_payment_hash text unique,
  payment_points integer not null default 0,
  created_at timestamptz not null default now(),
  first_payment_at timestamptz
);

create table if not exists public.arc_reward_notifications (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  title text not null,
  body text not null,
  type text not null default 'reward',
  action_label text not null default 'View',
  url text not null default '/#rewards',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists arc_reward_events_wallet_idx on public.arc_reward_events(wallet_address, created_at desc);
create index if not exists arc_reward_notifications_wallet_idx on public.arc_reward_notifications(wallet_address, created_at desc);
alter table public.arc_reward_accounts enable row level security;
alter table public.arc_reward_events enable row level security;
alter table public.arc_daily_spins enable row level security;
alter table public.arc_payment_reward_receipts enable row level security;
alter table public.arc_referrals enable row level security;
alter table public.arc_reward_notifications enable row level security;

create or replace function public.arc_reward_state(p_wallet text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_wallet text := lower(p_wallet); v_day date := (now() at time zone 'Africa/Lagos')::date; v_account arc_reward_accounts%rowtype; v_spin arc_daily_spins%rowtype;
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
    'spins', jsonb_build_object('earned', 1 + v_spin.bonus_spins, 'spent', v_spin.spent_spins, 'available', 1 + v_spin.bonus_spins - v_spin.spent_spins, 'paymentSpins', v_spin.bonus_spins),
    'referrals', (select jsonb_build_object('points', coalesce(sum(signup_points + payment_points),0), 'joinedCount', count(*), 'completedCount', count(*) filter (where first_payment_hash is not null), 'items', coalesce(jsonb_agg(jsonb_build_object('referredWallet',referred_wallet,'referredTag',referred_tag,'signupPoints',signup_points,'paymentPoints',payment_points,'firstPaymentHash',first_payment_hash,'createdAt',created_at) order by created_at desc),'[]'::jsonb)) from arc_referrals where referrer_wallet = v_wallet),
    'notifications', coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'body',body,'type',type,'actionLabel',action_label,'url',url,'timestamp',extract(epoch from created_at)*1000,'readAt',case when read_at is null then null else extract(epoch from read_at)*1000 end) order by created_at desc) from (select * from arc_reward_notifications where wallet_address=v_wallet order by created_at desc limit 50) n),'[]'::jsonb)
  );
end $$;

create or replace function public.arc_claim_daily_streak(p_wallet text, p_reward integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_wallet text := lower(p_wallet); v_day date := (now() at time zone 'Africa/Lagos')::date; v_count integer; v_points integer;
begin
  insert into arc_reward_accounts(wallet_address) values(v_wallet) on conflict do nothing;
  select case when last_streak_day = v_day - 1 then streak_count + 1 else 1 end into v_count from arc_reward_accounts where wallet_address=v_wallet for update;
  v_points := (array[10,15,20,25,30,40,50])[((v_count - 1) % 7) + 1];
  if p_reward <> v_points then raise exception 'Reward amount mismatch'; end if;
  update arc_reward_accounts set points_balance=points_balance+v_points, streak_count=v_count,last_streak_day=v_day,updated_at=now() where wallet_address=v_wallet and (last_streak_day is null or last_streak_day < v_day);
  if not found then raise exception 'Daily streak already claimed'; end if;
  insert into arc_reward_events(wallet_address,event_type,points,idempotency_key,metadata) values(v_wallet,'daily_streak',v_points,'streak:'||v_day,jsonb_build_object('streakCount',v_count));
  insert into arc_reward_notifications(wallet_address,title,body) values(v_wallet,'Daily streak claimed',format('Day %s streak: %s Protocol Points added. Come back tomorrow to keep your streak alive.',v_count,v_points));
  return jsonb_build_object('points',v_points,'streakCount',v_count,'claimedToday',true,'lastStreakDay',v_day);
end $$;

create or replace function public.arc_consume_spin(p_wallet text,p_prize_id text,p_prize_points integer,p_request_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_wallet text := lower(p_wallet); v_day date := (now() at time zone 'Africa/Lagos')::date; v_spin arc_daily_spins%rowtype;
begin
  insert into arc_reward_accounts(wallet_address) values(v_wallet) on conflict do nothing;
  insert into arc_daily_spins(wallet_address,reward_day) values(v_wallet,v_day) on conflict do nothing;
  select * into v_spin from arc_daily_spins where wallet_address=v_wallet and reward_day=v_day for update;
  if v_spin.spent_spins >= 1 + v_spin.bonus_spins then raise exception 'No spins available'; end if;
  update arc_daily_spins set spent_spins=spent_spins+1,updated_at=now() where wallet_address=v_wallet and reward_day=v_day;
  update arc_reward_accounts set points_balance=points_balance+p_prize_points,updated_at=now() where wallet_address=v_wallet;
  insert into arc_reward_events(wallet_address,event_type,points,idempotency_key,metadata) values(v_wallet,'wheel_spin',p_prize_points,'spin-request:'||p_request_id,jsonb_build_object('prizeId',p_prize_id,'rewardDay',v_day));
  insert into arc_reward_notifications(wallet_address,title,body) values(v_wallet,format('%s Protocol Points won',p_prize_points),format('Your Arc wheel reward of %s Points has been added. Daily spins refresh at midnight Lagos time.',p_prize_points));
  return jsonb_build_object('prizeId',p_prize_id,'points',p_prize_points,'earned',1+v_spin.bonus_spins,'spent',v_spin.spent_spins+1,'available',1+v_spin.bonus_spins-v_spin.spent_spins-1,'paymentSpins',v_spin.bonus_spins);
end $$;

create or replace function public.arc_register_referral(p_referred_wallet text,p_referrer_wallet text,p_referrer_tag text,p_referred_tag text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_referred text:=lower(p_referred_wallet); v_referrer text:=lower(p_referrer_wallet);
begin
  if v_referred=v_referrer then raise exception 'You cannot refer your own wallet'; end if;
  insert into arc_reward_accounts(wallet_address) values(v_referred),(v_referrer) on conflict do nothing;
  insert into arc_referrals(referred_wallet,referrer_wallet,referrer_tag,referred_tag) values(v_referred,v_referrer,lower(p_referrer_tag),lower(p_referred_tag));
  update arc_reward_accounts set points_balance=points_balance+100,updated_at=now() where wallet_address in (v_referred,v_referrer);
  insert into arc_reward_events(wallet_address,event_type,points,idempotency_key,metadata) values(v_referred,'referral_joined',100,'referral-signup:'||v_referred,jsonb_build_object('referrerTag',lower(p_referrer_tag))),(v_referrer,'referral_signup',100,'referral-signup:'||v_referred,jsonb_build_object('referredTag',lower(p_referred_tag)));
  insert into arc_reward_notifications(wallet_address,title,body) values(v_referrer,'A friend joined with your NairaTag','You and your friend each earned 100 Protocol Points. Their first confirmed Arc payment unlocks another referral reward.'),(v_referred,'You joined with a referral','You earned 100 Protocol Points for joining through a friend.');
  return jsonb_build_object('pointsEach',100,'referrerWallet',v_referrer,'referredWallet',v_referred);
end $$;

create or replace function public.arc_record_tag_claim(p_wallet text,p_tag text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_wallet text:=lower(p_wallet); v_tag text:=lower(p_tag); v_recorded boolean;
begin
  insert into arc_reward_accounts(wallet_address) values(v_wallet) on conflict do nothing;
  insert into arc_reward_events(wallet_address,event_type,points,idempotency_key,metadata)
    values(v_wallet,'tag_claimed',0,'tag-claim:'||v_tag,jsonb_build_object('tag',v_tag)) on conflict(wallet_address,idempotency_key) do nothing;
  v_recorded:=found;
  if v_recorded then
    insert into arc_reward_notifications(wallet_address,title,body) values(v_wallet,'Your NairaTag is live on Arc',format('₦%s is ready. Claim your daily streak and invite a friend to earn Protocol Points.',v_tag));
  end if;
  return jsonb_build_object('recorded',v_recorded);
end $$;

create or replace function public.arc_record_payment_rewards(p_wallet text,p_tx_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_wallet text:=lower(p_wallet); v_day date:=(now() at time zone 'Africa/Lagos')::date; v_ref arc_referrals%rowtype; v_bonus integer:=0; v_referred boolean:=false;
begin
  insert into arc_reward_accounts(wallet_address) values(v_wallet) on conflict do nothing;
  insert into arc_payment_reward_receipts(tx_hash,wallet_address) values(lower(p_tx_hash),v_wallet);
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

create or replace function public.arc_mark_reward_notifications_read(p_wallet text,p_ids uuid[] default null)
returns void language sql security definer set search_path = public as $$
  update arc_reward_notifications set read_at=coalesce(read_at,now()) where wallet_address=lower(p_wallet) and (p_ids is null or id=any(p_ids));
$$;

revoke all on function public.arc_reward_state(text) from public, anon, authenticated;
revoke all on function public.arc_claim_daily_streak(text,integer) from public, anon, authenticated;
revoke all on function public.arc_consume_spin(text,text,integer,text) from public, anon, authenticated;
revoke all on function public.arc_register_referral(text,text,text,text) from public, anon, authenticated;
revoke all on function public.arc_record_tag_claim(text,text) from public, anon, authenticated;
revoke all on function public.arc_record_payment_rewards(text,text) from public, anon, authenticated;
revoke all on function public.arc_mark_reward_notifications_read(text,uuid[]) from public, anon, authenticated;
grant execute on function public.arc_reward_state(text),public.arc_claim_daily_streak(text,integer),public.arc_consume_spin(text,text,integer,text),public.arc_register_referral(text,text,text,text),public.arc_record_tag_claim(text,text),public.arc_record_payment_rewards(text,text),public.arc_mark_reward_notifications_read(text,uuid[]) to service_role;
