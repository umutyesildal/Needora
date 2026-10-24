'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Client, RunsResponse } from '@/lib/types';

const MONO = "var(--font-geist-mono), 'Geist Mono', monospace";
const SANS = "var(--font-geist-sans), 'Geist', sans-serif";
const COLS = '48px minmax(0,1.3fr) minmax(0,1fr) repeat(6,minmax(0,0.7fr))';
const TRIGGER = { manual: 'Manual', scheduled: 'Scheduled', demo: 'Demo' } as const;

// "Today 14:02", "Yesterday 18:00", else "Oct 22 10:22"
function when(iso: string) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86400000);
  if (days === 0) return 'Today ' + time;
  if (days === 1) return 'Yesterday ' + time;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + time;
}

export default function RunsView({ client, onOpenRun }: { client: Client; onOpenRun: (runId: number) => void }) {
  const [runs, setRuns] = useState<RunsResponse['runs'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = () =>
      api<RunsResponse>(`/api/runs?client_id=${client.id}`)
        .then((r) => {
          if (!alive) return;
          setRuns(r.runs);
          setError(null);
          if (r.runs.some((x) => x.status === 'running')) timer = setTimeout(load, 4000);
        })
        .catch((e: Error) => alive && setError(e.message));
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [client.id]);

  const right = { textAlign: 'right' } as const;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: '#1c1b19' }}>Runs</h1>
        <div style={{ fontSize: 13, color: '#6f6b64' }}>
          Every press of Find leads is stored as a search run with its queries, posts, scores and prepared messages.
        </div>
      </div>
      <section style={{ background: '#ffffff', border: '1px solid #e3e0da', borderRadius: 10, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid', gridTemplateColumns: COLS, gap: 8, padding: '10px 16px', fontSize: 11, color: '#8a867f',
            textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #ece9e4',
          }}
        >
          <span>Run</span><span>Started</span><span>Trigger</span><span style={right}>Queries</span><span style={right}>Posts</span>
          <span style={right}>Leads</span><span style={right}>Compl.</span><span style={right}>Prepared</span><span style={right}>Failed</span>
        </div>
        {runs?.map((r) => (
          <div
            key={r.id}
            onClick={() => onOpenRun(r.id)}
            className="hover:bg-[#faf9f6]"
            style={{
              display: 'grid', gridTemplateColumns: COLS, gap: 8, padding: '12px 16px', fontSize: 13, color: '#1c1b19',
              borderBottom: '1px solid #f0eeea', fontFamily: MONO, cursor: 'pointer',
            }}
          >
            <span>#{r.id}</span>
            <span style={{ fontFamily: SANS, color: '#6f6b64' }}>{when(r.started_at)}{r.status === 'running' ? ' · running' : ''}</span>
            <span style={{ fontFamily: SANS, color: r.trigger === 'scheduled' ? '#1c1b19' : '#6f6b64' }}>{TRIGGER[r.trigger]}</span>
            <span style={right}>{r.queries.length}</span>
            <span style={right}>{r.counts.posts}</span>
            <span style={right}>{r.counts.leads}</span>
            <span style={{ ...right, color: 'oklch(0.45 0.14 320)' }}>{r.counts.complaints}</span>
            <span style={{ ...right, color: 'oklch(0.45 0.11 155)' }}>{r.counts.prepared}</span>
            <span style={{ ...right, color: 'oklch(0.48 0.15 25)' }}>{r.counts.failed}</span>
          </div>
        ))}
        {(!runs || runs.length === 0) && (
          <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13, color: error ? 'oklch(0.48 0.15 25)' : '#8a867f' }}>
            {error ?? (runs ? 'No runs yet. Press Find leads to start the first one.' : 'Loading runs…')}
          </div>
        )}
      </section>
    </div>
  );
}
