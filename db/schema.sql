-- Needora schema (spec 0001). Idempotent: safe to run again.

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text not null unique,
  profile jsonb,
  profile_source text check (profile_source in ('pdf', 'live')),
  research jsonb not null default '{"status":"idle"}',
  settings jsonb not null default '{"send_mode":"auto","send_cap":null,"threshold":50,"platforms":{"reddit":true,"x":true,"linkedin":true},"schedule":{"times":[],"days":[],"tz":"Europe/Berlin"}}',
  created_at timestamptz not null default now()
);

create table if not exists runs (
  id bigint generated always as identity primary key,
  client_id uuid not null references clients(id) on delete cascade,
  trigger text not null check (trigger in ('manual', 'scheduled', 'demo')),
  status text not null default 'running' check (status in ('running', 'done', 'failed')),
  step text not null default 'queries' check (step in ('queries', 'scrape', 'score', 'complaints', 'write', 'post', 'done')),
  queries jsonb not null default '[]',
  stats jsonb not null default '{}',
  log jsonb not null default '[]',
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists runs_client_started on runs (client_id, started_at desc);
create unique index if not exists runs_one_running on runs (client_id) where status = 'running';

create table if not exists leads (
  id bigint generated always as identity primary key,
  client_id uuid not null references clients(id) on delete cascade,
  run_id bigint not null references runs(id) on delete cascade,
  platform text not null check (platform in ('reddit', 'x', 'linkedin')),
  external_id text not null,
  url text not null,
  author_handle text,
  author_url text,
  author_headline text,
  source text,
  title text,
  body text not null,
  posted_at timestamptz,
  query text,
  category text,
  fit smallint check (fit between 0 and 4),
  intent smallint check (intent between 0 and 4),
  buying_power smallint check (buying_power between 0 and 4),
  icp text check (icp in ('yes', 'maybe', 'no')),
  reply_welcome boolean,
  disqualified boolean,
  competitor text,
  need text,
  evidence text,
  score real check (score between 0 and 1),
  profile jsonb,
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  unique (client_id, platform, external_id)
);
create index if not exists leads_client_score on leads (client_id, score desc nulls last);
create index if not exists leads_run on leads (run_id);

create table if not exists messages (
  id bigint generated always as identity primary key,
  lead_id bigint not null references leads(id) on delete cascade,
  channel text not null check (channel in ('reply', 'dm')),
  body text not null,
  tone text not null check (tone in ('funny', 'serious', 'urgent')),
  angle text,
  link text not null,
  -- prepared = would be sent (posting is not built yet), awaiting = Review mode, waiting for approval
  status text not null check (status in ('prepared', 'awaiting', 'over_cap', 'failed')),
  simulated boolean not null default true,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists messages_lead on messages (lead_id, created_at desc);
