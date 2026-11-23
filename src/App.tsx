import React, { useCallback, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowRight,
  Car,
  CheckCircle2,
  Globe2,
  Hotel,
  Lock,
  Mail,
  MapPinned,
  Menu,
  MessageCircle,
  Plane,
  Send,
  ShieldCheck,
  User,
  Wallet,
  X,
  type LucideProps,
} from 'lucide-react';
import AdminPanel from './components/AdminPanel';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const db = url && key ? createClient(url, key) : null;
const phone = import.meta.env.VITE_WHATSAPP_NUMBER || '250788697728';
const email = import.meta.env.VITE_CONTACT_EMAIL || 'agencytnptravel@gmail.com';

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Plane,
  ShieldCheck,
  Hotel,
  Car,
  MapPinned,
  Globe2,
  User,
  Wallet,
};

interface CatalogService {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface CatalogDestination {
  id: string;
  name: string;
}

const DEFAULT_SERVICES: CatalogService[] = [
  { id: 'svc-1', name: 'Air ticketing', description: 'Flight inquiries and ticketing support.', icon: 'Plane' },
  { id: 'svc-2', name: 'Visa assistance', description: 'Application guidance and document preparation.', icon: 'ShieldCheck' },
  { id: 'svc-3', name: 'Hotel booking', description: 'Accommodation for business and leisure.', icon: 'Hotel' },
  { id: 'svc-4', name: 'Car rental', description: 'Comfortable transport at your destination.', icon: 'Car' },
  { id: 'svc-5', name: 'Tours & trip plans', description: 'Tailor-made holidays, trips and safaris.', icon: 'MapPinned' },
  { id: 'svc-6', name: 'Gorilla permits', description: 'Assistance with Rwanda gorilla permit inquiries.', icon: 'Globe2' },
  { id: 'svc-7', name: 'Study & work abroad', description: 'Guidance for international opportunities.', icon: 'User' },
  { id: 'svc-8', name: 'Money transfer', description: 'Ask us about supported transfer services.', icon: 'Wallet' },
];

const DEFAULT_DESTINATIONS: CatalogDestination[] = [
  { id: 'dst-1', name: 'Canada' },
  { id: 'dst-2', name: 'China' },
  { id: 'dst-3', name: 'Poland' },
  { id: 'dst-4', name: 'Serbia' },
  { id: 'dst-5', name: 'Luxembourg' },
  { id: 'dst-6', name: 'Germany' },
  { id: 'dst-7', name: 'Dubai' },
  { id: 'dst-8', name: 'United States' },
];

export default function App() {
  const [menu, setMenu] = useState(false);
  const [booking, setBooking] = useState(false);
  const [staffModal, setStaffModal] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const [services, setServices] = useState<CatalogService[]>(DEFAULT_SERVICES);
  const [destinations, setDestinations] = useState<CatalogDestination[]>(DEFAULT_DESTINATIONS);

  const [msg, setMsg] = useState('');
  const [submittedWaLink, setSubmittedWaLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: '',
    email: '',
    phone: '',
    service: 'Air ticketing',
    destination: '',
    date: '',
    details: '',
  });

