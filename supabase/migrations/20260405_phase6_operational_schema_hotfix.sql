create extension if not exists pgcrypto;

create table if not exists public.users (
  id text primary key,
  email text,
  is_pro boolean not null default false,
  pro_activated_at timestamptz,
  daily_used integer not null default 0,
  daily_reset_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_email_idx
  on public.users (email);

create index if not exists users_is_pro_idx
  on public.users (is_pro);

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'users'
      and constraint_name = 'users_app_users_fk'
  ) then
    alter table public.users
      drop constraint users_app_users_fk;
  end if;
exception
  when undefined_object then null;
end $$;

alter table if exists public.analyses
  add column if not exists input_text text,
  add column if not exists input_mode text,
  add column if not exists result_json jsonb default '{}'::jsonb,
  add column if not exists app_user_id text;

insert into public.users (
  id,
  email,
  is_pro,
  pro_activated_at,
  created_at,
  updated_at
)
select
  au.id,
  au.email,
  coalesce(
    au.is_pro,
    case
      when lower(coalesce(au.profile_json ->> 'isPro', '')) in ('1', 'true', 'yes', 'on') then true
      when lower(coalesce(au.profile_json ->> 'isPro', '')) in ('0', 'false', 'no', 'off') then false
      else false
    end
  ),
  coalesce(
    au.pro_activated_at,
    case
      when nullif(au.profile_json ->> 'proActivatedAt', '') is not null
        then (au.profile_json ->> 'proActivatedAt')::timestamptz
      else null
    end
  ),
  coalesce(au.created_at, now()),
  coalesce(au.updated_at, now())
from public.app_users au
on conflict (id) do update
set email = excluded.email,
    is_pro = excluded.is_pro,
    pro_activated_at = excluded.pro_activated_at,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;

update public.analyses
set input_text = coalesce(input_text, input_data),
    input_mode = coalesce(input_mode, input_type),
    result_json = coalesce(result_json, scene_data -> 'result_json', '{}'::jsonb),
    app_user_id = coalesce(app_user_id, scene_data ->> 'app_user_id')
where input_text is null
   or input_mode is null
   or result_json is null
   or app_user_id is null;

insert into public.users (
  id,
  email,
  is_pro,
  pro_activated_at,
  created_at,
  updated_at
)
select distinct
  nullif(a.app_user_id, ''),
  null::text,
  false,
  null::timestamptz,
  coalesce(a.created_at, now()),
  coalesce(a.created_at, now())
from public.analyses a
where nullif(a.app_user_id, '') is not null
  and not exists (
    select 1
    from public.users u
    where u.id = a.app_user_id
  )
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'analyses'
      and constraint_name = 'analyses_app_user_fk'
  ) then
    alter table public.analyses
      add constraint analyses_app_user_fk
      foreign key (app_user_id) references public.users(id)
      on delete set null;
  end if;
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_analyses_app_user_id
  on public.analyses (app_user_id);

create table if not exists public.wardrobe (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  fragrance_name text not null,
  brand text,
  status text not null default 'owned',
  rating integer check (rating between 1 and 5),
  notes text,
  analysis_id uuid references public.analyses(id) on delete set null,
  source_key text,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'wardrobe'
      and constraint_name = 'wardrobe_user_fk'
  ) then
    alter table public.wardrobe
      add constraint wardrobe_user_fk
      foreign key (user_id) references public.users(id)
      on delete cascade;
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'wardrobe'
      and constraint_name = 'wardrobe_status_check'
  ) then
    alter table public.wardrobe
      add constraint wardrobe_status_check
      check (status in ('owned', 'wishlist', 'tried', 'rebuy', 'past', 'tested', 'skip'));
  end if;
exception
  when duplicate_object then null;
end $$;

create index if not exists wardrobe_user_added_idx
  on public.wardrobe (user_id, added_at desc);

create index if not exists wardrobe_user_status_idx
  on public.wardrobe (user_id, status);

create unique index if not exists wardrobe_user_source_key_idx
  on public.wardrobe (user_id, source_key);

