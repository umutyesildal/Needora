import { sql } from '@/lib/db';
import { startRun, RunConflictError, NoProfileError } from '@/lib/pipeline';
import { dueSlot } from '@/lib/schedule-time';
import { recoverResearch } from '@/lib/research';
import type { ClientSettings } from '@/lib/types';

const g = globalThis as {
  needoraScheduler?: ReturnType<typeof setInterval>;
  needoraLastTick?: number; // last whole minute checked
  needoraSlots?: Map<string, string>; // client id -> last fired slot
};

// Start a 'scheduled' run for every client whose schedule has a slot due since the last tick (AC-15). Each slot
// fires once: a DST fall-back repeats it, a late tick catches up (up to 10 min), manual runs do not suppress it.
async function tick() {
  await recoverResearch(new Date(Date.now() - 10 * 60_000)).catch((e) => console.error('[scheduler] research recovery failed:', e));
  const to = Math.floor(Date.now() / 60_000) * 60_000;
  const from = Math.max(g.needoraLastTick ?? to - 60_000, to - 10 * 60_000);
  g.needoraLastTick = to;
  const slots = (g.needoraSlots ??= new Map());
  // A scheduled run in the last 2 minutes means this slot already fired (e.g. before a restart).
  const clients = (await sql`
    select c.id, c.settings from clients c
    where not exists (select 1 from runs r where r.client_id = c.id and r.trigger = 'scheduled'
      and r.started_at > now() - interval '2 minutes')
  `) as { id: string; settings: ClientSettings }[];
  for (const c of clients) {
    try {
      const s = c.settings.schedule;
      if (!s?.times?.length || !s.days?.length) continue;
      let slot: string | null = null;
      for (let m = from + 60_000; m <= to && !slot; m += 60_000) slot = dueSlot(s, m);
      if (!slot || slots.get(c.id) === slot) continue;
      slots.set(c.id, slot);
      const runId = await startRun(c.id, 'scheduled');
      console.log(`[scheduler] started run ${runId} for client ${c.id} (slot ${slot})`);
    } catch (e) {
      if (e instanceof RunConflictError || e instanceof NoProfileError) console.log(`[scheduler] skipped client ${c.id}: ${(e as Error).message}`);
      else console.error(`[scheduler] client ${c.id} failed:`, e);
    }
  }
}

// One interval per process: a hot reload replaces the old interval instead of adding a second one.
export function startScheduler() {
  if (g.needoraScheduler) clearInterval(g.needoraScheduler);
  g.needoraScheduler = setInterval(() => tick().catch((e) => console.error('[scheduler] tick failed:', e)), 60_000);
  g.needoraScheduler.unref(); // never keeps a process (e.g. a build worker) alive on its own
  console.log('[scheduler] checking schedules every 60 s');
}
