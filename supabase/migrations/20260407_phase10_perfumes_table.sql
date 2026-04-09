create extension if not exists pgcrypto;

create table if not exists public.perfumes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null default '',
  year integer,
  gender text,
  rating numeric,
  perfumer text,
  top_notes text[] not null default '{}',
  heart_notes text[] not null default '{}',
  base_notes text[] not null default '{}',
  accords text[] not null default '{}',
  source text not null default 'parfumo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists perfumes_name_brand_source_unique_idx
  on public.perfumes (name, brand, source);

create index if not exists perfumes_name_trgm_idx
  on public.perfumes using gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(brand, '')));

create index if not exists perfumes_source_idx
  on public.perfumes (source);

create index if not exists perfumes_rating_idx
  on public.perfumes (rating desc nulls last);

create or replace function public.perfumes_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'perfumes_set_updated_at_trigger'
  ) then
    create trigger perfumes_set_updated_at_trigger
      before update on public.perfumes
      for each row
      execute function public.perfumes_set_updated_at();
  end if;
end $$;
