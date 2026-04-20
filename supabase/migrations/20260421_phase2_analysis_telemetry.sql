-- Phase 2: Analysis telemetry table
-- Logs per-request metadata: latency, model, prompt version, success/failure

create table if not exists public.analysis_telemetry (
  id uuid primary key default gen_random_uuid(),
  app_user_id text,
  mode text not null check (mode in ('text', 'notes', 'image')),
  prompt_version text not null default 'v3',
  model_version text,
  latency_ms integer,
  success boolean not null default true,
  cache_hit boolean not null default false,
  degraded boolean not null default false,
  retry_count integer not null default 0,
  confidence_score integer,
  has_db_match boolean not null default false,
  error_code text,
  created_at timestamptz not null default now()
);

-- Index for per-user queries (history, quota analysis)
create index if not exists analysis_telemetry_user_idx
  on public.analysis_telemetry (app_user_id, created_at desc);

-- Index for aggregate dashboards (daily stats)
create index if not exists analysis_telemetry_created_idx
  on public.analysis_telemetry (created_at desc);

-- Cleanup function: purge telemetry older than 90 days
create or replace function public.cleanup_analysis_telemetry()
returns void
language plpgsql
as $$
begin
  delete from public.analysis_telemetry
  where created_at < now() - interval '90 days';
end;
$$;
