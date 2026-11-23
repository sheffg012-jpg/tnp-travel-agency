-- Add staff_note to bookings, icon to services, and seed initial destinations.
alter table public.bookings add column if not exists staff_note text not null default '';
alter table public.services add column if not exists icon text not null default 'Globe2';

update public.services set icon = 'Plane' where name = 'Air ticketing';
update public.services set icon = 'ShieldCheck' where name = 'Visa assistance';
update public.services set icon = 'Hotel' where name = 'Hotel booking';
update public.services set icon = 'Car' where name = 'Car rental';
update public.services set icon = 'MapPinned' where name = 'Tours & trip plans';
update public.services set icon = 'Globe2' where name = 'Gorilla permits';
update public.services set icon = 'User' where name = 'Study & work abroad';
update public.services set icon = 'Wallet' where name = 'Money transfer';

insert into public.destinations(name, country_code, active) values
  ('Canada', 'CA', true),
  ('China', 'CN', true),
  ('Poland', 'PL', true),
  ('Serbia', 'RS', true),
  ('Luxembourg', 'LU', true),
  ('Germany', 'DE', true),
  ('Dubai', 'AE', true),
  ('United States', 'US', true)
on conflict (name) do nothing;
