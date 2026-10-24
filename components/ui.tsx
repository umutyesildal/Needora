'use client';
// Small presentational bits shared by the dashboard views. Colors copied from docs/design/needora-dashboard.dc.html.
import { useState, type CSSProperties } from 'react';
import { MESSAGE_STATUS_LABEL, PLATFORM_LABEL, type Lead, type MessageStatus, type Platform } from '@/lib/types';

export const C = {
  ink: '#1c1b19', muted: '#6f6b64', faint: '#9a968e', line: '#e3e0da', line2: '#ece9e4',
  accent: 'oklch(0.56 0.2 27)', comp: 'oklch(0.48 0.14 320)', ok: 'oklch(0.45 0.11 155)', bad: 'oklch(0.5 0.15 25)',
};
export const MONO = "var(--font-geist-mono), 'Geist Mono', monospace";

const PLAT: Record<Platform, { short: string; bg: string; fg: string }> = {
  reddit: { short: 'R', bg: 'oklch(0.94 0.04 45)', fg: 'oklch(0.48 0.14 45)' },
  x: { short: 'X', bg: '#ebe9e4', fg: '#1c1b19' },
  linkedin: { short: 'in', bg: 'oklch(0.94 0.03 250)', fg: 'oklch(0.45 0.12 250)' },
};

export function PlatformChip({ platform, size = 26 }: { platform: Platform; size?: number }) {
  const p = PLAT[platform];
  return (
    <div title={PLATFORM_LABEL[platform]} style={{ width: size, height: size, borderRadius: size > 26 ? 7 : 6, background: p.bg, color: p.fg, display: 'grid', placeItems: 'center', fontSize: size > 26 ? 12 : 11, fontWeight: 600, flexShrink: 0 }}>
      {p.short}
    </div>
  );
}

// [background, color, border]
const ST = {
  ok: ['oklch(0.95 0.04 155)', 'oklch(0.42 0.11 155)', 'oklch(0.95 0.04 155)'],
  bad: ['oklch(0.95 0.03 25)', 'oklch(0.48 0.15 25)', 'oklch(0.95 0.03 25)'],
  warn: ['oklch(0.95 0.05 80)', 'oklch(0.45 0.1 65)', 'oklch(0.95 0.05 80)'],
  mute: ['#eeece8', '#6f6b64', '#eeece8'],
  faint: ['transparent', '#9a968e', 'transparent'],
  ink: ['#ffffff', '#1c1b19', '#d6d2cb'],
};
const STATUS_KIND: Record<MessageStatus, keyof typeof ST> = { prepared: 'ok', awaiting: 'warn', over_cap: 'mute', failed: 'bad' };

// fallback/kind: the chip shown when there is no message (design: 'Below threshold' faint, 'Queued' ink)
export function StatusChip({ status, fallback = '—', kind = 'faint' }: { status: MessageStatus | null; fallback?: string; kind?: keyof typeof ST }) {
  const [bg, fg, border] = ST[status ? STATUS_KIND[status] : kind];
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 5, border: `1px solid ${border}`, background: bg, color: fg, fontSize: 12, whiteSpace: 'nowrap' }}>
      {status ? MESSAGE_STATUS_LABEL[status] : fallback}
    </span>
  );
}

export const chipGrey: CSSProperties = { padding: '2px 7px', borderRadius: 5, background: '#f2f0ec' };
export const chipComp: CSSProperties = { padding: '2px 7px', borderRadius: 5, background: 'oklch(0.95 0.04 320)', color: 'oklch(0.45 0.14 320)', fontSize: 12 };
export const btnDark: CSSProperties = { padding: '8px 14px', border: 0, borderRadius: 7, background: C.ink, color: '#ffffff', fontSize: 13, cursor: 'pointer' };
export const btnLight: CSSProperties = { padding: '8px 14px', border: `1px solid ${C.line}`, borderRadius: 7, background: '#ffffff', color: C.ink, fontSize: 13, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' };
export const label11: CSSProperties = { fontSize: 11, color: '#8a867f', textTransform: 'uppercase', letterSpacing: '0.06em' };

export function Tab({ label, count, active, onClick }: { label: string; count: number | string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 10px', border: `1px solid ${active ? '#dcd8d1' : 'transparent'}`, borderRadius: 6, background: active ? '#f2f0ec' : '#ffffff', color: C.ink, fontSize: 13, cursor: 'pointer' }}>
      <span>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 11, color: '#8a867f' }}>{count}</span>
    </button>
  );
}

export function CopyButton({ text, style }: { text: string; style?: CSSProperties }) {
  const [done, setDone] = useState(false);
  return (
    <button
      style={{ ...btnLight, ...style }}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); });
      }}
    >
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

export function ago(iso: string | null) {
  if (!iso) return '';
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
}

export const leadHandle = (l: Lead) => l.author_handle || 'Author hidden';
export const leadWhere = (l: Lead) => l.author_headline || l.source || PLATFORM_LABEL[l.platform];
export const leadAge = (l: Lead) => ago(l.posted_at ?? l.created_at);
export const leadText = (l: Lead) => (l.title ? `${l.title} — ${l.body}` : l.body);
export const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
