import React, { useCallback, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowRight,
  Car,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  Hotel,
  Lock,
  Mail,
  MapPinned,
  Menu,
  MessageCircle,
  Plane,
  Send,
  Share2,
  ShieldCheck,
  User,
  Wallet,
  X,
  type LucideProps,
} from 'lucide-react';
import AdminPanel, { type SocialLinkItem } from './components/AdminPanel';

function normalizeSupabaseUrl(raw?: string): string {
  if (!raw) return '';
  return raw.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}

const url = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
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

function isSafeHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isAdminPath(): boolean {
  if (typeof window === 'undefined') return false;
  const pathname = window.location.pathname.replace(/\/+$/, '');
  const hash = window.location.hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  return pathname === '/admin' || pathname === '/app' || hash === 'admin';
}

const INQUIRY_DRAFT_KEY = 'tnp_inquiry_draft_v1';

interface InquiryFormState {
  name: string;
  email: string;
  phone: string;
  service: string;
  destination: string;
  date: string;
  details: string;
}

const EMPTY_INQUIRY_FORM: InquiryFormState = {
  name: '',
  email: '',
  phone: '',
  service: 'Air ticketing',
  destination: '',
  date: '',
  details: '',
};

function hasInquiryDraftContent(form: InquiryFormState): boolean {
  return Boolean(
    form.name.trim() ||
      form.email.trim() ||
      form.phone.trim() ||
      form.destination.trim() ||
      form.date.trim() ||
      form.details.trim(),
  );
}

function loadInquiryDraft(): { form: InquiryFormState; open: boolean } {
  if (typeof window === 'undefined') {
    return { form: EMPTY_INQUIRY_FORM, open: false };
  }
  try {
    const raw = window.localStorage.getItem(INQUIRY_DRAFT_KEY);
    if (!raw) return { form: EMPTY_INQUIRY_FORM, open: false };
    const parsed = JSON.parse(raw) as { form?: Partial<InquiryFormState>; open?: boolean };
    const src = parsed?.form && typeof parsed.form === 'object' ? parsed.form : (parsed as Partial<InquiryFormState>);
    const restored: InquiryFormState = {
      name: typeof src.name === 'string' ? src.name : '',
      email: typeof src.email === 'string' ? src.email : '',
      phone: typeof src.phone === 'string' ? src.phone : '',
      service: typeof src.service === 'string' && src.service ? src.service : 'Air ticketing',
      destination: typeof src.destination === 'string' ? src.destination : '',
      date: typeof src.date === 'string' ? src.date : '',
      details: typeof src.details === 'string' ? src.details : '',
    };
    const shouldReopen = Boolean(parsed?.open && hasInquiryDraftContent(restored) && !isAdminPath());
    return { form: restored, open: shouldReopen };
  } catch {
    return { form: EMPTY_INQUIRY_FORM, open: false };
  }
}

