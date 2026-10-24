-- Read onboarding progress from the same ledger that powers Protocol Points.
-- Prior deployments used 30 points for firstInteraction; top up those existing
-- claims once so the current 100 point schedule stays consistent.
with upgraded as (
  update public.arc_reward_events
     set points = 40
   where event_type = 'agent_onboarding'
     and idempotency_key like 'agent-onboarding:%:firstInteraction'
     and points = 30
  returning wallet_address
), topups as (
  select wallet_address, count(*)::bigint * 10 as points
    from upgraded
   group by wallet_address
)
update public.arc_reward_accounts a
   set points_balance = a.points_balance + t.points,
       updated_at = now()
  from topups t
 where a.wallet_address = t.wallet_address;

create or replace function public.arc_agent_onboarding_state(p_wallet text, p_tag text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_wallet text := lower(trim(p_wallet));
  v_tag text := lower(trim(p_tag));
  v_steps jsonb;
  v_points integer;
begin
  select
    coalesce(jsonb_object_agg(metadata->>'step', true), '{}'::jsonb),
    coalesce(sum(points), 0)::integer
  into v_steps, v_points
  from public.arc_reward_events
  where wallet_address = v_wallet
    and event_type = 'agent_onboarding'
    and metadata->>'tag' = v_tag
    and metadata->>'step' in ('identity', 'avatar', 'personality', 'permissions', 'firstInteraction');

  return jsonb_build_object(
    'tag', v_tag,
    'points', least(v_points, 100),
    'steps', jsonb_build_object(
      'identity', coalesce((v_steps->>'identity')::boolean, false),
      'avatar', coalesce((v_steps->>'avatar')::boolean, false),
      'personality', coalesce((v_steps->>'personality')::boolean, false),
      'permissions', coalesce((v_steps->>'permissions')::boolean, false),
      'firstInteraction', coalesce((v_steps->>'firstInteraction')::boolean, false)
    ),
    'completed', v_points >= 100
  );
end $$;

revoke all on function public.arc_agent_onboarding_state(text,text) from public, anon, authenticated;
grant execute on function public.arc_agent_onboarding_state(text,text) to service_role;
