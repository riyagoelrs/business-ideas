-- Riya OS: Market Intelligence v1
create extension if not exists pgcrypto;

create table if not exists public.market_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  brief_date date not null default current_date,
  title text not null,
  summary text not null default '',
  signals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, brief_date)
);

create table if not exists public.market_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  opportunity_type text not null default 'Sector',
  status text not null default 'New',
  thesis text not null,
  why_now text,
  novelty_score numeric(4,1) check (novelty_score between 0 and 10),
  market_score numeric(4,1) check (market_score between 0 and 10),
  timing_score numeric(4,1) check (timing_score between 0 and 10),
  evidence_score numeric(4,1) check (evidence_score between 0 and 10),
  next_test text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_research_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opportunity_id uuid references public.market_opportunities(id) on delete set null,
  title text not null,
  domain text not null default 'Markets',
  priority text not null default 'Medium',
  is_done boolean not null default false,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.market_workstreams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opportunity_id uuid references public.market_opportunities(id) on delete cascade,
  domain text not null,
  title text not null,
  detail text not null default '',
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists market_briefings_user_date_idx on public.market_briefings(user_id, brief_date desc);
create index if not exists market_opportunities_user_created_idx on public.market_opportunities(user_id, created_at desc);
create index if not exists market_research_tasks_user_done_idx on public.market_research_tasks(user_id, is_done, created_at desc);
create index if not exists market_workstreams_user_created_idx on public.market_workstreams(user_id, created_at desc);
create index if not exists market_research_tasks_opportunity_idx on public.market_research_tasks(opportunity_id);
create index if not exists market_workstreams_opportunity_idx on public.market_workstreams(opportunity_id);

alter table public.market_briefings enable row level security;
alter table public.market_opportunities enable row level security;
alter table public.market_research_tasks enable row level security;
alter table public.market_workstreams enable row level security;

revoke all on table public.market_briefings, public.market_opportunities, public.market_research_tasks, public.market_workstreams from anon;
grant select, insert, update, delete on table public.market_briefings, public.market_opportunities, public.market_research_tasks, public.market_workstreams to authenticated;

create policy "market_briefings_owner_all" on public.market_briefings for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "market_opportunities_owner_all" on public.market_opportunities for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "market_research_tasks_owner_all" on public.market_research_tasks for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "market_workstreams_owner_all" on public.market_workstreams for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
