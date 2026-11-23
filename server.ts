import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;

// Ephemeral in-memory fallback signing key when SESSION_SECRET is not set
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const BOOKING_STATUSES = [
  'pending',
  'reviewing',
  'awaiting_payment',
  'confirmed',
  'completed',
  'cancelled',
  'rejected',
] as const;
type BookingStatus = (typeof BOOKING_STATUSES)[number];

const CURRENCIES = ['RWF', 'USD', 'EUR'] as const;
type Currency = (typeof CURRENCIES)[number];

interface BookingRecord {
  id: string;
  reference: string;
  customer_name: string;
  email: string;
  phone: string;
  service_type: string;
  destination: string | null;
  travel_date: string | null;
  details: string;
  status: BookingStatus;
  quoted_amount: number | null;
  currency: Currency;
  staff_note: string;
  created_at: string;
  updated_at: string;
}

interface ServiceRecord {
  id: string;
  name: string;
  description: string;
  icon: string;
  active: boolean;
  created_at: string;
}

interface DestinationRecord {
  id: string;
  name: string;
  active: boolean;
}

interface ClaimedAdmin {
  username: string;
  salt: string;
  hash: string;
}

interface AuthedRequest extends Request {
  adminUser?: { username: string; jti: string };
}

function normalizeSupabaseUrl(raw?: string): string {
  if (!raw) return '';
  return raw.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}

const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const supabasePublic: SupabaseClient | null =
  supabaseUrl && (supabaseServiceKey || supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

const DEFAULT_ICON_BY_NAME: Record<string, string> = {
  'Air ticketing': 'Plane',
  'Visa assistance': 'ShieldCheck',
  'Hotel booking': 'Hotel',
  'Car rental': 'Car',
  'Tours & trip plans': 'MapPinned',
  'Gorilla permits': 'Globe2',
  'Study & work abroad': 'User',
  'Money transfer': 'Wallet',
};

let claimedAdmin: ClaimedAdmin | null = null;
const activeSessions = new Map<string, { username: string; exp: number }>();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

const bookings: BookingRecord[] = [];

const services: ServiceRecord[] = [
  { id: 'svc-1', name: 'Air ticketing', description: 'Flight inquiries and ticketing support.', icon: 'Plane', active: true, created_at: new Date().toISOString() },
  { id: 'svc-2', name: 'Visa assistance', description: 'Application guidance and document preparation.', icon: 'ShieldCheck', active: true, created_at: new Date().toISOString() },
  { id: 'svc-3', name: 'Hotel booking', description: 'Accommodation for business and leisure.', icon: 'Hotel', active: true, created_at: new Date().toISOString() },
  { id: 'svc-4', name: 'Car rental', description: 'Comfortable transport at your destination.', icon: 'Car', active: true, created_at: new Date().toISOString() },
  { id: 'svc-5', name: 'Tours & trip plans', description: 'Tailor-made holidays, trips and safaris.', icon: 'MapPinned', active: true, created_at: new Date().toISOString() },
  { id: 'svc-6', name: 'Gorilla permits', description: 'Assistance with Rwanda gorilla permit inquiries.', icon: 'Globe2', active: true, created_at: new Date().toISOString() },
  { id: 'svc-7', name: 'Study & work abroad', description: 'Guidance for international opportunities.', icon: 'User', active: true, created_at: new Date().toISOString() },
  { id: 'svc-8', name: 'Money transfer', description: 'Ask us about supported transfer services.', icon: 'Wallet', active: true, created_at: new Date().toISOString() },
];

const destinations: DestinationRecord[] = [
  { id: 'dst-1', name: 'Canada', active: true },
  { id: 'dst-2', name: 'China', active: true },
  { id: 'dst-3', name: 'Poland', active: true },
  { id: 'dst-4', name: 'Serbia', active: true },
  { id: 'dst-5', name: 'Luxembourg', active: true },
  { id: 'dst-6', name: 'Germany', active: true },
  { id: 'dst-7', name: 'Dubai', active: true },
  { id: 'dst-8', name: 'United States', active: true },
];

function safeEqualText(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyScryptPassword(password: string, salt: string, storedHex: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(storedHex, 'hex');
  if (derived.length !== stored.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}

function isEnvConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length > 0);
}

function isAdminConfigured(): boolean {
  return isEnvConfigured() || claimedAdmin !== null;
}

function issueSessionToken(username: string): string {
  const jti = crypto.randomBytes(16).toString('hex');
  const exp = Date.now() + SESSION_TTL_MS;
  activeSessions.set(jti, { username, exp });
  const payload = Buffer.from(JSON.stringify({ sub: username, jti, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): { username: string; jti: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;

  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string;
      jti?: string;
      exp?: number;
    };
    if (!parsed.sub || !parsed.jti || !parsed.exp) return null;
    if (Date.now() > parsed.exp) {
      activeSessions.delete(parsed.jti);
      return null;
    }
    const session = activeSessions.get(parsed.jti);
    if (!session || session.exp < Date.now() || session.username !== parsed.sub) {
      activeSessions.delete(parsed.jti);
      return null;
    }
    return { username: parsed.sub, jti: parsed.jti };
  } catch {
    return null;
  }
}

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const verified = verifySessionToken(token);
  if (!verified) {
    res.status(401).json({ error: 'Session expired or invalid' });
    return;
  }
  req.adminUser = verified;
  next();
}

function checkRateLimit(req: Request): boolean {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }
  entry.count += 1;
  return true;
}

