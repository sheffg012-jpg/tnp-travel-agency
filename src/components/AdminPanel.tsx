import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  Image as ImageIcon,
  KeyRound,
  Link2,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Newspaper,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Shield,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import SocialPlatformIcon, { detectSocialPlatform } from './SocialPlatformIcon';

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

export type PicturePlacement = 'gallery' | 'hero' | 'feature' | 'about';

export interface SitePictureItem {
  id: string;
  title: string;
  caption: string;
  placement: PicturePlacement;
  image_url: string;
  active: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export type NewsCategory = 'Travel Tip' | 'Visa Update' | 'Company News' | 'Flight Alert' | 'Destination Guide';

export interface TravelNewsItem {
  id: string;
  title: string;
  category: NewsCategory;
  summary: string;
  content: string;
  image_url: string | null;
  published: boolean;
  published_at: string;
  created_at?: string;
  updated_at?: string;
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
  onLogout: (reason?: string) => void;
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
  'Telegram',
  'Threads',
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

const PICTURE_PLACEMENT_LABELS: Record<PicturePlacement, string> = {
  gallery: 'Gallery Showcase',
  hero: 'Hero Main Banner',
  feature: 'Flight Support Banner',
  about: 'About Section Image',
};

const NEWS_CATEGORIES: NewsCategory[] = [
  'Travel Tip',
  'Visa Update',
  'Company News',
  'Flight Alert',
  'Destination Guide',
];

function isSafeImageSrc(src: string): boolean {
  if (!src) return false;
  if (src.startsWith('data:image/')) {
    return /^data:image\/(?:jpeg|jpg|png|webp|gif);base64,/i.test(src);
  }
  if (src.startsWith('/')) {
    return !src.startsWith('//') && !src.includes('..');
  }
  return isSafeHttpUrl(src);
}

async function prepareImageUpload(file: File): Promise<string> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Please choose a JPG, PNG, WebP, or GIF image.');
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('Image file is too large (max 12 MB).');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read file.')));
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });

  if (file.type === 'image/gif') {
    if (file.size > 2.5 * 1024 * 1024) {
      throw new Error('GIF image must be under 2.5 MB.');
    }
    return rawDataUrl;
  }

  if (file.size <= 650 * 1024) {
    return rawDataUrl;
  }

  // Compress large photos client-side so mobile uploads stay fast and under serverless limits
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1600;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const outputType = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
      resolve(canvas.toDataURL(outputType, 0.85));
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

