create extension if not exists pgcrypto;

create table if not exists public.fragrances (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  brand text,
  year integer,
  perfumer text,
  concentration text,
  gender_profile text,
  seasons text[] default '{}',
  occasions text[] default '{}',
  longevity_score integer,
  sillage_score integer,
  price_tier text,
  top_notes text[] default '{}',
  heart_notes text[] default '{}',
  base_notes text[] default '{}',
  key_molecules jsonb default '[]'::jsonb,
  character_tags text[] default '{}',
  similar_fragrances uuid[] default '{}',
  cover_image_url text,
  molecule_preview_smiles text,
  community_votes jsonb default '{"strong":0,"balanced":0,"light":0}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  input_type text,
  input_data text,
  detected_fragrance_id uuid references public.fragrances(id) on delete set null,
  confidence_score integer,
  iz_score integer,
  ai_description text,
  scene_data jsonb default '{}'::jsonb,
  signature_signals jsonb default '{}'::jsonb,
  user_fit_score integer,
  created_at timestamptz default now()
);

create table if not exists public.molecules (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  iupac_name text,
  smiles text not null,
  cas_number text,
  odor_description text,
  odor_intensity text,
  longevity_contribution text,
  usage_percentage_typical numeric,
  found_in_fragrances uuid[] default '{}',
  natural_source text,
  discovery_year integer,
  fun_fact text
);

alter table public.fragrances
  add column if not exists slug text,
  add column if not exists name text,
  add column if not exists brand text,
  add column if not exists year integer,
  add column if not exists perfumer text,
  add column if not exists concentration text,
  add column if not exists gender_profile text,
  add column if not exists seasons text[] default '{}',
  add column if not exists occasions text[] default '{}',
  add column if not exists longevity_score integer,
  add column if not exists sillage_score integer,
  add column if not exists price_tier text,
  add column if not exists top_notes text[] default '{}',
  add column if not exists heart_notes text[] default '{}',
  add column if not exists base_notes text[] default '{}',
  add column if not exists key_molecules jsonb default '[]'::jsonb,
  add column if not exists character_tags text[] default '{}',
  add column if not exists similar_fragrances uuid[] default '{}',
  add column if not exists cover_image_url text,
  add column if not exists molecule_preview_smiles text,
  add column if not exists community_votes jsonb default '{"strong":0,"balanced":0,"light":0}'::jsonb,
  add column if not exists created_at timestamptz default now();

alter table public.analyses
  add column if not exists input_type text,
  add column if not exists input_data text,
  add column if not exists detected_fragrance_id uuid references public.fragrances(id) on delete set null,
  add column if not exists confidence_score integer,
  add column if not exists iz_score integer,
  add column if not exists ai_description text,
  add column if not exists scene_data jsonb default '{}'::jsonb,
  add column if not exists signature_signals jsonb default '{}'::jsonb,
  add column if not exists user_fit_score integer,
  add column if not exists created_at timestamptz default now();

alter table public.molecules
  add column if not exists slug text,
  add column if not exists name text,
  add column if not exists iupac_name text,
  add column if not exists smiles text,
  add column if not exists cas_number text,
  add column if not exists odor_description text,
  add column if not exists odor_intensity text,
  add column if not exists longevity_contribution text,
  add column if not exists usage_percentage_typical numeric,
  add column if not exists found_in_fragrances uuid[] default '{}',
  add column if not exists natural_source text,
  add column if not exists discovery_year integer,
  add column if not exists fun_fact text;

create index if not exists idx_fragrances_slug on public.fragrances(slug);
create index if not exists idx_fragrances_name on public.fragrances(name);
create index if not exists idx_fragrances_brand on public.fragrances(brand);
create index if not exists idx_fragrances_created_at on public.fragrances(created_at desc);
create index if not exists idx_analyses_user_id on public.analyses(user_id);
create index if not exists idx_analyses_detected_fragrance_id on public.analyses(detected_fragrance_id);
create index if not exists idx_analyses_created_at on public.analyses(created_at desc);
create index if not exists idx_molecules_slug on public.molecules(slug);
create index if not exists idx_molecules_name on public.molecules(name);

alter table public.fragrances enable row level security;
alter table public.analyses enable row level security;
alter table public.molecules enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'fragrances'
      and policyname = 'fragrances_read_public'
  ) then
    create policy fragrances_read_public
      on public.fragrances
      for select
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'molecules'
      and policyname = 'molecules_read_public'
  ) then
    create policy molecules_read_public
      on public.molecules
      for select
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'analyses'
      and policyname = 'analyses_read_own'
  ) then
    create policy analyses_read_own
      on public.analyses
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'analyses'
      and policyname = 'analyses_insert_own'
  ) then
    create policy analyses_insert_own
      on public.analyses
      for insert
      with check (auth.uid() = user_id);
  end if;
end $$;
