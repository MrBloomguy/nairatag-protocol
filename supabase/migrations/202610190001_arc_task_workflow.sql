-- Durable task data for the Arc app. This is intentionally separate from the
-- Celo cNGN bounty/escrow tables and does not claim that Arc funds are escrowed.

create table if not exists public.arc_tasks (
  id text primary key,
  chain_id bigint not null default 5042002,
  title text not null,
  description text not null default '',
  category text not null,
  category_label text not null,
  creator_tag text not null,
  creator_wallet text,
  deliverable text not null default '',
  reward_usdc numeric(20, 6) not null default 0 check (reward_usdc >= 0),
  points integer not null default 0 check (points >= 0),
  deadline_label text not null default '',
  status text not null default 'open' check (status in ('open', 'closed', 'completed')),
  escrow_status text not null default 'not_integrated',
  escrow_contract text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arc_task_progress (
  task_id text not null references public.arc_tasks(id) on delete cascade,
  wallet_address text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'approved', 'rejected', 'paid')),
  deliverable_submission text,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (task_id, wallet_address)
);

create index if not exists arc_tasks_chain_status_idx on public.arc_tasks(chain_id, status, created_at desc);
create index if not exists arc_task_progress_wallet_idx on public.arc_task_progress(wallet_address, updated_at desc);

alter table public.arc_tasks enable row level security;
alter table public.arc_task_progress enable row level security;

-- Access is through the signed-wallet serverless API using the server key.
-- No anonymous client table policies are added.

insert into public.arc_tasks
  (id, chain_id, title, description, category, category_label, creator_tag, deliverable, reward_usdc, points, deadline_label, status, escrow_status)
values
  ('b001', 5042002, 'Test NairaTag Instant USDC Settlement on Arc Osaka', 'Execute and test a deterministic sub-second USDC payment using the Arc testnet memo registry and verify receipt on ArcScan.', 'test', '🧪 Testing', '₦CORE_DEV', 'ArcScan transaction hash showing finalized payment.', 25, 250, '2 days left', 'open', 'not_integrated'),
  ('b002', 5042002, 'Build Telegram Bot Adapter for ₦Tag Pay', 'Implement a GramJS or aiogram bot template that resolves ₦Tags and returns Arc Osaka payment links with deep-linking.', 'dev', '⚡ Engineering', '₦ARCLABS', 'GitHub repository with clean README and Dockerfile.', 120, 800, '4 days left', 'open', 'not_integrated'),
  ('b003', 5042002, 'Design 5 Sovereign NairaTag Social Banners', 'Create 5 high-impact, sleek 1200x628px social banners highlighting sub-second Arc Osaka finality and zero-gas UX.', 'design', '🎨 Design', '₦CREATIVE', 'Figma file + exported SVGs and PNG assets.', 45, 450, '1 day left', 'open', 'not_integrated'),
  ('b004', 5042002, 'Collect Jumia & Konga Product Price Feeds (7 Days)', 'Scrape and format daily pricing data for 50 consumer electronics in Lagos to supply decentralized AI agent pricing oracles.', 'data', '📊 Data & AI', '₦SHOP_AI', 'Timestamped JSON/CSV dataset with normalized currency fields.', 50, 500, '5 days left', 'open', 'not_integrated'),
  ('b005', 5042002, 'Write Technical Developer Guide for Arc ERC-8004', 'Author a step-by-step markdown tutorial explaining how autonomous AI agents register their identity and receive fees on Arc.', 'content', '✍️ Content', '₦FOUNDATION', 'Markdown guide with executable code snippets.', 60, 600, '3 days left', 'open', 'not_integrated'),
  ('b006', 5042002, 'Verify Nigerian Phone-to-NairaTag Resolver Accuracy', 'Test local MTN, Airtel, and Glo phone number resolution formats (080, 070, +234) into verified ₦Tags in the Arc terminal.', 'community', '📱 Community QA', '₦COMMUNITY', 'Short feedback note and resolution log.', 15, 150, '2 days left', 'open', 'not_integrated')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  deliverable = excluded.deliverable,
  reward_usdc = excluded.reward_usdc,
  points = excluded.points,
  deadline_label = excluded.deadline_label,
  updated_at = now();
