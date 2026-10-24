// Shared contract for Needora (spec 0001): DB row shapes, API response shapes, constants.
// Server code and UI both import from here. Keep it free of server-only imports.

export type Platform = 'reddit' | 'x' | 'linkedin';
export const PLATFORMS: Platform[] = ['reddit', 'x', 'linkedin'];
export const PLATFORM_LABEL: Record<Platform, string> = { reddit: 'Reddit', x: 'X', linkedin: 'LinkedIn' };

export type SendMode = 'auto' | 'review';
// Posting is not built yet: 'prepared' means "this is the message it would send".
export type MessageStatus = 'prepared' | 'awaiting' | 'over_cap' | 'failed';
export const MESSAGE_STATUS_LABEL: Record<MessageStatus, string> = {
  prepared: 'Prepared',
  awaiting: 'Needs approval',
  over_cap: 'Over cap',
  failed: 'Failed',
};
export type RunStatus = 'running' | 'done' | 'failed';
export type RunStep = 'queries' | 'scrape' | 'score' | 'complaints' | 'write' | 'post' | 'done';
export const RUN_STEPS: { step: Exclude<RunStep, 'done'>; label: string; via: string }[] = [
  { step: 'queries', label: 'Write queries', via: 'OpenAI' },
  { step: 'scrape', label: 'Scrape', via: 'Apify' },
  { step: 'score', label: 'Score', via: 'OpenAI' },
  { step: 'complaints', label: 'Flag complaints', via: 'OpenAI' },
  { step: 'write', label: 'Profile + write', via: 'Apify · OpenAI' },
  { step: 'post', label: 'Post', via: 'Prepared only' },
];
export type RunTrigger = 'manual' | 'scheduled' | 'demo';
export type Tone = 'funny' | 'serious' | 'urgent';
export type Icp = 'yes' | 'maybe' | 'no';
export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export const DAYS: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const CATEGORIES = [
  'Buying intent', 'Question', 'Pain point', 'Competitor complaint',
  'Competitor mention', 'Discussion', 'Self-promo', 'Unrelated',
] as const;
export type Category = (typeof CATEGORIES)[number];

// Scoring (AC-7). Each factor scaled to 0..1, weighted, times DISQUALIFIED_FACTOR when disqualified.
export const WEIGHTS = { fit: 0.3, intent: 0.25, icp: 0.2, buying_power: 0.15, reply_welcome: 0.1 } as const;
export const DISQUALIFIED_FACTOR = 0.2;
export const ICP_VALUE: Record<Icp, number> = { yes: 1, maybe: 0.5, no: 0 };

// Scrape volume (AC-4, AC-5).
export const NEED_QUERIES_PER_PLATFORM = 4;
export const COMPLAINT_QUERIES_PER_PLATFORM = 2;
export const POSTS_PER_QUERY = 25;
export const WINDOW_DAYS = 7;

export interface Competitor { name: string; weak_spots: string[]; complaint_query: string }
export interface ClientProfile {
  product: string;
  one_liner: string;
  pricing: { plan: string; price: string; note: string }[];
  targets: string[];
  pains: string[];
  use_cases: { name: string; url?: string }[];
  competitors: Competitor[];
  where_buyers_talk: string[];
}
export interface ClientSettings {
  send_mode: SendMode;
  send_cap: number | null; // null = no cap
  threshold: number; // 0..100, compared to score * 100
  platforms: Record<Platform, boolean>;
  schedule: { times: string[]; days: Day[]; tz: string }; // times as "HH:MM"
}
export interface ResearchState {
  status: 'idle' | 'running' | 'done' | 'failed';
  step?: string; // human label of the current research step
  detail?: string;
  response_id?: string;
  error?: string;
  updated_at?: string;
}
export interface Client {
  id: string;
  name: string;
  website: string;
  profile: ClientProfile | null;
  profile_source: 'pdf' | 'live' | null;
  research: ResearchState;
  settings: ClientSettings;
  created_at: string;
}

