import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Globe2,
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
  const [tab, setTab] = useState<'bookings' | 'services' | 'destinations' | 'social'>('bookings');
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [stats, setStats] = useState<AdminStats>({ total: 0, pending: 0, inProgress: 0, confirmed: 0 });
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [destinations, setDestinations] = useState<DestinationItem[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>([]);
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
      const [bRes, sRes, dRes, socRes] = await Promise.all([
        fetch('/api/admin/bookings', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/services', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/destinations', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/social-links', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (bRes.status === 401 || sRes.status === 401 || dRes.status === 401 || socRes.status === 401) {
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

      setBookings(bData.bookings);
      setStats(bData.stats);
      setStorageMode(bData.storage || '');
      setServices(sData.services);
      setDestinations(dData.destinations);
      setSocialLinks(socData.socialLinks);
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
                          <td>
                            <strong className="ref-code">{b.reference}</strong>
                            <small className="muted">{new Date(b.created_at).toLocaleString()}</small>
                          </td>
                          <td>
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
                          </td>
                          <td>
                            <strong>{b.service_type}</strong>
                            <small className="muted">
                              {b.destination ? `Destination: ${b.destination}` : 'No destination specified'}
                              {b.travel_date ? ` · ${b.travel_date}` : ''}
                            </small>
                            {b.details && <p className="detail-snippet">{b.details}</p>}
                            {b.staff_note && <p className="staff-note-pill">Note: {b.staff_note}</p>}
                          </td>
                          <td>
                            <span className={`status-badge status-${b.status}`}>
                              {formatStatusLabel(b.status)}
                            </span>
                          </td>
                          <td>
                            {b.quoted_amount !== null ? (
                              <strong>
                                {b.quoted_amount.toLocaleString()} {b.currency}
                              </strong>
                            ) : (
                              <span className="muted">Unquoted</span>
                            )}
                          </td>
                          <td>
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
    </div>
  );
}
