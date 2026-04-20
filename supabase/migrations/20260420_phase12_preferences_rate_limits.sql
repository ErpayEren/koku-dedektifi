-- Phase 12: User preferences + rate limiting infrastructure

-- Add preferences JSONB column to app_users
alter table if exists public.app_users
  add column if not exists preferences jsonb default '{}'::jsonb;

-- Add preferences JSONB column to users (operational mirror)
alter table if exists public.users
  add column if not exists preferences jsonb default '{}'::jsonb;

-- Sync preferences from app_users to users via existing trigger
-- (The sync_users_from_app_users trigger already handles upsert;
--  preferences will propagate on next app_users update)

-- Rate limiting table for per-user analyze quota
create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  endpoint text not null default 'analyze',
  window_start timestamptz not null default date_trunc('minute', now()),
  request_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists rate_limits_user_endpoint_window_idx
  on public.rate_limits (user_id, endpoint, window_start);

create index if not exists rate_limits_window_start_idx
  on public.rate_limits (window_start);

-- Cleanup old rate limit windows (called periodically)
create or replace function public.cleanup_rate_limits()
returns void
language plpgsql
as $$
begin
  delete from public.rate_limits
  where window_start < now() - interval '2 minutes';
end;
$$;

-- Feature flags table for global kill switches
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default true,
  description text,
  updated_at timestamptz not null default now()
);

insert into public.feature_flags (key, enabled, description)
values ('analyze_enabled', true, 'Global kill switch for the analyze endpoint')
on conflict (key) do nothing;

-- Analysis cache for idempotency (Phase 2 will use this)
create table if not exists public.analysis_cache (
  input_hash text primary key,
  result_json jsonb not null,
  model_version text,
  prompt_version text,
  cached_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists analysis_cache_expires_idx
  on public.analysis_cache (expires_at);
