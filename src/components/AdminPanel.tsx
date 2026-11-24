import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

export interface BookingItem {
  id: string;
  reference: string;
  customer_name: string;
  email: string;
  phone: string;
  service_type: string;
  destination: string | null;
  travel_date: string | null;
  details: string;
  status: 'pending' | 'reviewing' | 'awaiting_payment' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';
  quoted_amount: number | null;
  currency: 'RWF' | 'USD' | 'EUR';
  staff_note: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  active: boolean;
}

export interface DestinationItem {
  id: string;
  name: string;
  active: boolean;
}

export interface SocialLinkItem {
  id: string;
  platform: string;
  label: string;
  url: string;
  active: boolean;
}

export interface AdminUserItem {
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

interface AdminStats {
  total: number;
  pending: number;
  inProgress: number;
  confirmed: number;
}

interface AdminPanelProps {
  token: string;
  username: string;
  onClose: () => void;
  onLogout: () => void;
  onCatalogUpdated: () => void;
}

const STATUS_OPTIONS: BookingItem['status'][] = [
  'pending',
  'reviewing',
  'awaiting_payment',
  'confirmed',
  'completed',
  'cancelled',
  'rejected',
];

const CURRENCY_OPTIONS: BookingItem['currency'][] = ['RWF', 'USD', 'EUR'];

const SOCIAL_PLATFORMS = [
  'Instagram',
  'Facebook',
  'TikTok',
  'X (Twitter)',
  'YouTube',
  'LinkedIn',
  'WhatsApp Channel',
  'Website',
];

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function sanitizeDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function AdminPanel({
  token,
  username,
  onClose,
  onLogout,
  onCatalogUpdated,
}: AdminPanelProps) {
  const [tab, setTab] = useState<'bookings' | 'services' | 'destinations' | 'social' | 'users'>('bookings');
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [stats, setStats] = useState<AdminStats>({ total: 0, pending: 0, inProgress: 0, confirmed: 0 });
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [destinations, setDestinations] = useState<DestinationItem[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [storageMode, setStorageMode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [editing, setEditing] = useState<BookingItem | null>(null);
  const [editStatus, setEditStatus] = useState<BookingItem['status']>('pending');
  const [editQuote, setEditQuote] = useState('');
  const [editCurrency, setEditCurrency] = useState<BookingItem['currency']>('RWF');
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newDestinationName, setNewDestinationName] = useState('');

  const [newSocialPlatform, setNewSocialPlatform] = useState('Instagram');
  const [newSocialLabel, setNewSocialLabel] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');

  const [userActionMode, setUserActionMode] = useState<'invite' | 'create'>('invite');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'super_admin'>('admin');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [showNewAdminPass, setShowNewAdminPass] = useState(false);
  const [userMsg, setUserMsg] = useState('');
  const [userBusy, setUserBusy] = useState(false);

  const [passwordModal, setPasswordModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const authHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [bRes, sRes, dRes, socRes, usrRes] = await Promise.all([
        fetch('/api/admin/bookings', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/services', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/destinations', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/social-links', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (bRes.status === 401 || sRes.status === 401 || dRes.status === 401 || socRes.status === 401 || usrRes.status === 401) {
        onLogout();
        return;
      }

      if (!bRes.ok || !sRes.ok || !dRes.ok || !socRes.ok) {
        throw new Error('Failed to load administration data.');
      }

      const bData = (await bRes.json()) as {
        bookings: BookingItem[];
        stats: AdminStats;
        storage?: string;
      };
      const sData = (await sRes.json()) as { services: ServiceItem[] };
      const dData = (await dRes.json()) as { destinations: DestinationItem[] };
      const socData = (await socRes.json()) as { socialLinks: SocialLinkItem[] };
      const usrData = usrRes.ok ? ((await usrRes.json()) as { users?: AdminUserItem[] }) : { users: [] };

      setBookings(bData.bookings);
      setStats(bData.stats);
      setStorageMode(bData.storage || '');
      setServices(sData.services);
      setDestinations(dData.destinations);
      setSocialLinks(socData.socialLinks);
      setAdminUsers(Array.isArray(usrData.users) ? usrData.users : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openEditor(item: BookingItem) {
    setEditing(item);
    setEditStatus(item.status);
    setEditQuote(item.quoted_amount !== null ? String(item.quoted_amount) : '');
    setEditCurrency(item.currency);
    setEditNote(item.staff_note || '');
  }

  async function saveBookingEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/bookings/${editing.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          status: editStatus,
          quoted_amount: editQuote.trim() === '' ? null : Number(editQuote),
          currency: editCurrency,
          staff_note: editNote,
        }),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not update booking.');
      setEditing(null);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update booking.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteBooking(id: string) {
    setError('');
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok) throw new Error('Could not delete inquiry.');
      if (editing?.id === id) setEditing(null);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete inquiry.');
    }
  }

  async function toggleService(svc: ServiceItem) {
    setError('');
    try {
      const res = await fetch(`/api/admin/services/${svc.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ active: !svc.active }),
      });
      if (!res.ok) throw new Error('Could not update service.');
      await loadData();
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update service.');
    }
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    if (!newServiceName.trim() || !newServiceDesc.trim()) return;
    setError('');
    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: newServiceName.trim(), description: newServiceDesc.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not add service.');
      setNewServiceName('');
      setNewServiceDesc('');
      await loadData();
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add service.');
    }
  }

  async function toggleDestination(dst: DestinationItem) {
    setError('');
    try {
      const res = await fetch(`/api/admin/destinations/${dst.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ active: !dst.active }),
      });
      if (!res.ok) throw new Error('Could not update destination.');
      await loadData();
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update destination.');
    }
  }

  async function addDestination(e: React.FormEvent) {
    e.preventDefault();
    if (!newDestinationName.trim()) return;
    setError('');
    try {
      const res = await fetch('/api/admin/destinations', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: newDestinationName.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not add destination.');
      setNewDestinationName('');
      await loadData();
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add destination.');
    }
  }

  async function addSocialLink(e: React.FormEvent) {
    e.preventDefault();
    if (!newSocialUrl.trim()) return;
    setError('');
    try {
      const res = await fetch('/api/admin/social-links', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          platform: newSocialPlatform,
          label: newSocialLabel.trim() || newSocialPlatform,
          url: newSocialUrl.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not add social media link.');
      setNewSocialLabel('');
      setNewSocialUrl('');
      await loadData();
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add social media link.');
    }
  }

  async function toggleSocialLink(link: SocialLinkItem) {
    setError('');
    try {
      const res = await fetch(`/api/admin/social-links/${link.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ active: !link.active }),
      });
      if (!res.ok) throw new Error('Could not update social media link.');
      await loadData();
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update social media link.');
    }
  }

  async function deleteSocialLink(id: string) {
    setError('');
    try {
      const res = await fetch(`/api/admin/social-links/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Could not delete social media link.');
      await loadData();
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete social media link.');
    }
  }

  async function addOrInviteAdminUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    setError('');
    setUserMsg('');
    setUserBusy(true);

    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          mode: userActionMode,
          email: newAdminEmail.trim(),
          full_name: newAdminName.trim(),
          role: newAdminRole,
          password: userActionMode === 'create' ? newAdminPass : undefined,
          redirectTo: `${window.location.origin}/admin`,
        }),
      });
      const data = (await res.json()) as { error?: string; email?: string; mode?: string };
      if (!res.ok) throw new Error(data.error || 'Could not process admin user request.');

