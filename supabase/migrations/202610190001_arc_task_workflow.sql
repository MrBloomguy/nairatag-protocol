-- Durable task data for the Arc app. This is intentionally separate from the
-- Celo cNGN bounty/escrow tables and does not claim that Arc funds are escrowed.

create table if not exists public.arc_tasks (
  id text primary key,
  chain_id bigint not null default 5042002,
  title text not null,
  description text not null default '',
  category text not null,
  category_label text not null,
  creator_tag text not null,
  creator_wallet text,
  deliverable text not null default '',
  reward_usdc numeric(20, 6) not null default 0 check (reward_usdc >= 0),
  points integer not null default 0 check (points >= 0),
  deadline_label text not null default '',
  status text not null default 'open' check (status in ('open', 'closed', 'completed')),
  escrow_status text not null default 'not_integrated',
  escrow_contract text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arc_task_progress (
  task_id text not null references public.arc_tasks(id) on delete cascade,
  wallet_address text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'approved', 'rejected', 'paid')),
  deliverable_submission text,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (task_id, wallet_address)
);

create index if not exists arc_tasks_chain_status_idx on public.arc_tasks(chain_id, status, created_at desc);
create index if not exists arc_task_progress_wallet_idx on public.arc_task_progress(wallet_address, updated_at desc);

alter table public.arc_tasks enable row level security;
alter table public.arc_task_progress enable row level security;

-- Access is through the signed-wallet serverless API using the server key.
-- No anonymous client table policies are added.
