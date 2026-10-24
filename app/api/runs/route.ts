import { z } from 'zod';
import { sql } from '@/lib/db';
import { startRun } from '@/lib/pipeline';
import { errorResponse, jsonError, listRuns } from '@/lib/queries';
import type { RunsResponse, StartRunResponse } from '@/lib/types';


const StartBody = z.object({ client_id: z.guid(), trigger: z.enum(['manual', 'scheduled']).default('manual') });

export async function POST(req: Request) {
  const p = StartBody.safeParse(await req.json().catch(() => null));
  if (!p.success) return jsonError(422, 'client_id (uuid) is required; trigger must be manual or scheduled');
  const [client] = await sql`select 1 from clients where id = ${p.data.client_id}::uuid`;
  if (!client) return jsonError(404, 'Client not found');
  try {
    const run_id = await startRun(p.data.client_id, p.data.trigger);
    return Response.json({ run_id } satisfies StartRunResponse, { status: 202 });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function GET(req: Request) {
  const p = z.guid().safeParse(new URL(req.url).searchParams.get('client_id'));
  if (!p.success) return jsonError(422, 'client_id (uuid) is required');
  const [client] = await sql`select 1 from clients where id = ${p.data}::uuid`;
  if (!client) return jsonError(404, 'Client not found');
  return Response.json({ runs: await listRuns(p.data) } satisfies RunsResponse);
}
