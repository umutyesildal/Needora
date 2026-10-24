'use client';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PLATFORMS, PLATFORM_LABEL, RUN_STEPS, type Client, type LeadFilter, type LeadWithMessage, type LeadsResponse, type RunResponse, type RunsResponse, type StartRunResponse } from '@/lib/types';
import { localDayTime, nextRunAt } from '@/lib/schedule-time';
import LeadsTable from '@/components/LeadsTable';
import LeadDrawer from '@/components/LeadDrawer';
import PipelinePanel, { runTime } from '@/components/PipelinePanel';
import { C, MONO, Tab, errMsg } from '@/components/ui';

const FILTERS: [LeadFilter, string][] = [['all', 'All'], ['top', 'Top matches'], ['complaints', 'Complaints'], ['prepared', 'Prepared'], ['failed', 'Failed']];
const BAD = 'oklch(0.48 0.15 25)';

// Design: "today 09:00" / "tomorrow 09:00" / "mon 09:00"; null when nothing is scheduled.
function nextAuto(schedule: Client['settings']['schedule']) {
  const next = nextRunAt(schedule);
  if (!next) return null;
  const { day, time } = localDayTime(next, schedule.tz);
  const ms = next.getTime() - Date.now();
  const label = ms < 86_400_000 && localDayTime(new Date(), schedule.tz).day === day ? 'today'
    : ms < 2 * 86_400_000 && localDayTime(new Date(Date.now() + 86_400_000), schedule.tz).day === day ? 'tomorrow' : day;
  return `${label} ${time}`;
}

export default function LeadsView(props: { client: Client; onClientChanged: () => void }) {
  return (
    <Suspense fallback={null}>
      <WithRunParam {...props} />
    </Suspense>
  );
}

// remount (fresh state) when the client or ?run= changes
function WithRunParam(props: { client: Client; onClientChanged: () => void }) {
  const paramRun = Number(useSearchParams().get('run')) || null;
  return <Leads key={`${props.client.id}:${paramRun}`} {...props} paramRun={paramRun} />;
}

