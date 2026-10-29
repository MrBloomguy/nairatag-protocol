-- ═══════════════════════════════════════════════════════════════════════════
-- NAIRATAG ARC: ENFORCE 1-TAG-PER-ACCOUNT (EMAIL & WALLET) & SYNC TO AGENTS DIRECTORY
-- Migration: 202610290001_enforce_one_claim_per_identity_and_sync_agents.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create durable arc_claims table
create table if not exists public.arc_claims (
  id uuid primary key default gen_random_uuid(),
  tag text not null unique check (tag ~ '^[a-z0-9_]{2,32}$'),
  wallet_address text not null unique check (wallet_address ~ '^0x[0-9a-fA-F]{40}$'),
  email text,
  auth_provider text not null default 'wallet',
  network text not null default 'Arc Mainnet',
  tx_hash text,
  avatar_url text,
  claimed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- Case-insensitive unique index on email: no email can claim twice
create unique index if not exists arc_claims_lower_email_idx
  on public.arc_claims (lower(trim(email)))
  where email is not null and trim(email) <> '';

-- Case-insensitive unique index on wallet_address: no wallet can claim twice
create unique index if not exists arc_claims_lower_wallet_idx
  on public.arc_claims (lower(trim(wallet_address)));

-- Case-insensitive unique index on tag: no tag can be claimed twice
create unique index if not exists arc_claims_lower_tag_idx
  on public.arc_claims (lower(trim(tag)));

-- 2. Pre-seed verified identities
-- Sovereign Protocol Agents
insert into public.arc_claims (tag, wallet_address, auth_provider, network, claimed_at)
values
  ('nairatag', '0x653f773c9062e71a6554b42a9525fcd47fcc1693', 'wallet', 'Arc Mainnet', now()),
  ('bloom', '0x7c26a1f03339e2ea74d261d97f5ab9c38181af26', 'wallet', 'Arc Mainnet', now()),
  ('defillama', '0xbfa1f73f632a54bfd04e9925db6006135fca6ce6', 'wallet', 'Arc Mainnet', now()),
  ('meteo', '0x235d0aa81f1c375c3325214f2dd7f205487eae36', 'wallet', 'Arc Mainnet', now()),
  ('coingecko', '0x1abfc727335489f2914effd7e19c19c309850ef8', 'wallet', 'Arc Mainnet', now())
on conflict (tag) do update
  set wallet_address = excluded.wallet_address;

-- Ola (bound to bloombetgaming@gmail.com and 0x033d1fa7b2a3a25c9cc24254eacd47f0bdb83dfa)
insert into public.arc_claims (tag, wallet_address, email, auth_provider, network, claimed_at)
values ('ola', '0x033d1fa7b2a3a25c9cc24254eacd47f0bdb83dfa', 'bloombetgaming@gmail.com', 'circle', 'Arc Mainnet', now())
on conflict (tag) do update
  set wallet_address = excluded.wallet_address,
      email = coalesce(excluded.email, public.arc_claims.email);

-- 3. Sync all protocol agents into arc_agents table with proper status
insert into public.arc_agents (
  tag, display_name, category, description,
  owner_type, owner_wallet, runtime_type, runtime_version,
  status, is_public, entity_type, provenance, updated_at
) values
  ('nairatag', '₦NAIRATAG', 'Protocol', 'NairaTag Core Protocol Orchestrator on Arc Mainnet', 'platform', '0x653f773C9062e71A6554b42a9525fcD47fCC1693', 'nairatag-managed', '1.0.0', 'active', true, 'autonomous_agent', 'first_party', now()),
  ('bloom', '₦BLOOM', 'Sovereign Agent', 'Flagship autonomous settlement agent and bounty solver on Arc Mainnet', 'platform', '0x7c26a1F03339E2Ea74D261D97f5ab9C38181AF26', 'nairatag-managed', '1.0.0', 'active', true, 'autonomous_agent', 'first_party', now()),
  ('defillama', '₦DEFILLAMA', 'Oracle', 'Autonomous DeFi TVL & price benchmark feeds on Arc Mainnet', 'platform', '0xbfA1f73F632a54bFd04e9925dB6006135FcA6Ce6', 'nairatag-managed', '1.0.0', 'active', true, 'autonomous_agent', 'first_party', now()),
  ('meteo', '₦METEO', 'Weather & Logistics', 'Real-time weather data & commerce oracle for African cities', 'platform', '0x235d0Aa81F1c375c3325214f2dd7F205487eae36', 'nairatag-managed', '1.0.0', 'active', true, 'autonomous_agent', 'first_party', now()),
  ('coingecko', '₦COINGECKO', 'Forex', 'Autonomous USDC/NGN conversion rates and spot price verification', 'platform', '0x1abfC727335489f2914Effd7e19C19C309850Ef8', 'nairatag-managed', '1.0.0', 'active', true, 'autonomous_agent', 'first_party', now()),
  ('ola', '₦OLA', 'User Agent', 'Sovereign NairaTag user on Arc Mainnet', 'user', '0x033d1fa7b2a3a25c9cc24254eacd47f0bdb83dfa', 'nairatag-managed', '1.0.0', 'active', true, 'autonomous_agent', 'community', now())
on conflict (tag) do update
  set owner_wallet = excluded.owner_wallet,
      display_name = excluded.display_name,
      status = 'active',
      is_public = true,
      updated_at = now();

-- 4. Pre-claim check function (prevents user from claiming twice with email or wallet)
create or replace function public.arc_check_can_claim(
  p_tag text,
  p_wallet text,
  p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean_tag text := lower(trim(regexp_replace(p_tag, '^[₦$@#]', '')));
  v_wallet text := nullif(lower(trim(p_wallet)), '');
  v_email text := nullif(lower(trim(p_email)), '');
  v_wallet_claim record;
  v_email_claim record;
  v_tag_claim record;
begin
  -- Check if wallet already owns a tag
  if v_wallet is not null then
    select * into v_wallet_claim from public.arc_claims where lower(wallet_address) = v_wallet;
    if v_wallet_claim.id is not null then
      return jsonb_build_object(
        'can_claim', false,
        'reason', format('This wallet already owns ₦%s. Each account can hold only 1 NairaTag.', upper(v_wallet_claim.tag)),
        'existing_tag', v_wallet_claim.tag,
        'existing_wallet', v_wallet_claim.wallet_address
      );
    end if;
  end if;

  -- Check if email already claimed a tag
  if v_email is not null then
    select * into v_email_claim from public.arc_claims where lower(email) = v_email;
    if v_email_claim.id is not null then
      return jsonb_build_object(
        'can_claim', false,
        'reason', format('This email address (%s) already claimed ₦%s. Each account can hold only 1 NairaTag.', v_email, upper(v_email_claim.tag)),
        'existing_tag', v_email_claim.tag,
        'existing_email', v_email_claim.email
      );
    end if;
  end if;

  -- Check if tag is reserved protocol agent
  if v_clean_tag in ('nairatag', 'bloom', 'defillama', 'meteo', 'coingecko', 'arc') then
    if (v_clean_tag = 'bloom' and (v_wallet is null or v_wallet <> '0x7c26a1f03339e2ea74d261d97f5ab9c38181af26')) or
       (v_clean_tag = 'nairatag' and (v_wallet is null or v_wallet <> '0x653f773c9062e71a6554b42a9525fcd47fcc1693')) then
      return jsonb_build_object(
        'can_claim', false,
        'reason', format('₦%s is an official sovereign protocol agent on Arc.', upper(v_clean_tag))
      );
    end if;
  end if;

  -- Check if tag is already taken
  select * into v_tag_claim from public.arc_claims where lower(tag) = v_clean_tag;
  if v_tag_claim.id is not null then
    return jsonb_build_object(
      'can_claim', false,
      'reason', format('₦%s is already claimed on Arc.', upper(v_clean_tag)),
      'taken', true
    );
  end if;

  return jsonb_build_object('can_claim', true, 'tag', v_clean_tag);
end;
$$;

-- 5. Authoritative claim enforcement function (persists claim, syncs to arc_agents, awards points)
create or replace function public.arc_enforce_claim(
  p_tag text,
  p_wallet text,
  p_email text default null,
  p_tx_hash text default null,
  p_auth_provider text default 'wallet',
  p_avatar_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean_tag text := lower(trim(regexp_replace(p_tag, '^[₦$@#]', '')));
  v_wallet text := lower(trim(p_wallet));
  v_email text := nullif(lower(trim(p_email)), '');
  v_existing_email_claim record;
  v_existing_wallet_claim record;
  v_existing_tag_claim record;
begin
  -- 1. Validate tag format
  if v_clean_tag is null or length(v_clean_tag) < 3 or length(v_clean_tag) > 32 or v_clean_tag !~ '^[a-z0-9_]+$' then
    return jsonb_build_object('ok', false, 'error', 'NairaTag must be 3-32 characters (letters, numbers, underscores).');
  end if;

  -- 2. Reject reserved protocol agent names for regular users
  if v_clean_tag in ('nairatag', 'bloom', 'defillama', 'meteo', 'coingecko', 'arc') then
    if (v_clean_tag = 'bloom' and v_wallet <> '0x7c26a1f03339e2ea74d261d97f5ab9c38181af26') or
       (v_clean_tag = 'nairatag' and v_wallet <> '0x653f773c9062e71a6554b42a9525fcd47fcc1693') then
      return jsonb_build_object('ok', false, 'error', format('₦%s is an official sovereign protocol agent on Arc.', upper(v_clean_tag)));
    end if;
  end if;

  -- 3. Check if this tag is already claimed by someone else
  select * into v_existing_tag_claim from public.arc_claims where lower(tag) = v_clean_tag;
  if v_existing_tag_claim.id is not null and lower(v_existing_tag_claim.wallet_address) <> v_wallet then
    return jsonb_build_object('ok', false, 'error', format('₦%s has already been claimed on Arc.', upper(v_clean_tag)));
  end if;

  -- 4. Check if this wallet already claimed a DIFFERENT tag
  select * into v_existing_wallet_claim from public.arc_claims where lower(wallet_address) = v_wallet;
  if v_existing_wallet_claim.id is not null and lower(v_existing_wallet_claim.tag) <> v_clean_tag then
    return jsonb_build_object('ok', false, 'error', format('This wallet already owns ₦%s. Limit is strictly 1 NairaTag per account.', upper(v_existing_wallet_claim.tag)));
  end if;

  -- 5. Check if this email already claimed a DIFFERENT tag
  if v_email is not null and v_email <> '' then
    select * into v_existing_email_claim from public.arc_claims where lower(email) = v_email;
    if v_existing_email_claim.id is not null and (lower(v_existing_email_claim.tag) <> v_clean_tag or lower(v_existing_email_claim.wallet_address) <> v_wallet) then
      return jsonb_build_object('ok', false, 'error', format('This email address (%s) already claimed ₦%s. Limit is strictly 1 NairaTag per account.', v_email, upper(v_existing_email_claim.tag)));
    end if;
  end if;

  -- 6. Insert or update the claim in arc_claims
  insert into public.arc_claims (tag, wallet_address, email, auth_provider, tx_hash, avatar_url, claimed_at)
  values (v_clean_tag, v_wallet, v_email, coalesce(p_auth_provider, 'wallet'), p_tx_hash, p_avatar_url, now())
  on conflict (tag) do update
    set wallet_address = excluded.wallet_address,
        email = coalesce(excluded.email, public.arc_claims.email),
        tx_hash = coalesce(excluded.tx_hash, public.arc_claims.tx_hash),
        avatar_url = coalesce(excluded.avatar_url, public.arc_claims.avatar_url);

  -- 7. Sync into public.arc_agents so it IMMEDIATELY appears on the /agents page!
  insert into public.arc_agents (
    tag, display_name, category, description,
    owner_type, owner_wallet, runtime_type, runtime_version,
    status, is_public, entity_type, provenance,
    avatar_url, updated_at
  ) values (
    v_clean_tag,
    '₦' || upper(v_clean_tag),
    'User Agent',
    'Sovereign NairaTag user on Arc Mainnet',
    'user',
    v_wallet,
    'nairatag-managed',
    '1.0.0',
    'active',
    true,
    'autonomous_agent',
    'community',
    coalesce(p_avatar_url, 'https://api.dicebear.com/7.x/identicon/svg?seed=' || v_clean_tag),
    now()
  )
  on conflict (tag) do update
    set owner_wallet = excluded.owner_wallet,
        status = 'active',
        is_public = true,
        updated_at = now();

  -- 8. Backwards compatibility sync to user_claims
  insert into public.user_claims (tag, clean_tag, wallet_address, network, is_sub, tx_hash, reputation, claimed_at, metadata)
  values (
    '₦' || upper(v_clean_tag),
    v_clean_tag,
    v_wallet,
    'Arc Mainnet',
    false,
    p_tx_hash,
    100,
    now(),
    jsonb_build_object('email', v_email, 'auth_provider', p_auth_provider)
  )
  on conflict do nothing;

  -- 9. Reward event (20 points for tag claimed)
  insert into public.arc_reward_accounts(wallet_address) values(v_wallet) on conflict do nothing;
  insert into public.arc_reward_events(wallet_address, event_type, points, idempotency_key, metadata)
    values(v_wallet, 'tag_claimed', 20, 'tag-claim:' || v_clean_tag, jsonb_build_object('tag', v_clean_tag, 'email', v_email))
    on conflict (wallet_address, idempotency_key) do nothing;

  -- 10. Notification
  insert into public.arc_reward_notifications(wallet_address, title, body, type, action_label, url)
  values(
    v_wallet,
    'Your NairaTag is ready',
    format('Your ₦%s is claimed and active on Arc Mainnet. Share it with friends and earn points.', upper(v_clean_tag)),
    'tag',
    'View Profile',
    '/tag/' || upper(v_clean_tag)
  );

  return jsonb_build_object(
    'ok', true,
    'tag', v_clean_tag,
    'wallet', v_wallet,
    'email', v_email,
    'message', format('₦%s successfully registered to %s.', upper(v_clean_tag), v_wallet)
  );
end;
$$;

-- Grant execution permissions
grant execute on function public.arc_check_can_claim(text, text, text) to anon, authenticated, service_role;
grant execute on function public.arc_enforce_claim(text, text, text, text, text, text) to anon, authenticated, service_role;
