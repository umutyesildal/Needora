import 'server-only';
import { ApifyClient } from 'apify-client';
import { POSTS_PER_QUERY, WINDOW_DAYS, type Platform } from '@/lib/types';

export interface ScrapedPost {
  platform: Platform;
  external_id: string;
  url: string;
  author_handle: string | null;
  author_url: string | null;
  author_headline: string | null;
  source: string | null;
  title: string | null;
  body: string;
  posted_at: string | null;
  query: string | null;
}

const apify = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
const ACTORS: Record<Platform, string> = {
  reddit: process.env.APIFY_ACTOR_REDDIT || 'parsebird/reddit-search-scraper',
  x: process.env.APIFY_ACTOR_X || 'scrapersdelight/x-tweet-search-scraper',
  linkedin: process.env.APIFY_ACTOR_LINKEDIN || 'data_pool/linkedin-post-scraper',
};
// Per actor run. Reddit/X runs are one query each (10-60 s); a hung one is cut at 90 s and keeps its partial items.
const TIMEOUT_SECS: Record<Platform, number> = { reddit: 90, x: 90, linkedin: 150 };
// Apify free plan allows 5 concurrent actor runs account-wide; keep one slot spare.
const MAX_RUNS = 4;
// Reddit fans out one run per query: cap it so X and LinkedIn never wait behind it.
const REDDIT_RUNS = 2;
const LIMIT_RETRIES = 8;
const LIMIT_WAIT_MS = 15_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Item = Record<string, any>;

// ponytail: one in-process semaphore on globalThis (survives hot reload); needs a shared store if we ever run several server instances
const slots = ((globalThis as { __apifySlots2?: { active: number; reddit: number; queue: (() => void)[] } }).__apifySlots2 ??= {
  active: 0,
  reddit: 0,
  queue: [],
});
async function withSlot<T>(platform: Platform, fn: () => Promise<T>): Promise<T> {
  const r = platform === 'reddit';
  while (slots.active >= MAX_RUNS || (r && slots.reddit >= REDDIT_RUNS)) await new Promise<void>((res) => slots.queue.push(res));
  slots.active++;
  if (r) slots.reddit++;
  try {
    return await fn();
  } finally {
    slots.active--;
    if (r) slots.reddit--;
    // Wake everyone: a waiting Reddit run may still be over its cap and simply waits again.
    slots.queue.splice(0).forEach((res) => res());
  }
}

// `warn` collects notes about partial results (timed out, actor stopped early / skipped requests).
async function runActor(platform: Platform, input: object, warn?: string[]): Promise<Item[]> {
  const actor = ACTORS[platform];
  const secs = TIMEOUT_SECS[platform];
  for (let attempt = 1; ; attempt++) {
    try {
      const run = await withSlot(platform, () => apify.actor(actor).call(input, { waitSecs: secs, timeout: secs, log: null }));
      const ok = run.status === 'SUCCEEDED' || run.status === 'TIMED-OUT';
      const items = ok ? ((await apify.dataset(run.defaultDatasetId).listItems()).items as Item[]) : [];
      // A timed-out run keeps what it saved (partial items); only an empty or failed one is an error.
      if (!ok || (!items.length && run.status === 'TIMED-OUT')) throw new Error(`${run.status}: ${run.statusMessage || 'no message'}`);
      if (run.status === 'TIMED-OUT') warn?.push(`timed out after ${secs} s, kept ${items.length} posts`);
      else if (/skipped|stopped early/i.test(run.statusMessage ?? '')) warn?.push(run.statusMessage!);
      return items;
    } catch (e) {
      // "By launching this job you will exceed your limit of 5 concurrent Actor runs" (or the memory limit): wait and retry.
      if (attempt >= LIMIT_RETRIES || !/you will exceed/i.test(e instanceof Error ? e.message : String(e))) throw e;
      await new Promise((r) => setTimeout(r, LIMIT_WAIT_MS));
    }
  }
}

