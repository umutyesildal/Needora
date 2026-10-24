'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Client } from '@/lib/types';
import { host } from '@/components/Sidebar';

// Step labels written by lib/research.ts into client.research.step.
const STEPS = ['Researching the web', 'Structuring the profile'];
const INK = '#1c1b19';
const ACCENT = 'oklch(0.56 0.2 27)';
const BAD = 'oklch(0.48 0.15 25)';

export default function ClientSetup({
  client,
  onClientChanged,
  onDone,
}: {
  client: Client;
  onClientChanged: () => void;
  onDone: () => void;
}) {
  const r = client.research;
  const running = r.status === 'running';
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Poll GET /api/clients/:id (through the shell) while research runs.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(onClientChanged, 5000);
    return () => clearInterval(t);
  }, [running, onClientChanged]);

  async function research() {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/clients/${client.id}/research`, { method: 'POST' });
      onClientChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const at = Math.max(0, STEPS.indexOf(r.step ?? ''));
  const error = err ?? (r.status === 'failed' ? r.error || 'Research failed.' : null);

  return (
    <div className="flex max-w-[760px] flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-[24px] font-semibold tracking-[-0.02em]">{client.name}</h1>
        <div className="font-mono text-[13px] text-[#6f6b64]">{host(client.website)}</div>
      </div>
      <section className="flex flex-col gap-3.5 rounded-[10px] border border-[#e3e0da] bg-white p-4">
        <div className="text-[15px] font-semibold">Set up this client</div>
        <div className="flex flex-col gap-2.5 text-[13px]">
          <div className="flex items-center gap-2.5">
            <span
              className="grid size-5 place-items-center rounded-full text-[11px] text-white"
              style={{ background: client.profile ? 'oklch(0.42 0.11 155)' : ACCENT }}
            >
              1
            </span>
            <span>Research the website: product, pricing, customers, competitors, queries</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-5 place-items-center rounded-full bg-[#ece9e4] text-[11px] text-[#6f6b64]">2</span>
            <span>Press Find leads</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={host(client.website)}
            readOnly
            className="min-w-[200px] flex-1 rounded-[7px] border border-[#e3e0da] bg-[#faf9f7] px-3 py-[9px] font-mono text-[14px] text-[#1c1b19] outline-none"
          />
          <button
            onClick={research}
            disabled={running || busy}
            className="rounded-[7px] border-0 bg-[#1c1b19] px-4 py-[9px] text-[14px] text-white disabled:opacity-80"
          >
            {running ? 'Researching…' : r.status === 'done' ? 'Research again' : 'Research'}
          </button>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
          {STEPS.map((label, i) => {
            const done = r.status === 'done' || ((running || r.status === 'failed') && i < at);
            const active = running && i === at;
            const failed = r.status === 'failed' && i === at;
            const bar = done ? INK : active ? ACCENT : failed ? BAD : '#ece9e4';
            const detail = done ? 'done' : active ? r.detail || 'working…' : failed ? 'failed' : '—';
            return (
              <div key={label} className="flex flex-col gap-[5px]">
                <div className="h-[3px] rounded-[2px]" style={{ background: bar }} />
                <div className="text-[13px]" style={{ color: done || active || failed ? INK : '#9a968e' }}>
                  {label}
                </div>
                <div className="font-mono text-[12px] text-[#8a867f]">{detail}</div>
              </div>
            );
          })}
        </div>
        {running && (
          <div className="text-[12px] text-[#8a867f]">Deep research can take tens of minutes. This page checks every 5 s.</div>
        )}
        {client.profile && r.status === 'done' && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] bg-[oklch(0.95_0.04_155)] px-3 py-2.5 text-[13px] text-[oklch(0.4_0.11_155)]">
            <span>Profile stored. Lead runs for this client start from here; demo leads exist only for RowRun.</span>
            <button onClick={onDone} className="rounded-[6px] border-0 bg-[#1c1b19] px-3 py-[7px] text-[13px] text-white">
              Open Leads
            </button>
          </div>
        )}
        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] bg-[oklch(0.95_0.03_25)] px-3 py-2.5 text-[13px] text-[oklch(0.48_0.15_25)]">
            <span>{error}</span>
            <button
              onClick={research}
              disabled={running || busy}
              className="rounded-[6px] border-0 bg-[#1c1b19] px-3 py-[7px] text-[13px] text-white disabled:opacity-80"
            >
              Retry
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
