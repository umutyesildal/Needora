import 'server-only';
import { sql } from '@/lib/db';
import { scrapePlatform, type ScrapedPost } from '@/lib/apify';
import { send } from '@/lib/send';
import {
  PLATFORMS,
  PLATFORM_LABEL,
  type Client,
  type Message,
  type Platform,
  type PlatformStat,
  type Query,
  type Run,
  type RunStats,
  type RunStep,
} from '@/lib/types';
import { writeQueries } from './queries';
import { scoreLeads } from './score';
import { linkCount, websiteHost, writeMessages } from './write';
import { postMessages } from './post';

export class RunConflictError extends Error {}
export class NoProfileError extends Error {}
// ponytail: subclass so lib/queries.ts errorResponse already maps it to 422; give it its own branch there if the class names matter
export class InvalidMessageError extends NoProfileError {}

// The partial unique index runs_one_running (one running run per client) closes the race between two run starts.
const onRunConflict = (e: unknown): never => {
  const err = e as { code?: string; constraint?: string; message?: string };
  if (err?.code === '23505' && /runs_one_running/.test(`${err.constraint ?? ''} ${err.message ?? ''}`))
    throw new RunConflictError('a run is already going for this client');
  throw e;
};

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

function log(runId: number, text: string) {
  console.log(`[run ${runId}] ${text}`);
  return sql`update runs set log = log || ${JSON.stringify([{ t: new Date().toISOString(), text }])}::jsonb where id = ${runId}`;
}
const setStep = (runId: number, step: RunStep) => sql`update runs set step = ${step} where id = ${runId}`;
const setStat = (runId: number, platform: Platform, stat: PlatformStat) =>
  sql`update runs set stats = jsonb_set(stats, array['platforms', ${platform}]::text[], ${JSON.stringify(stat)}::jsonb) where id = ${runId}`;

async function loadClient(clientId: string) {
  const [client] = await sql`select * from clients where id = ${clientId}`;
  if (!client) throw new Error('client not found');
  return client as Client;
}

async function fail(runId: number, e: unknown) {
  const error = errText(e);
  console.error(`[run ${runId}] failed:`, e);
  await sql`update runs set status = 'failed', error = ${error}, finished_at = now() where id = ${runId}`;
  await log(runId, `Run failed: ${error}`);
}

// Inserts new posts; returns ids of rows actually inserted (posts already stored for this client are skipped, AC-5).
async function insertPosts(runId: number, clientId: string, posts: ScrapedPost[]): Promise<number[]> {
  const unique = [...new Map(posts.map((p) => [`${p.platform}:${p.external_id}`, p])).values()];
  if (!unique.length) return [];
  const rows = await sql`
    insert into leads (client_id, run_id, platform, external_id, url, author_handle, author_url, author_headline, source, title, body, posted_at, query)
    select ${clientId}, ${runId}, p.platform, p.external_id, p.url, p.author_handle, p.author_url, p.author_headline, p.source, p.title, p.body, p.posted_at, p.query
    from jsonb_to_recordset(${JSON.stringify(unique)}::jsonb) as p(
      platform text, external_id text, url text, author_handle text, author_url text, author_headline text,
      source text, title text, body text, posted_at timestamptz, query text)
    on conflict (client_id, platform, external_id) do nothing
    returning id`;
  return rows.map((r) => Number(r.id));
}

