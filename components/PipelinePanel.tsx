'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { PLATFORMS, PLATFORM_LABEL, RUN_STEPS, type Run, type RunCounts } from '@/lib/types';
import { C, MONO, btnDark, errMsg } from '@/components/ui';

const BAD = 'oklch(0.48 0.15 25)';
type State = 'done' | 'active' | 'pending' | 'failed';

export const runTime = (iso: string) => {
  const d = new Date(iso);
  const hm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return d.toDateString() === new Date().toDateString() ? hm : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${hm}`;
};

function elapsed(from: string, at: string) {
  const s = Math.max(0, Math.floor((Date.parse(at) - Date.parse(from)) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function logColor(text: string) {
  if (/fail|error/i.test(text)) return C.bad;
  if (/complaint/i.test(text)) return C.comp;
  if (/approval|over cap|cap reached/i.test(text)) return 'oklch(0.5 0.1 65)';
  if (/complete|prepared|done/i.test(text)) return C.ok;
  return C.muted;
}

function details(run: Run, c: RunCounts, threshold: number): string[] {
  const complaintQ = run.queries.filter((q) => q.kind === 'complaint').length;
  const scrape = PLATFORMS.filter((p) => run.stats.platforms?.[p])
    .map((p) => {
      const s = run.stats.platforms[p]!;
      return `${PLATFORM_LABEL[p]} ${s.status === 'failed' ? 'failed' : s.status === 'done' ? s.posts : '…'}`;
    })
    .join(' · ');
  const messages = c.prepared + c.awaiting + c.over_cap + c.failed;
  return [
    `${run.queries.length} queries · ${complaintQ} complaint`,
    run.status === 'running' && run.step === 'scrape' ? scrape || 'starting…' : `${c.posts} posts · ${c.leads} leads`,
    `${c.top} ≥ ${threshold}`,
    `${c.complaints} complaints`,
    `${messages} profiles · messages`,
    `${c.prepared} prepared · ${c.failed} failed` + (c.awaiting ? ` · ${c.awaiting} waiting` : ''),
  ];
}

export default function PipelinePanel(props: { run: Run | null; counts: RunCounts | null; threshold: number; review: boolean; onChanged: () => void }) {
  const { run, counts } = props;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const logLen = run?.log.length ?? 0;
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [logLen]);

  const running = run?.status === 'running';
  const idx = run ? (run.step === 'done' ? RUN_STEPS.length : RUN_STEPS.findIndex((s) => s.step === run.step)) : -1;
  const failedPlatforms = PLATFORMS.filter((p) => run?.stats.platforms?.[p]?.status === 'failed');
  const det = run && counts ? details(run, counts, props.threshold) : [];

  const steps = RUN_STEPS.map((s, i) => {
    const state: State = !run
      ? 'pending'
      : (run.status === 'failed' && i === idx) || (s.step === 'scrape' && i < idx && failedPlatforms.length > 0)
        ? 'failed'
        : i < idx ? 'done' : i === idx && running ? 'active' : 'pending';
    return { ...s, state, detail: state === 'pending' ? '—' : state === 'active' && i !== 1 ? 'working…' : det[i] };
  });

  async function act(key: string, path: string, body?: object) {
    setBusy(key); setError(null);
    try { await api<unknown>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }); props.onChanged(); }
    catch (e) { setError(errMsg(e)); }
    finally { setBusy(null); }
  }

  const status = !run
    ? 'No run yet'
    : running
      ? `Step ${Math.min(idx + 1, 6)} of 6 · ${RUN_STEPS[Math.min(idx, 5)].label}`
      : run.status === 'failed'
        ? `Failed${run.error ? ` · ${run.error}` : ''}`
        : props.review && counts?.awaiting ? 'Waiting for approval' : 'Complete';

  return (
    <section style={{ background: '#ffffff', border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Pipeline</div>
          {run && <div style={{ fontSize: 12, color: '#8a867f', fontFamily: MONO }}>Run #{run.id} · {runTime(run.started_at)}</div>}
        </div>
        <div style={{ fontSize: 12, color: run?.status === 'failed' ? BAD : C.muted }}>{status}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
        {steps.map((s, i) => (
          <div key={s.step} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 3, borderRadius: 2, background: s.state === 'done' ? C.ink : s.state === 'active' ? C.accent : s.state === 'failed' ? C.bad : C.line2 }} />
            <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', fontSize: 13, color: s.state === 'pending' ? C.faint : s.state === 'failed' ? BAD : C.ink }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.faint }}>0{i + 1}</span>
              <span style={{ fontWeight: 500 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 12, color: C.muted, fontFamily: MONO }}>{s.detail}</div>
            <div style={{ fontSize: 11, color: C.faint }}>{s.via}</div>
          </div>
        ))}
      </div>

      {run && failedPlatforms.map((p) => (
        <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: 'oklch(0.95 0.03 25)', color: BAD, fontSize: 13, flexWrap: 'wrap' }}>
          <span>{PLATFORM_LABEL[p]} scrape failed{run.stats.platforms[p]!.error ? `: ${run.stats.platforms[p]!.error}` : ''}</span>
          <button disabled={running || busy != null} onClick={() => act(p, `/api/runs/${run.id}/retry`, { platform: p })} style={{ ...btnDark, padding: '7px 12px', borderRadius: 6, opacity: running || busy ? 0.6 : 1 }}>
            {busy === p ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      ))}

      {run && counts && !running && props.review && counts.awaiting > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: 'oklch(0.96 0.04 75)', color: 'oklch(0.42 0.1 65)', fontSize: 13, flexWrap: 'wrap' }}>
          <span>{counts.awaiting} {counts.awaiting === 1 ? 'message is' : 'messages are'} waiting for approval (review mode).</span>
          <button disabled={busy != null} onClick={() => act('approve', `/api/runs/${run.id}/approve`)} style={{ ...btnDark, padding: '7px 12px', borderRadius: 6, opacity: busy ? 0.6 : 1 }}>
            {busy === 'approve' ? 'Approving…' : 'Approve all'}
          </button>
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: BAD }}>{error}</div>}

      {run && (
        <div ref={logRef} style={{ background: '#faf9f7', border: `1px solid ${C.line2}`, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 3, fontFamily: MONO, fontSize: 12, boxSizing: 'content-box', minHeight: 126, maxHeight: 180, overflowY: 'auto' }}>
          {run.log.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, color: logColor(l.text) }}>
              <span style={{ color: '#b0aca4', flexShrink: 0 }}>{elapsed(run.started_at, l.t)}</span>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.text}>{l.text}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
