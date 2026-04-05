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

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'app_users'
  ) and not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'users'
      and constraint_name = 'users_app_users_fk'
  ) then
    alter table public.users
      add constraint users_app_users_fk
      foreign key (id) references public.app_users(id)
      on delete cascade;
  end if;
exception
  when duplicate_object then null;
end $$;

create index if not exists users_email_idx
  on public.users (email);

create index if not exists users_is_pro_idx
  on public.users (is_pro);

create or replace function public.sync_users_from_app_users()
returns trigger
language plpgsql
as $$
declare
  resolved_is_pro boolean;
  resolved_pro_activated_at timestamptz;
begin
  if tg_op = 'DELETE' then
    delete from public.users where id = old.id;
    return old;
  end if;

  resolved_is_pro := coalesce(
    new.is_pro,
    case
      when lower(coalesce(new.profile_json ->> 'isPro', '')) in ('1', 'true', 'yes', 'on') then true
      when lower(coalesce(new.profile_json ->> 'isPro', '')) in ('0', 'false', 'no', 'off') then false
      else false
    end
  );

  resolved_pro_activated_at := coalesce(
    new.pro_activated_at,
    case
      when nullif(new.profile_json ->> 'proActivatedAt', '') is not null
        then (new.profile_json ->> 'proActivatedAt')::timestamptz
      else null
    end
  );

  insert into public.users (
    id,
    email,
    is_pro,
    pro_activated_at,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    resolved_is_pro,
    resolved_pro_activated_at,
    coalesce(new.created_at, now()),
    coalesce(new.updated_at, now())
  )
  on conflict (id) do update
  set email = excluded.email,
      is_pro = excluded.is_pro,
      pro_activated_at = excluded.pro_activated_at,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at;

  return new;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'app_users'
  ) then
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
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'app_users'
  ) and not exists (
    select 1
    from pg_trigger
    where tgname = 'app_users_sync_public_users'
  ) then
    create trigger app_users_sync_public_users
      after insert or update or delete on public.app_users
      for each row execute function public.sync_users_from_app_users();
  end if;
end $$;

alter table if exists public.analyses
  add column if not exists input_text text,
  add column if not exists input_mode text,
  add column if not exists result_json jsonb default '{}'::jsonb,
  add column if not exists app_user_id text;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'analyses'
  ) and not exists (
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

update public.analyses
set input_text = coalesce(input_text, input_data),
    input_mode = coalesce(input_mode, input_type),
    result_json = coalesce(result_json, scene_data -> 'result_json', '{}'::jsonb),
    app_user_id = coalesce(app_user_id, scene_data ->> 'app_user_id')
where input_text is null
   or input_mode is null
   or result_json is null
   or app_user_id is null;

create index if not exists idx_analyses_app_user_id
  on public.analyses (app_user_id);

create index if not exists idx_analyses_input_mode
  on public.analyses (input_mode);

create or replace function public.sync_analysis_shadow_columns()
returns trigger
language plpgsql
as $$
begin
  new.input_text := coalesce(new.input_text, new.input_data);
  new.input_mode := coalesce(new.input_mode, new.input_type);

  if new.result_json is null and new.scene_data is not null and jsonb_typeof(new.scene_data) = 'object' then
    new.result_json := coalesce(new.scene_data -> 'result_json', '{}'::jsonb);
  end if;

  if coalesce(new.app_user_id, '') = '' and new.scene_data is not null and jsonb_typeof(new.scene_data) = 'object' then
    new.app_user_id := new.scene_data ->> 'app_user_id';
  end if;

  new.result_json := coalesce(new.result_json, '{}'::jsonb);
  return new;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'analyses'
  ) and not exists (
    select 1
    from pg_trigger
    where tgname = 'analyses_sync_shadow_columns'
  ) then
    create trigger analyses_sync_shadow_columns
      before insert or update on public.analyses
      for each row execute function public.sync_analysis_shadow_columns();
  end if;
end $$;

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

create table if not exists public.community_votes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  fragrance_name text not null,
  perfume_name text,
  week_key text not null,
  vote_type text not null default 'balanced',
  created_at timestamptz not null default now()
);

alter table public.community_votes
  add column if not exists fragrance_name text,
  add column if not exists perfume_name text,
  add column if not exists vote_type text not null default 'balanced';

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'community_votes'
      and constraint_name = 'community_votes_user_fk'
  ) then
    alter table public.community_votes
      add constraint community_votes_user_fk
      foreign key (user_id) references public.users(id)
      on delete cascade;
  end if;
exception
  when duplicate_object then null;
end $$;

update public.community_votes
set fragrance_name = coalesce(nullif(fragrance_name, ''), perfume_name),
    perfume_name = coalesce(nullif(perfume_name, ''), fragrance_name),
    vote_type = coalesce(nullif(vote_type, ''), 'balanced')
where fragrance_name is null
   or perfume_name is null
   or vote_type is null
   or vote_type = '';

create unique index if not exists community_votes_user_week_idx
  on public.community_votes (user_id, week_key);

create index if not exists community_votes_week_fragrance_idx
  on public.community_votes (week_key, fragrance_name);

create or replace function public.sync_community_vote_columns()
returns trigger
language plpgsql
as $$
begin
  new.fragrance_name := coalesce(nullif(new.fragrance_name, ''), new.perfume_name);
  new.perfume_name := coalesce(nullif(new.perfume_name, ''), new.fragrance_name);
  new.vote_type := coalesce(nullif(new.vote_type, ''), 'balanced');
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'community_votes_sync_columns'
  ) then
    create trigger community_votes_sync_columns
      before insert or update on public.community_votes
      for each row execute function public.sync_community_vote_columns();
  end if;
end $$;

alter table public.users enable row level security;
alter table public.analyses enable row level security;
alter table public.wardrobe enable row level security;
alter table public.community_votes enable row level security;

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

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'community_votes'
      and policyname = 'community_votes_select_self'
  ) then
    create policy community_votes_select_self
      on public.community_votes
      for select
      using (auth.uid()::text = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'community_votes'
      and policyname = 'community_votes_insert_self'
  ) then
    create policy community_votes_insert_self
      on public.community_votes
      for insert
      with check (auth.uid()::text = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'community_votes'
      and policyname = 'community_votes_update_self'
  ) then
    create policy community_votes_update_self
      on public.community_votes
      for update
      using (auth.uid()::text = user_id)
      with check (auth.uid()::text = user_id);
  end if;
end $$;
