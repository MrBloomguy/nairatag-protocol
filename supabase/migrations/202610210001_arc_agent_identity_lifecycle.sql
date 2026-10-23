-- Extend the existing Arc agent registry with identity provenance, aliases,
-- invocation metadata, and an auditable private-to-public lifecycle.
alter table public.arc_agents
  add column if not exists entity_type text not null default 'autonomous_agent',
  add column if not exists aliases text[] not null default '{}',
  add column if not exists provenance text not null default 'first_party',
  add column if not exists invocation_methods text[] not null default '{text,voice}',
  add column if not exists created_by text,
  add column if not exists validated_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists retired_at timestamptz;

alter table public.arc_agents alter column is_public set default false;
alter table public.arc_agents drop constraint if exists arc_agents_status_check;
alter table public.arc_agents add constraint arc_agents_status_check
  check (status in ('draft', 'validated', 'chat_only', 'active', 'paused', 'retired'));
alter table public.arc_agents drop constraint if exists arc_agents_entity_type_check;
alter table public.arc_agents add constraint arc_agents_entity_type_check
  check (entity_type in ('autonomous_agent', 'mcp_server', 'skill', 'custom_integration', 'composite_agent'));
alter table public.arc_agents drop constraint if exists arc_agents_provenance_check;
alter table public.arc_agents add constraint arc_agents_provenance_check
  check (provenance in ('first_party', 'community', 'open_source', 'third_party_commercial', 'unverified'));
alter table public.arc_agents drop constraint if exists arc_agents_invocation_methods_check;
alter table public.arc_agents add constraint arc_agents_invocation_methods_check
  check (invocation_methods <@ array['text', 'voice']::text[] and cardinality(invocation_methods) > 0);
alter table public.arc_agents drop constraint if exists arc_agents_public_lifecycle_check;
alter table public.arc_agents add constraint arc_agents_public_lifecycle_check
  check (not is_public or status in ('chat_only', 'active'));

create index if not exists arc_agents_aliases_gin_idx on public.arc_agents using gin (aliases);
create index if not exists arc_agents_discovery_idx on public.arc_agents (is_public, status, entity_type, tag);

-- Array prechecks in the API improve errors; this trigger + transaction lock
-- makes tag/alias uniqueness hold under concurrent admin requests as well.
create or replace function public.arc_agent_identity_alias_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(7312041101);
  if new.tag = any(new.aliases) then
    raise unique_violation using message = 'Arc agent tag cannot also be its alias';
  end if;
  if exists (
    select 1 from public.arc_agents current_agent
    where current_agent.id is distinct from new.id
      and (
        current_agent.tag = any(new.aliases)
        or new.tag = any(current_agent.aliases)
        or current_agent.aliases && new.aliases
      )
  ) then
    raise unique_violation using message = 'Arc agent tag or alias is already assigned';
  end if;
  return new;
end;
$$;

drop trigger if exists arc_agent_identity_alias_guard on public.arc_agents;
create trigger arc_agent_identity_alias_guard
before insert or update of tag, aliases on public.arc_agents
for each row execute function public.arc_agent_identity_alias_guard();

-- A real, server-executed read capability for capability-aware discovery.
insert into public.arc_agent_tools
  (agent_id, tool_key, display_name, description, input_schema, risk_level, provider, availability, executor_key)
select a.id, 'nairatag.discover_agents', 'Discover agents by capability',
       'Find public agents with an enabled registered capability that matches the requested task.',
       '{"type":"object","properties":{"query":{"type":"string","minLength":2,"maxLength":160},"invocationMethod":{"type":"string","enum":["text","voice"]}},"required":["query"],"additionalProperties":false}'::jsonb,
       'read_only', 'nairatag-registry', 'enabled', 'discover_agents'
from public.arc_agents a
where a.owner_type = 'platform' and a.status in ('chat_only', 'active')
on conflict (agent_id, tool_key) do nothing;

create table if not exists public.arc_agent_audit_log (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.arc_agents(id) on delete set null,
  agent_tag text not null,
  actor_wallet text check (actor_wallet is null or actor_wallet ~ '^0x[0-9a-f]{40}$'),
  actor_type text not null default 'wallet' check (actor_type in ('wallet', 'admin_token')),
  action text not null check (action in ('created', 'validated', 'published', 'suspended', 'reactivated', 'retired', 'aliases_updated')),
  from_status text,
  to_status text,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists arc_agent_audit_agent_idx
  on public.arc_agent_audit_log (agent_id, occurred_at desc);
alter table public.arc_agent_audit_log enable row level security;
-- No public policies: audit access stays on privileged server routes.
