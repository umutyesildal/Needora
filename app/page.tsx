'use client';

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Client, ClientResponse, ClientsResponse, RunsResponse } from '@/lib/types';
import Sidebar, { VIEWS, type View } from '@/components/Sidebar';
import ClientSetup from '@/components/ClientSetup';
import LeadsView from '@/components/LeadsView';
import RunsView from '@/components/RunsView';
import ClientProfileView from '@/components/ClientProfileView';
import HowItWorksView from '@/components/HowItWorksView';
import SettingsView from '@/components/SettingsView';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Shell />
    </Suspense>
  );
}

const isRowRun = (c: Client) => c.website.includes('row.run') || c.name.toLowerCase() === 'rowrun';

function Shell() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const clientId = params.get('client');
  const viewParam = params.get('view') as View;
  const view: View = VIEWS.includes(viewParam) ? viewParam : 'leads';

  const [clients, setClients] = useState<ClientsResponse['clients'] | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [runs, setRuns] = useState<RunsResponse['runs']>([]);
  const [justReady, setJustReady] = useState<string | null>(null); // client whose research finished this session
  const [error, setError] = useState<string | null>(null);
  const current = useRef(clientId);
  useEffect(() => {
    current.current = clientId;
  }, [clientId]);

  // Patch ?client=&view=&run= (null removes a key); push keeps back/forward working.
  const go = useCallback(
    (patch: Record<string, string | null>, replace = false) => {
      const q = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(patch)) {
        if (v == null) q.delete(k);
        else q.set(k, v);
      }
      const url = `${pathname}?${q}`;
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [pathname, router],
  );

  const refresh = useCallback(async () => {
    try {
      const { clients } = await api<ClientsResponse>('/api/clients');
      setClients(clients);
      const id = clients.some((c) => c.id === clientId) ? clientId : (clients.find(isRowRun) ?? clients[0])?.id;
      if (!id) return setClient(null);
      if (id !== clientId) return go({ client: id, run: null }, true); // effect reruns with the new id
      const [c, r] = await Promise.all([
        api<ClientResponse>(`/api/clients/${id}`),
        api<RunsResponse>(`/api/runs?client_id=${encodeURIComponent(id)}`),
      ]);
      if (current.current !== id) return; // switched client while loading
      setClient((prev) => {
        if (prev?.id === id && !prev.profile && c.client.profile) setJustReady(id);
        return c.client;
      });
      setRuns(r.runs);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [clientId, go]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh only sets state after an await
    refresh();
  }, [refresh]);

  const shown = client && client.id === clientId ? client : null;
  const needsSetup = shown && (!shown.profile || justReady === shown.id) && (view === 'leads' || view === 'runs' || view === 'client');
  // Design: nav Leads count = leads in the run being shown (?run= or the latest).
  const runParam = Number(params.get('run'));
  const shownRun = runs.find((r) => r.id === runParam) ?? runs[0];

  let body: ReactNode;
  if (!shown) {
    body =
      clients && clients.length === 0 ? (
        <div className="rounded-[10px] border border-[#e3e0da] bg-white px-4 py-10 text-center text-[13px] text-[#8a867f]">
          No clients yet. Add one from the client menu in the sidebar.
        </div>
      ) : error ? null : (
        <div className="py-10 text-center text-[13px] text-[#8a867f]">Loading…</div>
      );
  } else if (needsSetup) {
    body = <ClientSetup key={shown.id} client={shown} onClientChanged={refresh} onDone={() => setJustReady(null)} />;
  } else if (view === 'leads') {
    body = <LeadsView key={shown.id} client={shown} onClientChanged={refresh} />;
  } else if (view === 'runs') {
    body = <RunsView key={shown.id} client={shown} onOpenRun={(id) => go({ view: 'leads', run: String(id) })} />;
  } else if (view === 'client') {
    body = <ClientProfileView key={shown.id} client={shown} onClientChanged={refresh} />;
  } else if (view === 'how') {
    body = <HowItWorksView />;
  } else {
    body = <SettingsView key={shown.id} client={shown} onClientChanged={refresh} />;
  }

  return (
    <div className="grid min-h-screen grid-cols-[216px_minmax(0,1fr)] bg-[#f5f4f1] text-[#1c1b19]">
      <Sidebar
        clients={clients}
        client={shown}
        leadCount={shown ? (shownRun?.counts.leads ?? 0) : null}
        runCount={shown ? runs.length : null}
        view={view}
        onView={(v) => {
          setJustReady(null);
          go({ view: v, run: null });
        }}
        onPick={(id) => go({ client: id, run: null })}
        onAdded={(id) => go({ client: id, view: 'leads', run: null })}
      />
      <main className="flex min-w-0 flex-col gap-5 px-7 pb-14 pt-6">
        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] bg-[oklch(0.95_0.03_25)] px-3 py-2.5 text-[13px] text-[oklch(0.48_0.15_25)]">
            <span>Could not load: {error}</span>
            <button onClick={refresh} className="rounded-[6px] border-0 bg-[#1c1b19] px-3 py-[7px] text-[13px] text-white">
              Retry
            </button>
          </div>
        )}
        {body}
      </main>
    </div>
  );
}
