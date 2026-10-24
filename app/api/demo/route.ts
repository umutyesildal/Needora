import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from '@/lib/db';
import { PLATFORMS, type Platform } from '@/lib/types';


const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEMO_SITE = 'https://row.run';
const FILE = 'data/rowrun/leads.json';

interface DemoLead {
  post_id: number; platform: string; source: string | null; created: string | null; category: string | null;
  score: number | null; fit: number | null; intent: number | null; icp: string | null; reply_welcome: boolean | null;
  title: string | null; url: string; excerpt: string; need: string | null; reply: string | null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const clientId = body && typeof body === 'object' ? (body as { client_id?: unknown }).client_id : undefined;
  if (typeof clientId !== 'string' || !UUID.test(clientId)) return Response.json({ error: 'client_id is required' }, { status: 422 });
  const [client] = await sql`select website from clients where id = ${clientId}`;
  if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });
  if (client.website !== DEMO_SITE) return Response.json({ error: 'Demo data exists only for RowRun' }, { status: 422 });
  const existing = await sql`select 1 from runs where client_id = ${clientId} and trigger = 'demo' limit 1`;
  if (existing.length) return Response.json({ error: 'Demo data is already loaded' }, { status: 409 });

  const raw: DemoLead[] = JSON.parse(await readFile(path.join(process.cwd(), FILE), 'utf8'));
  // twitter -> x; platforms we do not scrape (hackernews) are skipped.
  const leads = raw.flatMap((l) => {
    const platform = (l.platform === 'twitter' ? 'x' : l.platform) as Platform;
    if (!PLATFORMS.includes(platform) || !l.url || !l.excerpt) return [];
    return [{
      platform, external_id: `demo-${l.post_id}`, url: l.url, title: l.title, body: l.excerpt, posted_at: l.created,
      source: l.source, category: l.category, fit: l.fit, intent: l.intent, icp: l.icp, reply_welcome: l.reply_welcome,
      score: l.score, need: l.need, evidence: l.excerpt.split(/(?<=[.!?])\s/)[0], reply: l.reply?.trim() || null,
    }];
  });
  const replies = leads.filter((l) => l.reply).length;
  const t = new Date().toISOString();
  const log = [
    { t, text: `Loaded demo data from ${FILE}` },
    { t, text: `Imported ${leads.length} leads (${raw.length - leads.length} skipped)` },
    { t, text: `${replies} reply drafts imported as prepared messages` },
  ];

  // One statement, so the import is all or nothing.
  const [res] = await sql`
    with r as (
      insert into runs (client_id, trigger, status, step, queries, stats, log, finished_at)
      values (${clientId}, 'demo', 'done', 'done', '[]', '{"platforms":{}}', ${JSON.stringify(log)}::jsonb, now())
      returning id
    ), x as (
      select * from jsonb_to_recordset(${JSON.stringify(leads)}::jsonb) as x(
        platform text, external_id text, url text, title text, body text, posted_at timestamptz, source text,
        category text, fit smallint, intent smallint, icp text, reply_welcome boolean, score real, need text,
        evidence text, reply text)
    ), l as (
      insert into leads (client_id, run_id, platform, external_id, url, title, body, posted_at, source, category,
        fit, intent, icp, reply_welcome, disqualified, score, need, evidence, scored_at)
      select ${clientId}, r.id, x.platform, x.external_id, x.url, x.title, x.body, x.posted_at, x.source, x.category,
        x.fit, x.intent, x.icp, x.reply_welcome, false, x.score, x.need, x.evidence, now()
      from x cross join r
      on conflict (client_id, platform, external_id) do nothing
      returning id, external_id
    ), m as (
      insert into messages (lead_id, channel, body, tone, link, status)
      select l.id, 'reply', x.reply, 'serious', ${DEMO_SITE}, 'prepared' from l join x using (external_id)
      where x.reply is not null
      returning id
    )
    select (select id from r) as run_id`;
  return Response.json({ run_id: Number(res.run_id) }, { status: 201 });
}
