-- Persistent conversations for the Arc app. Celo chat storage remains separate.
create table if not exists public.arc_chat_conversations (
  id uuid primary key,
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  agent_tag text not null default 'arc',
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arc_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.arc_chat_conversations(id) on delete cascade,
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  turn_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  agent_tag text not null default 'arc',
  content text not null check (length(content) between 1 and 12000),
  created_at timestamptz not null default now(),
  unique (turn_id, role)
);

create index if not exists arc_chat_conversations_wallet_updated_idx
  on public.arc_chat_conversations (wallet_address, updated_at desc);
create index if not exists arc_chat_messages_conversation_created_idx
  on public.arc_chat_messages (conversation_id, created_at asc);

alter table public.arc_chat_conversations enable row level security;
alter table public.arc_chat_messages enable row level security;

-- The signed-wallet API is the only read/write path; no anon table policies.
create or replace function public.arc_chat_append_turn(
  p_conversation_id uuid,
  p_wallet text,
  p_agent_tag text,
  p_title text,
  p_turn_id uuid,
  p_user_content text,
  p_assistant_content text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_wallet text := lower(p_wallet);
  v_owner text;
begin
  if p_user_content is null or length(p_user_content) not between 1 and 12000
    or p_assistant_content is null or length(p_assistant_content) not between 1 and 12000 then
    raise exception 'Invalid chat turn content';
  end if;

  insert into arc_chat_conversations (id, wallet_address, agent_tag, title)
  values (p_conversation_id, v_wallet, coalesce(nullif(p_agent_tag, ''), 'arc'), left(coalesce(p_title, ''), 120))
  on conflict (id) do nothing;

  select wallet_address into v_owner from arc_chat_conversations where id = p_conversation_id for update;
  if v_owner is distinct from v_wallet then raise exception 'Conversation does not belong to this wallet'; end if;

  insert into arc_chat_messages (conversation_id, wallet_address, turn_id, role, agent_tag, content)
  values
    (p_conversation_id, v_wallet, p_turn_id, 'user', coalesce(nullif(p_agent_tag, ''), 'arc'), p_user_content),
    (p_conversation_id, v_wallet, p_turn_id, 'assistant', coalesce(nullif(p_agent_tag, ''), 'arc'), p_assistant_content)
  on conflict (turn_id, role) do nothing;

  update arc_chat_conversations set
    agent_tag = coalesce(nullif(p_agent_tag, ''), 'arc'),
    title = case when title = '' then left(coalesce(p_title, ''), 120) else title end,
    updated_at = now()
  where id = p_conversation_id;

  return jsonb_build_object('conversationId', p_conversation_id, 'saved', true);
end;
$$;

revoke all on function public.arc_chat_append_turn(uuid, text, text, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.arc_chat_append_turn(uuid, text, text, text, uuid, text, text) to service_role;
