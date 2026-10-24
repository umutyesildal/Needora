import 'server-only';
import { sql } from '@/lib/db';
import { NoProfileError, RunConflictError } from '@/lib/pipeline';
import type { LeadFilter, LeadWithMessage, LeadsResponse, Run, RunCounts } from '@/lib/types';

// Rows go through to_jsonb so bigint ids come back as numbers (neon returns raw bigint as strings).

const PAGE_SIZE = 50;

// SQL twins of isRelevant / isTop in lib/types.ts. Aliases: l = leads, c = clients, m = latest message.
const REL = `(l.score is not null and l.disqualified is not true and coalesce(l.category, '') not in ('Unrelated', 'Self-promo'))`;
const COND: Record<Exclude<keyof RunCounts, 'posts'>, string> = {
  leads: REL,
  // Same double and rounding as the UI's Math.round(score * 100): the JSON digits (score::text) as float8, then floor(x + 0.5).
  top: `(${REL} and floor(l.score::text::float8 * 100 + 0.5) >= coalesce((c.settings->>'threshold')::numeric, 50))`,
  complaints: `(${REL} and l.category = 'Competitor complaint')`,
  prepared: `m.status = 'prepared'`,
  awaiting: `m.status = 'awaiting'`,
  over_cap: `m.status = 'over_cap'`,
  failed: `m.status = 'failed'`,
};
const FILTER: Record<LeadFilter, string> = { all: COND.leads, top: COND.top, complaints: COND.complaints, prepared: COND.prepared, failed: COND.failed };
const COUNTS = sql.unsafe(
  `jsonb_build_object('posts', count(*)${Object.entries(COND).map(([k, w]) => `, '${k}', count(*) filter (where ${w})`).join('')})`,
);
export const ZERO_COUNTS: RunCounts = { posts: 0, leads: 0, top: 0, complaints: 0, prepared: 0, awaiting: 0, over_cap: 0, failed: 0 };

// Leads of a client (one run, or all runs when runId is null) joined with client settings and the latest message.
const fromLeads = (clientId: string, runId: number | string | null) => sql`
  from leads l
  join clients c on c.id = l.client_id
  left join lateral (select * from messages where lead_id = l.id order by created_at desc, id desc limit 1) m on true
  where l.client_id = ${clientId}::uuid and (${runId}::bigint is null or l.run_id = ${runId}::bigint)`;

// Counts per run id for a client's runs (or just runId).
export async function runCounts(clientId: string, runId: number | string | null = null): Promise<Record<string, RunCounts>> {
  const rows = await sql`select l.run_id, ${COUNTS} counts ${fromLeads(clientId, runId)} group by l.run_id`;
  return Object.fromEntries(rows.map((r) => [String(r.run_id), r.counts as RunCounts]));
}

export async function getRun(id: number): Promise<Run | null> {
  const [row] = await sql`select to_jsonb(r) run from runs r where id = ${id}`;
  return (row?.run as Run) ?? null;
}

// clientId (optional) scopes the lookup: another client's run counts as not found.
export async function getRunWithCounts(id: number, clientId: string | null = null) {
  const run = await getRun(id);
  if (!run || (clientId && run.client_id !== clientId)) return null;
  const counts = (await runCounts(run.client_id, id))[id] ?? ZERO_COUNTS;
  return { run, counts };
}

export async function listRuns(clientId: string) {
  const [rows, counts] = await Promise.all([
    sql`select to_jsonb(r) run from runs r where client_id = ${clientId}::uuid order by started_at desc, id desc`,
    runCounts(clientId),
  ]);
  return rows.map((r) => {
    const run = r.run as Run;
    return { ...run, counts: counts[run.id] ?? ZERO_COUNTS };
  });
}

// run: a run id, 'all', or null for the client's latest run. cursor: 'score:id' of the last row shown (keyset, so
// rescoring between pages does not shift rows). Returns a 404 message when the client or the run is unknown.
export async function listLeads(clientId: string, run: number | 'all' | null, filter: LeadFilter, cursor: string | null): Promise<LeadsResponse | string> {
  const runNum = typeof run === 'number' ? run : null;
  const [client] = await sql`
    select (select id from runs where client_id = c.id order by started_at desc, id desc limit 1) latest,
      (${runNum}::bigint is null or exists (select 1 from runs where id = ${runNum}::bigint and client_id = c.id)) run_ok
    from clients c where c.id = ${clientId}::uuid`;
  if (!client) return 'Client not found';
  if (!client.run_ok) return 'Run not found';
  const [cScore, cId] = cursor ? cursor.split(':') : [null, null];
  // No runs yet: latest is null, which matches all (zero) leads.
  const runId = run === 'all' ? null : (run ?? (client.latest as string | null));
  const [rows, byRun] = await Promise.all([
    sql`select to_jsonb(l) || jsonb_build_object('message', to_jsonb(m)) lead
      ${fromLeads(clientId, runId)} and ${sql.unsafe(FILTER[filter])}
        and (${cScore}::real is null or (coalesce(l.score, -1), -l.id) < (${cScore}::real, -${cId}::bigint))
      order by l.score desc nulls last, l.id limit ${PAGE_SIZE + 1}`,
    runCounts(clientId, runId),
  ]);
  const counts: Record<LeadFilter, number> = { all: 0, top: 0, complaints: 0, prepared: 0, failed: 0 };
  for (const c of Object.values(byRun)) {
    counts.all += c.leads;
    counts.top += c.top;
    counts.complaints += c.complaints;
    counts.prepared += c.prepared;
    counts.failed += c.failed;
  }
  const leads = rows.slice(0, PAGE_SIZE).map((r) => r.lead as LeadWithMessage);
  const last = leads.at(-1);
  return { leads, next_cursor: rows.length > PAGE_SIZE && last ? `${last.score ?? -1}:${last.id}` : null, counts };
}

// ---- route helpers ----
export const jsonError = (status: number, error: string) => Response.json({ error }, { status });

// Path ids: anything that is not a positive integer is an unknown id.
export const parseId = (id: string) => (/^\d+$/.test(id) && Number.isSafeInteger(Number(id)) ? Number(id) : null);

export const RUN_GOING = 'A run is already going for this client';
// User-facing texts for the pipeline's internal error messages.
const TEXT: Record<string, string> = {
  'a run is already going for this client': RUN_GOING,
  'this run is still running': 'This run is still running',
  'already prepared': 'This message is already prepared',
  'client has no profile yet': 'This client has no profile yet. Research the website first.',
};

export function errorResponse(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  // The partial unique index catches the start/retry races that the app-level checks miss.
  if ((e as { constraint?: string } | null)?.constraint === 'runs_one_running') return jsonError(409, RUN_GOING);
  if (e instanceof RunConflictError || msg === 'already prepared') return jsonError(409, TEXT[msg] ?? msg);
  if (e instanceof NoProfileError) return jsonError(422, TEXT[msg] ?? msg);
  console.error(e);
  return jsonError(500, 'Internal error');
}
