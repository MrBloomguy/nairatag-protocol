-- Remove only the known seeded demo tasks/profiles from databases where the
-- earlier migrations have already been applied. Preserve all user-created rows.
update public.arc_agents
set status = 'retired', is_public = false, updated_at = now()
where tag in ('chowdeck', 'dev', 'designer', 'food', 'ride', 'escrow', 'music');

delete from public.arc_tasks
where id in ('b001', 'b002', 'b003', 'b004', 'b005', 'b006');