// Applies db/schema.sql and upserts the RowRun seed. Idempotent.
// Run: node --env-file=.env.local scripts/db-setup.mjs  (or npm run db:setup)
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// schema.sql has no functions or ';' inside strings, so a plain split is safe.
const statements = read('db/schema.sql')
  .split(';')
  .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);
for (const s of statements) await sql.query(s);
console.log(`schema applied (${statements.length} statements)`);

const seed = JSON.parse(read('db/seed/rowrun.json'));
const [client] = await sql`
  insert into clients (name, website, profile, profile_source)
  values (${seed.name}, ${seed.website}, ${JSON.stringify(seed.profile)}::jsonb, ${seed.profile_source})
  on conflict (website) do update
    set name = excluded.name, profile = excluded.profile, profile_source = excluded.profile_source
  returning id, (profile is not null) as has_profile`;

const tables = await sql`
  select table_name from information_schema.tables
  where table_schema = 'public' order by table_name`;
console.log('tables:', tables.map((t) => t.table_name).join(', '));
console.log(`RowRun client id: ${client.id} (profile: ${client.has_profile ? 'yes' : 'MISSING'})`);