create or replace function public.rebuild_wardrobe_from_shelf(
  target_user_id text,
  shelf jsonb,
  shelf_updated_at timestamptz
)
returns void
language plpgsql
as $$
begin
  delete from public.wardrobe
  where user_id = target_user_id
    and source_key is not null;

  insert into public.wardrobe (
    user_id,
    fragrance_name,
    brand,
    status,
    rating,
    notes,
    analysis_id,
    source_key,
    added_at,
    updated_at
  )
  select
    target_user_id,
    nullif(btrim(item.value ->> 'name'), ''),
    nullif(btrim(item.value ->> 'brand'), ''),
    case lower(coalesce(item.value ->> 'status', 'owned'))
      when 'wishlist' then 'wishlist'
      when 'tested' then 'tried'
      when 'tried' then 'tried'
      when 'rebuy' then 'rebuy'
      when 'skip' then 'past'
      when 'past' then 'past'
      else 'owned'
    end,
    case
      when coalesce(item.value ->> 'rating', '') ~ '^[0-9]+$'
        then greatest(1, least(5, (item.value ->> 'rating')::integer))
      else null
    end,
    nullif(item.value ->> 'notes', ''),
    case
      when coalesce(item.value -> 'analysis' ->> 'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (item.value -> 'analysis' ->> 'id')::uuid
      else null
    end,
    item.key,
    coalesce(
      case
        when nullif(item.value ->> 'updatedAt', '') is not null then (item.value ->> 'updatedAt')::timestamptz
        else null
      end,
      shelf_updated_at,
      now()
    ),
    coalesce(
      case
        when nullif(item.value ->> 'updatedAt', '') is not null then (item.value ->> 'updatedAt')::timestamptz
        else null
      end,
      shelf_updated_at,
      now()
    )
  from jsonb_each(coalesce(shelf, '{}'::jsonb)) as item
  where nullif(btrim(item.value ->> 'name'), '') is not null
  on conflict (user_id, source_key) do update
  set fragrance_name = excluded.fragrance_name,
      brand = excluded.brand,
      status = excluded.status,
      rating = excluded.rating,
      notes = excluded.notes,
      analysis_id = excluded.analysis_id,
      added_at = excluded.added_at,
      updated_at = excluded.updated_at;
end;
$$;

create or replace function public.sync_wardrobe_from_scent_wardrobe()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.wardrobe where user_id = old.user_id;
    return old;
  end if;

  perform public.rebuild_wardrobe_from_shelf(new.user_id, new.shelf_json, new.updated_at);
  return new;
end;
$$;

do $$
declare
  shelf_row record;
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'scent_wardrobe'
  ) then
    for shelf_row in
      select user_id, shelf_json, updated_at
      from public.scent_wardrobe
    loop
      perform public.rebuild_wardrobe_from_shelf(shelf_row.user_id, shelf_row.shelf_json, shelf_row.updated_at);
    end loop;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'scent_wardrobe'
  ) and not exists (
    select 1
    from pg_trigger
    where tgname = 'scent_wardrobe_sync_public_wardrobe'
  ) then
    create trigger scent_wardrobe_sync_public_wardrobe
      after insert or update or delete on public.scent_wardrobe
      for each row execute function public.sync_wardrobe_from_scent_wardrobe();
  end if;
end $$;

alter table public.users enable row level security;
alter table public.analyses enable row level security;
alter table public.wardrobe enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'users_select_self'
  ) then
    create policy users_select_self
      on public.users
      for select
      using (auth.uid()::text = id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'users_update_self'
  ) then
    create policy users_update_self
      on public.users
      for update
      using (auth.uid()::text = id)
      with check (auth.uid()::text = id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analyses'
      and policyname = 'analyses_read_app_user'
  ) then
    create policy analyses_read_app_user
      on public.analyses
      for select
      using (auth.uid()::text = app_user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analyses'
      and policyname = 'analyses_insert_app_user'
  ) then
    create policy analyses_insert_app_user
      on public.analyses
      for insert
      with check (auth.uid()::text = app_user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'wardrobe'
      and policyname = 'wardrobe_select_self'
  ) then
    create policy wardrobe_select_self
      on public.wardrobe
      for select
      using (auth.uid()::text = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'wardrobe'
      and policyname = 'wardrobe_insert_self'
  ) then
    create policy wardrobe_insert_self
      on public.wardrobe
      for insert
      with check (auth.uid()::text = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'wardrobe'
      and policyname = 'wardrobe_update_self'
  ) then
    create policy wardrobe_update_self
      on public.wardrobe
      for update
      using (auth.uid()::text = user_id)
      with check (auth.uid()::text = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'wardrobe'
      and policyname = 'wardrobe_delete_self'
  ) then
    create policy wardrobe_delete_self
      on public.wardrobe
      for delete
      using (auth.uid()::text = user_id);
  end if;
end $$;