export default function AdminPanel({
  token,
  username,
  onClose,
  onLogout,
  onCatalogUpdated,
}: AdminPanelProps) {
  const [tab, setTab] = useState<
    'bookings' | 'services' | 'destinations' | 'pictures' | 'news' | 'social' | 'contact' | 'users'
  >('bookings');
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [stats, setStats] = useState<AdminStats>({ total: 0, pending: 0, inProgress: 0, confirmed: 0 });
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [destinations, setDestinations] = useState<DestinationItem[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>([]);
  const [pictures, setPictures] = useState<SitePictureItem[]>([]);
  const [picturesTableReady, setPicturesTableReady] = useState(true);
  const [newsPosts, setNewsPosts] = useState<TravelNewsItem[]>([]);
  const [newsTableReady, setNewsTableReady] = useState(true);
  const [contactEmail, setContactEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [settingsTableReady, setSettingsTableReady] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState('');
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
  const [editingSocial, setEditingSocial] = useState<SocialLinkItem | null>(null);
  const [editSocialPlatform, setEditSocialPlatform] = useState('Instagram');
  const [editSocialLabel, setEditSocialLabel] = useState('');
  const [editSocialUrl, setEditSocialUrl] = useState('');
  const [savingSocial, setSavingSocial] = useState(false);

  const [newPicTitle, setNewPicTitle] = useState('');
  const [newPicCaption, setNewPicCaption] = useState('');
  const [newPicPlacement, setNewPicPlacement] = useState<PicturePlacement>('gallery');
  const [newPicUrl, setNewPicUrl] = useState('');
  const [newPicDataUrl, setNewPicDataUrl] = useState('');
  const [newPicFileName, setNewPicFileName] = useState('');
  const [uploadingPic, setUploadingPic] = useState(false);
  const [picNotice, setPicNotice] = useState('');

  const [editingPicture, setEditingPicture] = useState<SitePictureItem | null>(null);
  const [editPicTitle, setEditPicTitle] = useState('');
  const [editPicCaption, setEditPicCaption] = useState('');
  const [editPicPlacement, setEditPicPlacement] = useState<PicturePlacement>('gallery');
  const [editPicUrl, setEditPicUrl] = useState('');
  const [editPicDataUrl, setEditPicDataUrl] = useState('');
  const [editPicFileName, setEditPicFileName] = useState('');
  const [savingPic, setSavingPic] = useState(false);

  const [newNewsTitle, setNewNewsTitle] = useState('');
  const [newNewsCategory, setNewNewsCategory] = useState<NewsCategory>('Travel Tip');
  const [newNewsSummary, setNewNewsSummary] = useState('');
  const [newNewsContent, setNewNewsContent] = useState('');
  const [newNewsImageUrl, setNewNewsImageUrl] = useState('');
  const [newNewsImageDataUrl, setNewNewsImageDataUrl] = useState('');
  const [newNewsImageFileName, setNewNewsImageFileName] = useState('');
  const [newNewsPublished, setNewNewsPublished] = useState(true);
  const [savingNews, setSavingNews] = useState(false);
  const [newsNotice, setNewsNotice] = useState('');

  const [editingNews, setEditingNews] = useState<TravelNewsItem | null>(null);
  const [editNewsTitle, setEditNewsTitle] = useState('');
  const [editNewsCategory, setEditNewsCategory] = useState<NewsCategory>('Travel Tip');
  const [editNewsSummary, setEditNewsSummary] = useState('');
  const [editNewsContent, setEditNewsContent] = useState('');
  const [editNewsImageUrl, setEditNewsImageUrl] = useState('');
  const [editNewsImageDataUrl, setEditNewsImageDataUrl] = useState('');
  const [editNewsImageFileName, setEditNewsImageFileName] = useState('');
  const [editNewsPublished, setEditNewsPublished] = useState(true);
  const [updatingNews, setUpdatingNews] = useState(false);

  const [userActionMode, setUserActionMode] = useState<'invite' | 'link' | 'create'>('invite');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'super_admin'>('admin');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [showNewAdminPass, setShowNewAdminPass] = useState(false);
  const [userMsg, setUserMsg] = useState('');
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
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
      const [bRes, sRes, dRes, socRes, picRes, setRes, newsRes, usrRes] = await Promise.all([
        fetch('/api/admin/bookings', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/services', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/destinations', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/social-links', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/pictures', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/news', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (
        bRes.status === 401 ||
        sRes.status === 401 ||
        dRes.status === 401 ||
        socRes.status === 401 ||
        picRes.status === 401 ||
        setRes.status === 401 ||
        newsRes.status === 401 ||
        usrRes.status === 401
      ) {
        onLogout('Your admin session expired or could not be verified. Please sign in again.');
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
      const picData = picRes.ok
        ? ((await picRes.json()) as { pictures?: SitePictureItem[]; tableReady?: boolean })
        : { pictures: [], tableReady: true };
      const setData = setRes.ok
        ? ((await setRes.json()) as {
            settings?: { contact_email?: string; whatsapp_number?: string };
            tableReady?: boolean;
          })
        : { settings: undefined, tableReady: true };
      const newsData = newsRes.ok
        ? ((await newsRes.json()) as { news?: TravelNewsItem[]; tableReady?: boolean })
        : { news: [], tableReady: true };
      const usrData = usrRes.ok ? ((await usrRes.json()) as { users?: AdminUserItem[] }) : { users: [] };

      setBookings(bData.bookings);
      setStats(bData.stats);
      setStorageMode(bData.storage || '');
      setServices(sData.services);
      setDestinations(dData.destinations);
      setSocialLinks(socData.socialLinks);
      setPictures(Array.isArray(picData.pictures) ? picData.pictures : []);
      setPicturesTableReady(picData.tableReady !== false);
      if (setData.settings) {
        setContactEmail(setData.settings.contact_email || '');
        setWhatsappNumber(setData.settings.whatsapp_number || '');
      }
      setSettingsTableReady(setData.tableReady !== false);
      setNewsPosts(Array.isArray(newsData.news) ? newsData.news : []);
      setNewsTableReady(newsData.tableReady !== false);
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

  function openSocialEditor(link: SocialLinkItem) {
    setEditingSocial(link);
    setEditSocialPlatform(link.platform || 'Website');
    setEditSocialLabel(link.label || '');
    setEditSocialUrl(link.url || '');
  }

  async function saveSocialEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSocial) return;
    setSavingSocial(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/social-links/${editingSocial.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          platform: editSocialPlatform,
          label: editSocialLabel.trim() || editSocialPlatform,
          url: editSocialUrl.trim(),
        }),
      });
      if (res.status === 401) {
        onLogout('Your admin session expired or could not be verified. Please sign in again.');
        return;
      }
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not update social media link.');
      setEditingSocial(null);
      await loadData();
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update social media link.');
    } finally {
      setSavingSocial(false);
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
      if (editingSocial?.id === id) setEditingSocial(null);
      await loadData();
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete social media link.');
    }
  }

  async function handleNewPictureFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setPicNotice('');
    try {
      const dataUrl = await prepareImageUpload(file);
      setNewPicDataUrl(dataUrl);
      setNewPicFileName(file.name);
      if (!newPicTitle.trim()) {
        setNewPicTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 80));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not process image file.');
    } finally {
      e.target.value = '';
    }
  }

  async function addPicture(e: React.FormEvent) {
    e.preventDefault();
    if (!newPicTitle.trim()) {
      setError('Picture title is required.');
      return;
    }
    if (!newPicDataUrl && !newPicUrl.trim()) {
      setError('Please upload an image file or enter an image URL.');
      return;
    }
    setUploadingPic(true);
    setError('');
    setPicNotice('');
    try {
      const res = await fetch('/api/admin/pictures', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: newPicTitle.trim(),
          caption: newPicCaption.trim(),
          placement: newPicPlacement,
          imageDataUrl: newPicDataUrl || undefined,
          image_url: !newPicDataUrl ? newPicUrl.trim() : undefined,
        }),
      });
      if (res.status === 401) {
        onLogout('Your admin session expired or could not be verified. Please sign in again.');
        return;
      }
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not upload picture.');
      setNewPicTitle('');
      setNewPicCaption('');
      setNewPicUrl('');
      setNewPicDataUrl('');
      setNewPicFileName('');
      setPicNotice('Picture uploaded and published to the public site.');
      await loadData();
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not upload picture.');
    } finally {
      setUploadingPic(false);
    }
  }

  function openPictureEditor(pic: SitePictureItem) {
    setEditingPicture(pic);
    setEditPicTitle(pic.title);
    setEditPicCaption(pic.caption || '');
    setEditPicPlacement(pic.placement || 'gallery');
    setEditPicUrl(pic.image_url || '');
    setEditPicDataUrl('');
    setEditPicFileName('');
  }

  async function handleEditPictureFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const dataUrl = await prepareImageUpload(file);
      setEditPicDataUrl(dataUrl);
      setEditPicFileName(file.name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not process image file.');
    } finally {
      e.target.value = '';
    }
  }

  async function savePictureEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPicture) return;
    setSavingPic(true);
    setError('');
    setPicNotice('');
    try {
      const res = await fetch(`/api/admin/pictures/${editingPicture.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          title: editPicTitle.trim(),
          caption: editPicCaption.trim(),
          placement: editPicPlacement,
          imageDataUrl: editPicDataUrl || undefined,
          image_url: !editPicDataUrl && editPicUrl.trim() !== editingPicture.image_url ? editPicUrl.trim() : undefined,
        }),
      });
      if (res.status === 401) {
        onLogout('Your admin session expired or could not be verified. Please sign in again.');
        return;
      }
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not update picture.');
      setEditingPicture(null);
      setPicNotice('Picture updated on the public site.');
      await loadData();
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update picture.');
    } finally {
      setSavingPic(false);
    }
  }

  async function togglePictureActive(pic: SitePictureItem) {
    setError('');
    setPicNotice('');
    try {
      const res = await fetch(`/api/admin/pictures/${pic.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ active: !pic.active }),
      });
      if (res.status === 401) {
        onLogout('Your admin session expired or could not be verified. Please sign in again.');
        return;
      }
      if (!res.ok) throw new Error('Could not update picture visibility.');
      await loadData();
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update picture visibility.');
    }
  }

  async function deletePicture(id: string) {
    setError('');
    setPicNotice('');
    try {
      const res = await fetch(`/api/admin/pictures/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        onLogout('Your admin session expired or could not be verified. Please sign in again.');
        return;
      }
      if (!res.ok) throw new Error('Could not delete picture.');
      if (editingPicture?.id === id) setEditingPicture(null);
      await loadData();
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete picture.');
    }
  }

  async function saveContactSettings(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = contactEmail.trim().toLowerCase();
    const cleanedWhatsapp = sanitizeDigits(whatsappNumber);

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid public contact email address.');
      return;
    }
    if (whatsappNumber.trim() && (cleanedWhatsapp.length < 7 || cleanedWhatsapp.length > 20)) {
      setError('WhatsApp number must contain 7 to 20 digits with country code.');
      return;
    }

    setSavingSettings(true);
    setError('');
    setSettingsNotice('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          contact_email: trimmedEmail,
          whatsapp_number: cleanedWhatsapp,
        }),
      });
      if (res.status === 401) {
        onLogout('Your admin session expired or could not be verified. Please sign in again.');
        return;
      }
      const data = (await res.json()) as {
        settings?: { contact_email?: string; whatsapp_number?: string };
        tableReady?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Could not update contact information.');

      if (data.settings) {
        setContactEmail(data.settings.contact_email || trimmedEmail);
        setWhatsappNumber(data.settings.whatsapp_number || cleanedWhatsapp);
      }
      setSettingsTableReady(data.tableReady !== false);
      setSettingsNotice('Public contact email & WhatsApp info updated on the website.');
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update contact information.');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleNewNewsImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setNewsNotice('');
    try {
      const dataUrl = await prepareImageUpload(file);
      setNewNewsImageDataUrl(dataUrl);
      setNewNewsImageFileName(file.name);
      setNewNewsImageUrl('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not process image file.');
    } finally {
      e.target.value = '';
    }
  }

  async function addNewsPost(e: React.FormEvent) {
    e.preventDefault();
    if (!newNewsTitle.trim() || !newNewsSummary.trim()) {
      setError('Title and short summary are required.');
      return;
    }
    setSavingNews(true);
    setError('');
    setNewsNotice('');
    try {
      const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: newNewsTitle.trim(),
          category: newNewsCategory,
          summary: newNewsSummary.trim(),
          content: newNewsContent.trim() || newNewsSummary.trim(),
          imageDataUrl: newNewsImageDataUrl || undefined,
          image_url: !newNewsImageDataUrl ? newNewsImageUrl.trim() || null : undefined,
          published: newNewsPublished,
        }),
      });
      if (res.status === 401) {
        onLogout('Your admin session expired or could not be verified. Please sign in again.');
        return;
      }
      const data = (await res.json()) as { tableReady?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not publish news post.');
      setNewNewsTitle('');
      setNewNewsSummary('');
      setNewNewsContent('');
      setNewNewsImageUrl('');
      setNewNewsImageDataUrl('');
      setNewNewsImageFileName('');
      setNewNewsPublished(true);
      setNewsTableReady(data.tableReady !== false);
      setNewsNotice(newNewsPublished ? 'Article published to the Travel News section.' : 'Draft saved.');
      await loadData();
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not publish news post.');
    } finally {
      setSavingNews(false);
    }
  }

  function openNewsEditor(post: TravelNewsItem) {
    setEditingNews(post);
    setEditNewsTitle(post.title);
    setEditNewsCategory(post.category);
    setEditNewsSummary(post.summary);
    setEditNewsContent(post.content);
    setEditNewsImageUrl(post.image_url || '');
    setEditNewsImageDataUrl('');
    setEditNewsImageFileName('');
    setEditNewsPublished(post.published);
  }

  async function handleEditNewsImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const dataUrl = await prepareImageUpload(file);
      setEditNewsImageDataUrl(dataUrl);
      setEditNewsImageFileName(file.name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not process image file.');
    } finally {
      e.target.value = '';
    }
  }

  async function saveNewsEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingNews) return;
    setUpdatingNews(true);
    setError('');
    setNewsNotice('');
    try {
      const res = await fetch(`/api/admin/news/${editingNews.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          title: editNewsTitle.trim(),
          category: editNewsCategory,
          summary: editNewsSummary.trim(),
          content: editNewsContent.trim() || editNewsSummary.trim(),
          imageDataUrl: editNewsImageDataUrl || undefined,
          image_url: !editNewsImageDataUrl ? editNewsImageUrl.trim() || null : undefined,
          published: editNewsPublished,
        }),
      });
      if (res.status === 401) {
        onLogout('Your admin session expired or could not be verified. Please sign in again.');
        return;
      }
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not update news post.');
      setEditingNews(null);
      setEditNewsImageDataUrl('');
      setEditNewsImageFileName('');
      setNewsNotice('Travel News post updated.');
      await loadData();
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update news post.');
    } finally {
      setUpdatingNews(false);
    }
  }

  async function toggleNewsPublished(post: TravelNewsItem) {
    setError('');
    setNewsNotice('');
    try {
      const res = await fetch(`/api/admin/news/${post.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ published: !post.published }),
      });
      if (res.status === 401) {
        onLogout('Your admin session expired or could not be verified. Please sign in again.');
        return;
      }
      if (!res.ok) throw new Error('Could not update post visibility.');
      await loadData();
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update post visibility.');
    }
  }

  async function deleteNewsPost(id: string) {
    setError('');
    setNewsNotice('');
    try {
      const res = await fetch(`/api/admin/news/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        onLogout('Your admin session expired or could not be verified. Please sign in again.');
        return;
      }
      if (!res.ok) throw new Error('Could not delete news post.');
      if (editingNews?.id === id) setEditingNews(null);
      await loadData();
      onCatalogUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete news post.');
    }
  }

  async function addOrInviteAdminUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    setError('');
    setUserMsg('');
    setGeneratedInviteLink('');
    setCopiedInviteLink(false);
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
      const data = (await res.json()) as {
        error?: string;
        email?: string;
        mode?: string;
        inviteLink?: string;
        rateLimitFallback?: boolean;
      };
      if (!res.ok) throw new Error(data.error || 'Could not process admin user request.');

      if (data.inviteLink) {
        setGeneratedInviteLink(data.inviteLink);
      }

      if (data.mode === 'create') {
        setUserMsg(`Admin account created and synced for ${data.email}. They can sign in immediately at /admin.`);
      } else if (data.rateLimitFallback) {
        setUserMsg(
          `Supabase's built-in email limit was reached, so a direct invite link was generated for ${data.email}. Copy and send it to them so they can set their password at /admin.`,
        );
      } else if (data.mode === 'link') {
        setUserMsg(
          `Direct invite link generated for ${data.email}. Copy and send it to them so they can set their password at /admin.`,
        );
      } else {
        setUserMsg(
          `Invitation email sent to ${data.email}. Accepting the invite will direct them to /admin to set their password.`,
        );
      }

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

  async function copyInviteLink() {
    if (!generatedInviteLink) return;
    try {
      await navigator.clipboard.writeText(generatedInviteLink);
      setCopiedInviteLink(true);
      setTimeout(() => setCopiedInviteLink(false), 2500);
    } catch {
      setError('Could not copy automatically. Please select and copy the invite link below.');
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
          <button type="button" className="admin-btn-danger" onClick={() => onLogout()}>
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
            className={tab === 'pictures' ? 'active' : ''}
            onClick={() => setTab('pictures')}
          >
            <ImageIcon size={16} /> Pictures ({pictures.length})
          </button>
          <button
            type="button"
            className={tab === 'news' ? 'active' : ''}
            onClick={() => setTab('news')}
          >
            <Newspaper size={16} /> Travel News ({newsPosts.length})
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
            className={tab === 'contact' ? 'active' : ''}
            onClick={() => setTab('contact')}
          >
            <Mail size={16} /> Contact &amp; Email
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
                {socialLinks.map((link) => {
                  const brandKey = detectSocialPlatform(link.platform, link.url);
                  return (
                    <div key={link.id} className={`catalog-card ${link.active ? '' : 'inactive'}`}>
                      <div className="social-card-info">
                        <div className="social-card-head">
                          <span className={`social-admin-badge social-brand-${brandKey}`}>
                            <SocialPlatformIcon platform={link.platform} url={link.url} size={17} />
                          </span>
                          <div>
                            <strong>{link.platform}</strong>
                            <span className="muted">{link.label}</span>
                          </div>
                        </div>
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
                          className="icon-btn"
                          title="Edit social link"
                          onClick={() => openSocialEditor(link)}
                        >
                          <Pencil size={15} />
                        </button>
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
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'pictures' && (
          <div className="admin-panel-card">
            {!picturesTableReady && (
              <div className="notice-error" style={{ marginTop: 0, marginBottom: 16 }}>
                Supabase table <strong>site_pictures</strong> is not initialized yet. Run migration{' '}
                <code>006_site_pictures.sql</code> in Supabase SQL Editor so uploaded images persist across deployments.
              </div>
            )}

            <form className="admin-picture-form" onSubmit={addPicture}>
              <div className="admin-picture-fields">
                <input
                  type="text"
                  required
                  placeholder="Picture title (e.g. Dubai Holiday Package)"
                  value={newPicTitle}
                  onChange={(e) => setNewPicTitle(e.target.value)}
                />
                <select
                  className="admin-select"
                  value={newPicPlacement}
                  onChange={(e) => setNewPicPlacement(e.target.value as PicturePlacement)}
                >
                  <option value="gallery">Gallery Showcase</option>
                  <option value="hero">Hero Main Banner</option>
                  <option value="feature">Flight Support Banner</option>
                  <option value="about">About Section Image</option>
                </select>
                <input
                  type="text"
                  placeholder="Caption or short description (optional)"
                  value={newPicCaption}
                  onChange={(e) => setNewPicCaption(e.target.value)}
                />
              </div>

              <div className="admin-picture-upload-row">
                <label className="admin-file-picker">
                  <Upload size={16} />
                  <span>{newPicFileName ? `Selected: ${newPicFileName}` : 'Upload image from device'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleNewPictureFile}
                  />
                </label>

                <input
                  type="text"
                  placeholder="Or paste image URL (https://...)"
                  value={newPicUrl}
                  onChange={(e) => {
                    setNewPicUrl(e.target.value);
                    if (e.target.value.trim()) {
                      setNewPicDataUrl('');
                      setNewPicFileName('');
                    }
                  }}
                />

                {(newPicDataUrl || isSafeImageSrc(newPicUrl.trim())) && (
                  <div className="admin-upload-preview">
                    <img
                      src={newPicDataUrl || newPicUrl.trim()}
                      alt="Upload preview"
                    />
                    {newPicDataUrl && (
                      <button
                        type="button"
                        className="icon-btn"
                        title="Clear selected file"
                        onClick={() => {
                          setNewPicDataUrl('');
                          setNewPicFileName('');
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )}

                <button type="submit" className="primary" disabled={uploadingPic}>
                  <Upload size={16} /> {uploadingPic ? 'Uploading…' : 'Upload picture'}
                </button>
              </div>
            </form>

            {picNotice && <div className="notice" style={{ marginBottom: 16 }}>{picNotice}</div>}

            {pictures.length === 0 ? (
              <div className="admin-empty">
                No pictures uploaded yet. Upload an image above to showcase it on the public website.
              </div>
            ) : (
              <div className="picture-admin-grid">
                {pictures.map((pic) => (
                  <div key={pic.id} className={`picture-admin-card ${pic.active ? '' : 'inactive'}`}>
                    <div className="picture-admin-thumb">
                      {isSafeImageSrc(pic.image_url) && (
                        <img src={pic.image_url} alt={pic.title} />
                      )}
                      <span className="picture-placement-tag">
                        {PICTURE_PLACEMENT_LABELS[pic.placement] || 'Gallery'}
                      </span>
                    </div>
                    <div className="picture-admin-body">
                      <strong>{pic.title}</strong>
                      {pic.caption && <p>{pic.caption}</p>}
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Edit or replace picture"
                          onClick={() => openPictureEditor(pic)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className={pic.active ? 'toggle-btn active' : 'toggle-btn'}
                          onClick={() => togglePictureActive(pic)}
                        >
                          <CheckCircle2 size={15} /> {pic.active ? 'Active' : 'Hidden'}
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Delete picture"
                          onClick={() => deletePicture(pic.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'news' && (
          <div className="admin-panel-card">
            {!newsTableReady && (
              <div className="notice-error" style={{ marginTop: 0, marginBottom: 16 }}>
                Supabase table <strong>travel_news</strong> is not initialized yet. Run migrations{' '}
                <code>008_travel_news.sql</code> and <code>009_travel_news_images.sql</code> in Supabase SQL Editor so news posts and uploaded images persist across deployments.
              </div>
            )}

            <form className="admin-news-form" onSubmit={addNewsPost}>
              <div className="admin-news-row">
                <input
                  type="text"
                  required
                  placeholder="Headline (e.g. Schengen Visa Processing Tips for Summer Travel)"
                  value={newNewsTitle}
                  onChange={(e) => setNewNewsTitle(e.target.value)}
                />
                <select
                  className="admin-select"
                  value={newNewsCategory}
                  onChange={(e) => setNewNewsCategory(e.target.value as NewsCategory)}
                >
                  {NEWS_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                required
                placeholder="Short summary shown on the landing page card"
                value={newNewsSummary}
                onChange={(e) => setNewNewsSummary(e.target.value)}
              />
              <textarea
                rows={4}
                placeholder="Full article details, travel tips, visa requirements, or company announcement..."
                value={newNewsContent}
                onChange={(e) => setNewNewsContent(e.target.value)}
              />
              <div className="admin-picture-upload-row">
                <label className="admin-file-picker">
                  <Upload size={16} />
                  <span>
                    {newNewsImageFileName ? `Selected: ${newNewsImageFileName}` : 'Upload cover image from device'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleNewNewsImageFile}
                  />
                </label>

                <input
                  type="text"
                  placeholder="Or paste cover image URL (https://... or /tnp-services.jpg)"
                  value={newNewsImageUrl}
                  onChange={(e) => {
                    setNewNewsImageUrl(e.target.value);
                    if (e.target.value.trim()) {
                      setNewNewsImageDataUrl('');
                      setNewNewsImageFileName('');
                    }
                  }}
                />

                {(newNewsImageDataUrl || isSafeImageSrc(newNewsImageUrl.trim())) && (
                  <div className="admin-upload-preview">
                    <img
                      src={newNewsImageDataUrl || newNewsImageUrl.trim()}
                      alt="Cover preview"
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      title="Clear cover image"
                      onClick={() => {
                        setNewNewsImageDataUrl('');
                        setNewNewsImageFileName('');
                        setNewNewsImageUrl('');
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="admin-news-footer">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={newNewsPublished}
                    onChange={(e) => setNewNewsPublished(e.target.checked)}
                  />
                  <span>Publish immediately</span>
                </label>
                <button type="submit" className="primary" disabled={savingNews}>
                  <Plus size={16} /> {savingNews ? 'Saving…' : newNewsPublished ? 'Publish post' : 'Save draft'}
                </button>
              </div>
            </form>

            {newsNotice && <div className="notice" style={{ marginBottom: 16 }}>{newsNotice}</div>}

            {newsPosts.length === 0 ? (
              <div className="admin-empty">
                No Travel News posts yet. Share travel tips, visa updates, or announcements above.
              </div>
            ) : (
              <div className="catalog-grid">
                {newsPosts.map((post) => (
                  <div key={post.id} className={`catalog-card admin-news-card ${post.published ? '' : 'inactive'}`}>
                    {post.image_url && isSafeImageSrc(post.image_url) && (
                      <div className="admin-news-thumb">
                        <img src={post.image_url} alt={post.title} />
                      </div>
                    )}
                    <div className="admin-news-meta">
                      <div className="admin-news-badges">
                        <span className="news-category-pill">{post.category}</span>
                        <span className="muted">
                          {new Date(post.published_at).toLocaleDateString()}
                        </span>
                      </div>
                      <strong>{post.title}</strong>
                      <p>{post.summary}</p>
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Edit post & image"
                        onClick={() => openNewsEditor(post)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className={post.published ? 'toggle-btn active' : 'toggle-btn'}
                        onClick={() => toggleNewsPublished(post)}
                      >
                        <CheckCircle2 size={15} /> {post.published ? 'Published' : 'Draft'}
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Delete post"
                        onClick={() => deleteNewsPost(post.id)}
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

        {tab === 'contact' && (
          <div className="admin-panel-card">
            {!settingsTableReady && (
              <div className="notice-error" style={{ marginTop: 0, marginBottom: 16 }}>
                Supabase table <strong>site_settings</strong> is not initialized yet. Run migration{' '}
                <code>007_site_settings.sql</code> in Supabase SQL Editor so contact updates persist across deployments.
              </div>
            )}

            <form className="admin-settings-form" onSubmit={saveContactSettings}>
              <div className="admin-settings-grid">
                <label className="admin-settings-field">
                  <span>Public Contact Email</span>
                  <input
                    type="email"
                    required
                    placeholder="e.g. agencytnptravel@gmail.com"
                    value={contactEmail}
                    onChange={(e) => {
                      setContactEmail(e.target.value);
                      if (settingsNotice) setSettingsNotice('');
                    }}
                  />
                  <small className="muted">
                    Displayed in the Contact section of the public website and used for mailto links.
                  </small>
                </label>

                <label className="admin-settings-field">
                  <span>WhatsApp Number (with country code)</span>
                  <input
                    type="tel"
                    placeholder="e.g. 250788697728"
                    value={whatsappNumber}
                    onChange={(e) => {
                      setWhatsappNumber(e.target.value);
                      if (settingsNotice) setSettingsNotice('');
                    }}
                  />
                  <small className="muted">
                    Digits only with country code (no + or spaces). Used for WhatsApp chat buttons.
                  </small>
                </label>
              </div>

              <div className="admin-settings-actions">
                <button type="submit" className="primary" disabled={savingSettings}>
                  <Mail size={16} /> {savingSettings ? 'Saving…' : 'Save contact info'}
                </button>
              </div>
            </form>

            {settingsNotice && <div className="notice" style={{ marginBottom: 16 }}>{settingsNotice}</div>}

            <div className="admin-settings-preview">
              <small className="eyebrow">LIVE PUBLIC CONTACT PREVIEW</small>
              <div className="admin-settings-preview-row">
                <div>
                  <span className="muted">Email address</span>
                  <strong>{contactEmail || 'Not set'}</strong>
                </div>
                <div>
                  <span className="muted">WhatsApp link</span>
                  <strong>{whatsappNumber ? `+${sanitizeDigits(whatsappNumber)}` : 'Not set'}</strong>
                </div>
              </div>
            </div>
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
                    setGeneratedInviteLink('');
                  }}
                >
                  <Mail size={14} /> Invite by Email
                </button>
                <button
                  type="button"
                  className={userActionMode === 'link' ? 'toggle-btn active' : 'toggle-btn'}
                  onClick={() => {
                    setUserActionMode('link');
                    setUserMsg('');
                    setGeneratedInviteLink('');
                  }}
                >
                  <Link2 size={14} /> Generate Invite Link
                </button>
                <button
                  type="button"
                  className={userActionMode === 'create' ? 'toggle-btn active' : 'toggle-btn'}
                  onClick={() => {
                    setUserActionMode('create');
                    setUserMsg('');
                    setGeneratedInviteLink('');
                  }}
                >
                  <UserPlus size={14} /> Create with Password
                </button>
              </div>
              <span className="muted">
                Use Generate Invite Link or Create with Password to bypass Supabase&apos;s 2 emails/hour limit.
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
                {userActionMode === 'link' ? <Link2 size={16} /> : <UserPlus size={16} />}{' '}
                {userBusy
                  ? 'Saving…'
                  : userActionMode === 'create'
                    ? 'Create admin'
                    : userActionMode === 'link'
                      ? 'Generate link'
                      : 'Send invite'}
              </button>
            </form>

            {userMsg && (
              <div className="notice" style={{ marginBottom: 16 }}>
                <div>{userMsg}</div>
                {generatedInviteLink && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="text"
                      readOnly
                      value={generatedInviteLink}
                      onFocus={(e) => e.currentTarget.select()}
                      style={{
                        flex: 1,
                        minWidth: 220,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #bbf7d0',
                        background: '#ffffff',
                        fontSize: 12,
                        color: '#10264d',
                      }}
                    />
                    <button type="button" className="toggle-btn active" onClick={copyInviteLink}>
                      <Copy size={14} /> {copiedInviteLink ? 'Copied!' : 'Copy link'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {adminUsers.length === 0 ? (
              <div className="admin-empty">
                No synced admin accounts found yet. Run migration 005 in Supabase SQL Editor and click Refresh to sync Supabase Auth users.
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

      {editingSocial && (
        <div className="overlay" onClick={() => setEditingSocial(null)}>
          <div className="modal modal-narrow" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close" onClick={() => setEditingSocial(null)}>
              <X />
            </button>
            <small className="eyebrow">SOCIAL MEDIA</small>
            <h2>
              Update <i>social link.</i>
            </h2>
            <p>Changes update the social icon shown on the public website.</p>
            <form onSubmit={saveSocialEdit}>
              <label>
                Platform
                <select
                  value={editSocialPlatform}
                  onChange={(e) => setEditSocialPlatform(e.target.value)}
                >
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  {!SOCIAL_PLATFORMS.includes(editSocialPlatform) && (
                    <option value={editSocialPlatform}>{editSocialPlatform}</option>
                  )}
                </select>
              </label>
              <label>
                Display handle or label
                <input
                  type="text"
                  placeholder="e.g. @tnptravel"
                  value={editSocialLabel}
                  onChange={(e) => setEditSocialLabel(e.target.value)}
                />
              </label>
              <label>
                Full URL
                <input
                  required
                  type="url"
                  placeholder="https://x.com/tnptravel"
                  value={editSocialUrl}
                  onChange={(e) => setEditSocialUrl(e.target.value)}
                />
              </label>
              <button type="submit" className="primary wide" disabled={savingSocial}>
                {savingSocial ? 'Saving…' : 'Save social link'}
              </button>
            </form>
          </div>
        </div>
      )}

      {editingPicture && (
        <div className="overlay" onClick={() => setEditingPicture(null)}>
          <div className="modal modal-narrow" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close" onClick={() => setEditingPicture(null)}>
              <X />
            </button>
            <small className="eyebrow">SITE PICTURES</small>
            <h2>
              Update <i>picture.</i>
            </h2>
            <p>Update details or upload a new image to display on the public website.</p>
            <form onSubmit={savePictureEdit}>
              {(editPicDataUrl || isSafeImageSrc(editPicUrl.trim())) && (
                <div className="picture-modal-preview">
                  <img src={editPicDataUrl || editPicUrl.trim()} alt={editPicTitle || 'Picture preview'} />
                </div>
              )}
              <label>
                Title
                <input
                  required
                  type="text"
                  value={editPicTitle}
                  onChange={(e) => setEditPicTitle(e.target.value)}
                />
              </label>
              <label>
                Display section
                <select
                  value={editPicPlacement}
                  onChange={(e) => setEditPicPlacement(e.target.value as PicturePlacement)}
                >
                  <option value="gallery">Gallery Showcase</option>
                  <option value="hero">Hero Main Banner</option>
                  <option value="feature">Flight Support Banner</option>
                  <option value="about">About Section Image</option>
                </select>
              </label>
              <label>
                Caption
                <input
                  type="text"
                  placeholder="Short description (optional)"
                  value={editPicCaption}
                  onChange={(e) => setEditPicCaption(e.target.value)}
                />
              </label>
              <label>
                Upload replacement image
                <div className="admin-file-picker modal-file-picker">
                  <Upload size={16} />
                  <span>{editPicFileName ? `New file: ${editPicFileName}` : 'Choose a new JPG, PNG, WebP, or GIF'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleEditPictureFile}
                  />
                </div>
              </label>
              <label>
                Or image URL
                <input
                  type="text"
                  placeholder="https://... or /tnp-main-poster.jpg"
                  value={editPicUrl}
                  onChange={(e) => {
                    setEditPicUrl(e.target.value);
                    if (e.target.value.trim()) {
                      setEditPicDataUrl('');
                      setEditPicFileName('');
                    }
                  }}
                />
              </label>
              <button type="submit" className="primary wide" disabled={savingPic}>
                {savingPic ? 'Saving…' : 'Save picture'}
              </button>
            </form>
          </div>
        </div>
      )}

      {editingNews && (
        <div className="overlay" onClick={() => setEditingNews(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close" onClick={() => setEditingNews(null)}>
              <X />
            </button>
            <small className="eyebrow">TRAVEL NEWS</small>
            <h2>
              Update <i>article.</i>
            </h2>
            <p>Changes update immediately in the Travel News section on the public website.</p>
            <form onSubmit={saveNewsEdit}>
              {(editNewsImageDataUrl || isSafeImageSrc(editNewsImageUrl.trim())) && (
                <div className="picture-modal-preview admin-news-modal-preview">
                  <img
                    src={editNewsImageDataUrl || editNewsImageUrl.trim()}
                    alt={editNewsTitle || 'Article cover preview'}
                  />
                  <button
                    type="button"
                    className="admin-news-remove-img"
                    onClick={() => {
                      setEditNewsImageDataUrl('');
                      setEditNewsImageFileName('');
                      setEditNewsImageUrl('');
                    }}
                  >
                    <Trash2 size={14} /> Remove image
                  </button>
                </div>
              )}
              <div className="fields">
                <label>
                  Headline
                  <input
                    required
                    type="text"
                    value={editNewsTitle}
                    onChange={(e) => setEditNewsTitle(e.target.value)}
                  />
                </label>
                <label>
                  Category
                  <select
                    value={editNewsCategory}
                    onChange={(e) => setEditNewsCategory(e.target.value as NewsCategory)}
                  >
                    {NEWS_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Short summary
                <input
                  required
                  type="text"
                  value={editNewsSummary}
                  onChange={(e) => setEditNewsSummary(e.target.value)}
                />
              </label>
              <label>
                Full article content
                <textarea
                  rows={5}
                  value={editNewsContent}
                  onChange={(e) => setEditNewsContent(e.target.value)}
                />
              </label>
              <label>
                Upload cover image from device
                <div className="admin-file-picker modal-file-picker">
                  <Upload size={16} />
                  <span>
                    {editNewsImageFileName
                      ? `New file: ${editNewsImageFileName}`
                      : 'Choose a new JPG, PNG, WebP, or GIF'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleEditNewsImageFile}
                  />
                </div>
              </label>
              <label>
                Or cover image URL (optional)
                <input
                  type="text"
                  placeholder="https://... or /tnp-services.jpg"
                  value={editNewsImageUrl}
                  onChange={(e) => {
                    setEditNewsImageUrl(e.target.value);
                    if (e.target.value.trim()) {
                      setEditNewsImageDataUrl('');
                      setEditNewsImageFileName('');
                    }
                  }}
                />
              </label>
              <label className="admin-checkbox-label" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={editNewsPublished}
                  onChange={(e) => setEditNewsPublished(e.target.checked)}
                />
                <span>Published on public website</span>
              </label>
              <button type="submit" className="primary wide" disabled={updatingNews}>
                {updatingNews ? 'Saving…' : 'Save article'}
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