function cleanStr(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function mapSupabaseService(row: Record<string, unknown>): ServiceRecord {
  const name = String(row.name || '');
  return {
    id: String(row.id),
    name,
    description: String(row.description || ''),
    icon: typeof row.icon === 'string' && row.icon ? row.icon : DEFAULT_ICON_BY_NAME[name] || 'Globe2',
    active: Boolean(row.active ?? true),
    created_at: String(row.created_at || new Date().toISOString()),
  };
}

function mapSupabaseBooking(row: Record<string, unknown>): BookingRecord {
  const rawStatus = String(row.status || 'pending') as BookingStatus;
  const rawCurr = String(row.currency || 'RWF').toUpperCase() as Currency;
  return {
    id: String(row.id),
    reference: String(row.reference || ''),
    customer_name: String(row.customer_name || ''),
    email: String(row.email || ''),
    phone: String(row.phone || ''),
    service_type: String(row.service_type || ''),
    destination: row.destination ? String(row.destination) : null,
    travel_date: row.travel_date ? String(row.travel_date) : null,
    details: String(row.details || ''),
    status: BOOKING_STATUSES.includes(rawStatus) ? rawStatus : 'pending',
    quoted_amount: row.quoted_amount !== null && row.quoted_amount !== undefined ? Number(row.quoted_amount) : null,
    currency: CURRENCIES.includes(rawCurr) ? rawCurr : 'RWF',
    staff_note: typeof row.staff_note === 'string' ? row.staff_note : '',
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: String(row.updated_at || row.created_at || new Date().toISOString()),
  };
}

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '100kb' }));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Public catalog (active services & destinations)
  app.get('/api/catalog', async (_req, res) => {
    let resolvedServices = services.filter((s) => s.active);
    let resolvedDestinations = destinations.filter((d) => d.active);

    if (supabasePublic) {
      try {
        const [{ data: svcRows, error: svcErr }, { data: dstRows, error: dstErr }] = await Promise.all([
          supabasePublic.from('services').select('*').eq('active', true).order('created_at', { ascending: true }),
          supabasePublic.from('destinations').select('*').eq('active', true).order('name', { ascending: true }),
        ]);

        if (!svcErr && Array.isArray(svcRows) && svcRows.length > 0) {
          resolvedServices = svcRows.map((r) => mapSupabaseService(r as Record<string, unknown>));
        }
        if (!dstErr && Array.isArray(dstRows) && dstRows.length > 0) {
          resolvedDestinations = dstRows.map((r) => ({
            id: String((r as Record<string, unknown>).id),
            name: String((r as Record<string, unknown>).name),
            active: Boolean((r as Record<string, unknown>).active ?? true),
          }));
        }
      } catch {
        // Fall back to default catalog if Supabase tables are not yet initialized
      }
    }

    res.json({
      services: resolvedServices,
      destinations: resolvedDestinations,
    });
  });

  // Public booking inquiry creation
  app.post('/api/bookings', async (req, res) => {
    const customerName = cleanStr(req.body?.customer_name, 120);
    const email = cleanStr(req.body?.email, 160);
    const phone = cleanStr(req.body?.phone, 40);
    const serviceType = cleanStr(req.body?.service_type, 100);
    const destination = cleanStr(req.body?.destination, 120) || null;
    const travelDate = cleanStr(req.body?.travel_date, 30) || null;
    const details = cleanStr(req.body?.details, 2000);

    if (!customerName || !email || !phone || !serviceType) {
      res.status(400).json({ error: 'Name, email, phone, and service are required.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    const now = new Date().toISOString();
    const record: BookingRecord = {
      id: crypto.randomUUID(),
      reference: `TNP-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
      customer_name: customerName,
      email,
      phone,
      service_type: serviceType,
      destination,
      travel_date: travelDate,
      details,
      status: 'pending',
      quoted_amount: null,
      currency: 'RWF',
      staff_note: '',
      created_at: now,
      updated_at: now,
    };

    let persisted: 'supabase' | 'memory' = 'memory';

    if (supabasePublic) {
      try {
        const { error } = await supabasePublic.from('bookings').insert({
          id: record.id,
          reference: record.reference,
          customer_name: record.customer_name,
          email: record.email,
          phone: record.phone,
          service_type: record.service_type,
          destination: record.destination,
          travel_date: record.travel_date,
          details: record.details,
          status: 'pending',
        });
        if (!error) {
          persisted = 'supabase';
        }
      } catch {
        // Fall back to in-memory store if Supabase insert fails
      }
    }

    if (!supabaseAdmin) {
      bookings.unshift(record);
    }

    res.status(201).json({
      booking: {
        id: record.id,
        reference: record.reference,
        status: record.status,
        created_at: record.created_at,
      },
      persisted,
    });
  });

  // Admin auth status (never returns credentials or hints)
  app.get('/api/admin/status', (req, res) => {
    const token = extractBearerToken(req);
    const verified = token ? verifySessionToken(token) : null;
    res.json({
      configured: isAdminConfigured(),
      authenticated: Boolean(verified),
      username: verified?.username ?? null,
    });
  });

  // One-time admin initialization when env credentials are not set
  app.post('/api/admin/setup', (req, res) => {
    if (!checkRateLimit(req)) {
      res.status(429).json({ error: 'Too many attempts. Please try again later.' });
      return;
    }
    if (isAdminConfigured()) {
      res.status(409).json({ error: 'Admin access is already configured.' });
      return;
    }

    const username = cleanStr(req.body?.username, 60);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (username.length < 2 || password.length < 5) {
      res.status(400).json({ error: 'Username (min 2 chars) and password (min 5 chars) are required.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    claimedAdmin = { username, salt, hash };

    const token = issueSessionToken(username);
    res.status(201).json({ token, username });
  });

  // Admin login
  app.post('/api/admin/login', (req, res) => {
    if (!checkRateLimit(req)) {
      res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
      return;
    }
    if (!isAdminConfigured()) {
      res.status(409).json({ error: 'Admin credentials are not initialized yet.' });
      return;
    }

    const username = cleanStr(req.body?.username, 60);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    let valid = false;
    let authedUsername = username;

    if (isEnvConfigured()) {
      const expectedUser = (process.env.ADMIN_USERNAME || 'admin').trim();
      const expectedPass = process.env.ADMIN_PASSWORD || '';
      valid = safeEqualText(username, expectedUser) && safeEqualText(password, expectedPass);
      authedUsername = expectedUser;
    } else if (claimedAdmin) {
      valid =
        safeEqualText(username, claimedAdmin.username) &&
        verifyScryptPassword(password, claimedAdmin.salt, claimedAdmin.hash);
      authedUsername = claimedAdmin.username;
    }

    if (!valid) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    const token = issueSessionToken(authedUsername);
    res.json({ token, username: authedUsername });
  });

  // Admin logout
  app.post('/api/admin/logout', requireAdmin, (req: AuthedRequest, res) => {
    if (req.adminUser?.jti) {
      activeSessions.delete(req.adminUser.jti);
    }
    res.json({ ok: true });
  });

  // Admin bookings management
  app.get('/api/admin/bookings', requireAdmin, async (_req, res) => {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const list = data.map((r) => mapSupabaseBooking(r as Record<string, unknown>));
        const stats = {
          total: list.length,
          pending: list.filter((b) => b.status === 'pending').length,
          inProgress: list.filter((b) => b.status === 'reviewing' || b.status === 'awaiting_payment').length,
          confirmed: list.filter((b) => b.status === 'confirmed' || b.status === 'completed').length,
        };
        res.json({ bookings: list, stats, storage: 'supabase' });
        return;
      }
    }

    const stats = {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      inProgress: bookings.filter((b) => b.status === 'reviewing' || b.status === 'awaiting_payment').length,
      confirmed: bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed').length,
    };
    res.json({
      bookings,
      stats,
      storage: supabasePublic ? 'supabase-public-only' : 'memory',
    });
  });

  app.patch('/api/admin/bookings/:id', requireAdmin, async (req, res) => {
    const updates: Record<string, unknown> = {};

    if (req.body?.status !== undefined) {
      const nextStatus = cleanStr(req.body.status, 30) as BookingStatus;
      if (!BOOKING_STATUSES.includes(nextStatus)) {
        res.status(400).json({ error: 'Invalid booking status.' });
        return;
      }
      updates.status = nextStatus;
    }

    if (req.body?.quoted_amount !== undefined) {
      if (req.body.quoted_amount === null || req.body.quoted_amount === '') {
        updates.quoted_amount = null;
      } else {
        const amt = Number(req.body.quoted_amount);
        if (!Number.isFinite(amt) || amt < 0) {
          res.status(400).json({ error: 'Quoted amount must be a valid positive number.' });
          return;
        }
        updates.quoted_amount = Math.round(amt * 100) / 100;
      }
    }

    if (req.body?.currency !== undefined) {
      const nextCurrency = cleanStr(req.body.currency, 10).toUpperCase() as Currency;
      if (!CURRENCIES.includes(nextCurrency)) {
        res.status(400).json({ error: 'Unsupported currency.' });
        return;
      }
      updates.currency = nextCurrency;
    }

    if (req.body?.staff_note !== undefined) {
      updates.staff_note = cleanStr(req.body.staff_note, 1000);
    }

    if (supabaseAdmin) {
      let { data, error } = await supabaseAdmin
        .from('bookings')
        .update(updates)
        .eq('id', req.params.id)
        .select('*')
        .single();

      // Retry without staff_note if user ran 001_initial_schema.sql without 002
      if (error && 'staff_note' in updates) {
        const { staff_note: _ignored, ...withoutNote } = updates;
        const retry = await supabaseAdmin
          .from('bookings')
          .update(withoutNote)
          .eq('id', req.params.id)
          .select('*')
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        res.json({ booking: mapSupabaseBooking(data as Record<string, unknown>) });
        return;
      }
      if (error) {
        res.status(404).json({ error: error.message || 'Booking not found.' });
        return;
      }
    }

    const target = bookings.find((b) => b.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }
    if (updates.status !== undefined) target.status = updates.status as BookingStatus;
    if (updates.quoted_amount !== undefined) target.quoted_amount = updates.quoted_amount as number | null;
    if (updates.currency !== undefined) target.currency = updates.currency as Currency;
    if (updates.staff_note !== undefined) target.staff_note = updates.staff_note as string;
    target.updated_at = new Date().toISOString();
    res.json({ booking: target });
  });

  app.delete('/api/admin/bookings/:id', requireAdmin, async (req, res) => {
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from('bookings').delete().eq('id', req.params.id);
      if (error) {
        res.status(400).json({ error: error.message || 'Could not delete booking.' });
        return;
      }
      res.json({ ok: true });
      return;
    }

    const idx = bookings.findIndex((b) => b.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }
    bookings.splice(idx, 1);
    res.json({ ok: true });
  });

  // Admin services management
  app.get('/api/admin/services', requireAdmin, async (_req, res) => {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('services')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) {
        res.json({ services: data.map((r) => mapSupabaseService(r as Record<string, unknown>)) });
        return;
      }
    } else if (supabasePublic) {
      const { data, error } = await supabasePublic
        .from('services')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        res.json({ services: data.map((r) => mapSupabaseService(r as Record<string, unknown>)) });
        return;
      }
    }
    res.json({ services });
  });

  app.post('/api/admin/services', requireAdmin, async (req, res) => {
    const name = cleanStr(req.body?.name, 80);
    const description = cleanStr(req.body?.description, 240);
    const icon = cleanStr(req.body?.icon, 40) || 'Globe2';
    if (!name || !description) {
      res.status(400).json({ error: 'Service name and description are required.' });
      return;
    }

    if (supabaseAdmin) {
      let { data, error } = await supabaseAdmin
        .from('services')
        .insert({ name, description, icon, active: true })
        .select('*')
        .single();

      if (error) {
        const retry = await supabaseAdmin
          .from('services')
          .insert({ name, description, active: true })
          .select('*')
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        res.status(error.code === '23505' ? 409 : 400).json({ error: error.message });
        return;
      }
      res.status(201).json({ service: mapSupabaseService(data as Record<string, unknown>) });
      return;
    }

    if (services.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      res.status(409).json({ error: 'Service already exists.' });
      return;
    }
    const created: ServiceRecord = {
      id: `svc-${crypto.randomBytes(4).toString('hex')}`,
      name,
      description,
      icon,
      active: true,
      created_at: new Date().toISOString(),
    };
    services.push(created);
    res.status(201).json({ service: created });
  });

  app.patch('/api/admin/services/:id', requireAdmin, async (req, res) => {
    const updates: Record<string, unknown> = {};
    if (typeof req.body?.active === 'boolean') updates.active = req.body.active;
    if (typeof req.body?.name === 'string' && req.body.name.trim()) updates.name = cleanStr(req.body.name, 80);
    if (typeof req.body?.description === 'string' && req.body.description.trim()) {
      updates.description = cleanStr(req.body.description, 240);
    }

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('services')
        .update(updates)
        .eq('id', req.params.id)
        .select('*')
        .single();
      if (error || !data) {
        res.status(404).json({ error: error?.message || 'Service not found.' });
        return;
      }
      res.json({ service: mapSupabaseService(data as Record<string, unknown>) });
      return;
    }

    const target = services.find((s) => s.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }
    if (typeof updates.active === 'boolean') target.active = updates.active;
    if (typeof updates.name === 'string') target.name = updates.name;
    if (typeof updates.description === 'string') target.description = updates.description;
    res.json({ service: target });
  });

  // Admin destinations management
  app.get('/api/admin/destinations', requireAdmin, async (_req, res) => {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('destinations')
        .select('*')
        .order('name', { ascending: true });
      if (!error && Array.isArray(data)) {
        res.json({
          destinations: data.map((r) => ({
            id: String((r as Record<string, unknown>).id),
            name: String((r as Record<string, unknown>).name),
            active: Boolean((r as Record<string, unknown>).active ?? true),
          })),
        });
        return;
      }
    } else if (supabasePublic) {
      const { data, error } = await supabasePublic
        .from('destinations')
        .select('*')
        .order('name', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        res.json({
          destinations: data.map((r) => ({
            id: String((r as Record<string, unknown>).id),
            name: String((r as Record<string, unknown>).name),
            active: Boolean((r as Record<string, unknown>).active ?? true),
          })),
        });
        return;
      }
    }
    res.json({ destinations });
  });

  app.post('/api/admin/destinations', requireAdmin, async (req, res) => {
    const name = cleanStr(req.body?.name, 80);
    if (!name) {
      res.status(400).json({ error: 'Destination name is required.' });
      return;
    }

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('destinations')
        .insert({ name, active: true })
        .select('*')
        .single();
      if (error) {
        res.status(error.code === '23505' ? 409 : 400).json({ error: error.message });
        return;
      }
      res.status(201).json({
        destination: {
          id: String((data as Record<string, unknown>).id),
          name: String((data as Record<string, unknown>).name),
          active: Boolean((data as Record<string, unknown>).active ?? true),
        },
      });
      return;
    }

    if (destinations.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      res.status(409).json({ error: 'Destination already exists.' });
      return;
    }
    const created: DestinationRecord = {
      id: `dst-${crypto.randomBytes(4).toString('hex')}`,
      name,
      active: true,
    };
    destinations.push(created);
    res.status(201).json({ destination: created });
  });

  app.patch('/api/admin/destinations/:id', requireAdmin, async (req, res) => {
    const updates: Record<string, unknown> = {};
    if (typeof req.body?.active === 'boolean') updates.active = req.body.active;
    if (typeof req.body?.name === 'string' && req.body.name.trim()) updates.name = cleanStr(req.body.name, 80);

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('destinations')
        .update(updates)
        .eq('id', req.params.id)
        .select('*')
        .single();
      if (error || !data) {
        res.status(404).json({ error: error?.message || 'Destination not found.' });
        return;
      }
      res.json({
        destination: {
          id: String((data as Record<string, unknown>).id),
          name: String((data as Record<string, unknown>).name),
          active: Boolean((data as Record<string, unknown>).active ?? true),
        },
      });
      return;
    }

    const target = destinations.find((d) => d.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Destination not found.' });
      return;
    }
    if (typeof updates.active === 'boolean') target.active = updates.active;
    if (typeof updates.name === 'string') target.name = updates.name;
    res.json({ destination: target });
  });

  // Return JSON 404 for unknown API routes
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api/')) {
        res.sendFile(path.join(distDir, 'index.html'));
        return;
      }
      next();
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TNP Travel Agency server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
