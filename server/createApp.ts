import crypto from 'node:crypto';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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

interface SocialLinkRecord {
  id: string;
  platform: string;
  label: string;
  url: string;
  active: boolean;
  sort_order: number;
  created_at: string;
}

const PICTURE_PLACEMENTS = ['gallery', 'hero', 'feature', 'about'] as const;
type PicturePlacement = (typeof PICTURE_PLACEMENTS)[number];

interface SitePictureRecord {
  id: string;
  title: string;
  caption: string;
  placement: PicturePlacement;
  image_url: string;
  storage_path?: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface ClaimedAdmin {
  username: string;
  salt: string;
  hash: string;
}

interface AdminUserRecord {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  role: 'admin' | 'super_admin';
  active: boolean;
  auth_provider: string;
  auth_status: 'invited' | 'active' | 'disabled';
  has_password: boolean;
  invited_at: string | null;
  confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
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
const revokedSessions = new Map<string, number>();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

const bookings: BookingRecord[] = [];
const socialLinks: SocialLinkRecord[] = [];
let contactEmail = (process.env.VITE_CONTACT_EMAIL || 'agencytnptravel@gmail.com').trim();
let whatsappNumber = (process.env.VITE_WHATSAPP_NUMBER || '250788697728').replace(/\D/g, '') || '250788697728';
const pictureBlobs = new Map<string, { buffer: Buffer; mime: string }>();
const nowIso = new Date().toISOString();
const sitePictures: SitePictureRecord[] = [
  {
    id: 'pic-hero-default',
    title: 'Explore the World with TNP',
    caption: 'Main hero banner showcased on the home page.',
    placement: 'hero',
    image_url: '/tnp-main-poster.jpg',
    storage_path: null,
    active: true,
    sort_order: 1,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: 'pic-feature-default',
    title: 'Flight & Travel Support',
    caption: 'Featured banner for air ticketing and travel assistance.',
    placement: 'feature',
    image_url: '/tnp-air-ticketing.jpg',
    storage_path: null,
    active: true,
    sort_order: 2,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: 'pic-about-default',
    title: 'TNP Travel Agency Brand',
    caption: 'Official logo & visual displayed in the About section.',
    placement: 'about',
    image_url: '/tnp-logo.jpg',
    storage_path: null,
    active: true,
    sort_order: 3,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: 'pic-gallery-1',
    title: 'Complete Travel Services',
    caption: 'Flights, visas, hotel reservations, and end-to-end trip planning.',
    placement: 'gallery',
    image_url: '/tnp-services.jpg',
    storage_path: null,
    active: true,
    sort_order: 4,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: 'pic-gallery-2',
    title: 'Global Travel Campaigns',
    caption: 'Tailored international holiday, study, and business travel support.',
    placement: 'gallery',
    image_url: '/tnp-social-campaigns.jpg',
    storage_path: null,
    active: true,
    sort_order: 5,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: 'pic-gallery-3',
    title: 'Air Ticketing & Reservations',
    caption: 'Responsive ticketing desk connecting you to destinations worldwide.',
    placement: 'gallery',
    image_url: '/tnp-air-ticketing.jpg',
    storage_path: null,
    active: true,
    sort_order: 6,
    created_at: nowIso,
    updated_at: nowIso,
  },
];

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

async function isAdminConfigured(): Promise<boolean> {
  if (isEnvConfigured() || claimedAdmin !== null) return true;
  if (supabaseAdmin) {
    try {
      const [{ data: accRows }, { data: profRows }] = await Promise.all([
        supabaseAdmin.from('admin_accounts').select('id').eq('active', true).limit(1),
        supabaseAdmin.from('profiles').select('id').in('role', ['admin', 'super_admin']).limit(1),
      ]);
      if ((accRows && accRows.length > 0) || (profRows && profRows.length > 0)) {
        return true;
      }
    } catch {
      // Table may not exist yet
    }
  }
  return false;
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function issueSessionToken(username: string, supabaseAccessToken?: string): Promise<string> {
  const jti = crypto.randomBytes(16).toString('hex');
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ sub: username, jti, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const hmacToken = `${payload}.${sig}`;

  // If running across serverless instances without SESSION_SECRET or service role,
  // a Supabase-signed JWT can be verified consistently by every instance.
  if (!process.env.SESSION_SECRET && !supabaseAdmin && supabaseAccessToken) {
    return supabaseAccessToken;
  }

  // Persist hashed session reference in Supabase audit_logs so multi-instance serverless
  // deployments verify sessions even if SESSION_SECRET is not set in env vars.
  if (supabaseAdmin && !process.env.SESSION_SECRET) {
    try {
      await supabaseAdmin.from('audit_logs').insert({
        action: 'admin_session',
        entity: sha256Hex(hmacToken),
        metadata: { username, jti, exp },
      });
    } catch {
      // Non-fatal if audit_logs is unavailable
    }
  }

  return hmacToken;
}

function verifyLocalHmacToken(token: string): { username: string; jti: string; exp: number } | null {
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
      return null;
    }
    const revokedExp = revokedSessions.get(parsed.jti);
    if (revokedExp && revokedExp > Date.now()) {
      return null;
    }
    return { username: parsed.sub, jti: parsed.jti, exp: parsed.exp };
  } catch {
    return null;
  }
}

async function verifySessionTokenAsync(token: string): Promise<{ username: string; jti: string } | null> {
  const tokenHash = sha256Hex(token);
  const hashRevoked = revokedSessions.get(tokenHash);
  if (hashRevoked && hashRevoked > Date.now()) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length === 2) {
    const localVerified = verifyLocalHmacToken(token);
    if (localVerified) {
      return { username: localVerified.username, jti: localVerified.jti };
    }

    // Cross-instance fallback via Supabase audit_logs when SESSION_SECRET isn't configured across instances
    if (supabaseAdmin) {
      try {
        const { data: logs } = await supabaseAdmin
          .from('audit_logs')
          .select('action, metadata')
          .eq('entity', tokenHash)
          .in('action', ['admin_session', 'admin_session_revoked'])
          .order('created_at', { ascending: false })
          .limit(10);

        if (Array.isArray(logs) && logs.length > 0) {
          if (logs.some((l) => l.action === 'admin_session_revoked')) {
            return null;
          }
          const sessionRow = logs.find((l) => l.action === 'admin_session');
          const meta = (sessionRow?.metadata as { username?: string; jti?: string; exp?: number } | null) || null;
          if (meta?.username && meta?.jti && meta?.exp && Date.now() <= meta.exp) {
            const jtiRevoked = revokedSessions.get(meta.jti);
            if (jtiRevoked && jtiRevoked > Date.now()) return null;
            return { username: meta.username, jti: meta.jti };
          }
        }
      } catch {
        // Fall through
      }
    }
    return null;
  }

  // Fallback for 3-part Supabase Auth JWT tokens across serverless instances
  if (parts.length === 3 && supabasePublic && supabaseUrl && supabaseAnonKey) {
    try {
      const { data: userRes, error: userErr } = await supabasePublic.auth.getUser(token);
      if (userErr || !userRes?.user?.email) {
        return null;
      }
      const supaUser = userRes.user as unknown as SupabaseMinimalUser;
      const authCheck = await isAuthorizedAdminUser(supaUser, false);
      if (authCheck.disabled) return null;

      let allowed = authCheck.allowed;
      if (!allowed && !supabaseAdmin) {
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: prof } = await userClient
          .from('profiles')
          .select('role')
          .eq('id', supaUser.id)
          .maybeSingle();
        allowed = prof?.role === 'admin' || prof?.role === 'super_admin';
      }

      if (!allowed) return null;
      return { username: (supaUser.email || '').trim().toLowerCase(), jti: tokenHash };
    } catch {
      return null;
    }
  }

  return null;
}

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const verified = await verifySessionTokenAsync(token);
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

function validateHttpUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 500) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
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

function mapSupabaseSocialLink(row: Record<string, unknown>): SocialLinkRecord {
  return {
    id: String(row.id),
    platform: String(row.platform || ''),
    label: String(row.label || row.platform || ''),
    url: String(row.url || ''),
    active: Boolean(row.active ?? true),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at || new Date().toISOString()),
  };
}

function validatePictureUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 600) return null;
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//') || trimmed.includes('..') || /[\s"'<>\\]/.test(trimmed)) {
      return null;
    }
    return trimmed;
  }
  return validateHttpUrl(trimmed);
}

function parseValidatedImageDataUrl(raw: unknown): { buffer: Buffer; mime: string; ext: string } | null {
  if (typeof raw !== 'string') return null;
  const match = raw.trim().match(/^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;

  const base64Clean = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(base64Clean, 'base64');
  if (buffer.length < 8 || buffer.length > 3 * 1024 * 1024) {
    return null;
  }

  // Verify actual binary magic bytes (blocks spoofed MIME types)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { buffer, mime: 'image/jpeg', ext: 'jpg' };
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { buffer, mime: 'image/png', ext: 'png' };
  }
  if (buffer.subarray(0, 4).toString('ascii') === 'GIF8') {
    return { buffer, mime: 'image/gif', ext: 'gif' };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { buffer, mime: 'image/webp', ext: 'webp' };
  }

  return null;
}

function mapSupabasePicture(row: Record<string, unknown>): SitePictureRecord {
  const rawPlacement = String(row.placement || 'gallery') as PicturePlacement;
  return {
    id: String(row.id),
    title: String(row.title || ''),
    caption: String(row.caption || ''),
    placement: PICTURE_PLACEMENTS.includes(rawPlacement) ? rawPlacement : 'gallery',
    image_url: String(row.image_url || ''),
    storage_path: row.storage_path ? String(row.storage_path) : null,
    active: Boolean(row.active ?? true),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: String(row.updated_at || row.created_at || new Date().toISOString()),
  };
}

