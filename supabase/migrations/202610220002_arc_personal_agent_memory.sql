-- Persistent per-wallet/per-tag personal agent context. The signed API is the
-- only access path; these tables intentionally have no anon/authenticated RLS policies.
create table if not exists public.arc_personal_agent_profiles (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  tag text not null check (tag ~ '^[a-z0-9_]{2,32}$'),
  agent_name text not null default '' check (length(agent_name) <= 48),
  communication_style text not null default 'balanced'
    check (communication_style in ('balanced', 'direct', 'friendly', 'professional', 'playful')),
  response_length text not null default 'balanced'
    check (response_length in ('concise', 'balanced', 'detailed')),
  language_preference text not null default 'auto'
    check (length(language_preference) <= 48),
  custom_instructions text not null default ''
    check (length(custom_instructions) <= 1200),
  personalization_enabled boolean not null default true,
  memory_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wallet_address, tag)
);

create table if not exists public.arc_personal_agent_memories (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.arc_personal_agent_profiles(id) on delete cascade,
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  tag text not null check (tag ~ '^[a-z0-9_]{2,32}$'),
  category text not null check (category in ('profile', 'working', 'episodic')),
  title text not null check (length(title) between 1 and 96),
  content text not null check (length(content) between 1 and 1200),
  source_conversation_id uuid,
  user_confirmed boolean not null default true,
  confidence numeric(4,3) not null default 1.000 check (confidence between 0 and 1),
  is_sensitive boolean not null default false,
  expires_at timestamptz,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arc_personal_agent_goals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.arc_personal_agent_profiles(id) on delete cascade,
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  tag text not null check (tag ~ '^[a-z0-9_]{2,32}$'),
  title text not null check (length(title) between 2 and 120),
  description text not null default '' check (length(description) <= 1200),
  next_action text not null default '' check (length(next_action) <= 500),
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'archived')),
  target_date date,
  related_conversation_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arc_personal_agent_audit_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.arc_personal_agent_profiles(id) on delete set null,
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  tag text not null check (tag ~ '^[a-z0-9_]{2,32}$'),
  action text not null check (action in (
    'profile_updated', 'memory_created', 'memory_updated', 'memory_deleted',
    'memories_cleared', 'goal_created', 'goal_updated', 'goal_deleted'
  )),
  object_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists arc_personal_agent_profiles_wallet_idx
  on public.arc_personal_agent_profiles (wallet_address, tag);
create index if not exists arc_personal_agent_memories_owner_idx
  on public.arc_personal_agent_memories (profile_id, created_at desc);
create index if not exists arc_personal_agent_memories_category_idx
  on public.arc_personal_agent_memories (profile_id, category, updated_at desc);
create index if not exists arc_personal_agent_goals_owner_idx
  on public.arc_personal_agent_goals (profile_id, status, updated_at desc);
create index if not exists arc_personal_agent_audit_owner_idx
  on public.arc_personal_agent_audit_events (profile_id, created_at desc);

alter table public.arc_personal_agent_profiles enable row level security;
alter table public.arc_personal_agent_memories enable row level security;
alter table public.arc_personal_agent_goals enable row level security;
alter table public.arc_personal_agent_audit_events enable row level security;

revoke all on public.arc_personal_agent_profiles from public, anon, authenticated;
revoke all on public.arc_personal_agent_memories from public, anon, authenticated;
revoke all on public.arc_personal_agent_goals from public, anon, authenticated;
revoke all on public.arc_personal_agent_audit_events from public, anon, authenticated;
grant all on public.arc_personal_agent_profiles to service_role;
grant all on public.arc_personal_agent_memories to service_role;
grant all on public.arc_personal_agent_goals to service_role;
grant all on public.arc_personal_agent_audit_events to service_role;

-- Retrieval, review, provenance, and asynchronous extraction lifecycle.
alter table public.arc_personal_agent_profiles
  add column if not exists auto_memory_enabled boolean not null default true,
  add column if not exists memory_generation integer not null default 0;