export default function App() {
  const [initialDraft] = useState(() => loadInquiryDraft());
  const [menu, setMenu] = useState(false);
  const [booking, setBooking] = useState(initialDraft.open);
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => isAdminPath());

  const [services, setServices] = useState<CatalogService[]>(DEFAULT_SERVICES);
  const [destinations, setDestinations] = useState<CatalogDestination[]>(DEFAULT_DESTINATIONS);
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>([]);

  const [msg, setMsg] = useState('');
  const [submittedWaLink, setSubmittedWaLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<InquiryFormState>(initialDraft.form);

  // Admin auth state held exclusively in memory
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [adminConfigured, setAdminConfigured] = useState<boolean | null>(null);
  const [forceLoginMode, setForceLoginMode] = useState(false);
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authConfirm, setAuthConfirm] = useState('');
  const [showAuthPass, setShowAuthPass] = useState(false);
  const [showAuthConfirm, setShowAuthConfirm] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Supabase Auth invitation / password-setup callback state
  const [inviteMode, setInviteMode] = useState(false);
  const [inviteType, setInviteType] = useState<'invite' | 'recovery'>('invite');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteAccessToken, setInviteAccessToken] = useState('');
  const [inviteRefreshToken, setInviteRefreshToken] = useState('');
  const [inviteTokenHash, setInviteTokenHash] = useState('');
  const [invitePass, setInvitePass] = useState('');
  const [inviteConfirm, setInviteConfirm] = useState('');
  const [showInvitePass, setShowInvitePass] = useState(false);
  const [showInviteConfirm, setShowInviteConfirm] = useState(false);
  const [inviteInitializing, setInviteInitializing] = useState(false);

  const wa = `https://wa.me/${phone}?text=${encodeURIComponent(
    'Hello TNP Travel Agency, I would like to make an inquiry.',
  )}`;

  const setField = (k: keyof InquiryFormState, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    try {
      if (hasInquiryDraftContent(f) || f.service !== (services[0]?.name || 'Air ticketing')) {
        window.localStorage.setItem(INQUIRY_DRAFT_KEY, JSON.stringify({ form: f, open: booking }));
      } else {
        window.localStorage.removeItem(INQUIRY_DRAFT_KEY);
      }
    } catch {
      // Ignore storage quota or private-mode errors
    }
  }, [f, booking, services]);

  function clearInquiryDraft() {
    const defaultService = services[0]?.name || 'Air ticketing';
    setF({ ...EMPTY_INQUIRY_FORM, service: defaultService });
    setMsg('');
    setSubmittedWaLink('');
    try {
      window.localStorage.removeItem(INQUIRY_DRAFT_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/catalog');
      if (!res.ok) return;
      const data = (await res.json()) as {
        services?: CatalogService[];
        destinations?: CatalogDestination[];
        socialLinks?: SocialLinkItem[];
      };
      if (Array.isArray(data.services) && data.services.length > 0) {
        setServices(data.services);
      }
      if (Array.isArray(data.destinations) && data.destinations.length > 0) {
        setDestinations(data.destinations);
      }
      if (Array.isArray(data.socialLinks)) {
        setSocialLinks(data.socialLinks.filter((l) => isSafeHttpUrl(l.url)));
      }
    } catch {
      // Keep default catalog if server is restarting
    }
  }, []);

  const checkAdminStatus = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  useEffect(() => {
    let active = true;

    async function processSupabaseAuthCallback() {
      const searchParams = new URLSearchParams(window.location.search);
      const rawHash = window.location.hash.replace(/^#/, '');
      const hashParams =
        rawHash && rawHash !== 'admin' && !rawHash.startsWith('/admin') && rawHash.includes('=')
          ? new URLSearchParams(rawHash)
          : new URLSearchParams();

      const errorDesc =
        hashParams.get('error_description') ||
        searchParams.get('error_description') ||
        hashParams.get('error') ||
        searchParams.get('error');

      const typeParam = hashParams.get('type') || searchParams.get('type') || '';
      const accessToken = hashParams.get('access_token') || searchParams.get('access_token') || '';
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token') || '';
      const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash') || '';
      const code = searchParams.get('code') || '';

      if (errorDesc) {
        window.history.replaceState({}, '', '/admin');
        if (active) {
          setIsAdminRoute(true);
          setAuthError(errorDesc.replace(/\+/g, ' '));
        }
        return;
      }

      const hasCallback = Boolean(accessToken || tokenHash || code || typeParam === 'invite' || typeParam === 'recovery');
      if (!hasCallback) return;

      const isInviteOrRecovery =
        typeParam === 'invite' || typeParam === 'recovery' || (!typeParam && Boolean(tokenHash || accessToken));

      if (active) {
        setIsAdminRoute(true);
        setAuthError('');
        if (isInviteOrRecovery) {
          setInviteMode(true);
          setInviteType(typeParam === 'recovery' ? 'recovery' : 'invite');
          setInviteInitializing(true);
        }
        if (accessToken) setInviteAccessToken(accessToken);
        if (refreshToken) setInviteRefreshToken(refreshToken);
        if (tokenHash) setInviteTokenHash(tokenHash);
      }

      let resolvedAccess = accessToken;
      let resolvedRefresh = refreshToken;
      let resolvedEmail = '';

      if (db) {
        try {
          if (accessToken && refreshToken) {
            const { data, error } = await db.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!error && data.session) {
              resolvedAccess = data.session.access_token;
              resolvedRefresh = data.session.refresh_token;
              resolvedEmail = data.user?.email || '';
            }
          } else if (tokenHash) {
            const { data, error } = await db.auth.verifyOtp({
              token_hash: tokenHash,
              type: typeParam === 'recovery' ? 'recovery' : 'invite',
            });
            if (!error && data.session) {
              resolvedAccess = data.session.access_token;
              resolvedRefresh = data.session.refresh_token;
              resolvedEmail = data.user?.email || '';
            }
          } else if (code) {
            const { data, error } = await db.auth.exchangeCodeForSession(code);
            if (!error && data.session) {
              resolvedAccess = data.session.access_token;
              resolvedRefresh = data.session.refresh_token;
              resolvedEmail = data.user?.email || '';
            }
          } else {
            const { data } = await db.auth.getSession();
            if (data.session) {
              resolvedAccess = data.session.access_token;
              resolvedRefresh = data.session.refresh_token;
              resolvedEmail = data.session.user?.email || '';
            }
          }
        } catch {
          // Backend accept-invite endpoint handles token fallback if needed
        }
      }

      window.history.replaceState({}, '', '/admin');

      if (!active) return;

      if (resolvedAccess) setInviteAccessToken(resolvedAccess);
      if (resolvedRefresh) setInviteRefreshToken(resolvedRefresh);
      if (resolvedEmail) setInviteEmail(resolvedEmail);

      // If this was a non-invite sign-in callback (e.g. magic link), go straight into dashboard
      if (!isInviteOrRecovery && resolvedAccess) {
        try {
          const res = await fetch('/api/admin/supabase-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: resolvedAccess }),
          });
          const data = (await res.json()) as { token?: string; username?: string; error?: string };
          if (res.ok && data.token && active) {
            setAdminToken(data.token);
            setAdminUsername(data.username || resolvedEmail);
            setAdminConfigured(true);
            setInviteMode(false);
          } else if (active && data.error) {
            setAuthError(data.error);
          }
        } catch {
          if (active) setAuthError('Unable to verify Supabase session.');
        }
      }

      if (active) {
        setInviteInitializing(false);
      }
    }

    processSupabaseAuthCallback();

    const { data: authSub } = db
      ? db.auth.onAuthStateChange((event, session) => {
          if (!active) return;
          if (event === 'PASSWORD_RECOVERY' && session) {
            window.history.replaceState({}, '', '/admin');
            setIsAdminRoute(true);
            setInviteMode(true);
            setInviteType('recovery');
            setInviteAccessToken(session.access_token);
            setInviteRefreshToken(session.refresh_token);
            setInviteEmail(session.user?.email || '');
          }
        })
      : { data: { subscription: null } };

    return () => {
      active = false;
      authSub.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onLocationChange = () => {
      const pathname = window.location.pathname.replace(/\/+$/, '');
      if (pathname === '/app') {
        window.history.replaceState({}, '', '/admin');
      }
      setIsAdminRoute(isAdminPath());
    };
    onLocationChange();
    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('hashchange', onLocationChange);
    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('hashchange', onLocationChange);
    };
  }, []);

  useEffect(() => {
    if (isAdminRoute && !adminToken) {
      if (!inviteMode) {
        setAuthError('');
      }
      setAuthPass('');
      setAuthConfirm('');
      setShowAuthPass(false);
      setShowAuthConfirm(false);
      setForceLoginMode(false);
      checkAdminStatus();
    }
  }, [isAdminRoute, adminToken, inviteMode, checkAdminStatus]);

  function navigateTo(targetPath: '/' | '/admin') {
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setIsAdminRoute(targetPath === '/admin');
  }

  const isSetupView = adminConfigured === false && !forceLoginMode;

  async function handleAdminAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');

    if (isSetupView && authPass !== authConfirm) {
      setAuthError('Passwords do not match.');
      return;
    }

    setAuthBusy(true);
    try {
      const endpoint = isSetupView ? '/api/admin/setup' : '/api/admin/login';
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
      setForceLoginMode(false);
      setAuthPass('');
      setAuthConfirm('');
      setShowAuthPass(false);
      setShowAuthConfirm(false);
      navigateTo('/admin');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleInvitePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');

    if (invitePass.length < 5) {
      setAuthError('Password must be at least 5 characters.');
      return;
    }
    if (invitePass !== inviteConfirm) {
      setAuthError('Passwords do not match.');
      return;
    }

    setAuthBusy(true);
    try {
      let updatedViaBrowserClient = false;
      let sessionAccessToken = inviteAccessToken;

      if (db) {
        const { data: sessData } = await db.auth.getSession();
        if (sessData.session) {
          const { data: updData, error: updErr } = await db.auth.updateUser({ password: invitePass });
          if (updErr) {
            throw new Error(updErr.message || 'Could not save password.');
          }
          const { data: refreshed } = await db.auth.getSession();
          sessionAccessToken = refreshed.session?.access_token || sessData.session.access_token;
          if (updData.user?.email) {
            setInviteEmail(updData.user.email);
          }
          updatedViaBrowserClient = true;
        }
      }

      const endpoint = updatedViaBrowserClient ? '/api/admin/supabase-session' : '/api/admin/accept-invite';
      const payload = updatedViaBrowserClient
        ? { access_token: sessionAccessToken, password_set: true }
        : {
            access_token: inviteAccessToken,
            refresh_token: inviteRefreshToken,
            token_hash: inviteTokenHash,
            type: inviteType,
            password: invitePass,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { token?: string; username?: string; error?: string };
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Could not complete account setup.');
      }

      setAdminToken(data.token);
      setAdminUsername(data.username || inviteEmail);
      setAdminConfigured(true);
      setInviteMode(false);
      setInvitePass('');
      setInviteConfirm('');
      setShowInvitePass(false);
      setShowInviteConfirm(false);
      setInviteAccessToken('');
      setInviteRefreshToken('');
      setInviteTokenHash('');
      navigateTo('/admin');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Unable to save password.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleAdminLogout() {
    const token = adminToken;
    setAdminToken(null);
    setAdminUsername('');
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
    navigateTo('/admin');
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
      const data = (await res.json()) as {
        booking?: { reference: string };
        persisted?: 'supabase' | 'memory';
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Could not submit inquiry.');
      }

      if (db && data.persisted !== 'supabase') {
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
        ...EMPTY_INQUIRY_FORM,
        service: services[0]?.name || 'Air ticketing',
      });
      try {
        window.localStorage.removeItem(INQUIRY_DRAFT_KEY);
      } catch {
        // Ignore storage errors
      }
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Could not submit. Please contact us on WhatsApp.');
    } finally {
      setBusy(false);
    }
  }

  if (isAdminRoute) {
    if (adminToken) {
      return (
        <AdminPanel
          token={adminToken}
          username={adminUsername}
          onClose={() => navigateTo('/')}
          onLogout={handleAdminLogout}
          onCatalogUpdated={fetchCatalog}
        />
      );
    }

    if (inviteMode) {
      return (
        <div className="admin-auth-page">
          <div className="modal modal-narrow">
            <button
              type="button"
              className="close"
              onClick={() => {
                setInviteMode(false);
                navigateTo('/');
              }}
              aria-label="Back to website"
            >
              <X />
            </button>
            <small className="eyebrow">
              <Lock size={14} /> {inviteType === 'recovery' ? 'PASSWORD RESET' : 'INVITATION ACCEPTED'}
            </small>
            <h2>
              Set your <i>password.</i>
            </h2>
            <p>
              {inviteType === 'recovery'
                ? 'Choose a new administrator password to continue to the TNP Admin Dashboard.'
                : 'Your invitation is verified. Create a password to store your credentials and enter the TNP Admin Dashboard.'}
            </p>
            {inviteEmail && <div className="notice">Account: <strong>{inviteEmail}</strong></div>}

            {inviteInitializing ? (
              <div className="admin-empty">Verifying your invitation link…</div>
            ) : (
              <form onSubmit={handleInvitePasswordSubmit}>
                <label>
                  New password
                  <div className="password-field">
                    <input
                      required
                      minLength={5}
                      type={showInvitePass ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Minimum 5 characters"
                      value={invitePass}
                      onChange={(e) => setInvitePass(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowInvitePass((v) => !v)}
                      aria-label={showInvitePass ? 'Hide password' : 'Show password'}
                    >
                      {showInvitePass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
                <label>
                  Confirm password
                  <div className="password-field">
                    <input
                      required
                      minLength={5}
                      type={showInviteConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      value={inviteConfirm}
                      onChange={(e) => setInviteConfirm(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowInviteConfirm((v) => !v)}
                      aria-label={showInviteConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showInviteConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
                {authError && <div className="notice-error">{authError}</div>}
                <button className="primary wide" disabled={authBusy}>
                  {authBusy ? 'Saving password…' : 'Save password & open dashboard'} <ArrowRight />
                </button>
                <button
                  type="button"
                  className="auth-mode-switch"
                  onClick={() => {
                    setAuthError('');
                    setInviteMode(false);
                  }}
                >
                  Already have a password? Sign in
                </button>
              </form>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="admin-auth-page">
        <div className="modal modal-narrow">
          <button
            type="button"
            className="close"
            onClick={() => navigateTo('/')}
            aria-label="Back to website"
          >
            <X />
          </button>
          <small className="eyebrow">
            <Lock size={14} /> TEAM ACCESS
          </small>
          {isSetupView ? (
            <>
              <h2>
                Initialize <i>admin.</i>
              </h2>
              <p>Create the administrator account stored in your backend.</p>
            </>
          ) : (
            <>
              <h2>
                Admin <i>login.</i>
              </h2>
              <p>Sign in with your administrator credentials to manage inquiries and links.</p>
            </>
          )}

          <form onSubmit={handleAdminAuth}>
            <label>
              Email or username
              <input
                required
                type="text"
                autoComplete="username"
                value={authUser}
                onChange={(e) => setAuthUser(e.target.value)}
              />
            </label>
            <label>
              Password
              <div className="password-field">
                <input
                  required
                  type={showAuthPass ? 'text' : 'password'}
                  autoComplete={isSetupView ? 'new-password' : 'current-password'}
                  value={authPass}
                  onChange={(e) => setAuthPass(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowAuthPass((v) => !v)}
                  aria-label={showAuthPass ? 'Hide password' : 'Show password'}
                >
                  {showAuthPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {isSetupView && (
              <label>
                Confirm password
                <div className="password-field">
                  <input
                    required
                    type={showAuthConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={authConfirm}
                    onChange={(e) => setAuthConfirm(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowAuthConfirm((v) => !v)}
                    aria-label={showAuthConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showAuthConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            )}
            {authError && <div className="notice-error">{authError}</div>}
            <button className="primary wide" disabled={authBusy || adminConfigured === null}>
              {authBusy
                ? 'Verifying…'
                : isSetupView
                  ? 'Create admin & enter'
                  : 'Sign in'}{' '}
              <ArrowRight />
            </button>
            {adminConfigured === false && (
              <button
                type="button"
                className="auth-mode-switch"
                onClick={() => {
                  setAuthError('');
                  setForceLoginMode((prev) => !prev);
                }}
              >
                {forceLoginMode
                  ? 'Need to initialize admin first?'
                  : 'Already configured in Supabase? Sign in'}
              </button>
            )}
            <button
              type="button"
              className="auth-mode-switch"
              onClick={() => navigateTo('/')}
            >
              Back to public website
            </button>
          </form>
        </div>
      </div>
    );
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
            {socialLinks.length > 0 && (
              <div className="social-public-wrap">
                <small className="eyebrow">FOLLOW TNP</small>
                <div className="social-public-grid">
                  {socialLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-public-btn"
                    >
                      <Share2 size={15} />
                      <span>
                        <b>{link.platform}</b>
                        {link.label && link.label !== link.platform && <small>{link.label}</small>}
                      </span>
                      <ExternalLink size={14} />
                    </a>
                  ))}
                </div>
              </div>
            )}
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
        <div className="footer-center">
          <span>© {new Date().getFullYear()} TNP Travel Agency. Explore the World with TNP.</span>
          {socialLinks.length > 0 && (
            <div className="footer-socials">
              {socialLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.platform} <ExternalLink size={11} />
                </a>
              ))}
            </div>
          )}
        </div>
        <span className="footer-spacer" aria-hidden="true" />
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
              {hasInquiryDraftContent(f) && (
                <button
                  type="button"
                  className="auth-mode-switch"
                  onClick={clearInquiryDraft}
                >
                  Clear saved draft
                </button>
              )}
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
    </>
  );
}
