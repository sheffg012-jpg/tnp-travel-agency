-- Site pictures & gallery storage for TNP Travel Agency
create table if not exists public.site_pictures (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text not null default '',
  placement text not null default 'gallery' check (placement in ('gallery', 'hero', 'feature', 'about')),
  image_url text not null,
  storage_path text,
  image_base64 text,
  image_mime text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_pictures_placement_idx on public.site_pictures(placement, active, sort_order);

alter table public.site_pictures enable row level security;

drop policy if exists "active site pictures public read" on public.site_pictures;
create policy "active site pictures public read" on public.site_pictures
  for select to anon, authenticated
  using (active or public.is_staff());

drop policy if exists "staff manage site pictures" on public.site_pictures;
create policy "staff manage site pictures" on public.site_pictures
  for all to authenticated
  using (public.has_role(array['admin', 'super_admin']))
  with check (public.has_role(array['admin', 'super_admin']));

drop trigger if exists site_pictures_touch on public.site_pictures;
create trigger site_pictures_touch
  before update on public.site_pictures
  for each row execute function public.touch_updated_at();

-- Public Supabase Storage bucket for uploaded pictures
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-pictures',
  'site-pictures',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "public read site pictures bucket" on storage.objects;
create policy "public read site pictures bucket" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'site-pictures');

drop policy if exists "staff upload site pictures bucket" on storage.objects;
create policy "staff upload site pictures bucket" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-pictures' and public.has_role(array['admin', 'super_admin']));

drop policy if exists "staff update site pictures bucket" on storage.objects;
create policy "staff update site pictures bucket" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-pictures' and public.has_role(array['admin', 'super_admin']))
  with check (bucket_id = 'site-pictures' and public.has_role(array['admin', 'super_admin']));

drop policy if exists "staff delete site pictures bucket" on storage.objects;
create policy "staff delete site pictures bucket" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-pictures' and public.has_role(array['admin', 'super_admin']));

-- Seed initial agency pictures if table is empty
insert into public.site_pictures (title, caption, placement, image_url, active, sort_order)
select v.title, v.caption, v.placement, v.image_url, true, v.sort_order
from (
  values
    ('Explore the World with TNP', 'Main hero banner showcased on the home page.', 'hero', '/tnp-main-poster.jpg', 1),
    ('Flight & Travel Support', 'Featured banner for air ticketing and travel assistance.', 'feature', '/tnp-air-ticketing.jpg', 2),
    ('TNP Travel Agency Brand', 'Official logo & visual displayed in the About section.', 'about', '/tnp-logo.jpg', 3),
    ('Complete Travel Services', 'Flights, visas, hotel reservations, and end-to-end trip planning.', 'gallery', '/tnp-services.jpg', 4),
    ('Global Travel Campaigns', 'Tailored international holiday, study, and business travel support.', 'gallery', '/tnp-social-campaigns.jpg', 5),
    ('Air Ticketing & Reservations', 'Responsive ticketing desk connecting you to destinations worldwide.', 'gallery', '/tnp-air-ticketing.jpg', 6)
) as v(title, caption, placement, image_url, sort_order)
where not exists (select 1 from public.site_pictures);
