-- Keep the tag claim confirmation friendly and useful for non-technical users.
update public.arc_reward_notifications
set title = 'Your NairaTag is ready',
    body = regexp_replace(body, ' on Arc', '', 'gi')
where title = 'Your NairaTag is live on Arc';

create or replace function public.arc_record_tag_claim(p_wallet text, p_tag text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_wallet text := lower(p_wallet);
  v_tag text := lower(p_tag);
  v_recorded boolean;
begin
  insert into arc_reward_accounts(wallet_address) values(v_wallet) on conflict do nothing;
  insert into arc_reward_events(wallet_address,event_type,points,idempotency_key,metadata)
    values(v_wallet,'tag_claimed',0,'tag-claim:'||v_tag,jsonb_build_object('tag',v_tag))
    on conflict(wallet_address,idempotency_key) do nothing;
  v_recorded := found;
  if v_recorded then
    insert into arc_reward_notifications(wallet_address,title,body)
    values(v_wallet,'Your NairaTag is ready',format('Your ₦%s is ready. Share it with friends, find your community, and earn points through NairaTag activities.',v_tag));
  end if;
  return jsonb_build_object('recorded',v_recorded);
end $$;
