'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { PLATFORMS, PLATFORM_LABEL, type Client, type ClientResponse, type Query } from '@/lib/types';

const MONO = "var(--font-geist-mono), 'Geist Mono', monospace";
const INK = '#1c1b19';
const ACCENT = 'oklch(0.56 0.2 27)';
const COMP = 'oklch(0.48 0.14 320)';
const card = { background: '#ffffff', border: '1px solid #e3e0da', borderRadius: 10 } as const;
const label = { fontSize: 11, color: '#8a867f', textTransform: 'uppercase', letterSpacing: '0.06em' } as const;
const rowLine = { fontSize: 13, padding: '6px 0', borderTop: '1px solid #f0eeea' } as const;
// Deep research reports two steps (spec: "Researching the web", "Structuring the profile").
const RESEARCH_STEPS = ['Researching the web', 'Structuring the profile'];

const host = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

export default function ClientProfileView({ client: initial, onClientChanged }: { client: Client; onClientChanged: () => void }) {
  const [client, setClient] = useState(initial);
  const [queries, setQueries] = useState<Query[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const notify = useRef(onClientChanged);
  useEffect(() => {
    notify.current = onClientChanged;
  });

  const [synced, setSynced] = useState(initial);
  if (synced !== initial) {
    setSynced(initial);
    setClient(initial);
  }

  // Load profile + latest queries; poll every 5 s while research runs, tell the parent when it ends.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    let wasRunning = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = () =>
      api<ClientResponse>(`/api/clients/${initial.id}`)
        .then((r) => {
          if (!alive) return;
          setClient(r.client);
          setQueries(r.latest_queries);
          if (r.client.research.status === 'running') {
            wasRunning = true;
            timer = setTimeout(load, 5000);
          } else if (wasRunning) notify.current();
        })
        .catch((e: Error) => alive && setError(e.message));
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [initial.id, tick]);

  async function research() {
    setStarting(true);
    setError(null);
    try {
      await api(`/api/clients/${client.id}/research`, { method: 'POST' });
      setClient((c) => ({ ...c, research: { status: 'running', step: RESEARCH_STEPS[0] } }));
      setTick((t) => t + 1);
      notify.current();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  const r = client.research;
  const running = r.status === 'running';
  const p = client.profile;
  const sourceLabel =
    client.profile_source === 'pdf' ? `${client.name}_Analysis.pdf`
    : client.profile_source === 'live' ? `Live research of ${host(client.website)}`
    : 'None yet';
  const activeIdx = Math.max(0, RESEARCH_STEPS.findIndex((s) => s.toLowerCase() === (r.step ?? '').toLowerCase()));
  const doneDetail = [
    'report ready',
    p ? `${p.pricing.length} plans · ${p.competitors.length} competitors` : 'done',
  ];
  const steps = RESEARCH_STEPS.map((labelText, i) => {
    const done = r.status === 'done' || (running && i < activeIdx);
    const active = running && i === activeIdx;
    const failed = r.status === 'failed' && i === activeIdx;
    return {
      labelText,
      detail: done ? doneDetail[i] : active ? r.detail || 'working…' : failed ? 'failed' : '—',
      bar: done ? INK : active ? ACCENT : failed ? 'oklch(0.48 0.15 25)' : '#ece9e4',
      fg: done || active || failed ? INK : '#9a968e',
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, color: INK }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Client profile</h1>
        <div style={{ fontSize: 13, color: '#6f6b64' }}>
          What the agent knows about {client.name}. Find leads writes its queries and messages from this profile.
        </div>
      </div>

      <section style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Research a website</div>
          <div style={{ fontSize: 12, color: '#6f6b64' }}>
            Current source: <span style={{ color: INK }}>{sourceLabel}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={host(client.website)}
            readOnly
            style={{
              flex: 1, minWidth: 200, padding: '9px 12px', border: '1px solid #e3e0da', borderRadius: 7, fontSize: 14,
              fontFamily: MONO, background: '#faf9f7', color: INK,
            }}
          />
          <button
            onClick={research}
            disabled={running || starting}
            style={{
              padding: '9px 16px', border: 0, borderRadius: 7, background: running || starting ? '#57534d' : INK, color: '#ffffff',
              fontSize: 14, cursor: running || starting ? 'default' : 'pointer',
            }}
          >
            {running ? 'Researching…' : r.status === 'done' || r.status === 'failed' ? 'Research again' : 'Research'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
          {steps.map((s) => (
            <div key={s.labelText} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ height: 3, borderRadius: 2, background: s.bar }} />
              <div style={{ fontSize: 13, color: s.fg }}>{s.labelText}</div>
              <div style={{ fontSize: 12, color: '#8a867f', fontFamily: MONO }}>{s.detail}</div>
            </div>
          ))}
        </div>
        {(r.status === 'failed' || error) && (
          <div style={{ fontSize: 13, color: 'oklch(0.48 0.15 25)', background: 'oklch(0.95 0.03 25)', borderRadius: 7, padding: '8px 12px' }}>
            {error ?? `Research failed: ${r.error ?? 'unknown reason'}`}
          </div>
        )}
      </section>

      {p ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
            <section style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={label}>Product</div>
              <div style={{ fontSize: 14, lineHeight: 1.55 }}>{p.product}</div>
              <div style={{ ...label, marginTop: 8 }}>Pricing</div>
              {p.pricing.map((pr) => (
                <div key={pr.plan} style={{ ...rowLine, display: 'grid', gridTemplateColumns: '90px 90px minmax(0,1fr)', gap: 8 }}>
                  <span style={{ fontWeight: 500 }}>{pr.plan}</span>
                  <span style={{ fontFamily: MONO }}>{pr.price}</span>
                  <span style={{ color: '#6f6b64' }}>{pr.note}</span>
                </div>
              ))}
            </section>
            <section style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={label}>Target customers</div>
              {p.targets.map((t) => <div key={t} style={rowLine}>{t}</div>)}
              <div style={{ ...label, marginTop: 8 }}>Pains</div>
              {p.pains.map((t) => <div key={t} style={rowLine}>{t}</div>)}
            </section>
          </div>

          <section style={{ ...card, overflow: 'hidden' }}>
            <div
              style={{
                padding: '14px 16px', borderBottom: '1px solid #ece9e4', display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline', gap: 10, flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600 }}>Competitors and weak spots</div>
              <div style={{ fontSize: 12, color: '#6f6b64' }}>Feeds the competitor complaint radar</div>
            </div>
            {p.competitors.map((c) => (
              <div
                key={c.name}
                style={{
                  display: 'grid', gridTemplateColumns: '100px minmax(0,1.3fr) minmax(0,1fr)', gap: 16, padding: '12px 16px',
                  borderBottom: '1px solid #f0eeea', fontSize: 13, alignItems: 'baseline',
                }}
              >
                <span style={{ fontWeight: 500, color: 'oklch(0.45 0.14 320)' }}>{c.name}</span>
                <span style={{ lineHeight: 1.45 }}>{c.weak_spots.join('; ')}</span>
                <span style={{ fontFamily: MONO, fontSize: 12, color: '#6f6b64' }}>{c.complaint_query}</span>
              </div>
            ))}
          </section>
        </>
      ) : (
        <section style={{ ...card, padding: 16, fontSize: 13, color: '#6f6b64' }}>
          No profile yet. Research the website to build one: product, pricing, customers, pains and competitors.
        </section>
      )}

      <section style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Search queries</div>
        {queries && queries.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PLATFORMS.flatMap((pl) => queries.filter((q) => q.platform === pl)).map((q, i) => (
              <span
                key={i}
                title={`${PLATFORM_LABEL[q.platform]} · ${q.kind === 'complaint' ? `Complaint query${q.competitor ? ` · ${q.competitor}` : ''}` : 'Need query'}`}
                style={{
                  padding: '5px 9px', borderRadius: 6, fontSize: 12, fontFamily: MONO,
                  background: q.kind === 'complaint' ? 'oklch(0.95 0.04 320)' : '#f2f0ec',
                  color: q.kind === 'complaint' ? COMP : INK,
                }}
              >
                {q.text}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#8a867f' }}>{queries ? 'No run yet' : 'Loading…'}</div>
        )}
      </section>
    </div>
  );
}
