-- Arc ERC-8004 social follows are separate from the legacy Celo timeline.
create table if not exists public.arc_agent_follows (
  follower_wallet text not null check (follower_wallet ~ '^0x[0-9a-f]{40}$'),
  agent_id numeric(78, 0) not null check (agent_id >= 0),
  agent_tag text not null check (agent_tag ~ '^[a-z0-9_]{2,32}$'),
  followed_at timestamptz not null default now(),
  primary key (follower_wallet, agent_id)
);

create index if not exists arc_agent_follows_agent_idx
  on public.arc_agent_follows (agent_id, followed_at desc);

alter table public.arc_agent_follows enable row level security;

-- Reads and writes go through the Arc wallet-signature API using the server key.
-- Do not add anon/authenticated table policies.
