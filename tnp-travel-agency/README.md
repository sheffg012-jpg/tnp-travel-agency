# TNP Travel Agency — full-stack starter

Branded React + Vite frontend, Supabase database schema and secure Edge Function scaffolding. Includes the supplied TNP brand assets.

## Included
- Responsive TNP public website, service catalogue, destinations, inquiry form and WhatsApp contact.
- Supabase client integration; booking inquiries are saved when configured, otherwise handed to WhatsApp.
- SQL schema for profiles, services, destinations, bookings, booking history, payments, webhook events, refunds, documents, notifications and audit logs.
- Initial RLS policies and staff-role helpers.
- Fail-closed payment initialization and webhook Edge Function scaffolds.

## Important production limitations
This package is an implementation starter, not a live deployed business platform. It does **not** yet issue airline tickets, reserve hotel inventory, process card/mobile-money payments, settle funds, send transactional email, or provide a fully implemented authenticated admin dashboard. Those require authorized provider accounts, credentials, API contracts, sandbox testing and business verification. The payment functions deliberately return an error rather than pretending to charge a customer. Do not collect live payments until provider adapters have been implemented and independently tested.

## Run locally
1. Install Node.js 20+.
2. Copy `.env.example` to `.env` and fill in your Supabase project URL and anon key.
3. Run `npm install` then `npm run dev`.
4. Open the local URL printed by Vite.

Without Supabase credentials, the inquiry form prepares a WhatsApp message. With Supabase configured, it inserts into `public.bookings`.

## Supabase setup
1. Create a Supabase project.
2. Open SQL Editor and run `supabase/migrations/001_initial_schema.sql`.
3. Add the project URL and anon key to `.env` (frontend anon key only; never add a service-role key to the browser).
4. Deploy Edge Functions using Supabase CLI after configuring secrets.
5. Create staff users through Supabase Auth, then assign a role to their `profiles` row using a trusted SQL/admin process. Never expose role assignment to public users.
6. Review and test RLS policies against anonymous, customer and each staff role before launch.

## Payment provider work required
Choose a provider only after written confirmation of Rwanda merchant onboarding, supported collection methods, settlement destination(s), fees, refund support and webhook signing. Implement its official sandbox API in `create-payment` and exact webhook signature validation in `payment-webhook`. The browser must never set a payment to `succeeded`; only a verified provider webhook/server-side verification can do that. Also implement idempotency and reconciliation before production.

## Suggested remaining modules
- `/admin`: authenticated staff dashboard with role-based views and server-side queries.
- `/account`: customer booking history, profile and secure document uploads.
- Flight/hotel inventory APIs and real supplier booking confirmations.
- Email/SMS provider integration and PDF receipt generation.
- Refund processing and accounting reconciliation.

## Contact defaults
WhatsApp: +250 788 697 728  
Email: agencytnptravel@gmail.com
