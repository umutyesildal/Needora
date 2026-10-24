'use client';

const MONO = "var(--font-geist-mono), 'Geist Mono', monospace";
const COLS = '36px minmax(140px,0.9fr) minmax(0,1.6fr) minmax(120px,0.8fr) minmax(0,1fr)';
const card = { background: '#ffffff', border: '1px solid #e3e0da', borderRadius: 10 } as const;

const STEPS: [string, string, string, string][] = [
  ['Write queries', 'The agent reads the client profile and writes 6 search queries per enabled platform: 4 buying questions ("anyone know a tool that…") and 2 complaint queries naming competitors from the profile.', 'OpenAI', 'runs.queries'],
  ['Scrape', 'Apify actors run the queries on Reddit, X and LinkedIn in parallel and return posts from the last 7 days, up to 25 per query. A post already stored for this client is skipped. A failed platform is retried once, then shown as failed with a Retry.', 'Apify', 'leads'],
  ['Score', 'Every new post gets fit, intent, ICP, buying power, reply welcome, a category, the author\'s need and the quote that shows it. Score = 0.30 fit + 0.25 intent + 0.20 ICP + 0.15 buying power + 0.10 reply welcome (×0.2 when disqualified). Leads at or above the threshold become top matches.', 'OpenAI', 'leads.score'],
  ['Flag complaints', 'Posts that complain about a competitor from the client profile are flagged with the competitor named. Their message gets the switch angle.', 'OpenAI', 'leads.competitor'],
  ['Profile and write', 'For top matches the agent fetches the author\'s recent posts where the platform allows it, builds a buyer profile (intent signals, buying power, tone) and writes one message in that tone with the client\'s link. Each author gets at most one message per client.', 'Apify, OpenAI', 'leads.profile, messages'],
  ['Post', 'Messages are prepared as a reply under the post or as a DM, highest score first, until the send cap is reached; the rest are marked over cap. They are not posted yet. In review mode they wait for approval. Failures are stored with the reason.', 'Prepared only', 'messages.status'],
];

const TABLES: [string, string][] = [
  ['clients', 'name, website, profile, profile_source (pdf | live), research, settings'],
  ['runs', 'client_id, trigger, status, step, queries, stats, log, started_at'],
  ['leads', 'run_id, platform, url, author_handle, body, category, fit, intent, icp, buying_power, reply_welcome, score, competitor, profile'],
  ['messages', 'lead_id, channel (reply | dm), body, tone, angle, status (prepared | awaiting | over_cap | failed), error'],
];

const GUARDRAILS: [string, string][] = [
  ['Send cap.', 'At most N messages prepared per run, highest score first. The rest are marked over cap.'],
  ['Threshold.', 'Only leads at or above the score threshold get a message.'],
  ['Review mode.', 'Messages wait for a click before they are prepared.'],
  ['Platform rules.', 'X requires consent for automated replies and DMs; LinkedIn prohibits messaging bots and scraping; Reddit\'s builder policy still needs to be checked in a browser.'],
  ['Posting is off.', 'Needora prepares every message but does not post yet.'],
];

export default function HowItWorksView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 980, color: '#1c1b19' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>How it works</h1>
        <div style={{ fontSize: 13, color: '#6f6b64', lineHeight: 1.5 }}>
          One press of Find leads runs the whole loop once. Each step reads from and writes to the Neon database, so the dashboard can show a run while it is still going.
        </div>
      </div>
      <section style={{ ...card, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid', gridTemplateColumns: COLS, gap: 14, padding: '10px 16px', fontSize: 11, color: '#8a867f',
            textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #ece9e4',
          }}
        >
          <span /><span>Step</span><span>What happens</span><span>Service</span><span>Writes</span>
        </div>
        {STEPS.map(([step, what, service, writes], i) => (
          <div
            key={step}
            style={{
              display: 'grid', gridTemplateColumns: COLS, gap: 14, padding: '14px 16px', fontSize: 13, lineHeight: 1.5,
              borderBottom: i < STEPS.length - 1 ? '1px solid #f0eeea' : undefined,
            }}
          >
            <span style={{ fontFamily: MONO, color: '#9a968e' }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ fontWeight: 500 }}>{step}</span>
            <span>{what}</span>
            <span style={{ color: '#6f6b64' }}>{service}</span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: '#6f6b64' }}>{writes}</span>
          </div>
        ))}
      </section>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
        <section style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Data model</div>
          <div style={{ display: 'flex', flexDirection: 'column', fontFamily: MONO, fontSize: 12, lineHeight: 1.5 }}>
            {TABLES.map(([name, cols]) => (
              <div
                key={name}
                style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 10, padding: '6px 0', borderTop: '1px solid #f0eeea' }}
              >
                <span style={{ color: '#1c1b19' }}>{name}</span>
                <span style={{ color: '#6f6b64' }}>{cols}</span>
              </div>
            ))}
          </div>
        </section>
        <section style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Guardrails</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, lineHeight: 1.5 }}>
            {GUARDRAILS.map(([title, text]) => (
              <div key={title} style={{ paddingTop: 8, borderTop: '1px solid #f0eeea' }}>
                <span style={{ fontWeight: 500 }}>{title}</span> {text}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
