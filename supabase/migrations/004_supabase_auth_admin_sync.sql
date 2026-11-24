-- TNP Travel Agency: Supabase Auth <-> Website Admin Auto-Sync & Invite Support
-- Run this SQL in Supabase Dashboard -> SQL Editor -> New query.

create extension if not exists pgcrypto;

-- 1. Extend public.profiles with email & authentication tracking fields
alter table public.profiles
  add column if not exists email text,
  add column if not exists auth_provider text not null default 'email',
  add column if not exists email_confirmed_at timestamptz,
  add column if not exists last_sign_in_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists profiles_email_idx on public.profiles (lower(email));

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- 2. Extend public.admin_accounts so Supabase Auth users (invite or dashboard create-user)
--    sync automatically without requiring a separate local password hash.
alter table public.admin_accounts
  alter column password_hash drop not null,
  alter column password_salt drop not null;

alter table public.admin_accounts
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade,
  add column if not exists full_name text not null default '',
  add column if not exists auth_provider text not null default 'email',
  add column if not exists auth_status text not null default 'active',
  add column if not exists invited_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists last_sign_in_at timestamptz,
  add column if not exists auth_metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_accounts_auth_status_check'
      and conrelid = 'public.admin_accounts'::regclass
  ) then
    alter table public.admin_accounts
      add constraint admin_accounts_auth_status_check
      check (auth_status in ('invited', 'active', 'disabled'));
  end if;
end $$;

-- Normalize existing admin emails to lowercase
update public.admin_accounts
set email = lower(trim(email))
where email <> lower(trim(email));

-- 3. Trigger function to automatically sync auth.users -> public.profiles & public.admin_accounts
--    whenever a user is created, invited, confirmed, or updated in Supabase Authentication.
create or replace function public.handle_auth_user_sync()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_full_name text;
  v_phone text;
  v_provider text;
  v_confirmed_at timestamptz;
  v_has_password boolean;
  v_is_disabled boolean;
  v_auth_status text;
  v_target_role text;
  v_existing_role text;
  v_existing_active boolean;
  v_meta jsonb;
