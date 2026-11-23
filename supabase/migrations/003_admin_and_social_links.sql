-- Admin accounts & social media links tables for TNP Travel Agency
create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  password_salt text not null,
  role text not null default 'super_admin' check (role in ('admin', 'super_admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_accounts enable row level security;
-- No anon/authenticated policies on admin_accounts: accessible only via server-side service_role key.

drop trigger if exists admin_accounts_touch on public.admin_accounts;
create trigger admin_accounts_touch
  before update on public.admin_accounts
  for each row execute function public.touch_updated_at();

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  label text not null,
  url text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.social_links enable row level security;

drop policy if exists "active social links public read" on public.social_links;
create policy "active social links public read" on public.social_links
  for select to anon, authenticated
  using (active or public.is_staff());

drop policy if exists "staff manage social links" on public.social_links;
create policy "staff manage social links" on public.social_links
  for all to authenticated
  using (public.has_role(array['admin', 'super_admin']))
  with check (public.has_role(array['admin', 'super_admin']));
