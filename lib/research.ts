import 'server-only';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { openai, MODELS, structured } from '@/lib/openai';
import type { ClientProfile, ResearchState } from '@/lib/types';

const POLL_MS = 10_000;
const MAX_MS = 45 * 60_000;

const ProfileSchema = z.object({
  product: z.string(),
  one_liner: z.string(),
  pricing: z.array(z.object({ plan: z.string(), price: z.string(), note: z.string() })),
  targets: z.array(z.string()),
  pains: z.array(z.string()),
  use_cases: z.array(z.object({ name: z.string(), url: z.string().nullable() })),
  competitors: z.array(z.object({ name: z.string(), weak_spots: z.array(z.string()), complaint_query: z.string() })),
  where_buyers_talk: z.array(z.string()),
});

const isRoot = (url: string, website: string) => {
  try {
    const u = new URL(url);
    return u.pathname.replace(/\/+$/, '') === '' && u.hostname.replace(/^www\./, '') === new URL(website).hostname.replace(/^www\./, '');
  } catch {
    return false;
  }
};

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function setResearch(clientId: string, r: ResearchState) {
  const state = JSON.stringify({ ...r, updated_at: new Date().toISOString() });
  await sql`update clients set research = ${state}::jsonb where id = ${clientId}`;
}

// Step and OpenAI response of a research in flight, so a failure records where it failed and a retry or
// resume can reuse the background response instead of paying for a new deep research.
interface Ctx { step: string; response_id?: string }

function launch(clientId: string, name: string, website: string, ctx: Ctx) {
  void research(clientId, name, website, ctx).catch((e) => {
    console.error(`research ${clientId} failed:`, msg(e));
    return setResearch(clientId, { status: 'failed', step: ctx.step, response_id: ctx.response_id, error: msg(e) })
      .catch((e2) => console.error(msg(e2)));
  });
}

// Sets research running and kicks off deep research in the background. A running state not updated
// for 10 min (server restarted mid research) counts as stale and may be restarted. After a failure (or a stale run)
// the previous response_id is kept, so a finished web report is reused.
export async function startResearch(clientId: string): Promise<void> {
  const state = JSON.stringify({
    status: 'running', step: 'Researching the web', detail: 'Starting deep research', updated_at: new Date().toISOString(),
  });
  const rows = await sql`update clients set research = ${state}::jsonb || jsonb_strip_nulls(jsonb_build_object('response_id',
      case when research->>'status' in ('failed', 'running') then research->'response_id' end))
    where id = ${clientId} and (research->>'status' is distinct from 'running'
      or coalesce((research->>'updated_at')::timestamptz, 'epoch') < now() - interval '10 minutes')
    returning name, website, research->>'response_id' as response_id`;
  if (!rows.length) {
    const exists = await sql`select 1 from clients where id = ${clientId}`;
    throw new Error(exists.length ? 'research running' : 'client not found');
  }
  const { name, website, response_id } = rows[0] as { name: string; website: string; response_id: string | null };
  launch(clientId, name, website, { step: 'Researching the web', response_id: response_id ?? undefined });
}

// Picks up research left 'running' by a stopped server (no update since `before`): resumes polling its background
// response, or marks it failed when no response was created yet.
export async function recoverResearch(before: Date): Promise<void> {
  const rows = (await sql`update clients set research = research || jsonb_build_object('updated_at', now())
    where research->>'status' = 'running' and coalesce((research->>'updated_at')::timestamptz, 'epoch') < ${before.toISOString()}
    returning id, name, website, research->>'response_id' as response_id, research->>'step' as step`) as
    { id: string; name: string; website: string; response_id: string | null; step: string | null }[];
  for (const c of rows) {
    if (c.response_id) {
      console.log(`research ${c.id}: resuming ${c.response_id}`);
      launch(c.id, c.name, c.website, { step: 'Researching the web', response_id: c.response_id });
    } else {
      await setResearch(c.id, {
        status: 'failed', step: c.step ?? 'Researching the web', error: 'Research was interrupted (server restarted)',
      }).catch((e) => console.error(msg(e)));
    }
  }
}

function brief(name: string, website: string) {
  return `Research the company "${name}" at ${website} thoroughly using the web. Start with their own site (home, pricing, product, use case and customer pages), then reviews, comparisons and community discussions. Report:
1. Product: what it is and does, plus a one line summary.
2. Pricing: every plan with its price and what it includes or limits.
3. Target customers: roles, company types and sizes that buy it.
4. Pains it solves, in the words customers use.
5. Use cases, with the page URL for each when one exists.
6. Competitors (direct and the tools buyers compare it with), and for each one its concrete weak spots that users complain about (price, reliability, complexity, missing features, support), with evidence.
7. Where its buyers talk online: specific subreddits, X topics or accounts, LinkedIn groups or topics, forums and communities.
Be specific and factual; cite sources; say "unknown" instead of guessing.`;
}