export interface Query { platform: Platform; text: string; kind: 'need' | 'complaint'; competitor: string | null }
export interface PlatformStat { status: 'pending' | 'running' | 'done' | 'failed'; posts: number; attempts: number; error: string | null }
export interface RunStats { platforms: Partial<Record<Platform, PlatformStat>>; send_cap?: number | null }
export interface LogLine { t: string; text: string } // t = ISO timestamp
export interface Run {
  id: number;
  client_id: string;
  trigger: RunTrigger;
  status: RunStatus;
  step: RunStep;
  queries: Query[];
  stats: RunStats;
  log: LogLine[];
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface BuyerProfile {
  signals: { label: string; evidence: string }[];
  power_estimate: string; // e.g. "Team plan, $200/mo"
  power_note: string;
  tone: Tone;
  tone_evidence: string;
  recent_posts: number;
}
export interface Lead {
  id: number;
  client_id: string;
  run_id: number;
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
  category: Category | null;
  fit: number | null;
  intent: number | null;
  buying_power: number | null;
  icp: Icp | null;
  reply_welcome: boolean | null;
  disqualified: boolean | null;
  competitor: string | null;
  need: string | null;
  evidence: string | null;
  score: number | null; // 0..1
  profile: BuyerProfile | null;
  scored_at: string | null;
  created_at: string;
}
export interface Message {
  id: number;
  lead_id: number;
  channel: 'reply' | 'dm';
  body: string;
  tone: Tone;
  angle: string | null; // competitor name for the switch angle
  link: string;
  status: MessageStatus;
  simulated: boolean;
  error: string | null;
  created_at: string;
  sent_at: string | null;
}
export interface LeadWithMessage extends Lead { message: Message | null } // latest message

// A "lead" (vs a scraped post) is a scored post that is relevant: not Unrelated, not Self-promo, not disqualified.
// A "top match" is a lead with score * 100 >= client.settings.threshold.
export interface RunCounts { posts: number; leads: number; top: number; complaints: number; prepared: number; awaiting: number; over_cap: number; failed: number }
export type LeadFilter = 'all' | 'top' | 'complaints' | 'prepared' | 'failed';

// ---- API response shapes (all errors: { error: string } with a 4xx/5xx status) ----
export interface ClientsResponse { clients: (Client & { lead_count: number })[] } // GET /api/clients
export interface ClientResponse { client: Client; latest_queries: Query[] } // GET /api/clients/:id
export interface CreatedClientResponse { id: string } // POST /api/clients (201)
export interface RunsResponse { runs: (Run & { counts: RunCounts })[] } // GET /api/runs?client_id=
export interface RunResponse { run: Run; counts: RunCounts } // GET /api/runs/:id
export interface StartRunResponse { run_id: number } // POST /api/runs (202), POST /api/demo (201)
export interface LeadsResponse { // GET /api/leads?client_id=&run_id=&filter=&cursor=
  leads: LeadWithMessage[]; // sorted by score desc, 50 per page
  next_cursor: string | null;
  counts: Record<LeadFilter, number>;
}
export interface MessageResponse { message: Message } // POST /api/messages/:id/send
export interface ApproveResponse { prepared: number } // POST /api/runs/:id/approve
export interface SettingsResponse { settings: ClientSettings } // PATCH /api/clients/:id/settings
export type RetryResponse = StartRunResponse; // POST /api/runs/:id/retry (202)
export type ResearchResponse = Record<string, never>; // POST /api/clients/:id/research (202, {})

// ---- display helpers (pure) ----
export const to100 = (v: number | null, max = 4) => (v == null ? null : Math.round((v / max) * 100));
export const scoreTo100 = (s: number | null) => (s == null ? null : Math.round(s * 100));
export function computeScore(l: Pick<Lead, 'fit' | 'intent' | 'icp' | 'buying_power' | 'reply_welcome' | 'disqualified'>): number {
  const raw =
    WEIGHTS.fit * ((l.fit ?? 0) / 4) +
    WEIGHTS.intent * ((l.intent ?? 0) / 4) +
    WEIGHTS.icp * ICP_VALUE[l.icp ?? 'no'] +
    WEIGHTS.buying_power * ((l.buying_power ?? 0) / 4) +
    WEIGHTS.reply_welcome * (l.reply_welcome ? 1 : 0);
  return Math.round(raw * (l.disqualified ? DISQUALIFIED_FACTOR : 1) * 100) / 100;
}
export const isRelevant = (l: Pick<Lead, 'category' | 'disqualified' | 'score'>) =>
  l.score != null && !l.disqualified && l.category !== 'Unrelated' && l.category !== 'Self-promo';
export const isTop = (l: Pick<Lead, 'category' | 'disqualified' | 'score'>, threshold: number) =>
  isRelevant(l) && Math.round((l.score ?? 0) * 100) >= threshold;
