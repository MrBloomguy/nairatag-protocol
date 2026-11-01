-- Make referral signup retries safe across browser retries and simultaneous API requests.
create or replace function public.arc_register_referral(
  p_referred_wallet text,
  p_referrer_wallet text,
  p_referrer_tag text,
  p_referred_tag text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referred text := lower(trim(p_referred_wallet));
  v_referrer text := lower(trim(p_referrer_wallet));
  v_inserted integer;
begin
  if v_referred = v_referrer then
    raise exception 'You cannot refer your own wallet';
  end if;

  insert into arc_reward_accounts(wallet_address)
  values (v_referred), (v_referrer)
  on conflict do nothing;

  insert into arc_referrals(referred_wallet, referrer_wallet, referrer_tag, referred_tag)
  values (v_referred, v_referrer, lower(p_referrer_tag), lower(p_referred_tag))
  on conflict (referred_wallet) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    if not exists (
      select 1 from arc_referrals
      where referred_wallet = v_referred
        and referrer_wallet = v_referrer
    ) then
      raise exception 'This wallet has already joined through a different referral';
    end if;
    return jsonb_build_object(
      'pointsEach', 100,
      'referrerWallet', v_referrer,
      'referredWallet', v_referred,
      'alreadyRegistered', true
    );
  end if;

  update arc_reward_accounts
  set points_balance = points_balance + 100, updated_at = now()
  where wallet_address in (v_referred, v_referrer);

  insert into arc_reward_events(wallet_address, event_type, points, idempotency_key, metadata)
  values
    (v_referred, 'referral_joined', 100, 'referral-signup:' || v_referred, jsonb_build_object('referrerTag', lower(p_referrer_tag))),
    (v_referrer, 'referral_signup', 100, 'referral-signup:' || v_referred, jsonb_build_object('referredTag', lower(p_referred_tag)));

  insert into arc_reward_notifications(wallet_address, title, body)
  values
    (v_referrer, 'A friend joined with your NairaTag', 'You and your friend each earned 100 Protocol Points. Their first confirmed Arc payment unlocks another referral reward.'),
    (v_referred, 'You joined with a referral', 'You earned 100 Protocol Points for joining through a friend.');

  return jsonb_build_object(
    'pointsEach', 100,
    'referrerWallet', v_referrer,
    'referredWallet', v_referred,
    'alreadyRegistered', false
  );
end;
$$;

revoke all on function public.arc_register_referral(text, text, text, text) from public, anon, authenticated;
grant execute on function public.arc_register_referral(text, text, text, text) to service_role;