type OpenAIResponse = Awaited<ReturnType<typeof openai.responses.retrieve>>;

async function research(clientId: string, name: string, website: string, ctx: Ctx) {
  const input = brief(name, website);
  let note = '';
  // Reuse an earlier background response when it is still going or finished with a report.
  let r: OpenAIResponse | null = ctx.response_id ? await openai.responses.retrieve(ctx.response_id).catch(() => null) : null;
  const going = r?.status === 'queued' || r?.status === 'in_progress';
  if (r && !going && !((r.status === 'completed' || r.status === 'incomplete') && r.output_text?.trim())) r = null;
  if (!r) {
    ctx.response_id = undefined;
    try {
      r = await openai.responses.create({
        model: MODELS.research, background: true, tools: [{ type: 'web_search' }], max_tool_calls: 40, input,
      });
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (!(status === 400 || status === 404) || !/model/i.test(msg(e))) throw e;
      note = ` (model ${MODELS.research} rejected, used ${MODELS.smart} with web search)`;
      console.warn(`research ${clientId}: ${MODELS.research} rejected (${msg(e)}), falling back to ${MODELS.smart}`);
      await setResearch(clientId, { status: 'running', step: 'Researching the web', detail: `Researching the web${note}` });
      r = await openai.responses.create({ model: MODELS.smart, tools: [{ type: 'web_search' }], max_tool_calls: 40, input });
    }
  }
  ctx.response_id = r.id;

  const started = r.created_at ? r.created_at * 1000 : Date.now();
  while (r.status === 'queued' || r.status === 'in_progress') {
    if (Date.now() - started > MAX_MS) {
      await openai.responses.cancel(r.id).catch(() => {});
      throw new Error('Research timed out after 45 min');
    }
    const min = Math.floor((Date.now() - started) / 60_000);
    await setResearch(clientId, {
      status: 'running', step: 'Researching the web', detail: `Researching the web, ${min} min${note}`, response_id: r.id,
    });
    await new Promise((res) => setTimeout(res, POLL_MS));
    r = await openai.responses.retrieve(r.id);
  }
  const report = r.output_text?.trim();
  if (!report || (r.status !== 'completed' && r.status !== 'incomplete')) {
    throw new Error(r.error?.message ?? `Research ended with status ${r.status}${report ? '' : ' and no report'}`);
  }

  ctx.step = 'Structuring the profile';
  await setResearch(clientId, { status: 'running', step: 'Structuring the profile', detail: `Structuring the profile${note}`, response_id: r.id });
  const p = await structured({
    model: MODELS.smart,
    schema: ProfileSchema,
    name: 'client_profile',
    system: `You turn a research report about a company into its profile JSON for a lead finding tool.
- product: 2 to 4 sentences on what the product is, what it does, for whom and how it works (not just its name). one_liner: what it does in one sentence.
- pricing: each plan with price as written (e.g. "$49/mo") and a short note on limits or audience; [] if unknown.
- targets: buyer roles and company types. pains: problems it solves, short phrases in the customers' words.
- use_cases: name plus url only when the report cites a page specific to that use case; never the homepage; else null.
- competitors: up to 8, each with concrete weak_spots and a complaint_query: a short search phrase (3 to 6 words, under 60 characters, no quotes or operators) that finds posts of people complaining about that competitor, e.g. "Zapier too expensive".
- where_buyers_talk: communities, subreddits, hashtags or topic groups where buyers discuss the problem, such as "r/sales", "X: #RevOps", "LinkedIn: GTM engineers"; no individual people and not the company's own pages, events or channels.
Use only facts from the report. Write in English.`,
    user: `Company: ${name} (${website})\n\nResearch report:\n${report}`,
  });
  const profile: ClientProfile = {
    ...p,
    // A use case "page" that is just the site root is no page.
    use_cases: p.use_cases.map((u) => (u.url && !isRoot(u.url, website) ? { name: u.name, url: u.url } : { name: u.name })),
  };
  const done = JSON.stringify({
    status: 'done', step: 'Done', detail: `Profile ready${note}`, response_id: r.id, updated_at: new Date().toISOString(),
  });
  await sql`update clients set profile = ${JSON.stringify(profile)}::jsonb, profile_source = 'live', research = ${done}::jsonb
    where id = ${clientId}`;
}
