import { getRunWithCounts, jsonError, parseId } from '@/lib/queries';
import type { RunResponse } from '@/lib/types';


export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  const clientId = new URL(req.url).searchParams.get('client_id');
  const res = id == null ? null : await getRunWithCounts(id, clientId);
  if (!res) return jsonError(404, 'Run not found');
  return Response.json(res satisfies RunResponse);
}
