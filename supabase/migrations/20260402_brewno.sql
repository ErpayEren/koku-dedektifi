-- =====================================================
-- BREWNO — Coffee Discovery & Taste Intelligence Platform
-- Migration: 20260402_brewno.sql
-- =====================================================

create extension if not exists pg_trgm;

-- ── COFFEES ──────────────────────────────────────────
create table if not exists public.coffees (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text unique not null,
  name                   text not null,
  roaster                text,
  origin_country         text,
  origin_region          text,
  farm                   text,
  altitude_m             integer,
  variety                text[]  default '{}',
  process                text,        -- washed | natural | honey | anaerobic | wet-hulled
  roast_level            text,        -- light | medium-light | medium | medium-dark | dark
  flavor_notes           text[]  default '{}',
  acidity_score          integer,     -- 1-10
  sweetness_score        integer,
  body_score             integer,
  bitterness_score       integer,
  aroma_score            integer,
  brew_score             numeric(4,2),
  community_rating_count integer default 0,
  community_rating_avg   numeric(4,2) default 0,
  cover_image_url        text,
  description            text,
  price_per_100g         numeric(8,2),
  bag_sizes              integer[] default '{}',
  available              boolean default true,
  certifications         text[]  default '{}',
  tags                   text[]  default '{}',
  created_at             timestamptz default now()
);

create index if not exists idx_coffees_slug          on public.coffees(slug);
create index if not exists idx_coffees_roast         on public.coffees(roast_level);
create index if not exists idx_coffees_process       on public.coffees(process);
create index if not exists idx_coffees_country       on public.coffees(origin_country);
create index if not exists idx_coffees_brew_score    on public.coffees(brew_score desc);
create index if not exists idx_coffees_flavor_notes  on public.coffees using gin(flavor_notes);
create index if not exists idx_coffees_tags          on public.coffees using gin(tags);
create index if not exists idx_coffees_fts           on public.coffees
  using gin(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(roaster,'') || ' ' || coalesce(origin_country,'')));

-- ── COFFEE RATINGS ──────────────────────────────────
create table if not exists public.coffee_ratings (
  id               uuid primary key default gen_random_uuid(),
  coffee_id        uuid references public.coffees(id) on delete cascade,
  user_id          uuid references auth.users(id) on delete cascade,
  overall_score    numeric(3,1) not null check (overall_score between 1 and 5),
  acidity_score    integer check (acidity_score between 1 and 10),
  sweetness_score  integer check (sweetness_score between 1 and 10),
  body_score       integer check (body_score between 1 and 10),
  bitterness_score integer check (bitterness_score between 1 and 10),
  aroma_score      integer check (aroma_score between 1 and 10),
  review_text      text,
  brew_method      text,  -- v60 | espresso | aeropress | french-press | chemex | moka-pot | cold-brew
  brew_recipe      jsonb  default '{}'::jsonb,
  liked_notes      text[] default '{}',
  created_at       timestamptz default now(),
  unique (coffee_id, user_id)
);

create index if not exists idx_coffee_ratings_coffee on public.coffee_ratings(coffee_id);
create index if not exists idx_coffee_ratings_user   on public.coffee_ratings(user_id);

-- Auto-update community stats on coffee when rating changes
create or replace function public.update_coffee_community_stats()
returns trigger language plpgsql security definer as $$
begin
  update public.coffees
  set
    community_rating_count = (select count(*) from public.coffee_ratings where coffee_id = coalesce(new.coffee_id, old.coffee_id)),
    community_rating_avg   = (select round(avg(overall_score)::numeric, 2) from public.coffee_ratings where coffee_id = coalesce(new.coffee_id, old.coffee_id)),
    brew_score             = (
      select round((
        avg(overall_score) * 20                               -- 0-100 normalised
        + coalesce(avg(aroma_score),5) * 0.8
        + coalesce(avg(sweetness_score),5) * 0.6
      )::numeric / 3, 1)
      from public.coffee_ratings
      where coffee_id = coalesce(new.coffee_id, old.coffee_id)
    )
  where id = coalesce(new.coffee_id, old.coffee_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_coffee_rating_upsert on public.coffee_ratings;
create trigger trg_coffee_rating_upsert
  after insert or update or delete on public.coffee_ratings
  for each row execute function public.update_coffee_community_stats();

-- ── USER TASTE PROFILES ──────────────────────────────
create table if not exists public.user_taste_profiles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete cascade unique,
  preferred_roast       text[] default '{}',
  preferred_process     text[] default '{}',
  preferred_notes       text[] default '{}',
  disliked_notes        text[] default '{}',
  acidity_pref          integer default 5 check (acidity_pref between 1 and 10),
  sweetness_pref        integer default 5 check (sweetness_pref between 1 and 10),
  body_pref             integer default 5 check (body_pref between 1 and 10),
  bitterness_pref       integer default 5 check (bitterness_pref between 1 and 10),
  quiz_completed        boolean default false,
  updated_at            timestamptz default now()
);

