// Import Eduard's icp-scout RowRun data (data/rowrun/*.json) into Neon as one 'demo' run for RowRun.
// Run: node --env-file=.env.local scripts/import-icp-scout.mjs   (refuses if RowRun already has a demo run)
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const read = f => JSON.parse(readFileSync(new URL(`../data/rowrun/${f}`, import.meta.url)));
const posts = read('posts.json');
const leads = new Map(read('leads.json').map(l => [l.post_id, l]));
const [meta] = read('run.json');

const PLATFORM = { reddit: 'reddit', twitter: 'x', linkedin: 'linkedin' }; // hackernews is not a Needora platform
const [client] = await sql`select id from clients where website = 'https://row.run'`;
if (!client) throw new Error('RowRun client missing: run npm run db:setup first');
const [existing] = await sql`select id from runs where client_id = ${client.id} and trigger = 'demo'`;
if (existing) { console.log(`RowRun already has demo run #${existing.id}, nothing to do`); process.exit(0); }

const kept = posts.filter(p => PLATFORM[p.platform]);
const skipped = posts.length - kept.length;
const queries = [...new Map(kept.filter(p => p.query).map(p => [`${p.platform}|${p.query}`,
  { platform: PLATFORM[p.platform], text: p.query, kind: 'need', competitor: null }])).values()];
const perPlatform = {};
for (const p of kept) {
  const k = PLATFORM[p.platform];
  perPlatform[k] ??= { status: 'done', posts: 0, attempts: 1, error: null };
  perPlatform[k].posts++;
}
const t = meta.exported_at;
const log = [
  { t, text: `Imported from icp-scout (${meta.judge_model} judge): ${posts.length} screened posts, ${leads.size} leads` },
  { t, text: `Kept ${kept.length} Reddit, X and LinkedIn posts; skipped ${skipped} Hacker News posts` },
];

const [run] = await sql`
  insert into runs (client_id, trigger, status, step, queries, stats, log, started_at, finished_at)
  values (${client.id}, 'demo', 'done', 'done', ${JSON.stringify(queries)}, ${JSON.stringify({ platforms: perPlatform, send_cap: null })},
          ${JSON.stringify(log)}, ${t}, ${t})
  returning id`;

// Platform-native ids, so live runs dedupe against imported posts (AC-5). 'icp-<n>' only when there is no URL.
const nativeId = url => {
  const reddit = url?.match(/\/comments\/(\w+)/)?.[1];
  return reddit ? 't3_' + reddit : url?.match(/\/status\/(\d+)/)?.[1] ?? url?.match(/urn:li:\w+:\d+/)?.[0];
};
// Blank (incl. zero-width) replies are skipped; one without the client link is imported for review, not as prepared.
const blank = r => !r?.replace(/[\s\u200b-\u200d\ufeff]/g, '');

let inserted = 0, messages = 0, unlinked = 0;
for (const p of kept) {
  const l = leads.get(p.post_id);
  const [row] = await sql`
    insert into leads (client_id, run_id, platform, external_id, url, source, title, body, posted_at, query,
                       category, fit, intent, icp, reply_welcome, disqualified, need, evidence, score, scored_at)
    values (${client.id}, ${run.id}, ${PLATFORM[p.platform]}, ${nativeId(l?.url) ?? 'icp-' + p.post_id}, ${l?.url ?? ''}, ${p.source},
            ${l?.title ?? null}, ${l?.excerpt ?? `(icp-scout kept no text for this post: ${p.verdict})`}, ${p.created}, ${p.query},
            ${p.category}, ${p.fit}, ${p.intent}, ${p.icp}, ${p.reply_welcome}, ${!p.match || !!p.disqualified},
            ${l?.need ?? null}, ${l?.excerpt?.split(/(?<=[.!?])\s/)[0] ?? null}, ${l ? p.score : null}, ${t})
    on conflict (client_id, platform, external_id) do nothing
    returning id`;
  if (!row) continue;
  inserted++;
  if (!blank(l?.reply)) {
    const reply = l.reply.trim(), linked = reply.includes('row.run');
    if (!linked) unlinked++;
    await sql`insert into messages (lead_id, channel, body, tone, link, status, simulated, error)
              values (${row.id}, 'reply', ${reply}, 'serious', 'https://row.run', ${linked ? 'prepared' : 'awaiting'}, true,
                      ${linked ? null : 'imported draft: missing link'})`;
    messages++;
  }
}
console.log(`Run #${run.id}: ${inserted} posts, ${messages} replies (${unlinked} without the link kept as awaiting), ${skipped} Hacker News posts skipped`);