// Scrape one platform, retrying once (AC-6). Never throws: a failed platform is recorded and the run goes on.
async function scrapeOne(runId: number, client: Client, platform: Platform, queries: Query[], priorAttempts = 0) {
  const texts = queries.filter((q) => q.platform === platform).map((q) => q.text);
  const label = PLATFORM_LABEL[platform];
  let error = '';
  for (let attempt = priorAttempts + 1; attempt <= priorAttempts + 2; attempt++) {
    try {
      await setStat(runId, platform, { status: 'running', posts: 0, attempts: attempt, error: null });
      const { posts, failed, notes } = await scrapePlatform(platform, texts);
      const ids = await insertPosts(runId, client.id, posts);
      await setStat(runId, platform, { status: 'done', posts: posts.length, attempts: attempt, error: null, ...{ failed_queries: failed } });
      await log(runId, `${label}: ${posts.length} posts scraped, ${ids.length} new`);
      if (notes.length)
        await log(runId, `${label} warning: ${failed} of ${texts.length} queries failed; ${notes.join('; ')}`.slice(0, 1000));
      return ids;
    } catch (e) {
      error = errText(e);
      await log(runId, `${label}: scrape failed (attempt ${attempt}): ${error}`).catch(() => {});
    }
  }
  await setStat(runId, platform, { status: 'failed', posts: 0, attempts: priorAttempts + 2, error }).catch(() => {});
  return [];
}

// Steps 3-6 for the given new leads, then the run is done.
async function processLeads(runId: number, client: Client, leadIds: number[], sendCap: number | null) {
  await setStep(runId, 'score');
  const s = await scoreLeads(client, leadIds);
  if (s.scored === 0 && s.failed > 0) throw new Error(`scoring failed: ${s.error}`);
  await log(runId, `Scored ${s.scored} new posts${s.failed ? ` (${s.failed} failed: ${s.error})` : ''}`);

  await setStep(runId, 'complaints');
  const ids = leadIds.map(String);
  const complaints = await sql`
    select coalesce(competitor, 'other') as name, count(*)::int as n from leads
    where id = any(${ids}::bigint[])
      and category = 'Competitor complaint'
    group by 1 order by 2 desc`;
  const total = complaints.reduce((a, c) => a + c.n, 0);
  await log(runId, `${total} complaints${total ? `: ${complaints.map((c) => `${c.name} ${c.n}`).join(', ')}` : ''}`);

  await setStep(runId, 'write');
  const w = await writeMessages(client, leadIds);
  await log(
    runId,
    `${w.top} top matches; ${w.written} profiles + messages written` +
      (w.skipped ? `, ${w.skipped} skipped (author already messaged)` : '') +
      (w.failed ? `, ${w.failed} failed` : ''),
  );

  await setStep(runId, 'post');
  const p = await postMessages(client, runId, sendCap);
  await log(
    runId,
    client.settings.send_mode === 'review'
      ? `Review mode: ${p.awaiting} messages awaiting approval`
      : `Prepared ${p.prepared} / over cap ${p.overCap}`,
  );

  await sql`update runs set status = 'done', step = 'done', error = null, finished_at = now() where id = ${runId}`;
  await log(runId, 'Run done');
}

async function runPipeline(runId: number, client: Client, platforms: Platform[]) {
  try {
    await log(runId, `Run started for ${client.name}: ${platforms.map((p) => PLATFORM_LABEL[p]).join(', ') || 'no platforms enabled'}`);
    const queries = await writeQueries(client, platforms, (text) => log(runId, text));
    await sql`update runs set queries = ${JSON.stringify(queries)}::jsonb where id = ${runId}`;
    await log(runId, `${queries.length} queries saved`);

    await setStep(runId, 'scrape');
    const ids = (await Promise.all(platforms.map((p) => scrapeOne(runId, client, p, queries)))).flat();
    await log(runId, `${ids.length} new posts in total`);

    await processLeads(runId, client, ids, client.settings.send_cap ?? null);
  } catch (e) {
    await fail(runId, e).catch((e2) => console.error(`[run ${runId}] could not save failure:`, e2));
  }
}

