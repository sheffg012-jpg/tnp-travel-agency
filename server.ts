import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';

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
  app.get('/api/catalog', (_req, res) => {
    res.json({
      services: services.filter((s) => s.active),
      destinations: destinations.filter((d) => d.active),
    });
  });

  // Public booking inquiry creation
  app.post('/api/bookings', (req, res) => {
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

    bookings.unshift(record);
    res.status(201).json({
      booking: {
        id: record.id,
        reference: record.reference,
        status: record.status,
        created_at: record.created_at,
      },
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
  app.get('/api/admin/bookings', requireAdmin, (_req, res) => {
    const stats = {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      inProgress: bookings.filter((b) => b.status === 'reviewing' || b.status === 'awaiting_payment').length,
      confirmed: bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed').length,
    };
    res.json({ bookings, stats });
  });

  app.patch('/api/admin/bookings/:id', requireAdmin, (req, res) => {
    const target = bookings.find((b) => b.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    if (req.body?.status !== undefined) {
      const nextStatus = cleanStr(req.body.status, 30) as BookingStatus;
      if (!BOOKING_STATUSES.includes(nextStatus)) {
        res.status(400).json({ error: 'Invalid booking status.' });
        return;
      }
      target.status = nextStatus;
    }

    if (req.body?.quoted_amount !== undefined) {
      if (req.body.quoted_amount === null || req.body.quoted_amount === '') {
        target.quoted_amount = null;
      } else {
        const amt = Number(req.body.quoted_amount);
        if (!Number.isFinite(amt) || amt < 0) {
          res.status(400).json({ error: 'Quoted amount must be a valid positive number.' });
          return;
        }
        target.quoted_amount = Math.round(amt * 100) / 100;
      }
    }

    if (req.body?.currency !== undefined) {
      const nextCurrency = cleanStr(req.body.currency, 10).toUpperCase() as Currency;
      if (!CURRENCIES.includes(nextCurrency)) {
        res.status(400).json({ error: 'Unsupported currency.' });
        return;
      }
      target.currency = nextCurrency;
    }

    if (req.body?.staff_note !== undefined) {
      target.staff_note = cleanStr(req.body.staff_note, 1000);
    }

    target.updated_at = new Date().toISOString();
    res.json({ booking: target });
  });

  app.delete('/api/admin/bookings/:id', requireAdmin, (req, res) => {
    const idx = bookings.findIndex((b) => b.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }
    bookings.splice(idx, 1);
    res.json({ ok: true });
  });

  // Admin services management
  app.get('/api/admin/services', requireAdmin, (_req, res) => {
    res.json({ services });
  });

  app.post('/api/admin/services', requireAdmin, (req, res) => {
    const name = cleanStr(req.body?.name, 80);
    const description = cleanStr(req.body?.description, 240);
    const icon = cleanStr(req.body?.icon, 40) || 'Globe2';
    if (!name || !description) {
      res.status(400).json({ error: 'Service name and description are required.' });
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

  app.patch('/api/admin/services/:id', requireAdmin, (req, res) => {
    const target = services.find((s) => s.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }
    if (typeof req.body?.active === 'boolean') target.active = req.body.active;
    if (typeof req.body?.name === 'string' && req.body.name.trim()) target.name = cleanStr(req.body.name, 80);
    if (typeof req.body?.description === 'string' && req.body.description.trim()) {
      target.description = cleanStr(req.body.description, 240);
    }
    res.json({ service: target });
  });

  // Admin destinations management
  app.get('/api/admin/destinations', requireAdmin, (_req, res) => {
    res.json({ destinations });
  });

  app.post('/api/admin/destinations', requireAdmin, (req, res) => {
    const name = cleanStr(req.body?.name, 80);
    if (!name) {
      res.status(400).json({ error: 'Destination name is required.' });
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

  app.patch('/api/admin/destinations/:id', requireAdmin, (req, res) => {
    const target = destinations.find((d) => d.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Destination not found.' });
      return;
    }
    if (typeof req.body?.active === 'boolean') target.active = req.body.active;
    if (typeof req.body?.name === 'string' && req.body.name.trim()) target.name = cleanStr(req.body.name, 80);
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
