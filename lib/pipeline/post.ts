import 'server-only';
import { sql } from '@/lib/db';
import { send } from '@/lib/send';
import type { Client } from '@/lib/types';

// Step 6: Auto mode prepares awaiting messages (highest lead score first) up to the run's send cap, the rest go over cap.
// Review mode leaves them awaiting for approval.
export async function postMessages(client: Client, runId: number, sendCap: number | null) {
  const msgs = await sql`
    select m.id from messages m join leads l on l.id = m.lead_id
    where l.run_id = ${runId} and m.status = 'awaiting'
    order by l.score desc nulls last, m.id`;
  if (client.settings.send_mode === 'review') return { prepared: 0, overCap: 0, awaiting: msgs.length };

  const [{ n }] = await sql`
    select count(*)::int as n from messages m join leads l on l.id = m.lead_id
    where l.run_id = ${runId} and m.status = 'prepared'`;
  const room = sendCap == null ? msgs.length : Math.max(0, sendCap - n);
  const toSend = msgs.slice(0, room);
  for (const m of toSend) await send(Number(m.id)); // sequential: real posting will be rate limited
  const over = msgs.slice(room).map((m) => String(m.id));
  if (over.length) await sql`update messages set status = 'over_cap' where id = any(${over}::bigint[])`;
  return { prepared: toSend.length, overCap: over.length, awaiting: 0 };
}
