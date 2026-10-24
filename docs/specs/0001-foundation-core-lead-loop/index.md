# 0001. Needora foundation and the full lead loop

**Date**: 2026-10-24
**Status**: In Progress

## Summary

This spec decides the stack and builds the whole Needora product in one go: a Next.js app on your laptop, a Neon database, Apify for scraping and OpenAI for every judgment. One press of Find leads writes search queries (including complaints about the client's competitors), scrapes Reddit, X and LinkedIn, scores every post, builds a buyer profile for the best ones, writes a message in their tone and "posts" it. Posting is simulated for now: the full message is produced and marked sent, and real posting comes later in spec 2. New clients are added on the site and researched deeply on the web; RowRun is seeded from the PDF so the demo never waits on research.

> ⚠️ Premise note: you chose the full design, deep research, scheduled runs and review mode in this one spec, with about 75 minutes of build time left. That is very likely more than fits. The build plan is ordered so the app is demoable after milestone 2 (the thin thread); everything after that thickens it. If time runs out, cut from the end of the plan, never from the middle. Reasoning and options: see [rationale.md](rationale.md).

## Requirements

**User stories**:
- As the person running Needora for a client, I want to press Find leads and see who on Reddit, X and LinkedIn is asking for what the client sells, ranked, so I know who to talk to.
- As that person, I want every top match to come with a buyer profile and a ready message in their tone, so outreach is one click (or none, in Auto mode).
- As that person, I want to add a new client by name and website and have the agent research it deeply, so the next client needs no PDF.
- As the demo presenter, I want RowRun preloaded and a demo data fallback, so the demo never shows an empty screen.

**Acceptance criteria**:
- **AC-1**: After setup, RowRun exists as a client with a profile seeded from `~/Downloads/RowRun_Analysis.pdf` (product, pricing, target customers, pains, use cases, competitors with weak spots), profile source `pdf`, and the dashboard opens on it.
- **AC-2**: Add client (name + website) creates the client and starts a deep web research run in the background. The dashboard shows the research steps while it runs. When done, the client profile page shows product, pricing, target customers, pains, competitors with weak spots and complaint queries, with source `live`. A failed research shows the reason and a retry button. Research a website on the profile page reruns it for an existing client.
- **AC-3**: Find leads starts a run (the request returns at once), and the dashboard shows the pipeline live: the 6 steps (Write queries, Scrape, Score, Flag complaints, Profile + write, Post) with their status, detail and log lines, until the run is done. A second Find leads for the same client while a run is going is refused with a clear message.
- **AC-4**: The query step writes 6 queries per enabled platform: 4 need queries ("anyone know a tool that…") and 2 competitor complaint queries naming competitors from the client profile. They are stored on the run and shown on the profile page.
- **AC-5**: The enabled platforms are scraped in parallel for posts from the last 7 days, up to 25 posts per query. Each post is stored once per client; a post already stored in an earlier run is not scored or messaged again.
- **AC-6**: A platform whose scrape fails is retried once automatically. If it still fails, the run continues with the other platforms, the pipeline shows that platform as failed with the reason, and a Retry button reruns only that platform through the rest of the pipeline.
- **AC-7**: Every new post gets fit (0 to 4), intent (0 to 4), ICP (yes, maybe, no), reply welcome (yes or no), buying power (0 to 4), a category, the author's need in one sentence and the quote that shows it. Score = 0.30 fit + 0.25 intent + 0.20 ICP + 0.15 buying power + 0.10 reply welcome, each scaled to 0 to 1 (ICP yes 1, maybe 0.5, no 0), multiplied by 0.2 when the author is a vendor, a job ad or a content drop. Intent, Power and Score show as 0 to 100.
- **AC-8**: A post that complains about one of the client's competitors gets the category Competitor complaint and the competitor's name. The Complaints tab and the Competitor column show it, and the drawer shows "Complaint about <competitor>".
- **AC-9**: For every top match (score at or above the client's threshold and not disqualified), the author's recent posts are fetched where the platform allows it, and the agent builds a buyer profile: intent signals each with a quoted piece of evidence, a buying power estimate with a short note, and the detected tone (funny, serious or urgent) with evidence.
- **AC-10**: Every top match gets one message in the detected tone. It is a reply under the post when a reply is welcome or the author has no handle, otherwise a DM. It contains the client's website link exactly once. A reply does not say who writes it; a DM says we work together with the client. A message to a competitor complaint uses the switch angle (why the client fits better than that competitor).
- **AC-11**: The same author (platform + handle) gets at most one message per client, across all runs.
- **AC-12**: Posting is simulated. In Auto mode, messages are marked sent (simulated), highest score first, until the send cap; the rest are marked over cap. The default is no cap. In Review mode, messages wait; Approve and send (one) and Approve all and send (the run) mark them sent. A failed send stores the reason and can be retried.
- **AC-13**: The Leads view shows the stat tiles (Posts scraped, Leads, Top matches, Complaints, Sent / cap, Failed), the filter tabs with counts (All, Top matches, Complaints, Sent, Failed), and the table (Post, Intent, Power, Score, Competitor, Status) sorted by score. Clicking a row opens the drawer with the post, an Open on <platform> link, the scores, the buyer profile and the message. Empty, loading and error states render.
- **AC-14**: The Runs view lists every run with number, start time, trigger, queries, posts, leads, complaints, sent and failed.
- **AC-15**: Settings (send mode, send cap, threshold, enabled platforms, scheduled run times and days) are saved per client and apply to the next run. While the server runs, scheduled runs start on their own at those times; Trigger job now starts one immediately.
- **AC-16**: Load demo data imports the 49 RowRun leads from `data/rowrun/leads.json` as a demo run (RowRun only), with their scores, verdicts and reply drafts as messages.
- **AC-17**: The UI follows `docs/design/needora-dashboard.dc.html` (layout, warm grey palette, Geist and Geist Mono, sidebar, views) and shows the Needora logo from `assets/brand/logos/`. The How it works view shows the pipeline steps, the data model and the guardrails, updated to match this spec.

## Decision

**Chosen option**: Option 3: fixed pipeline in code, structured AI steps, with one small agent for query writing.

Code runs the six steps in order and stores every step in Neon. Each AI judgment (scoring, buyer profile, message) is one OpenAI call that must return JSON matching a schema. Only query writing is an agent (OpenAI Agents SDK) that can preview a search and refine its queries. Client research uses OpenAI deep research in background mode.

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript | One language for page, API and pipeline |
| Framework | Next.js 16 (App Router, route handlers on the Node runtime) | One app for the dashboard and the API; `create-next-app` ships Geist, which the design uses |
| Styling | Tailwind CSS, tokens copied from the design file | Fast to match the design; no component library |
| Database | Neon Postgres via `@neondatabase/serverless` (`neon()` tagged template SQL); schema in `db/schema.sql` | One small package, no ORM, 4 tables |
| AI calls | `openai` Node SDK, Responses API, structured outputs via `zodTextFormat` (`openai/helpers/zod`) + `zod` | Typed answers that code checks before anything continues |
| Query agent | `@openai/agents` (Agents SDK for TypeScript) | The one step that benefits from trying and refining |
| Models | `OPENAI_MODEL_FAST` default `gpt-6-luna` (scoring); `OPENAI_MODEL_SMART` default `gpt-6-astra` (query agent, profile + message, research structuring); `OPENAI_MODEL_RESEARCH` default `gpt-5.6-sol` (deep research) | Cheap model for the big batch, best model for the few top matches |
| Scraping | `apify-client`; actors `parsebird/reddit-search-scraper`, `scrapersdelight/x-tweet-search-scraper`, `data_pool/linkedin-post-scraper` (ids in env, so they can be swapped) | Public data, no login cookies, pay per result |
| Hosting | Local (`next dev` or `next start`) on your laptop | No time limits for multi minute runs, zero deploy time |
| Background work | Route handler starts the pipeline without awaiting it; state lives in Neon; dashboard polls every 2 s | Works on a long lived Node server, survives page reloads |
| Scheduler | `instrumentation.ts` `register()` starts a 60 s interval that checks each client's schedule | No extra service for a local demo |
| Auth | None (single operator, local) | Deferred in the scope |
| Observability | `console` logs plus a per run `log` array shown in the pipeline panel | What the demo needs |

**Implementation skills**: none installed (skipped by choice).

## Feature design

**Data model sketch** (4 tables, confirmed; JSON columns hold the design's profile, settings and buyer profile so no extra tables are needed):

| Table | Column | Type | Notes |
|---|---|---|---|
| **clients** | `id` | uuid PK | `gen_random_uuid()` |
| | `name` | text not null | |
| | `website` | text not null, **unique** | e.g. `https://row.run` |
| | `profile` | jsonb null | `{product, one_liner, pricing:[{plan, price, note}], targets:[], pains:[], use_cases:[{name, url}], competitors:[{name, weak_spots:[], complaint_query}], where_buyers_talk:[]}`; null until researched |
| | `profile_source` | text null | `pdf` or `live` |
| | `research` | jsonb not null default `{}` | `{status: idle, running, done, failed; step; response_id; error; updated_at}` |
| | `settings` | jsonb not null | default `{send_mode:"auto", send_cap:null, threshold:50, platforms:{reddit:true,x:true,linkedin:true}, schedule:{times:[], days:[], tz:"Europe/Berlin"}}` |
| | `created_at` | timestamptz default now() | |
| **runs** | `id` | bigint identity PK | shown as #id |
| | `client_id` | uuid FK → clients, not null | clients 1:N runs |
| | `trigger` | text not null | `manual`, `scheduled`, `demo` |
| | `status` | text not null | `running`, `done`, `failed` |
| | `step` | text not null | `queries`, `scrape`, `score`, `complaints`, `write`, `post`, `done` |
| | `queries` | jsonb not null default `[]` | `[{platform, text, kind: need or complaint, competitor}]` |
| | `stats` | jsonb not null default `{}` | `{platforms:{reddit:{status, posts, attempts, error}}, send_cap}` |
| | `log` | jsonb not null default `[]` | `[{t, text}]` |
| | `error` | text null | |
| | `started_at` / `finished_at` | timestamptz | finished null while running |
| **leads** | `id` | bigint identity PK | one row per scraped post |
| | `client_id` | uuid FK → clients, not null | |
| | `run_id` | bigint FK → runs, not null | the run that found it; runs 1:N leads |
| | `platform` | text not null | `reddit`, `x`, `linkedin` |
| | `external_id` | text not null | platform post id (or URL) |
| | `url` | text not null | |
| | `author_handle` / `author_url` / `author_headline` | text null | headline = role and company where the platform gives it |
| | `source` | text null | `r/sales`, `X`, `LinkedIn` |
| | `title` | text null | |
| | `body` | text not null | |
| | `posted_at` | timestamptz null | |
| | `query` | text null | the query that found it |
| | `category` | text null | Buying intent, Question, Pain point, Competitor complaint, Competitor mention, Discussion, Self-promo, Unrelated |
| | `fit`, `intent`, `buying_power` | smallint null, 0 to 4 | |
| | `icp` | text null | `yes`, `maybe`, `no` |
| | `reply_welcome` / `disqualified` | boolean null | |
| | `competitor` / `need` / `evidence` | text null | |
| | `score` | real null, 0 to 1 | written at scoring time from the fixed weights (AC-7) |
| | `profile` | jsonb null | top matches only: `{signals:[{label, evidence}], power_estimate, power_note, tone, tone_evidence, recent_posts}` |
| | `scored_at`, `created_at` | timestamptz | |
| | | **unique** `(client_id, platform, external_id)` | |
| **messages** | `id` | bigint identity PK | |
| | `lead_id` | bigint FK → leads, not null | leads 1:N messages; the dashboard shows the latest |
| | `channel` | text not null | `reply` or `dm` |
| | `body` | text not null | |
| | `tone` | text not null | `funny`, `serious`, `urgent` |
| | `angle` | text null | the competitor for a switch angle |
| | `link` | text not null | the client website used |
| | `status` | text not null | `awaiting`, `sent`, `failed`, `over_cap` |
| | `simulated` | boolean not null default true | |
| | `error` | text null | |
| | `created_at`, `sent_at` | timestamptz | |

Indexes: `leads (client_id, score desc)`, `leads (run_id)`, `messages (lead_id)`, `runs (client_id, started_at desc)`.

**State transitions**:
- run: `running` → `done` (all steps finished, even with a failed platform) · `running` → `failed` (a step outside scraping threw). A `running` run older than 30 minutes counts as stale and is set to `failed` when a new run starts.
- message: `awaiting` → `sent` | `failed` (Review mode) · created as `sent` or `over_cap` directly (Auto mode) · `failed` → `sent` | `failed` (retry) · `over_cap` → `sent` (Approve and send).
- client research: `idle` → `running` → `done` | `failed` · `failed` or `done` → `running` (rerun).

**Pipeline** (one run, in `lib/pipeline/`):
1. **Write queries** (agent, `OPENAI_MODEL_SMART`): input the client profile and enabled platforms; one tool `preview_search(query)` that runs the Reddit actor with 10 results and returns titles (at most 3 calls); output 6 queries per platform (4 need, 2 complaint naming a competitor). Saved to `runs.queries`.
2. **Scrape** (Apify): per platform in parallel; per query one actor run with a 7 day filter and 25 results (Reddit `timeFilter: week`; X `recency: week`; LinkedIn `datePosted: week`). Normalise each item to the lead columns, insert with `on conflict do nothing`. Retry a failed platform once; then record it as failed in `runs.stats` and go on.
3. **Score** (`OPENAI_MODEL_FAST`): new leads in chunks of 20, 5 chunks at a time; the model returns the fields of AC-7 per post id; code computes `score`.
4. **Flag complaints**: part of the same scoring call (category + competitor from the profile's competitor list); this step only counts and logs them so the pipeline shows it.
5. **Profile + write** (`OPENAI_MODEL_SMART`): for top matches whose author has no message for this client yet, fetch up to 10 recent posts (Reddit `author:<handle>`, X `from:<handle>`; LinkedIn uses the post and headline only), then one structured call returns the buyer profile and the message (rules of AC-10). 5 leads at a time.
6. **Post**: messages sorted by score. Auto: through `send()` until the cap, the rest `over_cap`. Review: `awaiting`. `send()` lives in `lib/send.ts` and in this spec only simulates (marks `sent`, `simulated = true`); spec 2 swaps in real posting behind the same function.

**Client research** (`lib/research.ts`): Responses API with `OPENAI_MODEL_RESEARCH`, `background: true`, the web search tool, `max_tool_calls` 40; prompt asks for product, pricing, customers, pains, use cases, competitors and their weak spots, and where buyers talk online. Poll every 10 s with `responses.retrieve` (step labels: Researching the web, Structuring the profile). Then one `OPENAI_MODEL_SMART` structured call turns the report into the `profile` JSON. Deep research can take tens of minutes, which is fine because RowRun is seeded.

**Message rules** (system prompt for step 5): answer the person's actual question first; mention the client once as a fit for their case; include the website link exactly once; reply = no statement about who writes it; DM = say we work together with the client (e.g. "we work together with the RowRun team"); complaint = say concretely why the client fits better than that competitor, using the profile's weak spots; match the detected tone and the post's language; under 90 words for replies and 120 for DMs; no hashtags, no emojis unless the tone is funny.

**API surface** (all JSON, all local, no auth):
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/clients` | GET | | clients with name, website, initial, research status, lead counts | none | |
| `/api/clients` | POST | name:string (req), website:url (req) | 201 `{id}`; research starts | none | 409 website exists, 422 invalid URL |
| `/api/clients/:id` | GET | | client with profile, profile_source, research, settings, latest run queries | none | 404 |
| `/api/clients/:id/research` | POST | | 202 | none | 409 research running |
| `/api/clients/:id/settings` | PATCH | send_mode, send_cap, threshold, platforms, schedule (all opt) | 200 settings | none | 422 invalid values |
| `/api/runs` | POST | client_id:uuid (req), trigger:string (opt, default manual) | 202 `{run_id}` | none | 409 run in progress, 422 client has no profile |
| `/api/runs` | GET | client_id:uuid (req) | runs with counts | none | |
| `/api/runs/:id` | GET | | run with step, stats, queries, log, counts | none | 404 |
| `/api/runs/:id/retry` | POST | platform:string (req) | 202 | none | 409 run in progress, 422 platform not failed |
| `/api/runs/:id/approve` | POST | | count sent | none | 404 |
| `/api/leads` | GET | client_id (req), run_id (opt), filter: all, top, complaints, sent, failed (opt), cursor (opt) | 50 leads with latest message + `next_cursor` | none | 422 |
| `/api/messages/:id/send` | POST | | message with new status | none | 409 already sent |
| `/api/demo` | POST | client_id (req) | 201 `{run_id}` | none | 422 not RowRun, 409 demo already loaded |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Leads table | Intent, Power | `leads.intent` × 25, `leads.buying_power` × 25 |
| Leads table | Score | `leads.score` × 100, rounded |
| Leads table | Top match | derived: `score × 100 >= clients.settings.threshold` and not `disqualified` |
| Leads table | handle, where, age | `author_handle`; `author_headline` or `source`; now minus `posted_at` (fallback `created_at`) |
| Leads table | Competitor, Status | `leads.competitor`; latest `messages.status` (shown "Sent (simulated)" when `simulated`), else "—" |
| Stat tiles, tab counts | Posts, Leads, Top, Complaints, Sent, Failed | counts over `leads` and `messages` for the selected run (latest run by default) |
| Stat tile | Sent / cap | sent messages in the run / `runs.stats.send_cap` (the cap copied from settings at run start; "no cap" when null) |
| Sidebar | Send mode, cap, threshold | `clients.settings` |
| Sidebar | Next auto run | derived from `settings.schedule.times`, `days` and `tz` |
| Pipeline panel | step states, details, platform failures, log | `runs.step`, `runs.stats`, `runs.log` |
| Drawer | buyer profile, recent posts count | `leads.profile` |
| Drawer | message kind, tone, angle, fail reason | `messages.channel`, `tone`, `angle`, `error` |
| Message body | the link | `clients.website` |
| Message body | DM partner line | `clients.name` |
| Profile view | product, pricing, targets, pains, competitors | `clients.profile`; source label from `profile_source` |
| Profile view | search queries | `runs.queries` of the latest run; "No run yet" otherwise |
| Research steps | labels, details, error | `clients.research` |
| Runs view | counts per run | aggregated from `leads` and `messages` by `run_id`; trigger from `runs.trigger` |
| Scoring | competitor names to flag | `clients.profile.competitors[].name` |
| Scrape | the 7 day window and 25 results | constants in `lib/pipeline/scrape.ts` |
| Demo import | scores, verdict, reply | `data/rowrun/leads.json` fields (`score`, `fit`, `intent`, `icp`, `reply_welcome`, `category`, `need`, `reply`); buying power not present, stored null |

**Key invariants**:
- One lead per `(client_id, platform, external_id)`; a stored post is never scored or messaged twice.
- At most one message per author (platform + handle) per client.
- Every message body contains `clients.website` exactly once (checked in code; regenerate once, then fail the message).
- At most one `running` run per client.
- Scraped text is untrusted data: it goes to the model only as data inside the prompt, and the model only returns typed fields. No AI step except query writing has tools, and that tool only searches.
- No secret reaches the browser; all keys are read on the server only.

**Security model**: single operator on a local machine, no sign in (multiple clients and sign in are deferred). Do not deploy this build publicly: anyone with the URL could start runs and spend API credits. Data is public posts; store only what the platform shows publicly. Public replies without disclosure are your call (recorded in rationale); posting is simulated in this spec, so nothing reaches a platform yet.

**Configuration required**:
- `DATABASE_URL`: Neon connection string (set).
- `APIFY_API_TOKEN`: Apify (set).
- `OPENAI_API_KEY`: OpenAI (set).
- `OPENAI_MODEL_FAST`, `OPENAI_MODEL_SMART`, `OPENAI_MODEL_RESEARCH`: optional, defaults above.
- `APIFY_ACTOR_REDDIT`, `APIFY_ACTOR_X`, `APIFY_ACTOR_LINKEDIN`: optional, defaults above.

**Critical test scenarios**:
- Happy path: seeded RowRun, press Find leads, the pipeline runs through all 6 steps, leads appear sorted by score with complaints flagged, top matches have a profile and a simulated sent message with row.run, verifies **AC-3**, **AC-5**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-12**.
- Failure case: LinkedIn actor fails twice; the run finishes with Reddit and X, LinkedIn shows failed with the reason, Retry reruns only LinkedIn, verifies **AC-6**.
- Duplicate case: run twice; the second run stores no duplicate posts and messages no author twice, verifies **AC-5**, **AC-11**.
- Guard case: press Find leads twice quickly; the second gets "a run is already going", verifies **AC-3**.
- Permission: no sign in by design; the app is only reachable on localhost, verifies the security model.

## Build plan

Ordered as a tracer bullet: one thin real thread first (milestones 1 and 2 are demoable), then thicken each segment.

**Milestone 1: Scaffold and data**
1. Scaffold Next.js 16 with TypeScript and Tailwind in the repo root (keep `data/`, `assets/`, `docs/`, `brand.md`, `mention-scout.html`); add `@neondatabase/serverless`, `openai`, `@openai/agents`, `zod`, `apify-client`. Check peer versions (`@openai/agents` and `zod`) at install, satisfies **AC-17**.
2. `db/schema.sql` with the 4 tables, constraints and indexes, and an `npm run db:setup` script that applies it to `DATABASE_URL` and upserts the RowRun seed, satisfies **AC-1**.
3. Write `db/seed/rowrun.json` from the PDF (profile shape above, competitors Clay, n8n, Zapier, Make, Gumloop, Lindy with weak spots and a complaint query each), satisfies **AC-1**.

**Milestone 2: The thin thread (demoable)**
4. Test each Apify actor with a 3 result run and record the real output field names in a comment in `lib/pipeline/scrape.ts` (your instruction: test it yourself first), satisfies **AC-5**.
5. `POST /api/runs` + `lib/pipeline/` running all 6 steps thinly: fixed queries from the profile, Reddit only, scoring, simple message, simulated send; `GET /api/runs/:id`, `GET /api/leads`, satisfies **AC-3**, **AC-5**, **AC-7**, **AC-10**, **AC-12**.
6. Leads view shell from the design: sidebar, Find leads, pipeline panel with polling, table, satisfies **AC-3**, **AC-13**, **AC-17**.

**Milestone 3: Thicken the pipeline**
7. X and LinkedIn scrapers in parallel, retry once, failed platform in stats, `POST /api/runs/:id/retry`, satisfies **AC-5**, **AC-6**.
8. Query agent (Agents SDK, `preview_search`) with complaint queries; complaint category and competitor in scoring, satisfies **AC-4**, **AC-8**.
9. Author recent posts + buyer profile + tone + message rules + author dedupe + link check, satisfies **AC-9**, **AC-10**, **AC-11**.
10. Send cap, Review mode, approve one and all, retry failed, satisfies **AC-12**.

**Milestone 4: The full dashboard**
11. Drawer, stat tiles, filter tabs, empty and error states, satisfies **AC-13**.
12. Runs view, Client profile view, How it works view, Settings view (`PATCH` settings), satisfies **AC-14**, **AC-15**, **AC-17**.

**Milestone 5: Research, schedule, demo data**
13. Add client + deep research + research steps + rerun, satisfies **AC-2**.
14. Scheduler in `instrumentation.ts` + Trigger job now, satisfies **AC-15**.
15. `POST /api/demo` importing `data/rowrun/leads.json`, satisfies **AC-16**.

## Consequences

**Positive**:
- One app, one database, three providers: easy to run and explain on stage.
- Every step is stored, so a page reload or a crash mid run never loses what was found.
- Real posting later only replaces `send()`; nothing else changes.

**Negative / tradeoffs**:
- Local only: judges can't open it on their own devices without a deploy later.
- Deep research is slow (tens of minutes) and the most expensive call; a live demo of Add client will not finish on stage.
- The scheduler only runs while the server runs, and a server restart mid run leaves a stale run (handled by the 30 minute rule).
- Model and actor names change fast; they sit in env vars with defaults that may need updating.
- The full design in one spec is a real deadline risk (see the premise note).

**Neutral**:
- `score` is stored at scoring time (a derived value) because weights are fixed and sorting needs it; changing weights means rescoring.
- The design file's own data model (10 tables) and score formula (60% intent + 40% power) are superseded by this spec; the How it works view must show this spec's versions.

## Follow-up

- [x] Add `OPENAI_API_KEY` to `.env.local` before `/develop`.
- [ ] Spec 2: real posting (Reddit, X, LinkedIn) behind `send()`, including platform rules and disclosure.
- [ ] `brand.md` says Rubik, the design file uses Geist; this spec follows the design. Align the brand guide or the design.
- [ ] Not now (your choice): Neon, Apify and OpenAI docs MCP servers could help later builds; agent skills were skipped.
- [ ] Before any real posting: decide on disclosure in public replies (see rationale).

## Rationale

Reasoning, options and references: see [rationale.md](rationale.md).
