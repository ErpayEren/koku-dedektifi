alter table if exists public.app_users
  add column if not exists is_pro boolean not null default false;

alter table if exists public.app_users
  add column if not exists pro_activated_at timestamptz;

create index if not exists app_users_is_pro_idx
  on public.app_users (is_pro);