// Lone UTF-16 surrogates and control chars (except \n, \t) make OpenAI reject the request body ("failed to parse JSON value").
export const sanitize = (s: string) => s.toWellFormed().replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '');
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
// HTML entities as the platforms escape them (&amp; &#39; &#x200B;), LinkedIn's bare "amp;" artefact, zero-width chars.
const decode = (s: string) =>
  s
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, e: string) => {
      if (e[0] !== '#') return ENTITIES[e.toLowerCase()];
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1));
      return n <= 0x10ffff ? String.fromCodePoint(n) : '';
    })
    .replace(/(^|\s)amp;(?=\s)/g, '$1&')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '');
const str = (v: unknown) => (typeof v === 'string' ? sanitize(decode(v)).trim() || null : null);
// LinkedIn text sometimes holds the post several times (a truncated preview, then the full text): keep the longest copy.
const dedupeText = (s: string) => {
  const head = s.slice(0, 60);
  return head.length < 60 ? s : (head + s.split(head).reduce((a, b) => (b.length > a.length ? b : a), '')).trim();
};
const iso = (v: unknown) => {
  const t = typeof v === 'string' || typeof v === 'number' ? new Date(v).getTime() : NaN;
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};

function redditPost(i: Item, query: string): ScrapedPost {
  const author = str(i.author);
  const permalink = str(i.permalink);
  return {
    platform: 'reddit',
    external_id: String(i.id),
    url: permalink ? (permalink.startsWith('http') ? permalink : `https://www.reddit.com${permalink}`) : String(i.url),
    author_handle: author,
    author_url: author ? `https://www.reddit.com/user/${author}` : null,
    author_headline: null,
    source: str(i.subreddit) ? `r/${str(i.subreddit)!.replace(/^r\//, '')}` : null,
    title: str(i.title),
    // Title-only posts are common on Reddit; fall back to the title so the post is not lost.
    body: str(i.body) ?? str(i.title) ?? '',
    posted_at: iso(i.createdAt),
    query,
  };
}

function xPost(i: Item): ScrapedPost {
  const handle = str(i.authorHandle)?.replace(/^@/, '') ?? null;
  return {
    platform: 'x',
    external_id: String(i.id),
    url: str(i.url) ?? (handle ? `https://x.com/${handle}/status/${i.id}` : `https://x.com/i/status/${i.id}`),
    author_handle: handle,
    author_url: handle ? `https://x.com/${handle}` : null,
    author_headline: str(i.authorBio),
    source: 'X',
    title: null,
    body: str(i.text) ?? '',
    posted_at: iso(i.createdAt),
    query: str(i.searchTerm),
  };
}

