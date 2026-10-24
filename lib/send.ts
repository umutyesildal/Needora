import 'server-only';
import { sql } from '@/lib/db';
import type { Message, MessageStatus } from '@/lib/types';

// The single place real posting plugs in (spec 2). Posting is not built: "prepared" = the message it would send.
// Atomic claim: only a message still in one of `from`, with a non empty body, is prepared, so concurrent calls prepare it
// once; the others get null. `idleRun`: also refuse while the lead's run is running (its post step applies the send cap).
export async function send(messageId: number, from: MessageStatus[] = ['awaiting'], idleRun = false): Promise<Message | null> {
  const [m] = await sql`
    update messages m set status = 'prepared', simulated = true, sent_at = null, error = null
    from leads l join runs r on r.id = l.run_id
    where m.id = ${messageId} and l.id = m.lead_id and m.status = any(${from}::text[]) and btrim(m.body) <> ''
      and (${!idleRun}::boolean or r.status <> 'running')
    returning m.*`;
  return m ? ({ ...m, id: Number(m.id), lead_id: Number(m.lead_id) } as Message) : null;
}
