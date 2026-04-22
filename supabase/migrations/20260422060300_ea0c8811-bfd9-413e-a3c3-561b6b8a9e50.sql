create table if not exists public.bill_summaries (
  id uuid primary key default gen_random_uuid(),
  bill_id text not null,
  jurisdiction text not null default 'federal',
  plain_summary text not null,
  community_impact_template text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bill_id, jurisdiction)
);

create table if not exists public.user_tracked_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bill_id text not null,
  jurisdiction text not null default 'federal',
  bill_number text,
  bill_title text,
  status text,
  last_action text,
  last_action_date date,
  tracked_at timestamptz not null default now(),
  unique (user_id, bill_id, jurisdiction)
);

create table if not exists public.user_civic_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  civic_xp int not null default 0,
  bills_tracked_count int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_action_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.bill_summaries enable row level security;
alter table public.user_tracked_bills enable row level security;
alter table public.user_civic_stats enable row level security;

drop policy if exists "bill_summaries_read" on public.bill_summaries;
create policy "bill_summaries_read" on public.bill_summaries
  for select using (auth.role() = 'authenticated');

drop policy if exists "tracked_bills_owner" on public.user_tracked_bills;
create policy "tracked_bills_owner" on public.user_tracked_bills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "civic_stats_owner" on public.user_civic_stats;
create policy "civic_stats_owner" on public.user_civic_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);