import React from 'react';
import { Globe2 } from 'lucide-react';

export type SocialPlatformKey =
  | 'x'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'linkedin'
  | 'whatsapp'
  | 'telegram'
  | 'threads'
  | 'website';

export function detectSocialPlatform(platform: string, url = ''): SocialPlatformKey {
  const plat = platform.toLowerCase();

  let hostname = '';
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    hostname = '';
  }

  // Prefer the actual URL hostname when available so icon matches the destination link.
  if (hostname) {
    if (hostname === 'x.com' || hostname.endsWith('.x.com') || hostname === 'twitter.com' || hostname.endsWith('.twitter.com')) {
      return 'x';
    }
    if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) return 'instagram';
    if (hostname.includes('facebook.com') || hostname.includes('fb.com') || hostname.includes('fb.watch')) return 'facebook';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('whatsapp.com') || hostname === 'wa.me') return 'whatsapp';
    if (hostname === 't.me' || hostname.includes('telegram.')) return 'telegram';
    if (hostname.includes('threads.net') || hostname.includes('threads.com')) return 'threads';
  }

  if (/\b(x|twitter)\b/.test(plat) || plat.includes('x (twitter)')) return 'x';
  if (plat.includes('instagram')) return 'instagram';
  if (plat.includes('facebook')) return 'facebook';
  if (plat.includes('tiktok')) return 'tiktok';
  if (plat.includes('youtube')) return 'youtube';
  if (plat.includes('linkedin')) return 'linkedin';
  if (plat.includes('whatsapp')) return 'whatsapp';
  if (plat.includes('telegram')) return 'telegram';
  if (plat.includes('threads')) return 'threads';
  return 'website';
}

interface SocialPlatformIconProps {
  platform: string;
  url?: string;
  size?: number;
}

export default function SocialPlatformIcon({ platform, url = '', size = 20 }: SocialPlatformIconProps) {
  const key = detectSocialPlatform(platform, url);

  switch (key) {
    case 'x':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );

    case 'instagram':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      );

    case 'facebook':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4z" />
        </svg>
      );

    case 'tiktok':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      );

    case 'youtube':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12z" />
        </svg>
      );

    case 'linkedin':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002zM7 8.48H3V21h4zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91z" />
        </svg>
      );

    case 'whatsapp':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.81 14.11c-.25.7-1.43 1.34-1.99 1.42-.51.08-1.15.11-1.85-.11-.43-.14-.98-.32-1.69-.63-2.97-1.28-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.76-2.18 1.03-2.48.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.25.6.84 2.06.92 2.21.07.15.12.33.02.53-.1.2-.15.33-.3.5-.15.18-.31.4-.45.54-.15.15-.3.31-.13.61.18.3.78 1.29 1.68 2.09 1.16 1.03 2.13 1.35 2.43 1.5.3.15.48.13.66-.08.18-.2.76-.88.96-1.18.2-.3.41-.25.68-.15.28.1 1.77.84 2.07.99.3.15.51.23.58.35.08.13.08.73-.17 1.43z" />
        </svg>
      );

    case 'telegram':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
        </svg>
      );

    case 'threads':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19 12a7 7 0 1 0-3 5.74" />
          <path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-4 7.46" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );

    default:
      return <Globe2 size={size} aria-hidden="true" />;
  }
}
