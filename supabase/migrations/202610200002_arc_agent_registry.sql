-- Registry for Arc-first-party and future user/partner agents.
-- Agent tags here are platform identities. ERC-8004 verification is recorded
-- separately and is never inferred from a database row.

create table if not exists public.arc_agents (
  id uuid primary key default gen_random_uuid(),
  tag text not null unique check (tag ~ '^[a-z0-9_]{2,32}$'),
  display_name text not null,
  category text not null,
  description text not null default '',
  avatar_url text,
  owner_type text not null default 'platform' check (owner_type in ('platform', 'user', 'partner')),
  owner_wallet text,
  runtime_type text not null default 'nairatag-managed',
  runtime_version text not null default '1.0.0',
  status text not null default 'chat_only' check (status in ('chat_only', 'active', 'paused', 'retired')),
  is_public boolean not null default true,
  erc8004_agent_id numeric(78, 0),
  erc8004_registry text,
  metadata_uri text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arc_agent_tools (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.arc_agents(id) on delete cascade,
  tool_key text not null check (tool_key ~ '^[a-z][a-z0-9_.-]{2,80}$'),
  display_name text not null,
  description text not null,
  input_schema jsonb not null default '{"type":"object","properties":{},"additionalProperties":false}'::jsonb,
  risk_level text not null default 'read_only' check (risk_level in ('read_only', 'reversible_write', 'external_commitment', 'financial')),
  provider text not null default 'nairatag',
  availability text not null default 'planned' check (availability in ('enabled', 'planned', 'blocked', 'retired')),
  availability_reason text,
  executor_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id, tool_key)
);

create index if not exists arc_agents_public_status_idx on public.arc_agents (is_public, status, tag);
create index if not exists arc_agent_tools_agent_availability_idx on public.arc_agent_tools (agent_id, availability, tool_key);

alter table public.arc_agents enable row level security;
alter table public.arc_agent_tools enable row level security;

-- No anonymous policies. The Arc server API is the registry read path; writes
-- remain privileged and must not be exposed as model-callable operations.

-- These are visible catalog entries, not enabled capabilities. A tool becomes
-- callable only after its server-side executor, policy and provider checks exist.
insert into public.arc_agent_tools (agent_id, tool_key, display_name, description, input_schema, risk_level, provider, availability, availability_reason)
select a.id, planned.tool_key, planned.display_name, planned.description, planned.input_schema::jsonb,
       planned.risk_level, planned.provider, 'planned', planned.reason
from public.arc_agents a
cross join (values
  ('nairatag.resolve_tag', 'Resolve a NairaTag', 'Resolve a NairaTag on Arc and return the observed owner address.', '{"type":"object","properties":{"tag":{"type":"string","minLength":2,"maxLength":32}},"required":["tag"],"additionalProperties":false}', 'read_only', 'nairatag-registry', 'Enable after the Arc read adapter and chain verification are registered.'),
  ('arc.list_tasks', 'List Arc tasks', 'Read open Arc task records from the Arc task database.', '{"type":"object","properties":{"category":{"type":"string","maxLength":32}},"additionalProperties":false}', 'read_only', 'nairatag-database', 'Enable after the read adapter, filters and output limits are registered.'),
  ('food.search', 'Search food', 'Search provider-backed restaurants and available menus.', '{"type":"object","properties":{"query":{"type":"string","maxLength":160},"area":{"type":"string","maxLength":120}},"required":["query"],"additionalProperties":false}', 'read_only', 'food-provider', 'Requires authorized marketplace or merchant API access.'),
  ('food.order.create', 'Place food order', 'Submit an approved, provider-quoted order.', '{"type":"object","properties":{"quoteId":{"type":"string"},"approvalId":{"type":"string"}},"required":["quoteId","approvalId"],"additionalProperties":false}', 'financial', 'food-provider', 'Requires provider order access, verified quote support, approval records and reconciliation.'),
  ('food.voucher.check', 'Check food benefit eligibility', 'Check eligibility with an authorized food assistance provider.', '{"type":"object","properties":{"programId":{"type":"string"}},"required":["programId"],"additionalProperties":false}', 'read_only', 'food-benefits-provider', 'Requires an active food-benefits program and eligibility API.'),
  ('ride.quote', 'Get ride quote', 'Request a live ride fare and availability quote.', '{"type":"object","properties":{"pickup":{"type":"string"},"destination":{"type":"string"}},"required":["pickup","destination"],"additionalProperties":false}', 'read_only', 'ride-provider', 'Requires an authorized provider integration and location permission.'),
  ('ride.book', 'Book ride', 'Book a ride after exact quote and fare approval.', '{"type":"object","properties":{"quoteId":{"type":"string"},"approvalId":{"type":"string"}},"required":["quoteId","approvalId"],"additionalProperties":false}', 'external_commitment', 'ride-provider', 'Requires production booking access and user approval.'),
  ('music.search', 'Search music', 'Search music catalog using a connected provider account.', '{"type":"object","properties":{"query":{"type":"string","maxLength":160}},"required":["query"],"additionalProperties":false}', 'read_only', 'music-provider', 'Requires an approved catalog provider and OAuth connection.'),
  ('music.playlist.create', 'Create playlist', 'Create a playlist for the connected user.', '{"type":"object","properties":{"name":{"type":"string","maxLength":100},"trackIds":{"type":"array","items":{"type":"string"},"maxItems":100}},"required":["name","trackIds"],"additionalProperties":false}', 'reversible_write', 'music-provider', 'Requires user OAuth scopes and explicit confirmation.'),
  ('dev.audit_contract', 'Audit contract', 'Run configured static-analysis and bytecode tools against supplied source.', '{"type":"object","properties":{"source":{"type":"string","maxLength":100000}},"required":["source"],"additionalProperties":false}', 'read_only', 'isolated-code-runner', 'Requires an isolated, resource-limited analysis worker and evidence capture.'),
  ('designer.generate_asset', 'Generate design asset', 'Create a downloadable design artifact from an approved brief.', '{"type":"object","properties":{"brief":{"type":"string","maxLength":4000},"format":{"type":"string","enum":["svg","png"]}},"required":["brief","format"],"additionalProperties":false}', 'reversible_write', 'design-provider', 'Requires a configured generation provider and artifact storage.'),
  ('escrow.propose', 'Propose escrow terms', 'Create a non-binding draft with parties, amount, asset and milestone conditions.', '{"type":"object","properties":{"parties":{"type":"array","items":{"type":"string"},"minItems":2,"maxItems":10},"amount":{"type":"string"},"asset":{"type":"string"},"milestones":{"type":"array","items":{"type":"string"},"minItems":1,"maxItems":20}},"required":["parties","amount","asset","milestones"],"additionalProperties":false}', 'read_only', 'nairatag-escrow', 'No production escrow contract or dispute workflow is configured.')
) as planned(tool_key, display_name, description, input_schema, risk_level, provider, reason)
where (a.tag = 'chowdeck' and planned.tool_key in ('food.search', 'food.order.create'))
   or (a.tag = 'food' and planned.tool_key = 'food.voucher.check')
   or (a.tag = 'ride' and planned.tool_key like 'ride.%')
   or (a.tag = 'music' and planned.tool_key like 'music.%')
   or (a.tag = 'dev' and planned.tool_key like 'dev.%')
   or (a.tag = 'designer' and planned.tool_key like 'designer.%')
   or (a.tag = 'escrow' and planned.tool_key like 'escrow.%')