export async function startRun(clientId: string, trigger: 'manual' | 'scheduled'): Promise<number> {
  const client = await loadClient(clientId);
  if (!client.profile) throw new NoProfileError('client has no profile yet');
  await sql`
    update runs set status = 'failed', error = 'stale: running for more than 30 minutes', finished_at = now()
    where client_id = ${clientId} and status = 'running' and started_at < now() - interval '30 minutes'`;

  const platforms = PLATFORMS.filter((p) => client.settings.platforms?.[p]);
  const stats: RunStats = {
    platforms: Object.fromEntries(platforms.map((p) => [p, { status: 'pending', posts: 0, attempts: 0, error: null }])),
    send_cap: client.settings.send_cap ?? null,
  };
  // ponytail: check-and-insert in one statement; a partial unique index on (client_id) where status='running' would close the last race
  const rows = await sql`
    insert into runs (client_id, trigger, stats)
    select ${clientId}, ${trigger}, ${JSON.stringify(stats)}::jsonb
    where not exists (select 1 from runs where client_id = ${clientId} and status = 'running')
    returning id`.catch(onRunConflict);
  if (!rows.length) throw new RunConflictError('a run is already going for this client');
  const runId = Number(rows[0].id);
  void runPipeline(runId, client, platforms);
  return runId;
}

export async function retryPlatform(runId: number, platform: Platform): Promise<void> {
  const [run] = (await sql`select * from runs where id = ${runId}`) as Run[];
  if (!run) throw new Error('run not found');
  if (run.status === 'running') throw new RunConflictError('this run is still running');
  const prev = run.stats?.platforms?.[platform];
  if (prev?.status !== 'failed') throw new Error(`${PLATFORM_LABEL[platform] ?? platform} did not fail in this run`);
  const client = await loadClient(run.client_id);
  const claimed = await sql`
    update runs set status = 'running', step = 'scrape', error = null, finished_at = null
    where id = ${runId} and status <> 'running' returning id`.catch(onRunConflict);
  if (!claimed.length) throw new RunConflictError('this run is still running');

  void (async () => {
    try {
      await log(runId, `Retrying ${PLATFORM_LABEL[platform]}`);
      const ids = await scrapeOne(runId, client, platform, run.queries, prev.attempts);
      await processLeads(runId, client, ids, run.stats.send_cap ?? null);
    } catch (e) {
      await fail(runId, e).catch((e2) => console.error(`[run ${runId}] could not save failure:`, e2));
    }
  })();
}

// Approve one message (drawer). A failed one is prepared only when its body passes the checks write.ts applies.
export async function approveMessage(messageId: number): Promise<Message> {
  const [m] = await sql`
    select m.status, m.body, c.website, r.status as run_status from messages m
    join leads l on l.id = m.lead_id join clients c on c.id = l.client_id join runs r on r.id = l.run_id
    where m.id = ${messageId}`;
  if (!m) throw new Error('message not found');
  if (m.status === 'prepared') throw new Error('already prepared');
  if (m.run_status === 'running') throw new RunConflictError('run still running');
  if (m.status === 'failed') {
    const invalid = !String(m.body).trim()
      ? 'cannot approve: the message body is empty'
      : linkCount(m.body, websiteHost(m.website)) !== 1
        ? `cannot approve: link check failed (${m.website} must appear exactly once)`
        : null;
    if (invalid) {
      await sql`update messages set error = ${invalid} where id = ${messageId} and status = 'failed'`;
      throw new InvalidMessageError(invalid);
    }
  }
  const sent = await send(messageId, ['awaiting', 'over_cap', 'failed'], true);
  if (!sent) throw new Error('already prepared');
  return sent;
}

// Approve all awaiting messages of a finished run, best score first. Each is claimed atomically, so concurrent calls count it once.
export async function approveRun(runId: number): Promise<number> {
  const [run] = await sql`select status from runs where id = ${runId}`;
  if (run?.status === 'running') throw new RunConflictError('run still running');
  const msgs = await sql`
    select m.id from messages m join leads l on l.id = m.lead_id
    where l.run_id = ${runId} and m.status = 'awaiting'
    order by l.score desc nulls last, m.id`;
  let prepared = 0;
  for (const m of msgs) if (await send(Number(m.id), ['awaiting'], true)) prepared++;
  return prepared;
}
