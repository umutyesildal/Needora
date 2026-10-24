'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { localDayTime, nextRunAt } from '@/lib/schedule-time';
import type { Client, ClientsResponse, CreatedClientResponse } from '@/lib/types';

export type View = 'leads' | 'runs' | 'client' | 'how' | 'settings';
export const VIEWS: View[] = ['leads', 'runs', 'client', 'how', 'settings'];

export const host = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

function clientNote(c: Client) {
  const h = host(c.website);
  if (c.profile) return h;
  if (c.research.status === 'running') return `${h} · researching`;
  if (c.research.status === 'failed') return `${h} · research failed`;
  return `${h} · no profile yet`;
}

// Design: "09:00" when today, else "Mon 09:00"; "Off" when nothing is scheduled.
function nextRunShort(schedule: Client['settings']['schedule']) {
  const next = nextRunAt(schedule);
  if (!next) return 'Off';
  const n = localDayTime(next, schedule.tz);
  const today = localDayTime(new Date(), schedule.tz).day === n.day && next.getTime() - Date.now() < 86_400_000;
  return today ? n.time : `${n.day[0].toUpperCase()}${n.day.slice(1)} ${n.time}`;
}

export default function Sidebar(props: {
  clients: ClientsResponse['clients'] | null;
  client: Client | null;
  leadCount: number | null;
  runCount: number | null;
  view: View;
  onView: (v: View) => void;
  onPick: (id: string) => void;
  onAdded: (id: string) => void;
}) {
  const { clients, client, view } = props;
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const nav: [View, string, number | ''][] = [
    ['leads', 'Leads', props.leadCount ?? ''],
    ['runs', 'Runs', props.runCount ?? ''],
    ['client', 'Client profile', ''],
    ['how', 'How it works', ''],
    ['settings', 'Settings', ''],
  ];
  const s = client?.settings;

  async function add() {
    const n = name.trim();
    const w = url.trim();
    if (!n) return setErr('Client name is required.');
    setBusy(true);
    setErr(null);
    try {
      const website = !w || /^https?:\/\//i.test(w) ? w : `https://${w}`;
      const { id } = await api<CreatedClientResponse>('/api/clients', { method: 'POST', body: JSON.stringify({ name: n, website }) });
      setName('');
      setUrl('');
      setAdding(false);
      setOpen(false);
      props.onAdded(id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="sticky top-0 box-border flex h-screen flex-col gap-[22px] border-r border-[#e3e0da] px-3 py-5">
      <div className="flex items-center px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/needora-lockup-black-crop.svg" alt="Needora" className="block h-[22px] w-auto" />
      </div>

      <div className="relative flex flex-col gap-1.5">
        <div className="px-2 text-[11px] uppercase tracking-[0.06em] text-[#8a867f]">Client</div>
        <button
          onClick={() => {
            setOpen((o) => !o);
            setAdding(false);
          }}
          className={`flex items-center gap-2 rounded-[8px] border px-2 py-1.5 text-left text-[#1c1b19] hover:bg-white ${open ? 'border-[#e3e0da] bg-white' : 'border-transparent bg-transparent'}`}
        >
          <div className="grid size-[28px] shrink-0 place-items-center rounded-[6px] border border-[#e3e0da] bg-white text-[12px] font-semibold">
            {client ? client.name.charAt(0).toUpperCase() : '·'}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="truncate text-[14px] font-medium">{client?.name ?? (clients?.length === 0 ? 'No client' : 'Loading…')}</div>
            <div className="truncate font-mono text-[12px] text-[#8a867f]">{client ? host(client.website) : '—'}</div>
          </div>
          <span className="text-[11px] text-[#8a867f]">▾</span>
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1.5 flex flex-col gap-0.5 rounded-[10px] border border-[#e3e0da] bg-white p-1.5 shadow-[0_8px_24px_rgba(28,27,25,0.08)]">
            {(clients ?? []).map((c) => {
              const on = c.id === client?.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setOpen(false);
                    setAdding(false);
                    props.onPick(c.id);
                  }}
                  className={`flex items-center gap-2 rounded-[6px] border-0 px-2 py-[7px] text-left text-[#1c1b19] hover:bg-[#f5f4f1] ${on ? 'bg-[#f5f4f1]' : 'bg-transparent'}`}
                >
                  <div className="grid size-[24px] shrink-0 place-items-center rounded-[5px] border border-[#e3e0da] text-[11px] font-semibold">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="text-[13px] font-medium">{c.name}</div>
                    <div className="text-[11px] text-[#8a867f]">{clientNote(c)}</div>
                  </div>
                  <span className="font-[system-ui] text-[12px] text-[oklch(0.56_0.2_27)]">{on ? '●' : ''}</span>
                </button>
              );
            })}
            <div className="my-1 h-px bg-[#ece9e4]" />
            {!adding ? (
              <button
                onClick={() => {
                  setAdding(true);
                  setErr(null);
                }}
                className="flex items-center gap-2 rounded-[6px] border-0 bg-transparent px-2 py-[7px] text-left text-[13px] text-[#1c1b19] hover:bg-[#f5f4f1]"
              >
                <span className="grid size-[24px] place-items-center rounded-[5px] border border-dashed border-[#cfcac2] text-[13px] text-[#6f6b64]">+</span>
                Add client
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  add();
                }}
                className="flex flex-col gap-1.5 p-1"
              >
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Client name"
                  autoFocus
                  className="rounded-[6px] border border-[#e3e0da] bg-[#faf9f7] px-[9px] py-[7px] text-[13px] text-[#1c1b19] outline-none"
                />
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="website.com"
                  className="rounded-[6px] border border-[#e3e0da] bg-[#faf9f7] px-[9px] py-[7px] font-mono text-[13px] text-[#1c1b19] outline-none"
                />
                <div className="flex gap-1.5">
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 rounded-[6px] border-0 bg-[oklch(0.56_0.2_27)] p-[7px] text-[13px] text-white disabled:opacity-60"
                  >
                    {busy ? 'Adding…' : 'Add and research'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setErr(null);
                    }}
                    className="rounded-[6px] border border-[#e3e0da] bg-white px-2.5 py-[7px] text-[13px] text-[#6f6b64]"
                  >
                    Cancel
                  </button>
                </div>
                {err && <div className="text-[12px] text-[oklch(0.48_0.15_25)]">{err}</div>}
              </form>
            )}
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-0.5">
        {nav.map(([v, label, count]) => (
          <button
            key={v}
            onClick={() => props.onView(v)}
            className={`flex items-center justify-between rounded-[7px] border-0 px-2.5 py-2 text-left text-[14px] ${view === v ? 'bg-[#ebe9e4] text-[#1c1b19]' : 'bg-transparent text-[#6f6b64]'}`}
          >
            <span>{label}</span>
            <span className="font-mono text-[12px] text-[#8a867f]">{count}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 rounded-[10px] border border-[#e3e0da] bg-white p-3">
        {(
          [
            ['Send mode', s ? (s.send_mode === 'auto' ? 'Auto' : 'Review') : '—', false],
            ['Send cap / run', s ? (s.send_cap == null ? 'No cap' : String(s.send_cap)) : '—', true],
            ['Next auto run', s ? nextRunShort(s.schedule) : '—', true],
            ['Threshold', s ? String(s.threshold) : '—', true],
          ] as const
        ).map(([label, value, mono]) => (
          <div key={label} className="flex justify-between text-[12px] text-[#6f6b64]">
            <span>{label}</span>
            <span className={`font-medium text-[#1c1b19] ${mono ? 'font-mono' : ''}`}>{value}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
