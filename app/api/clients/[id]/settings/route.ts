import { z } from 'zod';
import { sql } from '@/lib/db';
import { DAYS, type ClientSettings, type Day } from '@/lib/types';


const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const Patch = z.object({
  send_mode: z.enum(['auto', 'review']).optional(),
  send_cap: z.number().int().min(1).max(500).nullable().optional(),
  threshold: z.number().int().min(0).max(100).optional(),
  platforms: z.object({ reddit: z.boolean(), x: z.boolean(), linkedin: z.boolean() }).partial().optional(),
  schedule: z.object({
    times: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:MM')),
    days: z.array(z.enum(DAYS as [Day, ...Day[]])),
    tz: z.string().refine(isZone, 'tz must be a valid IANA time zone'),
  }).partial().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return Response.json({ error: 'Client not found' }, { status: 404 });
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const error = parsed.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    return Response.json({ error }, { status: 422 });
  }
  // One UPDATE merges the patch into the stored settings, so concurrent saves never overwrite each other.
  const { platforms, schedule, ...rest } = parsed.data;
  const sched: Partial<ClientSettings['schedule']> = { ...schedule };
  if (schedule?.times) sched.times = [...new Set(schedule.times)].sort();
  if (schedule?.days) sched.days = DAYS.filter((d) => schedule.days!.includes(d));
  const [updated] = await sql`update clients set settings = settings || ${JSON.stringify(rest)}::jsonb
      || jsonb_build_object('platforms', coalesce(settings->'platforms', '{}') || ${JSON.stringify(platforms ?? {})}::jsonb,
        'schedule', coalesce(settings->'schedule', '{}') || ${JSON.stringify(sched)}::jsonb)
    where id = ${id} and exists (select 1 from jsonb_each(coalesce(settings->'platforms', '{}') || ${JSON.stringify(platforms ?? {})}::jsonb) e
      where e.value = 'true'::jsonb)
    returning settings`;
  if (updated) return Response.json({ settings: updated.settings });
  const [row] = await sql`select 1 from clients where id = ${id}`;
  if (!row) return Response.json({ error: 'Client not found' }, { status: 404 });
  return Response.json({ error: 'platforms: at least one platform must be on' }, { status: 422 });
}
