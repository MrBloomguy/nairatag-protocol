-- Fan out a durable in-app announcement when a new open task is saved.
alter table public.arc_reward_notifications
  add column if not exists task_id text references public.arc_tasks(id) on delete cascade;

create unique index if not exists arc_reward_notifications_task_wallet_unique_idx
  on public.arc_reward_notifications(wallet_address, task_id)
  where task_id is not null;

create or replace function public.arc_notify_task_posted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward text;
begin
  if new.status <> 'open' then
    return new;
  end if;

  v_reward := trim(trailing '.' from trim(trailing '0' from to_char(new.reward_usdc, 'FM999999999999990.000000')));

  insert into public.arc_reward_notifications(wallet_address, title, body, type, action_label, url, task_id)
  select recipients.wallet_address,
         'New task available',
         format('%s posted "%s" with a %s USDC reward. Open Tasks to view the details.', new.creator_tag, new.title, v_reward),
         'task',
         'View tasks',
         '/#tasks',
         new.id
  from (
    select lower(wallet_address::text) as wallet_address from public.arc_reward_accounts
    union
    select lower(wallet_address::text) from public.user_claims
    union
    select lower(owner_wallet::text) from public.arc_agents where owner_wallet is not null
    union
    select lower(wallet_address::text) from public.arc_task_progress
    union
    select lower(wallet_address::text) from public.arc_voucher_claims
    union
    select lower(referrer_wallet::text) from public.arc_referrals
    union
    select lower(referred_wallet::text) from public.arc_referrals
    union
    select lower(wallet_address::text) from public.arc_reward_notifications
    union
    select lower(new.creator_wallet::text) where new.creator_wallet is not null
  ) as recipients
  where recipients.wallet_address ~ '^0x[0-9a-f]{40}$'
  on conflict (wallet_address, task_id) where task_id is not null do nothing;

  return new;
end;
$$;

drop trigger if exists arc_task_posted_notification on public.arc_tasks;
create trigger arc_task_posted_notification
after insert on public.arc_tasks
for each row
when (new.status = 'open')
execute function public.arc_notify_task_posted();

revoke all on function public.arc_notify_task_posted() from public, anon, authenticated;
