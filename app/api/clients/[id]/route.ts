import { sql } from '@/lib/db';


const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return Response.json({ error: 'Client not found' }, { status: 404 });
  const [client] = await sql`select * from clients where id = ${id}`;
  if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });
  const [run] = await sql`select queries from runs where client_id = ${id} and jsonb_array_length(queries) > 0 order by started_at desc limit 1`;
  return Response.json({ client, latest_queries: run?.queries ?? [] });
}
