import { z } from 'zod';
import { jsonError, listLeads } from '@/lib/queries';
import type { LeadsResponse } from '@/lib/types';


const Query = z.object({
  client_id: z.guid(),
  run_id: z.union([z.literal('all'), z.coerce.number().int().positive()]).optional(),
  filter: z.enum(['all', 'top', 'complaints', 'prepared', 'failed']).default('all'),
  cursor: z.string().regex(/^-?\d+(\.\d+)?(e-?\d+)?:\d+$/).optional(), // 'score:id' from next_cursor
});

export async function GET(req: Request) {
  // Empty params count as absent.
  const params = Object.fromEntries([...new URL(req.url).searchParams].filter(([, v]) => v !== ''));
  const p = Query.safeParse(params);
  if (!p.success) return jsonError(422, 'Invalid query: ' + p.error.issues.map((i) => i.path.join('.')).join(', '));
  const { client_id, run_id, filter, cursor } = p.data;
  const res = await listLeads(client_id, run_id ?? null, filter, cursor ?? null);
  if (typeof res === 'string') return jsonError(404, res);
  return Response.json(res satisfies LeadsResponse);
}
