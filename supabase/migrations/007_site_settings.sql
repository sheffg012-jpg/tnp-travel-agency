-- Public site contact settings (contact_email, whatsapp_number) for TNP Travel Agency
create table if not exists public.site_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "public contact settings read" on public.site_settings;
create policy "public contact settings read" on public.site_settings
  for select to anon, authenticated
  using (key in ('contact_email', 'whatsapp_number') or public.is_staff());

drop policy if exists "staff manage site settings" on public.site_settings;
create policy "staff manage site settings" on public.site_settings
  for all to authenticated
  using (public.has_role(array['admin', 'super_admin']))
  with check (public.has_role(array['admin', 'super_admin']));

drop trigger if exists site_settings_touch on public.site_settings;
create trigger site_settings_touch
  before update on public.site_settings
  for each row execute function public.touch_updated_at();

insert into public.site_settings (key, value)
values
  ('contact_email', 'agencytnptravel@gmail.com'),
  ('whatsapp_number', '250788697728')
on conflict (key) do nothing;
