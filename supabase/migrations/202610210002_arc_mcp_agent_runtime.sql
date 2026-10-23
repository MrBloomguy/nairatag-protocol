-- MCP credentials and connector state are privileged server data. This table
-- has RLS enabled and deliberately has no anon/authenticated policies.
create table if not exists public.arc_agent_integrations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null unique references public.arc_agents(id) on delete cascade,
  provider text not null default 'mcp',
  transport text not null default 'streamable_http' check (transport = 'streamable_http'),
  endpoint text not null check (length(endpoint) <= 2048),
  auth_type text not null default 'none' check (auth_type in ('none', 'bearer', 'api_key')),
  auth_header text,
  encrypted_auth_secret text,
  connection_status text not null default 'untested' check (connection_status in ('untested', 'healthy', 'unhealthy')),
  server_info jsonb not null default '{}'::jsonb,
  last_tested_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((auth_type = 'none' and encrypted_auth_secret is null and auth_header is null)
      or (auth_type = 'bearer' and encrypted_auth_secret is not null and auth_header = 'Authorization')
      or (auth_type = 'api_key' and encrypted_auth_secret is not null and auth_header ~ '^x-[a-z0-9-]{1,60}$'))
);

alter table public.arc_agent_integrations enable row level security;
create index if not exists arc_agent_integrations_status_idx
  on public.arc_agent_integrations (connection_status, updated_at desc);

-- This contains the remote MCP tool name and connector binding. It is never
-- included in public agent responses.
alter table public.arc_agent_tools
  add column if not exists runtime_config jsonb not null default '{}'::jsonb;

alter table public.arc_agent_integrations
  drop constraint if exists arc_agent_integrations_endpoint_check;
alter table public.arc_agent_integrations
  add constraint arc_agent_integrations_endpoint_check
  check (endpoint ~ '^https://[^[:space:]]+$');

alter table public.arc_agent_audit_log drop constraint if exists arc_agent_audit_log_action_check;
alter table public.arc_agent_audit_log add constraint arc_agent_audit_log_action_check
  check (action in ('created', 'validated', 'published', 'suspended', 'reactivated', 'retired', 'aliases_updated', 'mcp_tool_enabled', 'mcp_tested'));
