// Pure schedule math, shared by the server scheduler and the UI ("Next auto run"). No server-only imports.
import type { ClientSettings, Day } from './types';

const formatters = new Map<string, Intl.DateTimeFormat>();

// Weekday, "HH:MM" and "YYYY-MM-DD" of `d` as seen in time zone `tz`. Throws RangeError on an invalid tz.
export function localDayTime(d: Date, tz: string): { day: Day; time: string; date: string } {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
    formatters.set(tz, f);
  }
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { day: p.weekday.toLowerCase() as Day, time: `${p.hour}:${p.minute}`, date: `${p.year}-${p.month}-${p.day}` };
}

// The slot ("YYYY-MM-DD HH:MM", local) that falls due at whole minute `m` (ms), or null. A scheduled time skipped by
// a DST spring-forward falls due at the first minute after the gap. During a fall-back hour the same slot comes
// up twice: callers fire a slot only once.
export function dueSlot(schedule: ClientSettings['schedule'], m: number): string | null {
  const cur = localDayTime(new Date(m), schedule.tz);
  if (!schedule.days.includes(cur.day)) return null;
  const prev = localDayTime(new Date(m - 60_000), schedule.tz);
  const after = prev.date === cur.date ? prev.time : '';
  const t = schedule.times.find((x) => x > after && x <= cur.time);
  return t ? `${cur.date} ${t}` : null;
}

// Next whole minute after `from` whose local day and HH:MM match the schedule; null if nothing is scheduled.
// ponytail: walks minute by minute (max ~11.5k steps), DST safe; jump by day/time if it ever shows up in a profile.
export function nextRunAt(schedule: ClientSettings['schedule'], from: Date = new Date()): Date | null {
  if (!schedule?.times?.length || !schedule.days?.length) return null;
  const start = Math.floor(from.getTime() / 60_000) * 60_000;
  try {
    for (let i = 1; i <= 8 * 1440; i++) {
      const m = start + i * 60_000;
      if (dueSlot(schedule, m)) return new Date(m);
    }
  } catch {
    // invalid time zone
  }
  return null;
}