function linkedinPost(i: Item): ScrapedPost {
  const a: Item = i.author ?? {};
  const profileUrl = str(a.profileUrl);
  return {
    platform: 'linkedin',
    external_id: String(i.postUrn),
    url: String(i.postUrl),
    // Stable identity for author dedupe (AC-11): the profile slug, not the display name (names collide).
    author_handle: profileUrl?.match(/linkedin\.com\/(?:in|company)\/([^/?#]+)/)?.[1] ?? str(a.name),
    author_url: str(a.profileUrl),
    author_headline: str(a.headline),
    source: 'LinkedIn',
    title: null,
    body: dedupeText(str(i.text) ?? ''),
    posted_at: iso(i.postedAtIso),
    query: str(i.matchedKeyword),
  };
}

// "r/sales", "reddit.com/r/n8n" -> "sales", "n8n"; non-subreddit entries ("X", "LinkedIn ...") are ignored.
export const subredditsOf = (where: string[] | null | undefined) => [
  ...new Set((where ?? []).map((w) => w.match(/(?:^|\/)r\/([A-Za-z0-9_]{2,21})/)?.[1]).filter((s): s is string => !!s)),
];

// All of Reddit, relevance sorted, last week. No subreddit list and no auto-discovery: the subreddit fan-out made most runs
// hang until timeout, and auto-discovery pulled in unrelated communities. Short keyword queries + relevance stay on topic.
const redditInput = (query: string, maxResults: number) => ({
  query,
  maxResults,
  sort: 'relevance',
  timeFilter: 'week',
  contentType: 'posts',
  autoDiscoverSubreddits: false,
});

export interface ScrapeResult {
  posts: ScrapedPost[];
  failed: number; // queries whose actor run failed
  notes: string[]; // why queries failed or came back partial
}

// Posts from the last WINDOW_DAYS days, up to POSTS_PER_QUERY per query, normalized, deduped.
// Reddit and X: one actor run per query (a slow or failed query costs only itself). Throws only when every query failed.
export async function scrapePlatform(platform: Platform, queries: string[]): Promise<ScrapeResult> {
  if (!queries.length) return { posts: [], failed: 0, notes: [] };
  const notes: string[] = [];
  let posts: ScrapedPost[];
  let failed = 0;
  if (platform === 'linkedin') {
    // maxItems is per keyword for this actor.
    const items = await runActor(
      'linkedin',
      { keywords: queries.map((q) => q.slice(0, 85)), maxItems: POSTS_PER_QUERY, sortBy: 'date_posted', datePosted: 'week' },
      notes,
    );
    posts = items.map(linkedinPost);
  } else {
    const runs = await Promise.allSettled(
      queries.map(async (q) => {
        const warn: string[] = [];
        const items =
          platform === 'reddit'
            ? (await runActor('reddit', redditInput(q, POSTS_PER_QUERY), warn)).map((i) => redditPost(i, q))
            : (await runActor('x', { searchTerms: [q], maxTweets: POSTS_PER_QUERY, maxTweetsPerTerm: POSTS_PER_QUERY, recency: 'week' }, warn)).map(
                (i) => ({ ...xPost(i), query: q }),
              );
        notes.push(...warn.map((w) => `"${q}": ${w}`));
        return items;
      }),
    );
    runs.forEach((r, n) => r.status === 'rejected' && notes.push(`"${queries[n]}" failed: ${r.reason instanceof Error ? r.reason.message : r.reason}`));
    const ok = runs.filter((r): r is PromiseFulfilledResult<ScrapedPost[]> => r.status === 'fulfilled');
    if (!ok.length) throw new Error(`all ${queries.length} queries failed: ${(runs[0] as PromiseRejectedResult).reason?.message ?? 'unknown'}`);
    posts = ok.flatMap((r) => r.value);
    failed = runs.length - ok.length;
  }
  const cutoff = Date.now() - WINDOW_DAYS * 864e5;
  const seen = new Set<string>();
  const perQuery = new Map<string, number>();
  posts = posts.filter((p) => {
    if (!p.body || !p.external_id || p.external_id === 'undefined' || seen.has(p.external_id)) return false;
    if (p.posted_at && new Date(p.posted_at).getTime() < cutoff) return false;
    const n = perQuery.get(p.query ?? '') ?? 0;
    if (n >= POSTS_PER_QUERY) return false; // actors overshoot their limits
    perQuery.set(p.query ?? '', n + 1);
    seen.add(p.external_id);
    return true;
  });
  return { posts, failed, notes };
}

// Quick look at what a Reddit query returns (used by the query-writing agent). Subreddits are no longer passed to the actor.
export async function previewReddit(query: string, n = 10, ...ignored: unknown[]): Promise<{ title: string; body: string }[]> {
  void ignored;
  const items = await runActor('reddit', redditInput(query, n));
  return items.map((i) => ({ title: str(i.title) ?? '', body: sanitize((str(i.body) ?? '').slice(0, 500)) }));
}

// Up to 10 recent post texts by the author. Only X: Reddit's author:<handle> works but takes ~36 s per author (probed),
// too slow for the write step; write.ts reuses the author's stored Reddit posts instead. Best effort, never throws.
export async function authorRecentPosts(platform: Platform, handle: string): Promise<string[]> {
  if (platform !== 'x' || !handle) return [];
  try {
    const items = await runActor('x', { searchTerms: [`from:${handle.replace(/^@/, '')}`], maxTweets: 10 });
    return items.map((i) => str(i.text)).filter((t): t is string => !!t).slice(0, 10);
  } catch (e) {
    console.warn(`[apify] recent posts of ${handle} failed:`, e instanceof Error ? e.message : e);
    return [];
  }
}
