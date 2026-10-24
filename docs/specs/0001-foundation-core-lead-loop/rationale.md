# 0001. Rationale: Needora foundation and the full lead loop

## Context

Needora is built in a 3.5 hour OpenAI hackathon by a small team, for one client (RowRun, whose founder judges). The repo had no code: only teammates' screened RowRun data (`data/rowrun/`, 847 posts and 49 leads from icp-scout, without author names), a static prototype (`mention-scout.html`), a brand guide and a full dashboard design (`docs/design/needora-dashboard.dc.html`). The database (Neon, project Needora), the scraper (Apify) and the AI provider (OpenAI) were fixed before this spec.

The product must find people who publicly ask for what a client sells, judge buying intent and buying power, flag complaints about the client's competitors, build a buyer profile and write a message in each person's tone. Runs take minutes (dozens of scraper calls, hundreds of posts), so the run must survive a slow step, a failing platform and a page reload. The demo must never show an empty screen.

Posting to Reddit, X and LinkedIn is restricted: X requires explicit consent for automated replies and DMs, LinkedIn prohibits messaging bots and scraping, and Reddit's builder policy restricts automated promotion. Fully automatic posting was requested, then deferred to the end: this spec simulates it. The engineer chose not to disclose the sender in public replies, while DMs say "we work together with the client". Public, undisclosed promotion is exactly what Reddit and X communities and rules punish; it does not matter while posting is simulated, but it must be decided again before spec 2 posts for real (basis: X Developer Policy; LinkedIn prohibited software page).

## Options considered

### Option 1: Fixed pipeline, structured outputs only

Code runs every step in order; each AI step is one call with a JSON schema; queries come from a template filled with the profile.

**Pros**:
- Most predictable and fastest; easy to debug on stage.
- Mirrors RowRun's own thesis ("AI where judgment is needed, code everywhere else"), a strong story for the judge.

**Cons**:
- Query quality is limited to a template; no learning from what the search actually returns.
- Less visibly "agentic" for an OpenAI hackathon.

### Option 2: One agent with tools (Agents SDK)

One agent gets tools (search, score, write, send) and decides the order.

**Pros**:
- Most impressive "agent" demo; flexible.

**Cons**:
- Unpredictable on stage: order, cost and duration vary per run.
- Hard to guarantee invariants (one message per author, link exactly once) when the agent decides.
- Prompt injection from scraped posts can steer an agent that holds a send tool.

### Option 3: Fixed pipeline, with a small query agent (chosen)

Option 1, but query writing is an agent that can preview a search and refine its queries.

**Pros**:
- Keeps the predictable, safe pipeline, and uses the Agents SDK where trying and refining pays off.
- The only agent tool is a read only search, so injected text can't trigger a send.

**Cons**:
- Two AI integration styles in one codebase (Agents SDK plus plain Responses API).
- The preview search adds 20 to 60 seconds per run.

Stack alternatives were weighed during the design conversation and rejected for this build: Python FastAPI with a separate frontend (two apps to wire), Vite React with a Node API (more wiring for the same result), Drizzle or Prisma (an ORM for 4 tables), Railway or Vercel hosting (deploy time; Vercel's function time limits break multi minute runs) (basis: serverless is wrong for long running work).

## Rationale

Option 3 because the risk in this build is time and stage reliability, not flexibility. A fixed pipeline stores every step in Neon, so a slow or failed platform degrades the run instead of killing it, and the dashboard can show progress from the database. The engineer wanted an agent; putting it on query writing gives the OpenAI hackathon story without letting an agent near sending, which matters once real posting arrives (basis: least privilege for AI steps, RowRun's own design).

Next.js on a local server, Neon with plain SQL and structured outputs is the fewest moving parts that can run multi minute jobs: one process, one database, typed AI answers (basis: boring technology; simple beats clever). Local hosting removes serverless time limits and deploy work; the cost is that judges see it on the presenter's screen only.

Deep research uses OpenAI's background mode because the engineer asked for research as thorough as ChatGPT's; the old deep research models were shut down in July 2026 and the docs name `gpt-5.6-sol` as their replacement. Because it takes tens of minutes, RowRun is seeded from the PDF and demo data stays as a fallback.

The data model keeps the 4 tables the engineer confirmed and puts the design's extra concepts (profile, settings, buyer profile, research state) in JSON columns, so the full design fits without new tables. Buying power is weighted into the score at the engineer's request (0.15), with fit, intent, ICP and reply welcome weights rebalanced from icp-scout's 0.34, 0.28, 0.22, 0.16 so the five add up to 1 (basis: icp-scout `data/rowrun/run.json`).

## References

**Project sources**:
- `data/rowrun/README.md` and `run.json`: icp-scout fields, categories, weights, threshold 0.5.
- `docs/design/needora-dashboard.dc.html`: the dashboard design (views, columns, settings).
- `brand.md` and `assets/brand/`: Needora logo and colors.
- `docs/scope/scope.md`: feature 1, approach Tracer Bullet, workflow Prototype, 2 spec limit.
- `~/Downloads/RowRun_Analysis.pdf`: RowRun's product, pricing, customers, competitors.

**Practices & standards**:
- Tracer bullet development and walking skeleton.
- Serverless is wrong for long running work; keep state in the database.
- Least privilege for AI steps; treat scraped content as untrusted data.
- Boring technology; simple beats clever.

**Links** (web verified):
- [OpenAI models (gpt-6-luna, gpt-6-astra)](https://developers.openai.com/api/docs/models)
- [OpenAI structured outputs (Responses API, zodTextFormat)](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI deep research (background mode, replacement model)](https://developers.openai.com/api/docs/guides/deep-research)
- [Next.js (latest stable 16.x)](https://nextjs.org/)
- [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver)
- [Apify: parsebird/reddit-search-scraper](https://apify.com/parsebird/reddit-search-scraper)
- [Apify: scrapersdelight/x-tweet-search-scraper](https://apify.com/scrapersdelight/x-tweet-search-scraper)
- [Apify: data_pool/linkedin-post-scraper](https://apify.com/data_pool/linkedin-post-scraper)
- [X Developer Policy](https://docs.x.com/developer-terms/policy)
- [LinkedIn: prohibited software and extensions](https://www.linkedin.com/help/linkedin/answer/a1341387/prohibited-software-and-extensions?lang=en)
- OpenAI Agents SDK for TypeScript (`@openai/agents`): seen in search results only, not fetched, so no link.
