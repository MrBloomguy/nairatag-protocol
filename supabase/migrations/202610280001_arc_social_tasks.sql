-- Four individual, database-backed NairaTag social tasks. Claims are reviewed
-- before their points are credited through arc_admin_review_voucher.
insert into public.arc_vouchers (id, title, description, category, points, action_url, status)
values
  ('social-follow-x', 'Follow NairaTag on X', 'Follow the official NairaTag X account, then submit your X handle or profile link for review.', 'social', 25, 'https://x.com/nairagtaghq', 'active'),
  ('social-follow-instagram', 'Follow NairaTag on Instagram', 'Follow the official NairaTag Instagram account, then submit your Instagram handle or profile link for review.', 'social', 25, 'https://instagram.com/nairataghq', 'active'),
  ('social-join-telegram-channel', 'Join the NairaTag Telegram channel', 'Join the NairaTag updates channel, then submit your Telegram username for review.', 'community', 25, 'https://t.me/nairatagupdates', 'active'),
  ('social-join-telegram-group', 'Join the NairaTag Telegram group', 'Join the NairaTag community group, then submit your Telegram username for review.', 'community', 25, 'https://t.me/nairatag', 'active')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  points = excluded.points,
  action_url = excluded.action_url,
  status = 'active',
  updated_at = now();

-- Allow a rejected submission to be corrected and resubmitted while preventing
-- duplicate pending or already approved rewards for the same wallet and task.
alter table public.arc_voucher_claims
  drop constraint if exists arc_voucher_claims_voucher_id_wallet_address_key;
drop index if exists public.arc_voucher_claims_voucher_wallet_unique_idx;
create unique index if not exists arc_voucher_claims_voucher_wallet_unique_idx
  on public.arc_voucher_claims (voucher_id, wallet_address)
  where status in ('pending', 'approved');