  // Admin auth state held exclusively in memory
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [adminConfigured, setAdminConfigured] = useState<boolean | null>(null);
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authConfirm, setAuthConfirm] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const wa = `https://wa.me/${phone}?text=${encodeURIComponent(
    'Hello TNP Travel Agency, I would like to make an inquiry.',
  )}`;

  const setField = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/catalog');
      if (!res.ok) return;
      const data = (await res.json()) as {
        services?: CatalogService[];
        destinations?: CatalogDestination[];
      };
      if (Array.isArray(data.services) && data.services.length > 0) {
        setServices(data.services);
      }
      if (Array.isArray(data.destinations) && data.destinations.length > 0) {
        setDestinations(data.destinations);
      }
    } catch {
      // Keep default catalog if server is restarting
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  async function openStaffPortal() {
    if (adminToken) {
      setAdminOpen(true);
      return;
    }
    setAuthError('');
    setAuthUser('');
    setAuthPass('');
    setAuthConfirm('');
    setStaffModal(true);
    try {
      const res = await fetch('/api/admin/status');
      if (res.ok) {
        const data = (await res.json()) as { configured: boolean };
        setAdminConfigured(data.configured);
      } else {
        setAdminConfigured(true);
      }
    } catch {
      setAdminConfigured(true);
    }
  }

  async function handleAdminAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');

    if (adminConfigured === false) {
      if (authPass !== authConfirm) {
        setAuthError('Passwords do not match.');
        return;
      }
    }

    setAuthBusy(true);
    try {
      const endpoint = adminConfigured === false ? '/api/admin/setup' : '/api/admin/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUser.trim(), password: authPass }),
      });
      const data = (await res.json()) as { token?: string; username?: string; error?: string };
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Authentication failed.');
      }

      setAdminToken(data.token);
      setAdminUsername(data.username || authUser.trim());
      setAdminConfigured(true);
      setAuthPass('');
      setAuthConfirm('');
      setStaffModal(false);
      setAdminOpen(true);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleAdminLogout() {
    const token = adminToken;
    setAdminToken(null);
    setAdminUsername('');
    setAdminOpen(false);
    if (token) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore network errors on logout
      }
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setSubmittedWaLink('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: f.name,
          email: f.email,
          phone: f.phone,
          service_type: f.service,
          destination: f.destination || null,
          travel_date: f.date || null,
          details: f.details,
        }),
      });
      const data = (await res.json()) as { booking?: { reference: string }; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Could not submit inquiry.');
      }

      if (db) {
        await db.from('bookings').insert({
          customer_name: f.name,
          email: f.email,
          phone: f.phone,
          service_type: f.service,
          destination: f.destination || null,
          travel_date: f.date || null,
          details: f.details,
          status: 'pending',
        });
      }

      const refText = data.booking?.reference ? ` (Ref: ${data.booking.reference})` : '';
      const body = `TNP booking inquiry${refText}\nName: ${f.name}\nEmail: ${f.email}\nPhone: ${f.phone}\nService: ${f.service}\nDestination: ${f.destination}\nDate: ${f.date}\nDetails: ${f.details}`;
      setSubmittedWaLink(`https://wa.me/${phone}?text=${encodeURIComponent(body)}`);
      setMsg(`Inquiry received${refText}. Our team will contact you shortly.`);
      setF({
        name: '',
        email: '',
        phone: '',
        service: services[0]?.name || 'Air ticketing',
        destination: '',
        date: '',
        details: '',
      });
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Could not submit. Please contact us on WhatsApp.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header>
        <a className="brand" href="#home">
          <img src="/tnp-logo.jpg" alt="TNP Travel Agency logo" />
          <span>
            TNP <b>TRAVEL AGENCY</b>
          </span>
        </a>
        <button className="hamb" onClick={() => setMenu(!menu)} aria-label="Toggle menu">
          {menu ? <X /> : <Menu />}
        </button>
        <nav className={menu ? 'nav show' : 'nav'}>
          {[
            ['Home', '#home'],
            ['Services', '#services'],
            ['Destinations', '#destinations'],
            ['About', '#about'],
            ['Contact', '#contact'],
          ].map(([n, h]) => (
            <a key={h} href={h} onClick={() => setMenu(false)}>
              {n}
            </a>
          ))}
          <button
            className="pill"
            onClick={() => {
              setMenu(false);
              setBooking(true);
            }}
          >
            Book now <ArrowRight size={16} />
          </button>
        </nav>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="intro">
            <small className="eyebrow">
              <Globe2 size={15} /> YOUR JOURNEY STARTS HERE
            </small>
            <h1>
              Explore the World
              <br />
              <i>with TNP.</i>
            </h1>
            <p>
              Flights, visa assistance, hotels, car rentals and unforgettable tours — travel planning
              made easier with personal support.
            </p>
            <div className="actions">
              <button className="primary" onClick={() => setBooking(true)}>
                Plan your trip <ArrowRight />
              </button>
              <a className="outline" href={wa} target="_blank" rel="noreferrer">
                <MessageCircle /> Chat with us
              </a>
            </div>
            <div className="proof">
              <span>
                <CheckCircle2 /> Personal assistance
              </span>
              <span>
                <CheckCircle2 /> Worldwide destinations
              </span>
            </div>
          </div>
          <div className="hero-img">
            <img src="/tnp-main-poster.jpg" alt="TNP travel agency promotional poster" />
            <div className="float">
              <Plane />
              <span>
                <b>Ready for take-off?</b>
                <small>Let&apos;s plan your next adventure.</small>
              </span>
            </div>
          </div>
        </section>

        <div className="airline">
          <span>TRAVEL WITH CONFIDENCE</span>
          <b>RwandAir</b>
          <b>Qatar Airways</b>
          <b>Emirates</b>
          <b>Turkish Airlines</b>
          <b>Lufthansa</b>
          <b>British Airways</b>
        </div>

        <section className="section" id="services">
          <div className="section-title">
            <div>
              <small className="eyebrow">WHAT WE DO</small>
              <h2>
                Everything you need
                <br />
                to <i>travel better.</i>
              </h2>
            </div>
            <p>
              One trusted partner for the details that make every journey smoother. Tell us what you
              need and our team will help with the next step.
            </p>
          </div>
          <div className="cards">
            {services.map((svc, i) => {
              const Icon = ICON_MAP[svc.icon] || Globe2;
              return (
                <article key={svc.id} className="service">
                  <div className="ico">
                    <Icon />
                  </div>
                  <small>{String(i + 1).padStart(2, '0')}</small>
                  <h3>{svc.name}</h3>
                  <p>{svc.description}</p>
                  <button
                    onClick={() => {
                      setField('service', svc.name);
                      setBooking(true);
                    }}
                  >
                    Make an inquiry <ArrowRight size={15} />
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="dest" id="destinations">
          <div>
            <small className="eyebrow">GO FURTHER</small>
            <h2>
              Where will life
              <br />
              take you <i>next?</i>
            </h2>
            <p>
              Explore international study, work and travel opportunities. Our team can help you
              understand the process and prepare your next steps.
            </p>
            <button className="primary" onClick={() => setBooking(true)}>
              Explore destinations <ArrowRight />
            </button>
          </div>
          <div className="countries">
            {destinations.map((dst, i) => (
              <button
                key={dst.id}
                onClick={() => {
                  setField('destination', dst.name);
                  setBooking(true);
                }}
              >
                <small>{String(i + 1).padStart(2, '0')}</small>
                {dst.name}
                <ArrowRight />
              </button>
            ))}
          </div>
        </section>

        <section className="feature">
          <img src="/tnp-air-ticketing.jpg" alt="TNP Air Ticketing" />
          <div>
            <small className="eyebrow">FLIGHT &amp; TRAVEL SUPPORT</small>
            <h2>
              Your world.
              <br />
              <i>One booking away.</i>
            </h2>
            <p>
              Need a flight, hotel, visa guidance or a complete holiday plan? Share your travel
              details and let TNP help coordinate your request.
            </p>
            <p>
              <CheckCircle2 /> Clear booking updates and next steps
            </p>
            <p>
              <CheckCircle2 /> Multiple travel services in one place
            </p>
            <button className="primary" onClick={() => setBooking(true)}>
              Start a booking <ArrowRight />
            </button>
          </div>
        </section>

        <section className="about" id="about">
          <img src="/tnp-logo.jpg" alt="TNP Travel Agency" />
          <div>
            <small className="eyebrow">ABOUT TNP</small>
            <h2>
              Your trusted
              <br />
              <i>travel partner.</i>
            </h2>
            <p>
              TNP Travel Agency helps individuals, families and businesses plan travel with
              confidence. We bring travel services together with responsive, personal support.
            </p>
            <p>
              <CheckCircle2 /> Helpful guidance &nbsp; <CheckCircle2 /> Service built around you
            </p>
          </div>
        </section>

        <section className="contact" id="contact">
          <div>
            <small className="eyebrow">LET&apos;S GET YOU MOVING</small>
            <h2>
              Have a trip
              <br />
              in <i>mind?</i>
            </h2>
            <p>Talk to our team and tell us where you want to go.</p>
          </div>
          <div className="contact-card">
            <a href={wa} target="_blank" rel="noreferrer">
              <MessageCircle />
              <span>
                <small>WHATSAPP</small>
                <b>+{phone}</b>
              </span>
              <ArrowRight />
            </a>
            <a href={`mailto:${email}`}>
              <Mail />
              <span>
                <small>EMAIL</small>
                <b>{email}</b>
              </span>
              <ArrowRight />
            </a>
            <button onClick={() => setBooking(true)}>
              <Send />
              <span>
                <small>BOOKING INQUIRY</small>
                <b>Send your travel request</b>
              </span>
              <ArrowRight />
            </button>
          </div>
        </section>
      </main>

      <footer>
        <img src="/tnp-logo.jpg" alt="TNP Travel Agency" />
        <span>© {new Date().getFullYear()} TNP Travel Agency. Explore the World with TNP.</span>
        <button onClick={openStaffPortal}>
          {adminToken ? 'Admin panel' : 'Staff login'}
        </button>
      </footer>

      <a className="wa-float" href={wa} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
        <MessageCircle />
      </a>

      {booking && (
        <div className="overlay" onClick={() => setBooking(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setBooking(false)} aria-label="Close modal">
              <X />
            </button>
            <small className="eyebrow">START YOUR JOURNEY</small>
            <h2>
              Make a booking <i>inquiry.</i>
            </h2>
            <p>Share your details. Our team will confirm availability, pricing and next steps.</p>
            <form onSubmit={submit}>
              <div className="fields">
                <label>
                  Full name
                  <input required value={f.name} onChange={(e) => setField('name', e.target.value)} />
                </label>
                <label>
                  Email
                  <input
                    required
                    type="email"
                    value={f.email}
                    onChange={(e) => setField('email', e.target.value)}
                  />
                </label>
                <label>
                  Phone / WhatsApp
                  <input required value={f.phone} onChange={(e) => setField('phone', e.target.value)} />
                </label>
                <label>
                  Service
                  <select value={f.service} onChange={(e) => setField('service', e.target.value)}>
                    {services.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Destination
                  <input
                    value={f.destination}
                    onChange={(e) => setField('destination', e.target.value)}
                  />
                </label>
                <label>
                  Travel date
                  <input type="date" value={f.date} onChange={(e) => setField('date', e.target.value)} />
                </label>
              </div>
              <label>
                Additional details
                <textarea
                  rows={3}
                  value={f.details}
                  onChange={(e) => setField('details', e.target.value)}
                />
              </label>
              <button className="primary wide" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit inquiry'} <ArrowRight />
              </button>
              {msg && (
                <div className="notice">
                  <div>{msg}</div>
                  {submittedWaLink && (
                    <a
                      className="wa-inline-link"
                      href={submittedWaLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle size={15} /> Send copy on WhatsApp
                    </a>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {staffModal && (
        <div className="overlay" onClick={() => setStaffModal(false)}>
          <div className="modal modal-narrow" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setStaffModal(false)} aria-label="Close modal">
              <X />
            </button>
            <small className="eyebrow">
              <Lock size={14} /> TEAM ACCESS
            </small>
            {adminConfigured === false ? (
              <>
                <h2>
                  Initialize <i>admin.</i>
                </h2>
                <p>Create the administrator account for this workspace.</p>
              </>
            ) : (
              <>
                <h2>
                  Staff <i>login.</i>
                </h2>
                <p>Sign in with your administrator credentials to manage inquiries and catalog.</p>
              </>
            )}

            <form onSubmit={handleAdminAuth}>
              <label>
                Username
                <input
                  required
                  autoComplete="username"
                  value={authUser}
                  onChange={(e) => setAuthUser(e.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  required
                  type="password"
                  autoComplete={adminConfigured === false ? 'new-password' : 'current-password'}
                  value={authPass}
                  onChange={(e) => setAuthPass(e.target.value)}
                />
              </label>
              {adminConfigured === false && (
                <label>
                  Confirm password
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={authConfirm}
                    onChange={(e) => setAuthConfirm(e.target.value)}
                  />
                </label>
              )}
              {authError && <div className="notice-error">{authError}</div>}
              <button className="primary wide" disabled={authBusy || adminConfigured === null}>
                {authBusy
                  ? 'Verifying…'
                  : adminConfigured === false
                    ? 'Create admin & enter'
                    : 'Sign in'}{' '}
                <ArrowRight />
              </button>
            </form>
          </div>
        </div>
      )}

      {adminOpen && adminToken && (
        <AdminPanel
          token={adminToken}
          username={adminUsername}
          onClose={() => setAdminOpen(false)}
          onLogout={handleAdminLogout}
          onCatalogUpdated={fetchCatalog}
        />
      )}
    </>
  );
}
