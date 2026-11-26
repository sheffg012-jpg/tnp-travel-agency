-- Add image upload support (Supabase Storage + base64 fallback) to public.travel_news
alter table public.travel_news
  add column if not exists storage_path text,
  add column if not exists image_base64 text,
  add column if not exists image_mime text;

-- Ensure public Supabase Storage bucket exists for uploaded site & news images
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

notify pgrst, 'reload schema';
