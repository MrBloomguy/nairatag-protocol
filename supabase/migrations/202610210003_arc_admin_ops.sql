-- Durable administration data for Arc tasks, voucher offers and their review queue.
create table if not exists public.arc_vouchers (
  id text primary key,
  title text not null,
  description text not null default '',
  category text not null default 'community',
  points integer not null default 0 check (points >= 0),
  action_url text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arc_voucher_claims (
  id uuid primary key default gen_random_uuid(),
  voucher_id text not null references public.arc_vouchers(id),
  wallet_address text not null,
  proof text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  unique (voucher_id, wallet_address)
);

create index if not exists arc_voucher_claims_status_idx on public.arc_voucher_claims(status, created_at desc);
alter table public.arc_vouchers enable row level security;
alter table public.arc_voucher_claims enable row level security;

insert into public.arc_vouchers (id, title, description, category, points, action_url)
values
 ('follow-x', 'Follow NairaTag on X', 'Follow the official NairaTag account and submit your profile link for review.', 'social', 25, 'https://x.com/nairatag'),
 ('join-telegram', 'Join NairaTag Telegram', 'Join the community and submit your Telegram username for review.', 'community', 25, 'https://t.me/nairatag'),
 ('share-nairatag', 'Share your NairaTag', 'Share your public NairaTag profile and submit the post link for review.', 'social', 50, ''),
 ('claim-tag', 'Claim your NairaTag', 'Claim a NairaTag identity connected to your wallet.', 'identity', 100, '/'),
 ('refer-a-friend', 'Refer a friend', 'Invite a friend with your referral link. Referral completion is tracked separately.', 'referral', 100, '/#rewards')
on conflict (id) do nothing;

create or replace function public.arc_admin_credit_points(p_wallet text, p_points integer, p_key text, p_event text, p_metadata jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_inserted uuid;
begin
  if p_points <= 0 then return true; end if;
  insert into arc_reward_events(wallet_address,event_type,points,idempotency_key,metadata)
    values(lower(p_wallet),p_event,p_points,p_key,coalesce(p_metadata,'{}'::jsonb))
    on conflict(wallet_address,idempotency_key) do nothing returning id into v_inserted;
  if v_inserted is null then return true; end if;
  insert into arc_reward_accounts(wallet_address,points_balance,updated_at) values(lower(p_wallet),p_points,now())
    on conflict(wallet_address) do update set points_balance=arc_reward_accounts.points_balance+excluded.points_balance,updated_at=now();
  return true;
end $$;

create or replace function public.arc_admin_review_task(p_task_id text, p_wallet text, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_task arc_tasks%rowtype; v_progress arc_task_progress%rowtype;
begin
  if p_status not in ('approved','rejected') then raise exception 'Invalid review status'; end if;
  select * into v_task from arc_tasks where id=p_task_id and chain_id=5042002;
  if not found then raise exception 'Task not found'; end if;
  update arc_task_progress set status=p_status,reviewed_at=now(),updated_at=now()
    where task_id=p_task_id and wallet_address=lower(p_wallet) and status='submitted' returning * into v_progress;
  if not found then raise exception 'Submission already reviewed or missing'; end if;
  if p_status='approved' then perform arc_admin_credit_points(lower(p_wallet),v_task.points,'task:'||p_task_id||':'||lower(p_wallet),'task_approved',jsonb_build_object('taskId',p_task_id)); end if;
  return jsonb_build_object('task_id',v_progress.task_id,'wallet_address',v_progress.wallet_address,'status',v_progress.status,'deliverable_submission',v_progress.deliverable_submission,'submitted_at',v_progress.submitted_at,'reviewed_at',v_progress.reviewed_at);
end $$;

create or replace function public.arc_admin_review_voucher(p_claim_id uuid, p_status text, p_admin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_claim arc_voucher_claims%rowtype; v_points integer;
begin
  if p_status not in ('approved','rejected') then raise exception 'Invalid review status'; end if;
  select * into v_claim from arc_voucher_claims where id=p_claim_id and status='pending' for update;
  if not found then raise exception 'Claim already reviewed or missing'; end if;
  select points into v_points from arc_vouchers where id=v_claim.voucher_id;
  update arc_voucher_claims set status=p_status,reviewed_at=now(),reviewed_by=lower(p_admin) where id=p_claim_id returning * into v_claim;
  if p_status='approved' then perform arc_admin_credit_points(v_claim.wallet_address,v_points,'voucher:'||v_claim.id::text,'voucher_claim',jsonb_build_object('voucherId',v_claim.voucher_id,'reviewedBy',lower(p_admin))); end if;
  return jsonb_build_object('id',v_claim.id,'voucher_id',v_claim.voucher_id,'wallet_address',v_claim.wallet_address,'status',v_claim.status,'created_at',v_claim.created_at,'reviewed_at',v_claim.reviewed_at);
end $$;

grant execute on function public.arc_admin_credit_points(text,integer,text,text,jsonb) to service_role;
grant execute on function public.arc_admin_review_task(text,text,text) to service_role;
grant execute on function public.arc_admin_review_voucher(uuid,text,text) to service_role;
revoke all on function public.arc_admin_credit_points(text,integer,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.arc_admin_review_task(text,text,text) from public, anon, authenticated;
revoke all on function public.arc_admin_review_voucher(uuid,text,text) from public, anon, authenticated;