async function uploadPictureToStorage(
  buffer: Buffer,
  mime: string,
  ext: string,
  placement: PicturePlacement,
  pictureId: string,
): Promise<{ imageUrl: string; storagePath: string } | null> {
  if (!supabaseAdmin) return null;
  const bucketName = 'site-pictures';
  try {
    const { data: bucket } = await supabaseAdmin.storage.getBucket(bucketName);
    if (!bucket) {
      await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      });
    }

    const storagePath = `${placement}/${pictureId}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(storagePath, buffer, { contentType: mime, upsert: true });

    if (uploadErr) {
      return null;
    }

    const { data: publicData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(storagePath);
    if (!publicData?.publicUrl) return null;

    return { imageUrl: publicData.publicUrl, storagePath };
  } catch {
    return null;
  }
}

async function removePictureFromStorage(storagePath?: string | null): Promise<void> {
  if (!supabaseAdmin || !storagePath) return;
  try {
    await supabaseAdmin.storage.from('site-pictures').remove([storagePath]);
  } catch {
    // Non-fatal cleanup
  }
}

interface SupabaseMinimalUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  invited_at?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  created_at?: string | null;
  banned_until?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

function deriveAuthStatus(user: SupabaseMinimalUser, activeOverride?: boolean): 'invited' | 'active' | 'disabled' {
  if (activeOverride === false) return 'disabled';
  if (user.banned_until && new Date(user.banned_until).getTime() > Date.now()) {
    return 'disabled';
  }
  const confirmed = user.email_confirmed_at || user.confirmed_at;
  if (user.invited_at && !confirmed) return 'invited';
  return 'active';
}

async function syncSupabaseUserToTables(
  user: SupabaseMinimalUser,
  options?: {
    role?: 'admin' | 'super_admin';
    active?: boolean;
    authStatus?: 'invited' | 'active' | 'disabled';
    hasPassword?: boolean;
    lastSignInNow?: boolean;
    fullName?: string;
  },
): Promise<void> {
  if (!supabaseAdmin || !user.email) return;

  const email = user.email.trim().toLowerCase();
  const provider =
    typeof user.app_metadata?.provider === 'string' && user.app_metadata.provider
      ? user.app_metadata.provider
      : 'email';
  const metaName =
    options?.fullName ||
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
    email.split('@')[0];
  const confirmedAt = user.email_confirmed_at || user.confirmed_at || (options?.authStatus === 'active' ? new Date().toISOString() : null);
  const lastSignInAt = options?.lastSignInNow ? new Date().toISOString() : user.last_sign_in_at || null;

  try {
    const { data: existingAcc } = await supabaseAdmin
      .from('admin_accounts')
      .select('id, role, active, auth_metadata')
      .or(`auth_user_id.eq.${user.id},email.eq.${email}`)
      .maybeSingle();

    const { data: existingProf } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const resolvedRole: 'admin' | 'super_admin' =
      options?.role ||
      (existingAcc?.role === 'super_admin' || existingProf?.role === 'super_admin' ? 'super_admin' : 'admin');
    const resolvedActive =
      options?.active !== undefined
        ? options.active
        : existingAcc?.active !== undefined
          ? Boolean(existingAcc.active)
          : true;
    const resolvedStatus = options?.authStatus || deriveAuthStatus(user, resolvedActive);
    const prevMeta = (existingAcc?.auth_metadata as Record<string, unknown> | null) || {};
    const authMeta = {
      ...prevMeta,
      providers: Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : [provider],
      email_verified: Boolean(confirmedAt),
      ...(options?.hasPassword !== undefined ? { has_password: options.hasPassword } : {}),
    };

    // Sync public.profiles (graceful fallback if 004 columns aren't added yet)
    const { error: profErr } = await supabaseAdmin.from('profiles').upsert(
      {
        id: user.id,
        email,
        full_name: metaName,
        phone: user.phone || null,
        role: resolvedRole,
        auth_provider: provider,
        email_confirmed_at: confirmedAt,
        last_sign_in_at: lastSignInAt,
      },
      { onConflict: 'id' },
    );

    if (profErr) {
      await supabaseAdmin.from('profiles').upsert(
        {
          id: user.id,
          full_name: metaName,
          role: resolvedRole,
        },
        { onConflict: 'id' },
      );
    }

    // Sync public.admin_accounts
    if (existingAcc?.id) {
      const { error: accUpdErr } = await supabaseAdmin
        .from('admin_accounts')
        .update({
          auth_user_id: user.id,
          email,
          full_name: metaName,
          role: resolvedRole,
          active: resolvedActive,
          auth_provider: provider,
          auth_status: resolvedStatus,
          invited_at: user.invited_at || null,
          confirmed_at: confirmedAt,
          last_sign_in_at: lastSignInAt,
          auth_metadata: authMeta,
        })
        .eq('id', existingAcc.id);

      if (accUpdErr) {
        await supabaseAdmin
          .from('admin_accounts')
          .update({ email, role: resolvedRole, active: resolvedActive })
          .eq('id', existingAcc.id);
      }
    } else {
      const { error: accInsErr } = await supabaseAdmin.from('admin_accounts').insert({
        auth_user_id: user.id,
        email,
        full_name: metaName,
        role: resolvedRole,
        active: resolvedActive,
        auth_provider: provider,
        auth_status: resolvedStatus,
        invited_at: user.invited_at || null,
        confirmed_at: confirmedAt,
        last_sign_in_at: lastSignInAt,
        auth_metadata: authMeta,
      });

      if (accInsErr) {
        await supabaseAdmin.from('admin_accounts').insert({
          email,
          password_hash: '',
          password_salt: '',
          role: resolvedRole,
          active: resolvedActive,
        });
      }
    }
  } catch {
    // Non-fatal if migration 004 has not been applied yet
  }
}

async function isAuthorizedAdminUser(user: SupabaseMinimalUser, allowInvited = false): Promise<{ allowed: boolean; disabled: boolean }> {
  const email = (user.email || '').trim().toLowerCase();
  if (!email) return { allowed: false, disabled: false };

  let accActive: boolean | null = null;
  let profRole: string | null = null;

  if (supabaseAdmin) {
    try {
      const [{ data: acc }, { data: prof }] = await Promise.all([
        supabaseAdmin
          .from('admin_accounts')
          .select('active')
          .or(`auth_user_id.eq.${user.id},email.eq.${email}`)
          .maybeSingle(),
        supabaseAdmin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      ]);
      if (acc) accActive = acc.active !== false;
      if (prof && typeof prof.role === 'string') profRole = prof.role;
    } catch {
      // Ignore missing table errors
    }
  }

  if (accActive === false) {
    return { allowed: false, disabled: true };
  }
  if (profRole === 'admin' || profRole === 'super_admin' || accActive === true) {
    return { allowed: true, disabled: false };
  }
  if (allowInvited && Boolean(user.invited_at)) {
    return { allowed: true, disabled: false };
  }
  return { allowed: false, disabled: false };
}

async function verifySupabaseAuthAdmin(
  email: string,
  password: string,
): Promise<{ email: string | null; accessToken?: string; errorMessage?: string }> {
  if (!supabaseUrl || !supabaseAnonKey) return { email: null };
  try {
    if (supabaseAdmin) {
      const { data: acc } = await supabaseAdmin
        .from('admin_accounts')
        .select('active')
        .eq('email', email)
        .maybeSingle();
      if (acc && acc.active === false) {
        return { email: null, errorMessage: 'This administrator account is disabled.' };
      }
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) {
      if (error?.message && /confirm/i.test(error.message)) {
        return {
          email: null,
          errorMessage: 'Email is not confirmed yet. Check your inbox or confirm this user in Supabase Authentication.',
        };
      }
      return { email: null };
    }

    let isAdmin = false;
    if (supabaseAdmin) {
      const authCheck = await isAuthorizedAdminUser(data.user as unknown as SupabaseMinimalUser, false);
      if (authCheck.disabled) {
        return { email: null, errorMessage: 'This administrator account is disabled.' };
      }
      isAdmin = authCheck.allowed;
    } else {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: prof } = await userClient
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();
      if (prof?.role === 'admin' || prof?.role === 'super_admin') {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return { email: null };
    }

    const resolvedEmail = (data.user.email || email).toLowerCase();
    await syncSupabaseUserToTables(data.user as unknown as SupabaseMinimalUser, {
      authStatus: 'active',
      hasPassword: true,
      lastSignInNow: true,
    });
    return { email: resolvedEmail, accessToken: data.session.access_token };
  } catch {
    return { email: null };
  }
}

export function createApiApp(): Express {
  const app = express();
  app.set('trust proxy', 1);

  const defaultJsonParser = express.json({ limit: '100kb' });
  const picturesJsonParser = express.json({ limit: '4mb' });
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/admin/pictures')) {
      picturesJsonParser(req, res, next);
      return;
    }
    defaultJsonParser(req, res, next);
  });

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Public catalog (active services, destinations, social links, and site pictures)
  app.get('/api/catalog', async (_req, res) => {
    let resolvedServices = services.filter((s) => s.active);
    let resolvedDestinations = destinations.filter((d) => d.active);
    let resolvedSocialLinks = socialLinks.filter((l) => l.active);
    let resolvedPictures = sitePictures.filter((p) => p.active);
    let resolvedContactEmail = contactEmail;
    let resolvedWhatsappNumber = whatsappNumber;

    if (supabasePublic) {
      try {
        const [
          { data: svcRows, error: svcErr },
          { data: dstRows, error: dstErr },
          { data: socRows, error: socErr },
          { data: picRows, error: picErr },
          { data: setRows, error: setErr },
        ] = await Promise.all([
          supabasePublic.from('services').select('*').eq('active', true).order('created_at', { ascending: true }),
          supabasePublic.from('destinations').select('*').eq('active', true).order('name', { ascending: true }),
          supabasePublic.from('social_links').select('*').eq('active', true).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
          supabasePublic
            .from('site_pictures')
            .select('id, title, caption, placement, image_url, active, sort_order, created_at, updated_at')
            .eq('active', true)
            .order('sort_order', { ascending: true })
            .order('updated_at', { ascending: false }),
          supabasePublic
            .from('site_settings')
            .select('key, value')
            .in('key', ['contact_email', 'whatsapp_number']),
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
        if (!socErr && Array.isArray(socRows)) {
          resolvedSocialLinks = socRows.map((r) => mapSupabaseSocialLink(r as Record<string, unknown>));
        }
        if (!picErr && Array.isArray(picRows) && picRows.length > 0) {
          resolvedPictures = picRows.map((r) => mapSupabasePicture(r as Record<string, unknown>));
        }
        if (!setErr && Array.isArray(setRows)) {
          for (const row of setRows) {
            const r = row as { key?: string; value?: string };
            if (r.key === 'contact_email' && r.value) {
              resolvedContactEmail = r.value.trim();
            } else if (r.key === 'whatsapp_number' && r.value) {
              const digits = r.value.replace(/\D/g, '');
              if (digits) resolvedWhatsappNumber = digits;
            }
          }
        }
      } catch {
        // Fall back to default/memory catalog if Supabase tables are not yet initialized
      }
    }

    res.json({
      services: resolvedServices,
      destinations: resolvedDestinations,
      socialLinks: resolvedSocialLinks,
      pictures: resolvedPictures.map(({ storage_path: _sp, ...pub }) => pub),
      settings: {
        contact_email: resolvedContactEmail,
        whatsapp_number: resolvedWhatsappNumber,
      },
    });
  });

  // Public image fallback endpoint for uploaded images stored when Storage bucket is unavailable
  app.get('/api/pictures/:id/file', async (req, res) => {
    const picId = cleanStr(req.params.id, 100);
    if (!picId) {
      res.status(400).end();
      return;
    }

    const memBlob = pictureBlobs.get(picId);
    if (memBlob) {
      res.setHeader('Content-Type', memBlob.mime);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.send(memBlob.buffer);
      return;
    }

    const dbClient = supabaseAdmin || supabasePublic;
    if (dbClient) {
      try {
        const { data } = await dbClient
          .from('site_pictures')
          .select('image_base64, image_mime, active')
          .eq('id', picId)
          .maybeSingle();

        if (data && data.active !== false && typeof data.image_base64 === 'string' && data.image_base64) {
          const mime =
            typeof data.image_mime === 'string' && /^image\/(jpeg|png|webp|gif)$/i.test(data.image_mime)
              ? data.image_mime
              : 'image/jpeg';
          const buf = Buffer.from(data.image_base64, 'base64');
          res.setHeader('Content-Type', mime);
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.send(buf);
          return;
        }
      } catch {
        // Not found
      }
    }

    res.status(404).end();
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
  app.get('/api/admin/status', async (req, res) => {
    const token = extractBearerToken(req);
    const verified = token ? await verifySessionTokenAsync(token) : null;
    const configured = await isAdminConfigured();
    res.json({
      configured,
      authenticated: Boolean(verified),
      username: verified?.username ?? null,
    });
  });

  // One-time admin initialization (persists in Supabase admin_accounts when available)
  app.post('/api/admin/setup', async (req, res) => {
    if (!checkRateLimit(req)) {
      res.status(429).json({ error: 'Too many attempts. Please try again later.' });
      return;
    }
    if (await isAdminConfigured()) {
      res.status(409).json({ error: 'Admin access is already configured.' });
      return;
    }

    const username = cleanStr(req.body?.username, 120).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (username.length < 2 || password.length < 5) {
      res.status(400).json({ error: 'Email/username (min 2 chars) and password (min 5 chars) are required.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);

    let storedInSupabase = false;
    if (supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin.from('admin_accounts').insert({
          email: username,
          password_hash: hash,
          password_salt: salt,
          role: 'super_admin',
          active: true,
        });
        if (!error) {
          storedInSupabase = true;
        }
      } catch {
        // Fall back to in-memory claimedAdmin if admin_accounts table does not exist yet
      }
    }

    if (!storedInSupabase) {
      claimedAdmin = { username, salt, hash };
    }

    const token = await issueSessionToken(username);
    res.status(201).json({ token, username, storedInSupabase });
  });

  // Admin login
  app.post('/api/admin/login', async (req, res) => {
    if (!checkRateLimit(req)) {
      res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
      return;
    }

    const username = cleanStr(req.body?.username, 120);
    const normalizedEmail = username.toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      res.status(400).json({ error: 'Email/username and password are required.' });
      return;
    }

    let valid = false;
    let authedUsername = username;
    let accountDisabled = false;
    let authErrorMessage = '';
    let supabaseAccessToken: string | undefined;

    if (isEnvConfigured()) {
      const expectedUser = (process.env.ADMIN_USERNAME || 'admin').trim();
      const expectedPass = process.env.ADMIN_PASSWORD || '';
      valid = safeEqualText(normalizedEmail, expectedUser.toLowerCase()) && safeEqualText(password, expectedPass);
      authedUsername = expectedUser;
    }

    if (!valid && supabaseAdmin) {
      try {
        const { data: acc } = await supabaseAdmin
          .from('admin_accounts')
          .select('id, email, password_hash, password_salt, active')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (acc && acc.active === false) {
          accountDisabled = true;
        } else if (acc && typeof acc.password_hash === 'string' && acc.password_hash && typeof acc.password_salt === 'string' && acc.password_salt) {
          if (verifyScryptPassword(password, acc.password_salt, acc.password_hash)) {
            valid = true;
            authedUsername = String(acc.email);
            await supabaseAdmin
              .from('admin_accounts')
              .update({ last_sign_in_at: new Date().toISOString(), auth_status: 'active' })
              .eq('id', acc.id);
          }
        }
      } catch {
        // Continue to Supabase Auth / claimedAdmin check
      }
    }

    if (accountDisabled) {
      res.status(403).json({ error: 'This administrator account is disabled.' });
      return;
    }

    if (!valid && supabasePublic && normalizedEmail.includes('@')) {
      const supaCheck = await verifySupabaseAuthAdmin(normalizedEmail, password);
      if (supaCheck.email) {
        valid = true;
        authedUsername = supaCheck.email;
        supabaseAccessToken = supaCheck.accessToken;
      } else if (supaCheck.errorMessage) {
        authErrorMessage = supaCheck.errorMessage;
      }
    }

    if (!valid && claimedAdmin) {
      if (
        safeEqualText(normalizedEmail, claimedAdmin.username.toLowerCase()) &&
        verifyScryptPassword(password, claimedAdmin.salt, claimedAdmin.hash)
      ) {
        valid = true;
        authedUsername = claimedAdmin.username;
      }
    }

    if (!valid) {
      if (authErrorMessage) {
        res.status(401).json({ error: authErrorMessage });
        return;
      }
      if (!(await isAdminConfigured()) && !supabasePublic) {
        res.status(409).json({ error: 'Admin credentials are not initialized yet.' });
        return;
      }
      res.status(401).json({ error: 'Invalid email/username or password.' });
      return;
    }

    const token = await issueSessionToken(authedUsername, supabaseAccessToken);
    res.json({ token, username: authedUsername });
  });

  // Exchange a verified Supabase Auth session (after invite acceptance or password update) for an admin session token
  app.post('/api/admin/supabase-session', async (req, res) => {
    if (!supabasePublic || !supabaseUrl || !supabaseAnonKey) {
      res.status(503).json({ error: 'Supabase authentication is not configured on the server.' });
      return;
    }

    const accessToken = cleanStr(req.body?.access_token, 4096) || extractBearerToken(req);
    if (!accessToken) {
      res.status(400).json({ error: 'Supabase session token is required.' });
      return;
    }

    try {
      const { data: userRes, error: userErr } = await supabasePublic.auth.getUser(accessToken);
      if (userErr || !userRes?.user?.email) {
        res.status(401).json({ error: 'Invalid or expired Supabase session.' });
        return;
      }

      const supaUser = userRes.user as unknown as SupabaseMinimalUser;
      const authCheck = await isAuthorizedAdminUser(supaUser, true);
      if (authCheck.disabled) {
        res.status(403).json({ error: 'This administrator account is disabled.' });
        return;
      }
      if (!authCheck.allowed) {
        // Check with user's own JWT against public.profiles in case supabaseAdmin is not configured
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${accessToken}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: prof } = await userClient
          .from('profiles')
          .select('role')
          .eq('id', supaUser.id)
          .maybeSingle();
        if (prof?.role !== 'admin' && prof?.role !== 'super_admin' && !supaUser.invited_at) {
          res.status(403).json({ error: 'This account does not have administrator access.' });
          return;
        }
      }

      await syncSupabaseUserToTables(supaUser, {
        authStatus: 'active',
        hasPassword: req.body?.password_set === true ? true : undefined,
        lastSignInNow: true,
      });

      const email = (supaUser.email || '').trim().toLowerCase();
      const token = await issueSessionToken(email, accessToken);
      res.json({ token, username: email });
    } catch {
      res.status(401).json({ error: 'Could not verify Supabase session.' });
    }
  });

  // Accept Supabase invite or recovery link, set password, sync admin record, and enter dashboard
  app.post('/api/admin/accept-invite', async (req, res) => {
    if (!checkRateLimit(req)) {
      res.status(429).json({ error: 'Too many attempts. Please try again later.' });
      return;
    }
    if (!supabasePublic || !supabaseUrl || !supabaseAnonKey) {
      res.status(503).json({ error: 'Supabase authentication is not configured on the server.' });
      return;
    }

    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (password.length < 5) {
      res.status(400).json({ error: 'Password must be at least 5 characters.' });
      return;
    }

    const accessToken = cleanStr(req.body?.access_token, 4096);
    const refreshToken = cleanStr(req.body?.refresh_token, 4096);
    const tokenHash = cleanStr(req.body?.token_hash, 512);
    const otpType = cleanStr(req.body?.type, 40) || 'invite';

    try {
      let supaUser: SupabaseMinimalUser | null = null;
      let activeAccessToken = accessToken;
      let activeRefreshToken = refreshToken;

      if (accessToken) {
        const { data, error } = await supabasePublic.auth.getUser(accessToken);
        if (!error && data?.user) {
          supaUser = data.user as unknown as SupabaseMinimalUser;
        }
      } else if (tokenHash) {
        const verifyClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await verifyClient.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType === 'recovery' ? 'recovery' : 'invite',
        });
        if (!error && data?.user) {
          supaUser = data.user as unknown as SupabaseMinimalUser;
          activeAccessToken = data.session?.access_token || '';
          activeRefreshToken = data.session?.refresh_token || '';
        }
      }

      if (!supaUser || !supaUser.email) {
        res.status(401).json({ error: 'Invitation link is invalid or has expired. Please request a new invite.' });
        return;
      }

      const authCheck = await isAuthorizedAdminUser(supaUser, true);
      if (authCheck.disabled) {
        res.status(403).json({ error: 'This administrator account is disabled.' });
        return;
      }
      if (!authCheck.allowed && !supabaseAdmin && activeAccessToken) {
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${activeAccessToken}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: prof } = await userClient
          .from('profiles')
          .select('role')
          .eq('id', supaUser.id)
          .maybeSingle();
        if (prof?.role !== 'admin' && prof?.role !== 'super_admin' && !supaUser.invited_at) {
          res.status(403).json({ error: 'This account does not have administrator access.' });
          return;
        }
      }

      if (supabaseAdmin) {
        const { data: updData, error: updErr } = await supabaseAdmin.auth.admin.updateUserById(supaUser.id, {
          password,
          email_confirm: true,
        });
        if (updErr) {
          res.status(400).json({ error: updErr.message || 'Could not save password.' });
          return;
        }
        if (updData?.user) {
          supaUser = updData.user as unknown as SupabaseMinimalUser;
        }
      } else if (activeAccessToken && activeRefreshToken) {
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        await userClient.auth.setSession({
          access_token: activeAccessToken,
          refresh_token: activeRefreshToken,
        });
        const { data: updData, error: updErr } = await userClient.auth.updateUser({ password });
        if (updErr) {
          res.status(400).json({ error: updErr.message || 'Could not save password.' });
          return;
        }
        if (updData?.user) {
          supaUser = updData.user as unknown as SupabaseMinimalUser;
        }
      } else {
        res.status(400).json({ error: 'Missing Supabase session or service key to complete password setup.' });
        return;
      }

      await syncSupabaseUserToTables(supaUser, {
        authStatus: 'active',
        hasPassword: true,
        lastSignInNow: true,
      });

      const email = (supaUser.email || '').trim().toLowerCase();
      const token = await issueSessionToken(email, activeAccessToken || undefined);
      res.json({ token, username: email });
    } catch {
      res.status(500).json({ error: 'Unable to complete invitation setup.' });
    }
  });

  // Admin logout
  app.post('/api/admin/logout', requireAdmin, async (req: AuthedRequest, res) => {
    const token = extractBearerToken(req);
    if (req.adminUser?.jti) {
      revokedSessions.set(req.adminUser.jti, Date.now() + SESSION_TTL_MS);
    }
    if (token) {
      const tokenHash = sha256Hex(token);
      revokedSessions.set(tokenHash, Date.now() + SESSION_TTL_MS);
      if (supabaseAdmin) {
        try {
          await supabaseAdmin.from('audit_logs').insert({
            action: 'admin_session_revoked',
            entity: tokenHash,
            metadata: { username: req.adminUser?.username || null },
          });
        } catch {
          // Non-fatal
        }
      }
    }
    res.json({ ok: true });
  });

  // Admin password update (works for both local admin_accounts and Supabase Auth users)
  app.post('/api/admin/change-password', requireAdmin, async (req: AuthedRequest, res) => {
    if (!checkRateLimit(req)) {
      res.status(429).json({ error: 'Too many attempts. Please try again later.' });
      return;
    }

    if (isEnvConfigured()) {
      res.status(409).json({
        error: 'ADMIN_PASSWORD is set in server environment secrets. Update ADMIN_PASSWORD in Settings -> Secrets.',
      });
      return;
    }

    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!currentPassword || newPassword.length < 5) {
      res.status(400).json({ error: 'Current password and a new password (min 5 chars) are required.' });
      return;
    }

    const username = (req.adminUser?.username || '').trim().toLowerCase();
    let verified = false;
    let updatedInSupabase = false;

    if (supabaseAdmin && username) {
      try {
        const { data: acc } = await supabaseAdmin
          .from('admin_accounts')
          .select('id, auth_user_id, password_hash, password_salt')
          .eq('email', username)
          .maybeSingle();

        // Local scrypt password update
        if (acc && typeof acc.password_hash === 'string' && acc.password_hash && typeof acc.password_salt === 'string' && acc.password_salt) {
          if (!verifyScryptPassword(currentPassword, acc.password_salt, acc.password_hash)) {
            res.status(401).json({ error: 'Current password is incorrect.' });
            return;
          }
          verified = true;
          const nextSalt = crypto.randomBytes(16).toString('hex');
          const nextHash = hashPassword(newPassword, nextSalt);
          const { error: updateErr } = await supabaseAdmin
            .from('admin_accounts')
            .update({ password_hash: nextHash, password_salt: nextSalt })
            .eq('id', acc.id);
          if (updateErr) {
            res.status(500).json({ error: updateErr.message || 'Could not update password.' });
            return;
          }
          updatedInSupabase = true;
        }

        // Also verify & update Supabase Auth password if this user exists in auth.users
        if (supabaseUrl && supabaseAnonKey && username.includes('@')) {
          const verifyClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: signInData, error: signInErr } = await verifyClient.auth.signInWithPassword({
            email: username,
            password: currentPassword,
          });
          if (!signInErr && signInData?.user) {
            verified = true;
            const { error: authUpdErr } = await supabaseAdmin.auth.admin.updateUserById(signInData.user.id, {
              password: newPassword,
            });
            if (authUpdErr) {
              res.status(500).json({ error: authUpdErr.message || 'Could not update Supabase Auth password.' });
              return;
            }
            await syncSupabaseUserToTables(signInData.user as unknown as SupabaseMinimalUser, {
              authStatus: 'active',
              hasPassword: true,
            });
            updatedInSupabase = true;
          } else if (!verified && acc?.auth_user_id) {
            res.status(401).json({ error: 'Current password is incorrect.' });
            return;
          }
        }
      } catch {
        // Fall through to claimedAdmin check
      }
    }

    if (!verified && claimedAdmin && safeEqualText(username, claimedAdmin.username.toLowerCase())) {
      if (!verifyScryptPassword(currentPassword, claimedAdmin.salt, claimedAdmin.hash)) {
        res.status(401).json({ error: 'Current password is incorrect.' });
        return;
      }
      verified = true;
      const nextSalt = crypto.randomBytes(16).toString('hex');
      const nextHash = hashPassword(newPassword, nextSalt);
      claimedAdmin = { username: claimedAdmin.username, salt: nextSalt, hash: nextHash };
    }

    if (!verified) {
      res.status(400).json({
        error: 'Unable to update password for this account type. Ensure SUPABASE_SERVICE_ROLE_KEY is configured.',
      });
      return;
    }

    res.json({ ok: true, updatedInSupabase });
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

  // Admin social media links management
  app.get('/api/admin/social-links', requireAdmin, async (_req, res) => {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('social_links')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) {
        res.json({ socialLinks: data.map((r) => mapSupabaseSocialLink(r as Record<string, unknown>)) });
        return;
      }
    } else if (supabasePublic) {
      const { data, error } = await supabasePublic
        .from('social_links')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) {
        res.json({ socialLinks: data.map((r) => mapSupabaseSocialLink(r as Record<string, unknown>)) });
        return;
      }
    }
    res.json({ socialLinks });
  });

  app.post('/api/admin/social-links', requireAdmin, async (req, res) => {
    const platform = cleanStr(req.body?.platform, 60);
    const label = cleanStr(req.body?.label, 120) || platform;
    const validUrl = validateHttpUrl(req.body?.url);

    if (!platform) {
      res.status(400).json({ error: 'Social media platform is required.' });
      return;
    }
    if (!validUrl) {
      res.status(400).json({ error: 'Please provide a valid URL starting with https:// or http://' });
      return;
    }

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('social_links')
        .insert({
          platform,
          label,
          url: validUrl,
          active: true,
          sort_order: socialLinks.length,
        })
        .select('*')
        .single();
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(201).json({ socialLink: mapSupabaseSocialLink(data as Record<string, unknown>) });
      return;
    }

    const created: SocialLinkRecord = {
      id: `soc-${crypto.randomBytes(4).toString('hex')}`,
      platform,
      label,
      url: validUrl,
      active: true,
      sort_order: socialLinks.length,
      created_at: new Date().toISOString(),
    };
    socialLinks.push(created);
    res.status(201).json({ socialLink: created });
  });

  app.patch('/api/admin/social-links/:id', requireAdmin, async (req, res) => {
    const updates: Record<string, unknown> = {};
    if (typeof req.body?.active === 'boolean') updates.active = req.body.active;
    if (typeof req.body?.platform === 'string' && req.body.platform.trim()) {
      updates.platform = cleanStr(req.body.platform, 60);
    }
    if (typeof req.body?.label === 'string' && req.body.label.trim()) {
      updates.label = cleanStr(req.body.label, 120);
    }
    if (req.body?.url !== undefined) {
      const validUrl = validateHttpUrl(req.body.url);
      if (!validUrl) {
        res.status(400).json({ error: 'Please provide a valid URL starting with https:// or http://' });
        return;
      }
      updates.url = validUrl;
    }

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('social_links')
        .update(updates)
        .eq('id', req.params.id)
        .select('*')
        .single();
      if (error || !data) {
        res.status(404).json({ error: error?.message || 'Social link not found.' });
        return;
      }
      res.json({ socialLink: mapSupabaseSocialLink(data as Record<string, unknown>) });
      return;
    }

    const target = socialLinks.find((l) => l.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Social link not found.' });
      return;
    }
    if (typeof updates.active === 'boolean') target.active = updates.active;
    if (typeof updates.platform === 'string') target.platform = updates.platform;
    if (typeof updates.label === 'string') target.label = updates.label;
    if (typeof updates.url === 'string') target.url = updates.url;
    res.json({ socialLink: target });
  });

  app.delete('/api/admin/social-links/:id', requireAdmin, async (req, res) => {
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from('social_links').delete().eq('id', req.params.id);
      if (error) {
        res.status(400).json({ error: error.message || 'Could not delete social link.' });
        return;
      }
      res.json({ ok: true });
      return;
    }

    const idx = socialLinks.findIndex((l) => l.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Social link not found.' });
      return;
    }
    socialLinks.splice(idx, 1);
    res.json({ ok: true });
  });

  // Admin pictures & gallery management
  app.get('/api/admin/pictures', requireAdmin, async (_req, res) => {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('site_pictures')
          .select('id, title, caption, placement, image_url, storage_path, active, sort_order, created_at, updated_at')
          .order('sort_order', { ascending: true })
          .order('updated_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          res.json({
            pictures: data.map((r) => mapSupabasePicture(r as Record<string, unknown>)),
            tableReady: true,
          });
          return;
        }
      } catch {
        // Table not yet created in Supabase
      }
    } else if (supabasePublic) {
      try {
        const { data, error } = await supabasePublic
          .from('site_pictures')
          .select('id, title, caption, placement, image_url, active, sort_order, created_at, updated_at')
          .order('sort_order', { ascending: true })
          .order('updated_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          res.json({
            pictures: data.map((r) => mapSupabasePicture(r as Record<string, unknown>)),
            tableReady: true,
          });
          return;
        }
      } catch {
        // Fall through
      }
    }

    res.json({
      pictures: sitePictures,
      tableReady: !supabaseAdmin,
    });
  });

  app.post('/api/admin/pictures', requireAdmin, async (req, res) => {
    const title = cleanStr(req.body?.title, 120);
    const caption = cleanStr(req.body?.caption, 280);
    const rawPlacement = cleanStr(req.body?.placement, 30) as PicturePlacement;
    const placement: PicturePlacement = PICTURE_PLACEMENTS.includes(rawPlacement) ? rawPlacement : 'gallery';
    const parsedUpload = parseValidatedImageDataUrl(req.body?.imageDataUrl);
    const externalUrl = validatePictureUrl(req.body?.image_url);

    if (!title) {
      res.status(400).json({ error: 'Picture title is required.' });
      return;
    }
    if (!parsedUpload && !externalUrl) {
      res.status(400).json({
        error: 'Please upload a valid image file (JPG, PNG, WebP, or GIF under 3MB) or enter a valid image URL.',
      });
      return;
    }

    const pictureId = crypto.randomUUID();
    const now = new Date().toISOString();
    let finalImageUrl = externalUrl || '';
    let storagePath: string | null = null;
    let fallbackBase64: string | null = null;
    let fallbackMime: string | null = null;

    if (parsedUpload) {
      const uploaded = await uploadPictureToStorage(
        parsedUpload.buffer,
        parsedUpload.mime,
        parsedUpload.ext,
        placement,
        pictureId,
      );
      if (uploaded) {
        finalImageUrl = uploaded.imageUrl;
        storagePath = uploaded.storagePath;
      } else {
        pictureBlobs.set(pictureId, { buffer: parsedUpload.buffer, mime: parsedUpload.mime });
        finalImageUrl = `/api/pictures/${pictureId}/file?v=${Date.now()}`;
        fallbackBase64 = parsedUpload.buffer.toString('base64');
        fallbackMime = parsedUpload.mime;
      }
    }

    // Put newly uploaded hero/feature/about images first so they take priority on the public site
    const nextSortOrder = placement === 'gallery' ? sitePictures.length + 10 : 0;

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('site_pictures')
          .insert({
            id: pictureId,
            title,
            caption,
            placement,
            image_url: finalImageUrl,
            storage_path: storagePath,
            image_base64: fallbackBase64,
            image_mime: fallbackMime,
            active: true,
            sort_order: nextSortOrder,
          })
          .select('id, title, caption, placement, image_url, storage_path, active, sort_order, created_at, updated_at')
          .single();

        if (!error && data) {
          res.status(201).json({ picture: mapSupabasePicture(data as Record<string, unknown>) });
          return;
        }
        if (error && !/relation|does not exist|schema cache/i.test(error.message || '')) {
          res.status(400).json({ error: error.message });
          return;
        }
      } catch {
        // Fall back to in-memory store if migration 006 hasn't been applied yet
      }
    }

    const created: SitePictureRecord = {
      id: pictureId,
      title,
      caption,
      placement,
      image_url: finalImageUrl,
      storage_path: storagePath,
      active: true,
      sort_order: nextSortOrder,
      created_at: now,
      updated_at: now,
    };
    if (placement === 'gallery') {
      sitePictures.push(created);
    } else {
      sitePictures.unshift(created);
    }
    res.status(201).json({ picture: created });
  });

  app.patch('/api/admin/pictures/:id', requireAdmin, async (req, res) => {
    const pictureId = cleanStr(req.params.id, 100);
    const updates: Record<string, unknown> = {};

    if (typeof req.body?.active === 'boolean') updates.active = req.body.active;
    if (typeof req.body?.title === 'string') {
      const cleanTitle = cleanStr(req.body.title, 120);
      if (!cleanTitle) {
        res.status(400).json({ error: 'Picture title cannot be empty.' });
        return;
      }
      updates.title = cleanTitle;
    }
    if (typeof req.body?.caption === 'string') {
      updates.caption = cleanStr(req.body.caption, 280);
    }
    if (req.body?.placement !== undefined) {
      const rawPlacement = cleanStr(req.body.placement, 30) as PicturePlacement;
      if (!PICTURE_PLACEMENTS.includes(rawPlacement)) {
        res.status(400).json({ error: 'Invalid placement option.' });
        return;
      }
      updates.placement = rawPlacement;
      if (rawPlacement !== 'gallery') {
        updates.sort_order = 0;
      }
    }

    const parsedUpload = req.body?.imageDataUrl ? parseValidatedImageDataUrl(req.body.imageDataUrl) : null;
    if (req.body?.imageDataUrl && !parsedUpload) {
      res.status(400).json({
        error: 'Uploaded image must be a valid JPG, PNG, WebP, or GIF file under 3MB.',
      });
      return;
    }

    if (!parsedUpload && req.body?.image_url !== undefined) {
      const validUrl = validatePictureUrl(req.body.image_url);
      if (!validUrl) {
        res.status(400).json({ error: 'Please provide a valid image URL starting with https://, http://, or /' });
        return;
      }
      updates.image_url = validUrl;
      updates.image_base64 = null;
      updates.image_mime = null;
      updates.storage_path = null;
    }

    if (supabaseAdmin) {
      try {
        const { data: existing, error: findErr } = await supabaseAdmin
          .from('site_pictures')
          .select('id, placement, storage_path')
          .eq('id', pictureId)
          .maybeSingle();

        if (!findErr && existing) {
          const targetPlacement =
            (updates.placement as PicturePlacement | undefined) ||
            (PICTURE_PLACEMENTS.includes(String(existing.placement) as PicturePlacement)
              ? (String(existing.placement) as PicturePlacement)
              : 'gallery');

          if (parsedUpload) {
            const uploaded = await uploadPictureToStorage(
              parsedUpload.buffer,
              parsedUpload.mime,
              parsedUpload.ext,
              targetPlacement,
              pictureId,
            );
            if (uploaded) {
              updates.image_url = uploaded.imageUrl;
              updates.storage_path = uploaded.storagePath;
              updates.image_base64 = null;
              updates.image_mime = null;
            } else {
              pictureBlobs.set(pictureId, { buffer: parsedUpload.buffer, mime: parsedUpload.mime });
              updates.image_url = `/api/pictures/${pictureId}/file?v=${Date.now()}`;
              updates.storage_path = null;
              updates.image_base64 = parsedUpload.buffer.toString('base64');
              updates.image_mime = parsedUpload.mime;
            }
            if (existing.storage_path) {
              await removePictureFromStorage(String(existing.storage_path));
            }
          } else if (updates.image_url && existing.storage_path) {
            await removePictureFromStorage(String(existing.storage_path));
          }

          const { data, error } = await supabaseAdmin
            .from('site_pictures')
            .update(updates)
            .eq('id', pictureId)
            .select('id, title, caption, placement, image_url, storage_path, active, sort_order, created_at, updated_at')
            .single();

          if (error || !data) {
            res.status(400).json({ error: error?.message || 'Could not update picture.' });
            return;
          }
          res.json({ picture: mapSupabasePicture(data as Record<string, unknown>) });
          return;
        }
      } catch {
        // Fall through to in-memory array
      }
    }

    const target = sitePictures.find((p) => p.id === pictureId);
    if (!target) {
      res.status(404).json({ error: 'Picture not found.' });
      return;
    }

    const targetPlacement = (updates.placement as PicturePlacement | undefined) || target.placement;
    if (parsedUpload) {
      const uploaded = await uploadPictureToStorage(
        parsedUpload.buffer,
        parsedUpload.mime,
        parsedUpload.ext,
        targetPlacement,
        pictureId,
      );
      if (uploaded) {
        if (target.storage_path) await removePictureFromStorage(target.storage_path);
        target.image_url = uploaded.imageUrl;
        target.storage_path = uploaded.storagePath;
      } else {
        pictureBlobs.set(pictureId, { buffer: parsedUpload.buffer, mime: parsedUpload.mime });
        target.image_url = `/api/pictures/${pictureId}/file?v=${Date.now()}`;
        target.storage_path = null;
      }
    } else if (typeof updates.image_url === 'string') {
      target.image_url = updates.image_url;
      target.storage_path = null;
    }

    if (typeof updates.active === 'boolean') target.active = updates.active;
    if (typeof updates.title === 'string') target.title = updates.title;
    if (typeof updates.caption === 'string') target.caption = updates.caption;
    if (typeof updates.placement === 'string') target.placement = updates.placement as PicturePlacement;
    if (typeof updates.sort_order === 'number') target.sort_order = updates.sort_order;
    target.updated_at = new Date().toISOString();

    res.json({ picture: target });
  });

  app.delete('/api/admin/pictures/:id', requireAdmin, async (req, res) => {
    const pictureId = cleanStr(req.params.id, 100);
    pictureBlobs.delete(pictureId);

    if (supabaseAdmin) {
      try {
        const { data: existing } = await supabaseAdmin
          .from('site_pictures')
          .select('storage_path')
          .eq('id', pictureId)
          .maybeSingle();

        const { error } = await supabaseAdmin.from('site_pictures').delete().eq('id', pictureId);
        if (!error) {
          if (existing?.storage_path) {
            await removePictureFromStorage(String(existing.storage_path));
          }
          res.json({ ok: true });
          return;
        }
        if (!/relation|does not exist|schema cache/i.test(error.message || '')) {
          res.status(400).json({ error: error.message || 'Could not delete picture.' });
          return;
        }
      } catch {
        // Fall through to in-memory
      }
    }

    const idx = sitePictures.findIndex((p) => p.id === pictureId);
    if (idx === -1) {
      res.status(404).json({ error: 'Picture not found.' });
      return;
    }
    const [removed] = sitePictures.splice(idx, 1);
    if (removed?.storage_path) {
      await removePictureFromStorage(removed.storage_path);
    }
    res.json({ ok: true });
  });

  // Admin public contact settings (email & WhatsApp number)
  app.get('/api/admin/settings', requireAdmin, async (_req, res) => {
    let resolvedEmail = contactEmail;
    let resolvedWhatsapp = whatsappNumber;
    let tableReady = !supabaseAdmin;

    const dbClient = supabaseAdmin || supabasePublic;
    if (dbClient) {
      try {
        const { data, error } = await dbClient
          .from('site_settings')
          .select('key, value')
          .in('key', ['contact_email', 'whatsapp_number']);

        if (!error && Array.isArray(data)) {
          tableReady = true;
          for (const row of data) {
            const r = row as { key?: string; value?: string };
            if (r.key === 'contact_email' && r.value) {
              resolvedEmail = r.value.trim();
            } else if (r.key === 'whatsapp_number' && r.value) {
              const digits = r.value.replace(/\D/g, '');
              if (digits) resolvedWhatsapp = digits;
            }
          }
        }
      } catch {
        // Table not yet created in Supabase
      }
    }

    res.json({
      settings: {
        contact_email: resolvedEmail,
        whatsapp_number: resolvedWhatsapp,
      },
      tableReady,
    });
  });

  app.patch('/api/admin/settings', requireAdmin, async (req, res) => {
    const nextEmail = cleanStr(req.body?.contact_email, 160).toLowerCase();
    const rawWhatsapp = typeof req.body?.whatsapp_number === 'string' ? req.body.whatsapp_number : '';
    const nextWhatsapp = rawWhatsapp.replace(/\D/g, '').slice(0, 20);

    if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      res.status(400).json({ error: 'Please provide a valid public contact email address.' });
      return;
    }
    if (rawWhatsapp.trim() && (nextWhatsapp.length < 7 || nextWhatsapp.length > 20)) {
      res.status(400).json({ error: 'WhatsApp number must contain 7 to 20 digits with country code.' });
      return;
    }

    contactEmail = nextEmail;
    if (nextWhatsapp) {
      whatsappNumber = nextWhatsapp;
    }

    let tableReady = !supabaseAdmin;
    if (supabaseAdmin) {
      try {
        const rowsToSave = [{ key: 'contact_email', value: contactEmail }];
        if (nextWhatsapp) {
          rowsToSave.push({ key: 'whatsapp_number', value: whatsappNumber });
        }
        const { error } = await supabaseAdmin.from('site_settings').upsert(rowsToSave, { onConflict: 'key' });
        if (!error) {
          tableReady = true;
        } else if (!/relation|does not exist|schema cache/i.test(error.message || '')) {
          res.status(400).json({ error: error.message });
          return;
        }
      } catch {
        // Keep in-memory update if migration 007 hasn't been applied yet
      }
    }

    res.json({
      settings: {
        contact_email: contactEmail,
        whatsapp_number: whatsappNumber,
      },
      tableReady,
    });
  });

  // Admin team accounts management (synced with Supabase Auth & public.admin_accounts)
  app.get('/api/admin/users', requireAdmin, async (_req, res) => {
    if (!supabaseAdmin) {
      res.json({ users: [], supabaseConnected: false });
      return;
    }

    try {
      // Pull live Supabase Auth users and auto-sync any created/invited in Supabase Dashboard
      const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (authList?.users && Array.isArray(authList.users)) {
        for (const u of authList.users) {
          if (u.email) {
            await syncSupabaseUserToTables(u as unknown as SupabaseMinimalUser);
          }
        }
      }

      const { data: accRows, error } = await supabaseAdmin
        .from('admin_accounts')
        .select('id, auth_user_id, email, full_name, role, active, auth_provider, auth_status, invited_at, confirmed_at, last_sign_in_at, auth_metadata, password_hash, created_at')
        .order('created_at', { ascending: false });

      if (error || !Array.isArray(accRows)) {
        res.status(500).json({ error: error?.message || 'Could not load admin accounts.' });
        return;
      }

      const users: AdminUserRecord[] = accRows.map((row) => {
        const r = row as Record<string, unknown>;
        const meta = (r.auth_metadata as Record<string, unknown> | null) || {};
        const hasLocalPass = typeof r.password_hash === 'string' && r.password_hash.length > 0;
        const hasAuthPass = Boolean(meta.has_password);
        const active = Boolean(r.active ?? true);
        const rawStatus = String(r.auth_status || (active ? 'active' : 'disabled'));
        const authStatus: AdminUserRecord['auth_status'] =
          !active || rawStatus === 'disabled'
            ? 'disabled'
            : rawStatus === 'invited'
              ? 'invited'
              : 'active';

        return {
          id: String(r.id),
          auth_user_id: r.auth_user_id ? String(r.auth_user_id) : null,
          email: String(r.email || ''),
          full_name: String(r.full_name || ''),
          role: r.role === 'super_admin' ? 'super_admin' : 'admin',
          active,
          auth_provider: String(r.auth_provider || 'email'),
          auth_status: authStatus,
          has_password: hasLocalPass || hasAuthPass,
          invited_at: r.invited_at ? String(r.invited_at) : null,
          confirmed_at: r.confirmed_at ? String(r.confirmed_at) : null,
          last_sign_in_at: r.last_sign_in_at ? String(r.last_sign_in_at) : null,
          created_at: String(r.created_at || new Date().toISOString()),
        };
      });

      res.json({ users, supabaseConnected: true });
    } catch {
      res.status(500).json({ error: 'Could not load admin accounts.' });
    }
  });

  app.post('/api/admin/users/invite', requireAdmin, async (req, res) => {
    if (!supabaseAdmin) {
      res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required to invite or create Supabase users.' });
      return;
    }

    const email = cleanStr(req.body?.email, 160).toLowerCase();
    const fullName = cleanStr(req.body?.full_name, 120);
    const role: 'admin' | 'super_admin' = req.body?.role === 'super_admin' ? 'super_admin' : 'admin';
    const mode: 'invite' | 'link' | 'create' =
      req.body?.mode === 'create' ? 'create' : req.body?.mode === 'link' ? 'link' : 'invite';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    if (mode === 'create' && password.length < 5) {
      res.status(400).json({ error: 'Password must be at least 5 characters when creating a user directly.' });
      return;
    }

    const origin = cleanStr(req.headers.origin, 240);
    const fallbackRedirect = origin && /^https?:\/\//i.test(origin) ? `${origin.replace(/\/+$/, '')}/admin` : undefined;
    const redirectTo = validateHttpUrl(req.body?.redirectTo) || fallbackRedirect;

    async function generateDirectInviteLink(): Promise<{
      user: SupabaseMinimalUser;
      inviteLink: string;
      linkType: 'invite' | 'recovery';
    } | null> {
      if (!supabaseAdmin) return null;

      let linkType: 'invite' | 'recovery' = 'invite';
      let linkRes = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          ...(redirectTo ? { redirectTo } : {}),
          data: { ...(fullName ? { full_name: fullName } : {}), role },
        },
      });

      if (linkRes.error && /already.*registered|already.*exists/i.test(linkRes.error.message || '')) {
        linkType = 'recovery';
        linkRes = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: {
            ...(redirectTo ? { redirectTo } : {}),
          },
        });
      }

      if (linkRes.error || !linkRes.data?.user) {
        return null;
      }

      const hashedToken = linkRes.data.properties?.hashed_token;
      const directAdminUrl =
        redirectTo && hashedToken
          ? `${redirectTo.split('?')[0]}?token_hash=${encodeURIComponent(hashedToken)}&type=${linkType}`
          : linkRes.data.properties?.action_link || '';

      if (!directAdminUrl) return null;

      return {
        user: linkRes.data.user as unknown as SupabaseMinimalUser,
        inviteLink: directAdminUrl,
        linkType,
      };
    }

    try {
      if (mode === 'create') {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: fullName ? { full_name: fullName } : {},
          app_metadata: { role },
        });
        if (error || !data?.user) {
          res.status(400).json({ error: error?.message || 'Could not create Supabase user.' });
          return;
        }
        await syncSupabaseUserToTables(data.user as unknown as SupabaseMinimalUser, {
          role,
          active: true,
          authStatus: 'active',
          hasPassword: true,
          fullName: fullName || undefined,
        });
        try {
          await supabaseAdmin
            .from('admin_accounts')
            .update({ invite_method: 'password', invite_redirect_url: redirectTo || null })
            .eq('email', email);
        } catch {
          // Migration 005 columns are optional
        }
        res.status(201).json({ ok: true, mode: 'create', email });
        return;
      }

      if (mode === 'link') {
        const generated = await generateDirectInviteLink();
        if (!generated) {
          res.status(400).json({ error: 'Could not generate invite link for this email address.' });
          return;
        }
        await syncSupabaseUserToTables(generated.user, {
          role,
          active: true,
          authStatus: 'invited',
          hasPassword: false,
          fullName: fullName || undefined,
        });
        try {
          await supabaseAdmin
            .from('admin_accounts')
            .update({ invite_method: 'link', invite_redirect_url: redirectTo || null })
            .eq('email', email);
        } catch {
          // Migration 005 columns are optional
        }
        res.status(201).json({
          ok: true,
          mode: 'link',
          email,
          emailSent: false,
          inviteLink: generated.inviteLink,
        });
        return;
      }

      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        ...(redirectTo ? { redirectTo } : {}),
        data: { ...(fullName ? { full_name: fullName } : {}), role },
      });

      if (error) {
        const errText = error.message || '';
        const isEmailRateLimit =
          /rate\s*limit|too\s*many\s*requests|over_email_send_rate_limit/i.test(errText) ||
          error.status === 429;

        if (isEmailRateLimit) {
          const generated = await generateDirectInviteLink();
          if (generated) {
            await syncSupabaseUserToTables(generated.user, {
              role,
              active: true,
              authStatus: 'invited',
              hasPassword: false,
              fullName: fullName || undefined,
            });
            try {
              await supabaseAdmin
                .from('admin_accounts')
                .update({ invite_method: 'link', invite_redirect_url: redirectTo || null })
                .eq('email', email);
            } catch {
              // Migration 005 columns are optional
            }
            res.status(201).json({
              ok: true,
              mode: 'link',
              email,
              emailSent: false,
              rateLimitFallback: true,
              inviteLink: generated.inviteLink,
            });
            return;
          }
        }

        res.status(400).json({ error: errText || 'Could not send invitation email.' });
        return;
      }

      if (!data?.user) {
        res.status(400).json({ error: 'Could not send invitation email.' });
        return;
      }

      await syncSupabaseUserToTables(data.user as unknown as SupabaseMinimalUser, {
        role,
        active: true,
        authStatus: 'invited',
        hasPassword: false,
        fullName: fullName || undefined,
      });
      try {
        await supabaseAdmin
          .from('admin_accounts')
          .update({ invite_method: 'email', invite_redirect_url: redirectTo || null })
          .eq('email', email);
      } catch {
        // Migration 005 columns are optional
      }
      res.status(201).json({ ok: true, mode: 'invite', email, emailSent: true });
    } catch {
      res.status(500).json({ error: 'Failed to process admin user request.' });
    }
  });

  app.patch('/api/admin/users/:id', requireAdmin, async (req: AuthedRequest, res) => {
    if (!supabaseAdmin) {
      res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required to update admin accounts.' });
      return;
    }

    const { data: existing, error: findErr } = await supabaseAdmin
      .from('admin_accounts')
      .select('id, auth_user_id, email, role, active')
      .eq('id', req.params.id)
      .maybeSingle();

    if (findErr || !existing) {
      res.status(404).json({ error: 'Admin account not found.' });
      return;
    }

    const currentActor = (req.adminUser?.username || '').trim().toLowerCase();
    const targetEmail = String(existing.email || '').trim().toLowerCase();
    const nextActive = typeof req.body?.active === 'boolean' ? req.body.active : Boolean(existing.active);
    const nextRole: 'admin' | 'super_admin' =
      req.body?.role === 'super_admin'
        ? 'super_admin'
        : req.body?.role === 'admin'
          ? 'admin'
          : existing.role === 'super_admin'
            ? 'super_admin'
            : 'admin';

    if (currentActor === targetEmail && !nextActive) {
      res.status(400).json({ error: 'You cannot disable your own active administrator account.' });
      return;
    }

    const nextStatus = nextActive ? 'active' : 'disabled';
    const { error: updErr } = await supabaseAdmin
      .from('admin_accounts')
      .update({
        active: nextActive,
        role: nextRole,
        auth_status: nextStatus,
      })
      .eq('id', req.params.id);

    if (updErr) {
      res.status(400).json({ error: updErr.message || 'Could not update admin account.' });
      return;
    }

    if (existing.auth_user_id) {
      await supabaseAdmin
        .from('profiles')
        .update({ role: nextActive ? nextRole : 'customer' })
        .eq('id', existing.auth_user_id);

      await supabaseAdmin.auth.admin.updateUserById(String(existing.auth_user_id), {
        ban_duration: nextActive ? 'none' : '876000h',
        app_metadata: { role: nextRole },
      });
    }

    res.json({ ok: true, active: nextActive, role: nextRole });
  });

  // Return JSON 404 for unknown API routes
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  return app;
}
