-- Keep the onboarding welcome bonus at 100 points after removing the appearance step.
create or replace function public.arc_claim_agent_onboarding_reward(p_wallet text, p_tag text, p_step text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_wallet text := lower(p_wallet);
  v_tag text := lower(p_tag);
  v_points integer;
  v_inserted integer;
begin
  v_points := case p_step
    when 'identity' then 20
    when 'avatar' then 20
    when 'personality' then 10
    when 'permissions' then 10
    when 'firstInteraction' then 40
    else null
  end;
  if v_points is null then raise exception 'Invalid agent onboarding step'; end if;

  insert into arc_reward_accounts(wallet_address) values(v_wallet) on conflict do nothing;
  insert into arc_reward_events(wallet_address,event_type,points,idempotency_key,metadata)
    values(v_wallet,'agent_onboarding',v_points,'agent-onboarding:'||v_tag||':'||p_step,jsonb_build_object('tag',v_tag,'step',p_step))
    on conflict(wallet_address,idempotency_key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    update arc_reward_accounts set points_balance=points_balance+v_points,updated_at=now() where wallet_address=v_wallet;
    insert into arc_reward_notifications(wallet_address,title,body)
      values(v_wallet,'Agent setup reward',format('You earned %s Protocol Points for your agent setup.',v_points));
  end if;
  return jsonb_build_object('awarded',v_inserted=1,'step',p_step,'points',v_points);
end $$;

revoke all on function public.arc_claim_agent_onboarding_reward(text,text,text) from public, anon, authenticated;
grant execute on function public.arc_claim_agent_onboarding_reward(text,text,text) to service_role;
