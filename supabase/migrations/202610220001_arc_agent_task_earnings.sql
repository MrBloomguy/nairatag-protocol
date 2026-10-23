-- Real task reward attribution for the Arc Agents leaderboard.
-- A task is attributed to one published agent tag; Protocol Points accrue after
-- admin approval, and USDC earnings accrue only after an on-chain payout is verified.
alter table public.arc_tasks
  add column if not exists assigned_agent_tag text references public.arc_agents(tag) on update cascade on delete set null,
  add column if not exists reward_token text not null default 'USDC' check (reward_token in ('USDC'));

create table if not exists public.arc_task_payouts (
  id uuid primary key default gen_random_uuid(),
  task_id text not null references public.arc_tasks(id) on delete restrict,
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  agent_tag text not null references public.arc_agents(tag) on update cascade on delete restrict,
  token_address text not null check (token_address = lower('0x3600000000000000000000000000000000000000')),
  token_symbol text not null check (token_symbol = 'USDC'),
  amount numeric(30, 6) not null check (amount > 0),
  transaction_hash text not null check (transaction_hash ~ '^0x[0-9a-f]{64}$'),
  log_index integer not null check (log_index >= 0),
  verified_by text not null check (verified_by ~ '^0x[0-9a-f]{40}$'),
  paid_at timestamptz not null default now(),
  unique (transaction_hash, log_index),
  unique (task_id, wallet_address)
);

create index if not exists arc_task_payouts_agent_paid_idx
  on public.arc_task_payouts (agent_tag, paid_at desc);
alter table public.arc_task_payouts enable row level security;

create or replace function public.arc_admin_record_task_payout(
  p_task_id text, p_wallet text, p_agent_tag text, p_amount numeric,
  p_transaction_hash text, p_log_index integer, p_verified_by text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_task arc_tasks%rowtype; v_progress arc_task_progress%rowtype; v_payout arc_task_payouts%rowtype;
begin
  select * into v_task from arc_tasks where id=p_task_id and chain_id=5042002 for update;
  if not found then raise exception 'Task not found'; end if;
  if v_task.assigned_agent_tag is null or v_task.assigned_agent_tag <> lower(p_agent_tag) then raise exception 'Task has no matching assigned agent'; end if;
  if v_task.reward_token <> 'USDC' or v_task.reward_usdc <> p_amount then raise exception 'Payout amount does not match task reward'; end if;
  select * into v_progress from arc_task_progress where task_id=p_task_id and wallet_address=lower(p_wallet) for update;
  if not found or v_progress.status <> 'approved' then raise exception 'Task submission must be approved before payout'; end if;
  insert into arc_task_payouts(task_id,wallet_address,agent_tag,token_address,token_symbol,amount,transaction_hash,log_index,verified_by)
  values(p_task_id,lower(p_wallet),lower(p_agent_tag),lower('0x3600000000000000000000000000000000000000'),'USDC',p_amount,lower(p_transaction_hash),p_log_index,lower(p_verified_by))
  returning * into v_payout;
  update arc_task_progress set status='paid',updated_at=now() where task_id=p_task_id and wallet_address=lower(p_wallet);
  return jsonb_build_object('task_id',v_payout.task_id,'wallet_address',v_payout.wallet_address,'agent_tag',v_payout.agent_tag,
    'amount',v_payout.amount,'token_symbol',v_payout.token_symbol,'transaction_hash',v_payout.transaction_hash,
    'log_index',v_payout.log_index,'paid_at',v_payout.paid_at);
end $$;

grant execute on function public.arc_admin_record_task_payout(text,text,text,numeric,text,integer,text) to service_role;
revoke all on function public.arc_admin_record_task_payout(text,text,text,numeric,text,integer,text) from public, anon, authenticated;