-- ── BREW GUIDES ───────────────────────────────────────
create table if not exists public.brew_guides (
  id                       uuid primary key default gen_random_uuid(),
  method                   text not null,   -- v60 | espresso | french-press | aeropress | chemex | moka-pot | cold-brew
  name                     text not null,
  description              text,
  difficulty               text,   -- beginner | intermediate | advanced
  brew_time_seconds        integer,
  steps                    jsonb default '[]'::jsonb,
  recommended_roast        text,
  recommended_grind        text,
  water_temp_c             integer,
  coffee_to_water_ratio    text,
  yield_ml                 integer,
  cover_image_url          text,
  created_at               timestamptz default now()
);

-- ── USER PROFILES ─────────────────────────────────────
create table if not exists public.brewno_profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  username       text unique,
  display_name   text,
  avatar_url     text,
  bio            text,
  total_ratings  integer default 0,
  followers_count integer default 0,
  following_count integer default 0,
  created_at     timestamptz default now()
);

-- ── USER FOLLOWS ──────────────────────────────────────
create table if not exists public.brewno_follows (
  follower_id  uuid references auth.users(id) on delete cascade,
  following_id uuid references auth.users(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id)
);

-- ── WISHLIST ──────────────────────────────────────────
create table if not exists public.coffee_wishlist (
  user_id    uuid references auth.users(id) on delete cascade,
  coffee_id  uuid references public.coffees(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, coffee_id)
);

-- ── ACTIVITY FEED ─────────────────────────────────────
create table if not exists public.brewno_activity (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  type        text not null,  -- rated | wishlisted | followed | reviewed
  coffee_id   uuid references public.coffees(id) on delete set null,
  target_user uuid references auth.users(id) on delete set null,
  payload     jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);

create index if not exists idx_brewno_activity_user on public.brewno_activity(user_id, created_at desc);
create index if not exists idx_brewno_activity_type on public.brewno_activity(type);

-- ── ROW-LEVEL SECURITY ────────────────────────────────
alter table public.coffees              enable row level security;
alter table public.coffee_ratings       enable row level security;
alter table public.user_taste_profiles  enable row level security;
alter table public.brew_guides          enable row level security;
alter table public.brewno_profiles      enable row level security;
alter table public.brewno_follows       enable row level security;
alter table public.coffee_wishlist      enable row level security;
alter table public.brewno_activity      enable row level security;

-- coffees: public read
create policy "coffees_public_read"
  on public.coffees for select using (true);

-- coffee_ratings: public read, own write
create policy "ratings_public_read"
  on public.coffee_ratings for select using (true);
create policy "ratings_own_write"
  on public.coffee_ratings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- taste profiles: own read/write
create policy "taste_own"
  on public.user_taste_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- brew guides: public read
create policy "guides_public_read"
  on public.brew_guides for select using (true);

-- profiles: public read, own write
create policy "profiles_public_read"
  on public.brewno_profiles for select using (true);
create policy "profiles_own_write"
  on public.brewno_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- follows: public read, own write
create policy "follows_public_read"
  on public.brewno_follows for select using (true);
create policy "follows_own_write"
  on public.brewno_follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

-- wishlist: own
create policy "wishlist_own"
  on public.coffee_wishlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- activity: public read, own write
create policy "activity_public_read"
  on public.brewno_activity for select using (true);
create policy "activity_own_write"
  on public.brewno_activity for insert
  with check (auth.uid() = user_id);
