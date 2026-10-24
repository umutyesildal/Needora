# Scope: Needora

Needora finds people on Reddit, X and LinkedIn who publicly show they need what a client sells, scores how likely they are to buy, and reaches out to them automatically with a message in their own tone. First and only client for now: RowRun (row.run), an AI automation platform for sales and ops teams.

**Build approach:** Tracer Bullet (prove the whole pipe works with one thin real thread first, then thicken it). (basis: tracer bullet development; walking skeleton)
**Workflow:** Prototype (nothing runs after `/develop` except its own build time self check). Each spec is one build unit: `/develop` builds a whole spec in one go. (basis: 3.5 hour hackathon, every minute goes into building)
**Constraints:** OpenAI hackathon, about 3.5 hours total, **at most 2 specs**. Already chosen by you, recorded by `/architect` in spec 1: Neon database (project Needora), Apify for scraping, OpenAI for every agent step. Repo: `umutyesildal/Needora`, work happens on branch `feat/mvp`.
**Suggested order:** `/architect` feature 1 (done) → `/audit` → `/develop` feature 1 (demoable after its milestone 2) → `/architect` feature 4 → `/develop` feature 4.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## How we differ

Other tools tell you who **could** buy. We find who is **asking** to buy right now, and answer them where they asked.

| Competitor | What they do | Where their leads come from |
|---|---|---|
| Moltsets | Contact data (emails, phones) through an API, an agent connector or a browser extension, from $27 a month | A search by title, industry and size, or a list you already have |
| FullEnrich | Finds emails and phones by asking 20+ data vendors in turn, with triple email checks | A list you bring, or a search by target profile |
| Freckle | A terminal tool for GTM engineers that chains data providers from a coding agent; one example scrapes people engaging with a competitor's LinkedIn posts, scores fit and adds them to LinkedIn outreach | Data providers and LinkedIn engagement |
| Frontrunner | AI agents across your CRM and sales stack; drafts intros and follow ups and holds them for the owner | Hiring, job changes, website visits, conference lists, lookalikes of won deals |

What sets us apart:
1. **The signal is what the person wrote.** Not a job title or a hiring event, but their own words ("anyone know a tool that…"), minutes old.
2. **We answer where they asked.** A reply under their post or a DM, not a cold email in a sequence.
3. **Every message fits the person.** Tone and wording match how they write (funny, serious, urgent).
4. **Competitor complaint radar.** We look for people complaining about the client's competitors (for RowRun: Clay pricing, maintaining n8n or Zapier flows) and reply with why the client fits better.
5. **No stack needed.** Moltsets and FullEnrich need a list, Freckle needs a GTM engineer, Frontrunner needs your CRM and call data. We need only the client's website (or, for the demo, a PDF).

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| A | RowRun posts data | Existing | existing |
| B | Mention Scout prototype | Existing | existing |
| 1 | Foundation & core lead loop | Foundation + Slice 1 | in-progress |
| 2 | Coding standards & tooling | Foundation | planned |
| 3 | Lead profiling, tone matching & live client research | Slice 2 | dropped (merged into 1) |
| 4 | Real posting | Slice 2 | planned |

## Already in the repo

### A. RowRun posts data · existing
Real screened posts from icp-scout (847 posts, 49 leads from Reddit, Hacker News, X, LinkedIn) with fit, intent, ICP and reply welcome scores, categories (including Competitor mention), verdicts and reply drafts. No author names. Useful as a demo fallback and as a reference for the scoring fields. code in `data/rowrun/`

### B. Mention Scout prototype · existing
A static one page prototype of the flow (Collect, Match, Enrich) for X and Reddit, without a backend. code in `mention-scout.html`

## Foundation & Slice 1: the whole loop, thin

### 1. Foundation & core lead loop · in-progress
One spec for the ground and the first real thread. Decide the stack, how a long pipeline run executes, how posting works per platform, and the data model (clients, client profile with competitors, search runs, leads and posts, scores, messages, send status). Then the loop: RowRun's profile is seeded from the PDF; pressing Find leads on a one page dashboard has the agent write search queries, **including competitor complaint queries** (people unhappy with Clay, n8n, Zapier, Make and the other competitors from the profile), scrape all three platforms, score the batch for buying intent and buying power and flag competitor complaints, write a message with the row.run link for the top matches (complaints get the switch angle), and post it automatically as a reply or DM. Reuse what feature A already shows where it fits. Stack, data model and the core loop share one spec to stay within 2 specs. (basis: your 2 spec limit; tracer bullet, the first slice touches every layer)
**Done when:** the app reads and writes the Neon database; one press of Find leads stores scored leads from Reddit, X and LinkedIn; competitor complaints are flagged with the competitor named; the top matches get a message containing row.run, and complaint replies say why RowRun fits better; messages are really posted (reply or DM) up to a send cap per run; the dashboard lists each lead with its post, score, competitor flag, message and sent or failed status. (basis: platform automation rules, for the send cap)
Spec 0001 grew this feature to the full design: buyer profile and tone, deep client research, settings, scheduled runs, review mode and demo data (feature 3 is merged in). Posting is simulated; real posting is feature 4.
- [x] Decide the stack, data model and core loop (spec): `/architect foundation & core lead loop`
- [ ] Build it: `/develop foundation & core lead loop`
   - [ ] Scaffold, schema and RowRun seed (AC-1, AC-17)
   - [ ] Thin thread: Find leads end to end on Reddit, leads view (AC-3, AC-5, AC-7, AC-10, AC-12, AC-13)
   - [ ] Thicken the pipeline: X and LinkedIn, retry, query agent, complaints, buyer profile, tone, send modes (AC-4 to AC-12)
   - [ ] Full dashboard: drawer, tabs, runs, profile, how it works, settings (AC-13 to AC-15, AC-17)
   - [ ] Deep research, scheduler, demo data (AC-2, AC-15, AC-16)
