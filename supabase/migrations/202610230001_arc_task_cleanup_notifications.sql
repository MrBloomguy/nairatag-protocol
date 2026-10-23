-- Retire demonstration tasks and voucher offers seeded by the first Arc task rollout.
-- Keep historical task records and progress intact.
update public.arc_tasks
set status = 'closed', updated_at = now()
where id in ('b001','b002','b003','b004','b005','b006')
  and creator_wallet is null;

update public.arc_vouchers
set status = 'retired', updated_at = now()
where id in ('follow-x','join-telegram','share-nairatag','claim-tag','refer-a-friend');

create or replace function public.arc_admin_review_task(p_task_id text, p_wallet text, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_task arc_tasks%rowtype; v_progress arc_task_progress%rowtype;
begin
  if p_status not in ('approved','rejected') then raise exception 'Invalid review status'; end if;
  select * into v_task from arc_tasks where id=p_task_id and chain_id=5042002;
  if not found then raise exception 'Task not found'; end if;
  update arc_task_progress set status=p_status,reviewed_at=now(),updated_at=now()
    where task_id=p_task_id and wallet_address=lower(p_wallet) and status='submitted' returning * into v_progress;
  if not found then raise exception 'Submission already reviewed or missing'; end if;
  if p_status='approved' then
    perform arc_admin_credit_points(lower(p_wallet),v_task.points,'task:'||p_task_id||':'||lower(p_wallet),'task_approved',jsonb_build_object('taskId',p_task_id));
    insert into arc_reward_notifications(wallet_address,title,body,type,action_label,url)
    values(lower(p_wallet),'Task approved',format('Your submission for "%s" was approved. %s Protocol Points were added to your balance.',v_task.title,v_task.points),'task','View task','/#tasks');
  else
    insert into arc_reward_notifications(wallet_address,title,body,type,action_label,url)
    values(lower(p_wallet),'Task needs changes',format('Your submission for "%s" was not approved. Review the task requirements and submit again.',v_task.title),'task','View task','/#tasks');
  end if;
  return jsonb_build_object('task_id',v_progress.task_id,'wallet_address',v_progress.wallet_address,'status',v_progress.status,'deliverable_submission',v_progress.deliverable_submission,'submitted_at',v_progress.submitted_at,'reviewed_at',v_progress.reviewed_at);
end $$;

grant execute on function public.arc_admin_review_task(text,text,text) to service_role;
revoke all on function public.arc_admin_review_task(text,text,text) from public, anon, authenticated;

create or replace function public.arc_admin_record_task_payout(
  p_task_id text, p_wallet text, p_agent_tag text, p_amount numeric,
  p_transaction_hash text, p_log_index integer, p_verified_by text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_task arc_tasks%rowtype; v_progress arc_task_progress%rowtype; v_payout arc_task_payouts%rowtype;
begin
  select * into v_task from arc_tasks where id=p_task_id and chain_id=5042002 for update;
  if not found then raise exception 'Task not found'; end if;
  if v_task.assigned_agent_tag is null or v_task.assigned_agent_tag <> lower(p_agent_tag) then raise exception 'Task has no matching assigned agent'; end if;
  if v_task.reward_token <> 'USDC' or v_task.reward_usdc <> p_amount then raise exception 'Payout amount does not match task reward'; end if;
  select * into v_progress from arc_task_progress where task_id=p_task_id and wallet_address=lower(p_wallet) for update;
  if not found or v_progress.status <> 'approved' then raise exception 'Task submission must be approved before payout'; end if;
  insert into arc_task_payouts(task_id,wallet_address,agent_tag,token_address,token_symbol,amount,transaction_hash,log_index,verified_by)
  values(p_task_id,lower(p_wallet),lower(p_agent_tag),lower('0x3600000000000000000000000000000000000000'),'USDC',p_amount,lower(p_transaction_hash),p_log_index,lower(p_verified_by))
  returning * into v_payout;
  update arc_task_progress set status='paid',updated_at=now() where task_id=p_task_id and wallet_address=lower(p_wallet);
  insert into arc_reward_notifications(wallet_address,title,body,type,action_label,url)
  values(lower(p_wallet),'Task reward paid',format('%s USDC for "%s" was verified on Arc Testnet.',p_amount,v_task.title),'task','View task','/#tasks');
  return jsonb_build_object('task_id',v_payout.task_id,'wallet_address',v_payout.wallet_address,'agent_tag',v_payout.agent_tag,
    'amount',v_payout.amount,'token_symbol',v_payout.token_symbol,'transaction_hash',v_payout.transaction_hash,
    'log_index',v_payout.log_index,'paid_at',v_payout.paid_at);
end $$;

grant execute on function public.arc_admin_record_task_payout(text,text,text,numeric,text,integer,text) to service_role;
revoke all on function public.arc_admin_record_task_payout(text,text,text,numeric,text,integer,text) from public, anon, authenticated;
