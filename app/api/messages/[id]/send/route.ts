import { sql } from '@/lib/db';
import { approveMessage } from '@/lib/pipeline';
import { errorResponse, jsonError, parseId } from '@/lib/queries';
import type { MessageResponse } from '@/lib/types';


// Posting is not built: "send" approves the message, turning it into 'prepared'.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  const [found] = id == null ? [] : await sql`select 1 from messages where id = ${id}`;
  if (!found || id == null) return jsonError(404, 'Message not found');
  try {
    return Response.json({ message: await approveMessage(id) } satisfies MessageResponse);
  } catch (e) {
    return errorResponse(e);
  }
}