on conflict (agent_id, tool_key) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  input_schema = excluded.input_schema,
  risk_level = excluded.risk_level,
  provider = excluded.provider,
  availability = case when arc_agent_tools.availability = 'enabled' then 'enabled' else excluded.availability end,
  availability_reason = case when arc_agent_tools.availability = 'enabled' then null else excluded.availability_reason end,
  updated_at = now();

-- Implemented native read tools. Their executor keys map to a hard-coded
-- server-side allowlist; registry rows cannot define executable code.
insert into public.arc_agent_tools
  (agent_id, tool_key, display_name, description, input_schema, risk_level, provider, availability, executor_key, availability_reason)
select a.id, native.tool_key, native.display_name, native.description, native.input_schema::jsonb,
       'read_only', 'nairatag', 'enabled', native.executor_key, null
from public.arc_agents a
cross join (values
  ('nairatag.resolve_tag', 'Resolve a NairaTag', 'Resolve a registered NairaTag on Arc and return its current owner address.', '{"type":"object","properties":{"tag":{"type":"string","minLength":2,"maxLength":32}},"required":["tag"],"additionalProperties":false}', 'resolve_tag'),
  ('arc.list_tasks', 'List Arc tasks', 'Read currently open tasks from the Arc task registry.', '{"type":"object","properties":{"category":{"type":"string","maxLength":32}},"additionalProperties":false}', 'list_arc_tasks')
) as native(tool_key, display_name, description, input_schema, executor_key)
where a.owner_type = 'platform' and a.status in ('chat_only', 'active')
on conflict (agent_id, tool_key) do update set
  availability = 'enabled', executor_key = excluded.executor_key,
  availability_reason = null, updated_at = now();

create table if not exists public.arc_agent_runs (
  id uuid primary key,
  conversation_id uuid not null references public.arc_chat_conversations(id) on delete cascade,
  agent_id uuid not null references public.arc_agents(id),
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  status text not null check (status in ('planning', 'awaiting_approval', 'executing', 'reconciling', 'succeeded', 'failed', 'cancelled')),
  error_code text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.arc_agent_run_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.arc_agent_runs(id) on delete cascade,
  sequence integer not null,
  event_type text not null check (event_type in ('run_status', 'tool_started', 'tool_completed', 'tool_failed', 'approval_requested', 'approval_decided', 'provider_update')),
  tool_key text,
  input jsonb,
  output jsonb,
  error_code text,
  occurred_at timestamptz not null default now(),
  unique (run_id, sequence)
);

create table if not exists public.arc_agent_approvals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.arc_agent_runs(id) on delete cascade,
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  agent_tag text not null,
  provider text not null,
  action_digest text not null,
  proposed_action jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired', 'executed')),
  expires_at timestamptz not null,
  decided_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists arc_agent_runs_wallet_idx on public.arc_agent_runs (wallet_address, started_at desc);
create index if not exists arc_agent_events_run_idx on public.arc_agent_run_events (run_id, sequence);
create index if not exists arc_agent_approvals_run_idx on public.arc_agent_approvals (run_id, status, expires_at);

alter table public.arc_agent_runs enable row level security;
alter table public.arc_agent_run_events enable row level security;
alter table public.arc_agent_approvals enable row level security;
