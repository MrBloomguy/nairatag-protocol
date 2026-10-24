-- Keep retries of NairaDots agent registration idempotent per owner and Dot.
create unique index if not exists arc_agents_nairadots_external_id_idx
  on public.arc_agents (owner_wallet, metadata_uri)
  where owner_type = 'user' and metadata_uri like 'nairadots://agent/%';

create index if not exists arc_agents_user_owner_idx
  on public.arc_agents (owner_wallet, created_at desc)
  where owner_type = 'user';