Spec [0001](../specs/0001-foundation-core-lead-loop/index.md)

### 2. Coding standards & tooling
Capture the conventions and tooling choices for the decided stack, so every later build follows the same rules. Run it after feature 1's spec, before building it.
**Done when:** root `AGENTS.md` reflects the chosen stack and conventions.
- [ ] Capture conventions + tooling choices: `/audit`

## Slice 2: smarter targeting and live research

### 3. Lead profiling, tone matching & live client research · dropped
Merged into feature 1: you chose the full design and deep research in spec 0001.
Thickens the loop at both ends. For the best matches, scrape more of the author (profile, recent posts) and let the agent build a buyer profile: intent signals, buying power and personality (funny, serious, urgent); the message adapts to that tone and the dashboard visualises each lead's intent and behavior. And replace the PDF seed with live research: enter a client website, the agent researches it deeply (pages, pricing, docs, use cases, competitors and their weak spots, target customers) and stores the full profile and queries.
**Done when:** each top match shows a profile card with intent signals, a buying power estimate and the detected tone, each with its evidence, and its message follows that tone; entering row.run builds a client profile as deep as the RowRun PDF (product, pricing, target customers, pains, competitors and their weak spots, queries), and Find leads runs on it.
- [ ] Design it (spec): `/architect lead profiling, tone matching & live client research`

### 4. Real posting · needs a decision · from spec 0001
Replace the simulated `send()` with real replies and DMs on Reddit, X and LinkedIn, so Auto mode actually reaches people. Decide per platform how to post, which accounts to use, and disclosure in public replies before going live. (basis: platform automation rules)
**Done when:** in Auto mode a top match's message really appears under the post or in the author's inbox, the dashboard shows the live post link, and failures show the platform's reason.
- [ ] Design it (spec): `/architect real posting`

## Deferred
Out of scope for this hackathon build, kept so the plan stays honest.
- **Referral links**: a tracked referral link per client instead of the plain website · needs a decision
- **Video in the message**: a generated video attached to the outreach · needs a decision
- **Multiple clients & sign in**: accounts, several clients, each seeing only their own leads · needs a decision
- **Scheduled runs**: Find leads runs on its own every day · needs a decision
- **Reply tracking**: see who answered or clicked the link · needs a decision
- **Email fallback**: reach a lead by email through a contact data provider when a DM is not possible · needs a decision

## References

**Project sources**
- `~/Downloads/RowRun_Analysis.pdf`: RowRun's product, pricing, target customers and competitors; seeds the client profile in Slice 1.
- `data/rowrun/` and `mention-scout.html` in this repo: existing data and prototype from the team.
- Your answers in the `/scope` session on 2026-10-24: approach, workflow, sending mode, platforms, research source, 2 spec limit, competitor complaint radar.

**Practices & standards**
- Tracer bullet development: a thin working path through every layer first, then fill it in.
- Walking skeleton: a thinly connected, working architecture before any feature is built out.
- Foundations before features: the stack and data model are the most expensive things to redo.
- Platform automation rules: automated replies, DMs and scraping are restricted on all three platforms, which is why feature 1 carries a send cap. Reddit's Responsible Builder Policy and spam rules could not be opened to confirm (the pages blocked the fetch), so check them in a browser.

**Links** (web verified)
- [Tracer Bullets and Prototypes, interview with Andy Hunt and Dave Thomas](https://www.artima.com/articles/tracer-bullets-and-prototypes)
- [Alistair Cockburn, origin of the Walking Skeleton term](https://alistaircockburn.com/Bio)
- [X Developer Policy: get explicit consent before automated replies or DMs](https://docs.x.com/developer-terms/policy)
- [LinkedIn: prohibited software and extensions (bots that send messages or scrape profiles)](https://www.linkedin.com/help/linkedin/answer/a1341387/prohibited-software-and-extensions?lang=en)
- Competitors: [Moltsets](https://moltsets.com/) · [FullEnrich](https://fullenrich.com/) · [Freckle](https://www.freckle.io/) · [Frontrunner](https://usefr.com/)

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Its wording varies, so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | `/architect` at spec capture | `Design it` ticked; spec linked; `Build it: /develop <feature>` + 2 to 5 milestones (Prototype adds no verify or test boxes) |
| `in-progress` (building) | `/develop` | milestone sub boxes tick one by one; code pointer filled |
| `done` | you, when you decide it is; `/sync` reconciles | at Prototype, the suggested point is right after `/develop` |

- **Next step** = the first unticked box, following the suggested order in the header.
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards & tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (from before this workflow) and `dropped` (taken out of scope, kept for history).
- **Workflow tier tag** beside a heading (e.g. `· Alpha`) sets that one feature's rigor; no tag inherits the Prototype default.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
