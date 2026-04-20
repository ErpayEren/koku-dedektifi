-- Phase 3: Functional Gaps
-- Adds slug + is_public to analyses, perfumes search indexes, trending view

-- 1. analyses: slug + public sharing
alter table public.analyses
  add column if not exists slug text,
  add column if not exists is_public boolean not null default false;

create unique index if not exists analyses_slug_unique_idx
  on public.analyses (slug)
  where slug is not null;

create index if not exists analyses_is_public_idx
  on public.analyses (is_public)
  where is_public = true;

-- Slug generation helper
create or replace function public.generate_analysis_slug(
  p_brand text,
  p_name text,
  p_id uuid
) returns text
language plpgsql
as $$
declare
  v_base text;
  v_hash text;
begin
  v_base := lower(
    regexp_replace(
      coalesce(p_brand, '') || '-' || coalesce(p_name, 'parfum'),
      '[^a-z0-9\-]', '-', 'g'
    )
  );
  v_base := regexp_replace(v_base, '-+', '-', 'g');
  v_base := trim(both '-' from v_base);
  v_hash := substr(replace(p_id::text, '-', ''), 1, 6);
  return v_base || '-' || v_hash;
end;
$$;

-- 2. perfumes table: pg_trgm full-text search
create extension if not exists pg_trgm;

-- Drop old index if exists and recreate with trgm
drop index if exists perfumes_name_trgm_idx;

create index if not exists perfumes_fts_trgm_idx
  on public.perfumes using gin (
    (lower(coalesce(name, '')) || ' ' || lower(coalesce(brand, ''))) gin_trgm_ops
  );

-- Also keep pg_websearch index for ranking
create index if not exists perfumes_fts_websearch_idx
  on public.perfumes using gin (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(brand, ''))
  );

-- Add missing columns to perfumes if not exist
alter table public.perfumes
  add column if not exists gender text,
  add column if not exists price_tier text,
  add column if not exists intensity integer,
  add column if not exists cover_image_url text,
  add column if not exists popularity_score integer not null default 0;

-- 3. Trending: materialized view of top 20 perfumes by analysis count (last 7 days)
create materialized view if not exists public.trending_perfumes as
select
  p.id,
  p.name,
  p.brand,
  p.gender,
  p.rating,
  p.top_notes,
  p.heart_notes,
  p.base_notes,
  p.cover_image_url,
  p.price_tier,
  count(a.id) as analysis_count_7d,
  avg(a.confidence_score) as avg_confidence
from public.perfumes p
join public.analyses a
  on lower(a.scene_data->>'brand') = lower(p.brand)
  and lower(a.scene_data->>'result_json'->>'name') = lower(p.name)
  and a.created_at >= now() - interval '7 days'
group by p.id
order by analysis_count_7d desc, p.rating desc nulls last
limit 20;

create unique index if not exists trending_perfumes_id_idx
  on public.trending_perfumes (id);

-- Function to refresh trending (called by cron or on-demand)
create or replace function public.refresh_trending_perfumes()
returns void
language sql
security definer
as $$
  refresh materialized view concurrently public.trending_perfumes;
$$;

-- 4. RLS for public analysis reads
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'analyses'
    and policyname = 'analyses_read_public'
  ) then
    create policy analyses_read_public
      on public.analyses
      for select
      using (is_public = true);
  end if;
end $$;

-- 5. Index for slug lookup in core-analysis.ts
create index if not exists analyses_slug_lookup_idx
  on public.analyses (slug)
  where slug is not null and is_public = true;
