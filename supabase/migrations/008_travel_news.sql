-- Travel News & Blog Posts for TNP Travel Agency
create table if not exists public.travel_news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Travel Tip' check (
    category in ('Travel Tip', 'Visa Update', 'Company News', 'Flight Alert', 'Destination Guide')
  ),
  summary text not null,
  content text not null default '',
  image_url text,
  published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists travel_news_published_idx
  on public.travel_news(published, published_at desc);

alter table public.travel_news enable row level security;

drop policy if exists "published travel news public read" on public.travel_news;
create policy "published travel news public read" on public.travel_news
  for select to anon, authenticated
  using (published or public.is_staff());

drop policy if exists "staff manage travel news" on public.travel_news;
create policy "staff manage travel news" on public.travel_news
  for all to authenticated
  using (public.has_role(array['admin', 'super_admin']))
  with check (public.has_role(array['admin', 'super_admin']));

drop trigger if exists travel_news_touch on public.travel_news;
create trigger travel_news_touch
  before update on public.travel_news
  for each row execute function public.touch_updated_at();

insert into public.travel_news (title, category, summary, content, image_url, published, published_at)
select v.title, v.category, v.summary, v.content, v.image_url, true, v.published_at
from (
  values
    (
      'Visa Document Checklist for Europe, Canada & Dubai',
      'Visa Update',
      'Prepare your passport validity, bank statements, and flight itinerary early to avoid embassy processing delays.',
      E'Applying for a tourist, study, or business visa goes much faster when your documents are complete before your appointment.\n\n1. Ensure your passport is valid for at least 6 months beyond your planned return date and has at least two blank pages.\n2. Prepare clear hotel reservations, round-trip flight itineraries, and an updated travel insurance policy.\n3. Reach out to our Visa Assistance desk via WhatsApp or the booking form so our advisors can review your checklist before submission.',
      '/tnp-services.jpg',
      now() - interval '2 days'
    ),
    (
      'How Early Should You Book International Flights?',
      'Travel Tip',
      'Booking 4 to 8 weeks ahead helps unlock better fares and flexible seat availability across peak travel months.',
      E'International airline fares fluctuate quickly around school holidays, summer travel, and major business conferences.\n\nFor the best balance of price and routing convenience, we recommend sharing your preferred travel window 4 to 8 weeks before departure. Our ticketing team compares multiple carriers including RwandAir, Qatar Airways, Emirates, and Turkish Airlines to find reliable connections.',
      '/tnp-air-ticketing.jpg',
      now() - interval '5 days'
    ),
    (
      '24/7 WhatsApp Support & Rwanda Gorilla Permit Assistance',
      'Company News',
      'Need urgent flight changes, hotel bookings, or Volcanoes National Park permits? Our travel desk is ready to assist.',
      E'TNP Travel Agency now offers streamlined trip coordination for air ticketing, visa preparation, car rentals, and Rwanda gorilla trekking permits in one place.\n\nSimply submit an inquiry on our website or message us directly on WhatsApp and receive personalized guidance and clear next steps from our team.',
      '/tnp-social-campaigns.jpg',
      now() - interval '9 days'
    )
) as v(title, category, summary, content, image_url, published_at)
where not exists (select 1 from public.travel_news);

notify pgrst, 'reload schema';
