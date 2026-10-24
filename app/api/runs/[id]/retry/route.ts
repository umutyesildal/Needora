import { z } from 'zod';
import { retryPlatform } from '@/lib/pipeline';
import { sql } from '@/lib/db';
import { errorResponse, getRun, jsonError, parseId, RUN_GOING } from '@/lib/queries';
import { PLATFORMS } from '@/lib/types';


const Body = z.object({ platform: z.enum(PLATFORMS) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  const run = id == null ? null : await getRun(id);
  if (!run) return jsonError(404, 'Run not found');
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return jsonError(422, `platform must be one of ${PLATFORMS.join(', ')}`);
  if (run.status === 'running') return jsonError(409, 'Run is still in progress');
  if (run.stats.platforms?.[p.data.platform]?.status !== 'failed') return jsonError(422, `${p.data.platform} did not fail in this run`);
  const [going] = await sql`select 1 from runs where client_id = ${run.client_id} and status = 'running'`;
  if (going) return jsonError(409, RUN_GOING);
  try {
    await retryPlatform(run.id, p.data.platform);
    return Response.json({ run_id: run.id }, { status: 202 });
  } catch (e) {
    return errorResponse(e);
  }
}