alter table public.arc_personal_agent_memories
  add column if not exists status text not null default 'active'
    check (status in ('active', 'pending_confirmation', 'superseded', 'archived')),
  add column if not exists source_type text not null default 'manual'
    check (source_type in ('manual', 'conversation')),
  add column if not exists importance smallint not null default 3
    check (importance between 1 and 5),
  add column if not exists confidence numeric(4,3)
    check (confidence is null or confidence between 0 and 1),
  add column if not exists content_hash text,
  add column if not exists supersedes_id uuid references public.arc_personal_agent_memories(id) on delete set null;

create unique index if not exists arc_personal_agent_memories_dedupe_idx
  on public.arc_personal_agent_memories (profile_id, content_hash)
  where content_hash is not null and status <> 'archived';

create table if not exists public.arc_personal_agent_memory_sources (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.arc_personal_agent_memories(id) on delete cascade,
  conversation_id uuid references public.arc_chat_conversations(id) on delete cascade,
  message_id uuid references public.arc_chat_messages(id) on delete set null,
  evidence_hash text,
  created_at timestamptz not null default now(),
  unique (memory_id, message_id)
);

create table if not exists public.arc_personal_agent_extraction_jobs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.arc_personal_agent_profiles(id) on delete cascade,
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  tag text not null check (tag ~ '^[a-z0-9_]{2,32}$'),
  conversation_id uuid not null references public.arc_chat_conversations(id) on delete cascade,
  source_message_id uuid not null references public.arc_chat_messages(id) on delete cascade,
  turn_id uuid not null,
  memory_generation integer not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts smallint not null default 0 check (attempts between 0 and 3),
  retry_at timestamptz not null default now(),
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, turn_id)
);

create index if not exists arc_personal_agent_sources_memory_idx
  on public.arc_personal_agent_memory_sources (memory_id, created_at desc);
create index if not exists arc_personal_agent_sources_message_idx
  on public.arc_personal_agent_memory_sources (message_id);
create index if not exists arc_personal_agent_jobs_retry_idx
  on public.arc_personal_agent_extraction_jobs (wallet_address, status, retry_at);
create index if not exists arc_personal_agent_memories_retrieval_idx
  on public.arc_personal_agent_memories (wallet_address, profile_id, status, category, updated_at desc);

alter table public.arc_personal_agent_memory_sources enable row level security;
alter table public.arc_personal_agent_extraction_jobs enable row level security;
revoke all on public.arc_personal_agent_memory_sources from public, anon, authenticated;
revoke all on public.arc_personal_agent_extraction_jobs from public, anon, authenticated;
grant all on public.arc_personal_agent_memory_sources to service_role;
grant all on public.arc_personal_agent_extraction_jobs to service_role;

create or replace function public.arc_personal_agent_clear_memories(p_profile_id uuid, p_wallet text, p_tag text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_generation integer;
  v_deleted integer;
begin
  update arc_personal_agent_profiles
    set memory_generation = memory_generation + 1, updated_at = now()
    where id = p_profile_id and wallet_address = lower(p_wallet) and tag = lower(p_tag)
    returning memory_generation into v_generation;
  if v_generation is null then raise exception 'Personal agent profile not found'; end if;

  update arc_personal_agent_extraction_jobs
    set status = 'cancelled', updated_at = now()
    where profile_id = p_profile_id and status in ('pending', 'processing');
  delete from arc_personal_agent_memories
    where profile_id = p_profile_id and wallet_address = lower(p_wallet) and tag = lower(p_tag);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.arc_personal_agent_clear_memories(uuid, text, text) from public, anon, authenticated;
grant execute on function public.arc_personal_agent_clear_memories(uuid, text, text) to service_role;
-- Remove conversation-derived memories when their final source conversation is deleted.
create or replace function public.arc_personal_agent_purge_orphaned_conversation_memories()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.arc_personal_agent_memories m
  where m.source_type = 'conversation'
    and exists (
      select 1 from public.arc_personal_agent_memory_sources s
      where s.memory_id = m.id and s.conversation_id = old.id
    )
    and not exists (
      select 1 from public.arc_personal_agent_memory_sources s
      where s.memory_id = m.id and s.conversation_id <> old.id
    );
  return old;
end;
$$;

drop trigger if exists arc_personal_agent_purge_orphaned_conversation_memories
  on public.arc_chat_conversations;
create trigger arc_personal_agent_purge_orphaned_conversation_memories
  before delete on public.arc_chat_conversations
  for each row execute function public.arc_personal_agent_purge_orphaned_conversation_memories();