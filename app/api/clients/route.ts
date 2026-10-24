import { sql } from '@/lib/db';
import { startResearch } from '@/lib/research';


export async function GET() {
  const clients = await sql`select c.*, (select count(*)::int from leads l where l.client_id = c.id and l.score is not null
      and l.disqualified is not true and coalesce(l.category, '') not in ('Unrelated', 'Self-promo')) as lead_count
    from clients c order by c.created_at`;
  return Response.json({ clients });
}

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

// "row.run", "http://Row.run/pricing/" -> "https://row.run"; null when not a website (junk host, port, userinfo).
function normalizeWebsite(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const s = raw.trim();
  try {
    const u = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(s) ? s : `https://${s}`);
    if (!/^https?:$/.test(u.protocol) || u.port || u.username || u.password) return null;
    const host = u.hostname.toLowerCase().replace(/\.$/, '');
    const labels = host.split('.');
    if (labels.length < 2 || !labels.every((l) => LABEL.test(l)) || !TLD.test(labels.at(-1)!)) return null;
    return `https://${host}`;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const body = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return Response.json({ error: 'Name is required' }, { status: 422 });
  const website = normalizeWebsite(body.website);
  if (!website) return Response.json({ error: 'Website is not a valid URL' }, { status: 422 });

  // www.x.com and x.com are the same site: refuse a second client (and a second paid research) for it.
  const bare = website.replace(/^https:\/\/(www\.)?/, '');
  const [dup] = await sql`select website from clients where regexp_replace(lower(website), '^https?://(www\\.)?', '') = ${bare}`;
  if (dup) return Response.json({ error: `A client with website ${dup.website} already exists` }, { status: 409 });
  const rows = await sql`insert into clients (name, website) values (${name}, ${website})
    on conflict (website) do nothing returning id`;
  if (!rows.length) return Response.json({ error: `A client with website ${website} already exists` }, { status: 409 });
  const id = rows[0].id as string;
  try {
    await startResearch(id);
  } catch (e) {
    console.error(`research start for ${id} failed:`, e instanceof Error ? e.message : e);
  }
  return Response.json({ id }, { status: 201 });
}
