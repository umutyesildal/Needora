import { approveRun } from '@/lib/pipeline';
import { errorResponse, getRun, jsonError, parseId } from '@/lib/queries';
import type { ApproveResponse } from '@/lib/types';


export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  if (id == null || !(await getRun(id))) return jsonError(404, 'Run not found');
  try {
    return Response.json({ prepared: await approveRun(id) } satisfies ApproveResponse);
  } catch (e) {
    return errorResponse(e);
  }
}
