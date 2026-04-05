create table if not exists public.community_votes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.app_users(id) on delete cascade,
  perfume_name text not null,
  week_key text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists community_votes_user_week_idx
  on public.community_votes (user_id, week_key);

create index if not exists community_votes_week_perfume_idx
  on public.community_votes (week_key, perfume_name);