function Leads({ client, onClientChanged, paramRun }: { client: Client; onClientChanged: () => void; paramRun: number | null }) {
  const threshold = client.settings.threshold;

  const [runs, setRuns] = useState<RunsResponse['runs'] | null>(null);
  const [runId, setRunId] = useState<number | null>(null);
  const [runData, setRunData] = useState<RunResponse | null>(null);
  const [page, setPage] = useState<LeadsResponse | null>(null);
  const [filter, setFilter] = useState<LeadFilter>('all');
  const [selected, setSelected] = useState<LeadWithMessage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [demoHidden, setDemoHidden] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const seq = useRef(0);

  const loadRuns = useCallback(
    () => api<RunsResponse>(`/api/runs?client_id=${client.id}`).then((r) => { setRuns(r.runs); return r.runs; }),
    [client.id],
  );

  // pick the run to show: ?run= or the latest
  useEffect(() => {
    loadRuns().then((rs) => setRunId(paramRun ?? rs[0]?.id ?? null), (e) => setLoadError(errMsg(e)));
  }, [loadRuns, paramRun]);

  const leadsUrl = useCallback(
    (cursor?: string) => {
      const q = new URLSearchParams({ client_id: client.id, filter });
      if (runId != null) q.set('run_id', String(runId));
      if (cursor) q.set('cursor', cursor);
      return `/api/leads?${q}`;
    },
    [client.id, runId, filter],
  );

  const load = useCallback(() => {
    if (runId == null) return;
    const n = ++seq.current;
    Promise.all([api<RunResponse>(`/api/runs/${runId}`), api<LeadsResponse>(leadsUrl())]).then(
      ([r, l]) => {
        if (n !== seq.current) return;
        setRunData(r); setPage(l); setLoadError(null);
        setSelected((s) => (s ? l.leads.find((x) => x.id === s.id) ?? s : s));
      },
      (e) => { if (n === seq.current) setLoadError(errMsg(e)); },
    );
  }, [runId, leadsUrl]);

  useEffect(load, [load]);

  // poll every 2 s while the run is running, then once more
  const running = runData?.run.id === runId && runData?.run.status === 'running';
  const wasRunning = useRef(false);
  useEffect(() => {
    if (running) {
      wasRunning.current = true;
      const t = setInterval(load, 2000);
      return () => clearInterval(t);
    }
    if (wasRunning.current) {
      wasRunning.current = false;
      load();
      loadRuns().catch(() => {});
      onClientChanged();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, load]);

  async function findLeads() {
    setStarting(true); setActionError(null);
    try {
      const { run_id } = await api<StartRunResponse>('/api/runs', { method: 'POST', body: JSON.stringify({ client_id: client.id }) });
      setSelected(null); setFilter('all'); setRunId(run_id);
      loadRuns().catch(() => {});
    } catch (e) {
      setActionError(errMsg(e));
    } finally {
      setStarting(false);
    }
  }

  async function loadDemo() {
    setDemoBusy(true); setActionError(null);
    try {
      const { run_id } = await api<StartRunResponse>('/api/demo', { method: 'POST', body: JSON.stringify({ client_id: client.id }) });
      setSelected(null); setFilter('all'); setRunId(run_id);
      loadRuns().catch(() => {});
      onClientChanged();
    } catch (e) {
      setActionError(errMsg(e));
    } finally {
      setDemoHidden(true); setDemoBusy(false);
    }
  }

  async function loadMore() {
    if (!page?.next_cursor) return;
    setMoreBusy(true);
    const n = seq.current;
    try {
      const l = await api<LeadsResponse>(leadsUrl(page.next_cursor));
      if (n === seq.current) setPage((p) => (p ? { ...l, leads: [...p.leads, ...l.leads] } : l));
    } catch (e) {
      setLoadError(errMsg(e));
    } finally {
      setMoreBusy(false);
    }
  }

  const closeDrawer = useCallback(() => setSelected(null), []);

  const run = runData?.run.id === runId ? runData.run : null;
  const counts = run ? runData!.counts : null;
  const busy = running || starting;
  const isRowRun = /rowrun|row\.run/i.test(`${client.name} ${client.website}`);
  const showDemo = isRowRun && runs != null && !demoHidden && !runs.some((r) => r.trigger === 'demo');
  // same label as ClientProfileView
  const sourceLabel = client.profile_source === 'pdf' ? `${client.name}_Analysis.pdf`
    : client.profile_source === 'live' ? `Live research of ${client.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}` : 'None yet';
  const platforms = PLATFORMS.filter((p) => client.settings.platforms?.[p]).map((p) => PLATFORM_LABEL[p]);
  const platformText = platforms.length > 1 ? `${platforms.slice(0, -1).join(', ')} and ${platforms.at(-1)}` : platforms[0] ?? 'social media';
  const cap = run?.stats.send_cap ?? null;
  // while running, a tile shows '—' until its step is reached (design)
  const stepIdx = run ? (run.status === 'running' ? RUN_STEPS.findIndex((s) => s.step === run.step) : RUN_STEPS.length) : -1;
  const dash = (v: number | undefined, from = 0) => (v == null || stepIdx < from ? '—' : v);
  const stats = [
    { label: 'Posts scraped', value: dash(counts?.posts, 1), color: C.ink },
    { label: 'Leads', value: dash(counts?.leads), color: C.ink },
    { label: 'Top matches', value: dash(counts?.top, 2), color: C.accent },
    { label: 'Complaints', value: dash(counts?.complaints, 3), color: C.comp },
    { label: 'Prepared / cap', value: counts ? `${counts.prepared} / ${cap ?? 'no cap'}` : '—', color: C.ok },
    { label: 'Failed', value: dash(counts?.failed), color: counts?.failed ? C.bad : C.ink },
  ];
  const next = nextAuto(client.settings.schedule);
  const runMeta = runs == null ? 'Loading…' : !run ? (runId == null ? 'No runs yet' : 'Loading…') : running
    ? `Run #${run.id} in progress` + (run.trigger === 'scheduled' ? ' · scheduled' : '')
    : `${run.id === runs[0]?.id ? 'Last run' : 'Run'} #${run.id} · ${runTime(run.started_at)}` + (next ? ` · next auto ${next}` : '');
  const leads = (runId != null && page?.leads) || [];
  const emptyText = loadError
    ? `Could not load leads: ${loadError}`
    : runs == null || (runId != null && !page)
      ? 'Loading…'
      : runId == null
        ? 'No run yet. Press Find leads.'
        : running && (run?.step === 'queries' || run?.step === 'scrape')
          ? run.step === 'queries' ? 'Writing queries…' : 'Scraping posts…'
          : 'No leads in this filter.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{'@keyframes nd-pulse{0%,100%{opacity:1}50%{opacity:.3}}'}</style>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Leads</h1>
          <div style={{ fontSize: 13, color: C.muted }}>
            People on {platformText} asking for what {client.name} sells. Profile source: <span style={{ color: C.ink }}>{sourceLabel}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 12, color: '#8a867f', fontFamily: MONO }}>{runMeta}</div>
            {showDemo && (
              <button onClick={loadDemo} disabled={busy || demoBusy} style={{ padding: '10px 14px', border: `1px solid ${C.line}`, borderRadius: 8, background: '#ffffff', color: C.ink, fontSize: 14, cursor: busy || demoBusy ? 'default' : 'pointer' }}>
                {demoBusy ? 'Loading…' : 'Load demo data'}
              </button>
            )}
            <button onClick={findLeads} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', border: 0, borderRadius: 8, background: busy ? '#57534d' : C.accent, color: '#ffffff', fontSize: 14, fontWeight: 500, cursor: busy ? 'default' : 'pointer' }}>
              {busy && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ffffff', display: 'inline-block', animation: 'nd-pulse 1s infinite' }} />}
              <span>{busy ? 'Running…' : 'Find leads'}</span>
            </button>
          </div>
          {actionError && <div style={{ fontSize: 12, color: BAD }}>{actionError}</div>}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#ffffff', border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: C.muted }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', fontFamily: MONO, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <PipelinePanel run={run} counts={counts} threshold={threshold} review={((run?.stats as { send_mode?: string } | undefined)?.send_mode ?? client.settings.send_mode) === 'review'} onChanged={load} />

      <div style={{ display: 'grid', gridTemplateColumns: selected ? 'minmax(0,1fr) minmax(320px,420px)' : 'minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
        <section style={{ background: '#ffffff', border: `1px solid ${C.line}`, borderRadius: 10, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 4, padding: '10px 12px', borderBottom: `1px solid ${C.line2}`, flexWrap: 'wrap' }}>
            {FILTERS.map(([k, label]) => (
              <Tab key={k} label={label} count={page?.counts[k] ?? 0} active={filter === k} onClick={() => setFilter(k)} />
            ))}
          </div>
          {/* Prepared tab: the design's table, plus each message text it would send (user requirement) */}
          <LeadsTable leads={leads} threshold={threshold} selectedId={selected?.id ?? null} onSelect={setSelected} emptyText={emptyText} showMessage={filter === 'prepared'} />
          {page?.next_cursor && (
            <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
              <button onClick={loadMore} disabled={moreBusy} style={{ padding: '7px 14px', border: `1px solid ${C.line}`, borderRadius: 7, background: '#ffffff', color: C.ink, fontSize: 13, cursor: 'pointer' }}>
                {moreBusy ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </section>

        {selected && (
          <LeadDrawer
            key={selected.id}
            lead={selected}
            threshold={threshold}
            running={running}
            onClose={closeDrawer}
            onMessage={(m) => {
              setSelected((s) => (s && s.id === m.lead_id ? { ...s, message: m } : s));
              load();
            }}
          />
        )}
      </div>
    </div>
  );
}
