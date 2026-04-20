create extension if not exists vector;

create table if not exists public.perfume_docs (
  id uuid primary key default gen_random_uuid(),
  perfume_id uuid,
  content text not null default '',
  nota_text text,
  family text,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.perfume_docs
  add column if not exists perfume_id uuid,
  add column if not exists content text,
  add column if not exists nota_text text,
  add column if not exists family text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists embedding vector(768),
  add column if not exists title text,
  add column if not exists name text,
  add column if not exists brand text,
  add column if not exists doc_type text,
  add column if not exists url text,
  add column if not exists external_id text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.perfume_docs
set metadata = '{}'::jsonb
where metadata is null;

alter table public.perfume_docs
  alter column metadata set default '{}'::jsonb;

create index if not exists perfume_docs_perfume_id_idx
  on public.perfume_docs (perfume_id);

drop index if exists public.perfume_docs_perfume_id_unique_idx;

create unique index if not exists perfume_docs_perfume_id_unique_idx
  on public.perfume_docs (perfume_id);

create index if not exists perfume_docs_family_idx
  on public.perfume_docs (family);

create index if not exists perfume_docs_metadata_gin_idx
  on public.perfume_docs using gin (metadata);

create unique index if not exists perfume_docs_external_id_idx
  on public.perfume_docs (external_id)
  where external_id is not null;

create index if not exists perfume_docs_embedding_ivfflat_idx
  on public.perfume_docs using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.perfume_docs_set_updated_at()
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
    where tgname = 'perfume_docs_set_updated_at_trigger'
  ) then
    create trigger perfume_docs_set_updated_at_trigger
      before update on public.perfume_docs
      for each row
      execute function public.perfume_docs_set_updated_at();
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'perfumes'
  ) and not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'perfume_docs_perfume_fk'
      and table_schema = 'public'
      and table_name = 'perfume_docs'
  ) then
    alter table public.perfume_docs
      add constraint perfume_docs_perfume_fk
      foreign key (perfume_id) references public.perfumes(id)
      on delete cascade;
  elsif exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'fragrances'
  ) and not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'perfume_docs_fragrance_fk'
      and table_schema = 'public'
      and table_name = 'perfume_docs'
  ) then
    alter table public.perfume_docs
      add constraint perfume_docs_fragrance_fk
      foreign key (perfume_id) references public.fragrances(id)
      on delete cascade;
  end if;
exception
  when duplicate_object then null;
  when undefined_table then null;
end $$;

create or replace function public.match_perfume_docs(
  query_embedding vector(768),
  match_count int default 10,
  filter jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  perfume_id uuid,
  score double precision,
  content text,
  family text,
  metadata jsonb,
  title text,
  name text,
  brand text,
  snippet text
)
language sql
stable
as $$
  with scored as (
    select
      d.id,
      d.perfume_id,
      (1 - (d.embedding <=> query_embedding))::double precision as score,
      coalesce(d.content, '') as content,
      coalesce(d.family, '') as family,
      coalesce(d.metadata, '{}'::jsonb) as metadata,
      coalesce(d.title, d.metadata->>'title') as title,
      coalesce(d.name, d.metadata->>'name') as name,
      coalesce(d.brand, d.metadata->>'brand') as brand
    from public.perfume_docs d
    where d.embedding is not null
      and (
        coalesce(filter->>'family', '') = ''
        or coalesce(d.family, '') = filter->>'family'
      )
    order by d.embedding <=> query_embedding
    limit greatest(match_count, 1)
  )
  select
    s.id,
    s.perfume_id,
    s.score,
    s.content,
    s.family,
    s.metadata,
    coalesce(f.name, s.title, s.name, 'Bilinmeyen Parfum') as title,
    coalesce(f.name, s.name, '') as name,
    coalesce(f.brand, s.brand, '') as brand,
    left(s.content, 220) as snippet
  from scored s
  left join public.fragrances f on f.id = s.perfume_id
  order by s.score desc;
$$;

grant execute on function public.match_perfume_docs(vector(768), int, jsonb) to anon, authenticated, service_role;