begin
  v_email := lower(trim(coalesce(new.email, '')));
  if v_email = '' then
    return new;
  end if;

  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(v_email, '@', 1)
  );
  v_phone := nullif(trim(coalesce(new.phone, new.raw_user_meta_data ->> 'phone', '')), '');
  v_provider := coalesce(nullif(trim(new.raw_app_meta_data ->> 'provider'), ''), 'email');
  v_confirmed_at := coalesce(new.email_confirmed_at, new.confirmed_at);
  v_has_password := coalesce(new.encrypted_password, '') <> '';
  v_is_disabled := (new.banned_until is not null and new.banned_until > now());

  select role into v_existing_role
  from public.profiles
  where id = new.id;

  select active into v_existing_active
  from public.admin_accounts
  where auth_user_id = new.id or lower(email) = v_email
  limit 1;

  if v_is_disabled or v_existing_active is false then
    v_auth_status := 'disabled';
  elsif new.invited_at is not null and v_confirmed_at is null then
    v_auth_status := 'invited';
  elsif v_confirmed_at is null and not v_has_password then
    v_auth_status := 'invited';
  else
    v_auth_status := 'active';
  end if;

  if coalesce(new.raw_app_meta_data ->> 'role', '') in ('admin', 'super_admin') then
    v_target_role := new.raw_app_meta_data ->> 'role';
  elsif v_existing_role in ('admin', 'super_admin') then
    v_target_role := v_existing_role;
  else
    v_target_role := 'admin';
  end if;

  v_meta := jsonb_build_object(
    'providers', coalesce(new.raw_app_meta_data -> 'providers', jsonb_build_array(v_provider)),
    'email_verified', (v_confirmed_at is not null),
    'has_password', v_has_password
  );

  -- Sync public.profiles
  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    auth_provider,
    email_confirmed_at,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    new.id,
    v_email,
    v_full_name,
    v_phone,
    v_target_role,
    v_provider,
    v_confirmed_at,
    new.last_sign_in_at,
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    role = case
      when public.profiles.role = 'super_admin' then 'super_admin'
      when excluded.role in ('admin', 'super_admin') then excluded.role
      else public.profiles.role
    end,
    auth_provider = excluded.auth_provider,
    email_confirmed_at = coalesce(excluded.email_confirmed_at, public.profiles.email_confirmed_at),
    last_sign_in_at = coalesce(excluded.last_sign_in_at, public.profiles.last_sign_in_at),
    updated_at = now();

  -- Sync public.admin_accounts (match by auth_user_id first, then lowercase email)
  update public.admin_accounts
  set
    auth_user_id = new.id,
    email = v_email,
    full_name = case when full_name = '' then v_full_name else full_name end,
    role = case
      when role = 'super_admin' then 'super_admin'
      when v_target_role in ('admin', 'super_admin') then v_target_role
      else role
    end,
    auth_provider = v_provider,
    auth_status = v_auth_status,
    invited_at = coalesce(new.invited_at, invited_at),
    confirmed_at = coalesce(v_confirmed_at, confirmed_at),
    last_sign_in_at = coalesce(new.last_sign_in_at, last_sign_in_at),
    auth_metadata = coalesce(auth_metadata, '{}'::jsonb) || v_meta,
    active = case when v_is_disabled then false else active end,
    updated_at = now()
  where auth_user_id = new.id or lower(email) = v_email;

  if not found then
    insert into public.admin_accounts (
      auth_user_id,
      email,
      full_name,
      role,
      active,
      auth_provider,
      auth_status,
      invited_at,
      confirmed_at,
      last_sign_in_at,
      auth_metadata
    )
    values (
      new.id,
      v_email,
      v_full_name,
      v_target_role,
      (not v_is_disabled),
      v_provider,
      v_auth_status,
      new.invited_at,
      v_confirmed_at,
      new.last_sign_in_at,
      v_meta
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_or_updated on auth.users;
create trigger on_auth_user_created_or_updated
  after insert or update on auth.users
  for each row execute function public.handle_auth_user_sync();

-- 4. Backfill any existing users already created or invited in Supabase Authentication
do $$
declare
  u record;
  v_email text;
  v_full_name text;
  v_provider text;
  v_confirmed_at timestamptz;
  v_has_password boolean;
  v_is_disabled boolean;
  v_auth_status text;
  v_meta jsonb;
begin
  for u in select * from auth.users loop
    v_email := lower(trim(coalesce(u.email, '')));
    if v_email = '' then
      continue;
    end if;

    v_full_name := coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      split_part(v_email, '@', 1)
    );
    v_provider := coalesce(nullif(trim(u.raw_app_meta_data ->> 'provider'), ''), 'email');
    v_confirmed_at := coalesce(u.email_confirmed_at, u.confirmed_at);
    v_has_password := coalesce(u.encrypted_password, '') <> '';
    v_is_disabled := (u.banned_until is not null and u.banned_until > now());
    v_auth_status := case
      when v_is_disabled then 'disabled'
      when u.invited_at is not null and v_confirmed_at is null then 'invited'
      when v_confirmed_at is null and not v_has_password then 'invited'
      else 'active'
    end;
    v_meta := jsonb_build_object(
      'providers', coalesce(u.raw_app_meta_data -> 'providers', jsonb_build_array(v_provider)),
      'email_verified', (v_confirmed_at is not null),
      'has_password', v_has_password
    );

    insert into public.profiles (
      id, email, full_name, role, auth_provider, email_confirmed_at, last_sign_in_at, created_at, updated_at
    )
    values (
      u.id, v_email, v_full_name, 'admin', v_provider, v_confirmed_at, u.last_sign_in_at, coalesce(u.created_at, now()), now()
    )
    on conflict (id) do update set
      email = excluded.email,
      full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
      role = case when public.profiles.role = 'super_admin' then 'super_admin' else 'admin' end,
      auth_provider = excluded.auth_provider,
      email_confirmed_at = coalesce(excluded.email_confirmed_at, public.profiles.email_confirmed_at),
      last_sign_in_at = coalesce(excluded.last_sign_in_at, public.profiles.last_sign_in_at),
      updated_at = now();

    update public.admin_accounts
    set
      auth_user_id = u.id,
      email = v_email,
      full_name = case when full_name = '' then v_full_name else full_name end,
      auth_provider = v_provider,
      auth_status = case when active = false then 'disabled' else v_auth_status end,
      invited_at = coalesce(u.invited_at, invited_at),
      confirmed_at = coalesce(v_confirmed_at, confirmed_at),
      last_sign_in_at = coalesce(u.last_sign_in_at, last_sign_in_at),
      auth_metadata = coalesce(auth_metadata, '{}'::jsonb) || v_meta,
      updated_at = now()
    where auth_user_id = u.id or lower(email) = v_email;

    if not found then
      insert into public.admin_accounts (
        auth_user_id, email, full_name, role, active, auth_provider, auth_status, invited_at, confirmed_at, last_sign_in_at, auth_metadata
      )
      values (
        u.id, v_email, v_full_name, 'admin', (not v_is_disabled), v_provider, v_auth_status, u.invited_at, v_confirmed_at, u.last_sign_in_at, v_meta
      );
    end if;
  end loop;
end $$;