      setUserMsg(
        data.mode === 'create'
          ? `Admin account created and synced for ${data.email}.`
          : `Invitation sent to ${data.email}. Accepting the invite will direct them to /admin to set their password.`,
      );
      setNewAdminEmail('');
      setNewAdminName('');
      setNewAdminPass('');
      setShowNewAdminPass(false);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add admin user.');
    } finally {
      setUserBusy(false);
    }
  }

  async function toggleAdminUserActive(user: AdminUserItem) {
    setError('');
    setUserMsg('');
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ active: !user.active }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not update admin user.');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update admin user.');
    }
  }

  function openPasswordModal() {
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setShowCurrentPw(false);
    setShowNewPw(false);
    setShowConfirmPw(false);
    setPwError('');
    setPwMsg('');
    setPasswordModal(true);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwMsg('');

    if (newPw.length < 5) {
      setPwError('New password must be at least 5 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match.');
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (res.status === 401 && res.headers.get('content-type')?.includes('application/json')) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error || 'Current password is incorrect.');
      }
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not update password.');

      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setPwMsg('Admin password updated successfully.');
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setPwSaving(false);
    }
  }

  const filteredBookings = bookings.filter((b) => {
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const q = search.trim().toLowerCase();
    const matchesQuery =
      !q ||
      b.reference.toLowerCase().includes(q) ||
      b.customer_name.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q) ||
      b.service_type.toLowerCase().includes(q) ||
      (b.destination || '').toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="admin-shell" role="dialog" aria-label="TNP Travel Agency Admin Panel">
      <div className="admin-topbar">
        <div className="admin-brand">
          <img src="/tnp-logo.jpg" alt="TNP Travel Agency" />
          <div>
            <strong>TNP Admin Panel</strong>
            <small>
              <Shield size={12} /> Signed in as {username}
              {storageMode === 'supabase' && ' · Supabase connected'}
            </small>
          </div>
        </div>
        <div className="admin-top-actions">
          <button type="button" className="admin-btn-outline" onClick={loadData} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button type="button" className="admin-btn-outline" onClick={openPasswordModal}>
            <KeyRound size={15} /> Password
          </button>
          <button type="button" className="admin-btn-outline" onClick={onClose}>
            Public site
          </button>
          <button type="button" className="admin-btn-danger" onClick={onLogout}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>

      <div className="admin-body">
        <div className="admin-stats">
          <div className="admin-stat-card">
            <small>TOTAL INQUIRIES</small>
            <b>{stats.total}</b>
          </div>
          <div className="admin-stat-card">
            <small>PENDING REVIEW</small>
            <b>{stats.pending}</b>
          </div>
          <div className="admin-stat-card">
            <small>IN PROGRESS</small>
            <b>{stats.inProgress}</b>
          </div>
          <div className="admin-stat-card">
            <small>CONFIRMED / COMPLETED</small>
            <b>{stats.confirmed}</b>
          </div>
        </div>

        <div className="admin-tabs">
          <button
            type="button"
            className={tab === 'bookings' ? 'active' : ''}
            onClick={() => setTab('bookings')}
          >
            <ClipboardList size={16} /> Bookings &amp; Inquiries ({bookings.length})
          </button>
          <button
            type="button"
            className={tab === 'services' ? 'active' : ''}
            onClick={() => setTab('services')}
          >
            <Globe2 size={16} /> Services ({services.length})
          </button>
          <button
            type="button"
            className={tab === 'destinations' ? 'active' : ''}
            onClick={() => setTab('destinations')}
          >
            <MapPin size={16} /> Destinations ({destinations.length})
          </button>
          <button
            type="button"
            className={tab === 'social' ? 'active' : ''}
            onClick={() => setTab('social')}
          >
            <Share2 size={16} /> Social Media ({socialLinks.length})
          </button>
          <button
            type="button"
            className={tab === 'users' ? 'active' : ''}
            onClick={() => setTab('users')}
          >
            <Users size={16} /> Admin Users ({adminUsers.length})
          </button>
        </div>

        {error && <div className="admin-error">{error}</div>}

        {tab === 'bookings' && (
          <div className="admin-panel-card">
            <div className="admin-toolbar">
              <div className="admin-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search reference, customer, service, or destination..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {formatStatusLabel(st)}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="admin-empty">Loading inquiries…</div>
            ) : filteredBookings.length === 0 ? (
              <div className="admin-empty">
                {bookings.length === 0
                  ? 'No booking inquiries submitted yet. New requests from the website will appear here.'
                  : 'No inquiries match your current search or filter.'}
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Customer</th>
                      <th>Service &amp; Trip</th>
                      <th>Status</th>
                      <th>Quote</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => {
                      const waDigits = sanitizeDigits(b.phone);
                      return (
                        <tr key={b.id}>
                          <td data-label="Reference">
                            <div>
                              <strong className="ref-code">{b.reference}</strong>
                              <small className="muted">{new Date(b.created_at).toLocaleString()}</small>
                            </div>
                          </td>
                          <td data-label="Customer">
                            <div>
                              <strong>{b.customer_name}</strong>
                              <div className="contact-links">
                                <a href={`mailto:${b.email}`}>
                                  <Mail size={12} /> {b.email}
                                </a>
                                {waDigits && (
                                  <a
                                    href={`https://wa.me/${waDigits}?text=${encodeURIComponent(
                                      `Hello ${b.customer_name}, regarding your TNP Travel Agency inquiry (${b.reference}):`,
                                    )}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <MessageCircle size={12} /> {b.phone}
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                          <td data-label="Service & Trip">
                            <div>
                              <strong>{b.service_type}</strong>
                              <small className="muted">
                                {b.destination ? `Destination: ${b.destination}` : 'No destination specified'}
                                {b.travel_date ? ` · ${b.travel_date}` : ''}
                              </small>
                              {b.details && <p className="detail-snippet">{b.details}</p>}
                              {b.staff_note && <p className="staff-note-pill">Note: {b.staff_note}</p>}
                            </div>
                          </td>
                          <td data-label="Status">
                            <span className={`status-badge status-${b.status}`}>
                              {formatStatusLabel(b.status)}
                            </span>
                          </td>
                          <td data-label="Quote">
                            {b.quoted_amount !== null ? (
                              <strong>
                                {b.quoted_amount.toLocaleString()} {b.currency}
                              </strong>
                            ) : (
                              <span className="muted">Unquoted</span>
                            )}
                          </td>
                          <td data-label="Actions">
                            <div className="row-actions">
                              <button
                                type="button"
                                className="icon-btn"
                                title="Edit inquiry"
                                onClick={() => openEditor(b)}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn danger"
                                title="Delete inquiry"
                                onClick={() => deleteBooking(b.id)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'services' && (
          <div className="admin-panel-card">
            <form className="admin-inline-form" onSubmit={addService}>
              <input
                type="text"
                placeholder="New service name"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Short service description"
                value={newServiceDesc}
                onChange={(e) => setNewServiceDesc(e.target.value)}
                required
              />
              <button type="submit" className="primary">
                <Plus size={16} /> Add service
              </button>
            </form>

            <div className="catalog-grid">
              {services.map((svc) => (
                <div key={svc.id} className={`catalog-card ${svc.active ? '' : 'inactive'}`}>
                  <div>
                    <strong>{svc.name}</strong>
                    <p>{svc.description}</p>
                  </div>
                  <button
                    type="button"
                    className={svc.active ? 'toggle-btn active' : 'toggle-btn'}
                    onClick={() => toggleService(svc)}
                  >
                    <CheckCircle2 size={15} /> {svc.active ? 'Active' : 'Hidden'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'destinations' && (
          <div className="admin-panel-card">
            <form className="admin-inline-form" onSubmit={addDestination}>
              <input
                type="text"
                placeholder="Add destination country or city"
                value={newDestinationName}
                onChange={(e) => setNewDestinationName(e.target.value)}
                required
              />
              <button type="submit" className="primary">
                <Plus size={16} /> Add destination
              </button>
            </form>

            <div className="catalog-grid">
              {destinations.map((dst) => (
                <div key={dst.id} className={`catalog-card ${dst.active ? '' : 'inactive'}`}>
                  <strong>{dst.name}</strong>
                  <button
                    type="button"
                    className={dst.active ? 'toggle-btn active' : 'toggle-btn'}
                    onClick={() => toggleDestination(dst)}
                  >
                    <CheckCircle2 size={15} /> {dst.active ? 'Active' : 'Hidden'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'social' && (
          <div className="admin-panel-card">
            <form className="admin-inline-form" onSubmit={addSocialLink}>
              <select
                className="admin-select"
                value={newSocialPlatform}
                onChange={(e) => setNewSocialPlatform(e.target.value)}
              >
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Display handle or label (e.g. @tnptravel)"
                value={newSocialLabel}
                onChange={(e) => setNewSocialLabel(e.target.value)}
              />
              <input
                type="url"
                placeholder="Full URL (e.g. https://instagram.com/tnptravel)"
                value={newSocialUrl}
                onChange={(e) => setNewSocialUrl(e.target.value)}
                required
              />
              <button type="submit" className="primary">
                <Plus size={16} /> Add link
              </button>
            </form>

            {socialLinks.length === 0 ? (
              <div className="admin-empty">
                No social media links added yet. Add your Instagram, Facebook, TikTok, X, YouTube, or
                LinkedIn URLs above so visitors can click straight through to your official pages.
              </div>
            ) : (
              <div className="catalog-grid">
                {socialLinks.map((link) => (
                  <div key={link.id} className={`catalog-card ${link.active ? '' : 'inactive'}`}>
                    <div className="social-card-info">
                      <strong>{link.platform}</strong>
                      <span className="muted">{link.label}</span>
                      {isSafeHttpUrl(link.url) && (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="social-source-link"
                        >
                          {link.url} <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        className={link.active ? 'toggle-btn active' : 'toggle-btn'}
                        onClick={() => toggleSocialLink(link)}
                      >
                        <CheckCircle2 size={15} /> {link.active ? 'Active' : 'Hidden'}
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Delete social link"
                        onClick={() => deleteSocialLink(link.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div className="admin-panel-card">
            <div className="admin-toolbar">
              <div className="admin-user-mode">
                <button
                  type="button"
                  className={userActionMode === 'invite' ? 'toggle-btn active' : 'toggle-btn'}
                  onClick={() => {
                    setUserActionMode('invite');
                    setUserMsg('');
                  }}
                >
                  <Mail size={14} /> Invite by Email
                </button>
                <button
                  type="button"
                  className={userActionMode === 'create' ? 'toggle-btn active' : 'toggle-btn'}
                  onClick={() => {
                    setUserActionMode('create');
                    setUserMsg('');
                  }}
                >
                  <UserPlus size={14} /> Create with Password
                </button>
              </div>
              <span className="muted">
                Users created or invited in Supabase Authentication also sync here automatically.
              </span>
            </div>

            <form className="admin-inline-form" onSubmit={addOrInviteAdminUser}>
              <input
                type="email"
                required
                placeholder="Admin email (e.g. staff@tnptravel.com)"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
              />
              <input
                type="text"
                placeholder="Full name (optional)"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
              />
              <select
                className="admin-select"
                value={newAdminRole}
                onChange={(e) => setNewAdminRole(e.target.value as 'admin' | 'super_admin')}
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              {userActionMode === 'create' && (
                <div className="password-field admin-inline-pw">
                  <input
                    required
                    minLength={5}
                    type={showNewAdminPass ? 'text' : 'password'}
                    placeholder="Initial password (min 5 chars)"
                    value={newAdminPass}
                    onChange={(e) => setNewAdminPass(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowNewAdminPass((v) => !v)}
                    aria-label={showNewAdminPass ? 'Hide password' : 'Show password'}
                  >
                    {showNewAdminPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              )}
              <button type="submit" className="primary" disabled={userBusy}>
                <UserPlus size={16} />{' '}
                {userBusy
                  ? 'Saving…'
                  : userActionMode === 'create'
                    ? 'Create admin'
                    : 'Send invite'}
              </button>
            </form>

            {userMsg && <div className="notice" style={{ marginBottom: 16 }}>{userMsg}</div>}

            {adminUsers.length === 0 ? (
              <div className="admin-empty">
                No synced admin accounts found yet. Run migration 004 in Supabase SQL Editor and click Refresh to sync Supabase Auth users.
              </div>
            ) : (
              <div className="catalog-grid">
                {adminUsers.map((u) => (
                  <div key={u.id} className={`catalog-card ${u.active ? '' : 'inactive'}`}>
                    <div className="social-card-info">
                      <strong>{u.email}</strong>
                      {u.full_name && <span className="muted">{u.full_name}</span>}
                      <span className="muted">
                        Role: {u.role === 'super_admin' ? 'Super Admin' : 'Admin'} · Provider: {u.auth_provider}
                      </span>
                      <span className="muted">
                        Status:{' '}
                        <span className={`status-badge status-${u.auth_status === 'active' ? 'confirmed' : u.auth_status === 'invited' ? 'pending' : 'cancelled'}`}>
                          {formatStatusLabel(u.auth_status)}
                        </span>{' '}
                        · {u.has_password ? 'Password stored' : 'Awaiting password setup'}
                      </span>
                      {u.last_sign_in_at && (
                        <small className="muted">
                          Last sign in: {new Date(u.last_sign_in_at).toLocaleString()}
                        </small>
                      )}
                    </div>
                    <button
                      type="button"
                      className={u.active ? 'toggle-btn active' : 'toggle-btn'}
                      onClick={() => toggleAdminUserActive(u)}
                    >
                      <CheckCircle2 size={15} /> {u.active ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {editing && (
        <div className="overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close" onClick={() => setEditing(null)}>
              <X />
            </button>
            <small className="eyebrow">UPDATE INQUIRY</small>
            <h2>
              {editing.reference} <i>({editing.customer_name})</i>
            </h2>
            <p>
              {editing.service_type}
              {editing.destination ? ` · ${editing.destination}` : ''}
              {editing.travel_date ? ` · ${editing.travel_date}` : ''}
            </p>
            <form onSubmit={saveBookingEdit}>
              <div className="fields">
                <label>
                  Status
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as BookingItem['status'])}
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {formatStatusLabel(st)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Currency
                  <select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value as BookingItem['currency'])}
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Quoted amount
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Optional"
                    value={editQuote}
                    onChange={(e) => setEditQuote(e.target.value)}
                  />
                </label>
              </div>
              <label>
                Internal staff note
                <textarea
                  rows={3}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Quote notes, follow-up reminders, airline reference..."
                />
              </label>
              <button type="submit" className="primary wide" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {passwordModal && (
        <div className="overlay" onClick={() => setPasswordModal(false)}>
          <div className="modal modal-narrow" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close" onClick={() => setPasswordModal(false)}>
              <X />
            </button>
            <small className="eyebrow">SECURITY</small>
            <h2>
              Update <i>password.</i>
            </h2>
            <p>Change the administrator password for {username}.</p>
            <form onSubmit={handleChangePassword}>
              <label>
                Current password
                <div className="password-field">
                  <input
                    required
                    type={showCurrentPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowCurrentPw((v) => !v)}
                    aria-label={showCurrentPw ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              <label>
                New password
                <div className="password-field">
                  <input
                    required
                    type={showNewPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowNewPw((v) => !v)}
                    aria-label={showNewPw ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              <label>
                Confirm new password
                <div className="password-field">
                  <input
                    required
                    type={showConfirmPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPw((v) => !v)}
                    aria-label={showConfirmPw ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              {pwError && <div className="notice-error">{pwError}</div>}
              {pwMsg && <div className="notice">{pwMsg}</div>}
              <button type="submit" className="primary wide" disabled={pwSaving}>
                {pwSaving ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
