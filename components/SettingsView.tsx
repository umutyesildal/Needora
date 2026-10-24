'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { nextRunAt } from '@/lib/schedule-time';
import { DAYS, PLATFORMS, PLATFORM_LABEL, type Client, type ClientSettings, type Platform, type StartRunResponse } from '@/lib/types';
import { PlatformChip } from '@/components/ui';

const MONO = "var(--font-geist-mono), 'Geist Mono', monospace";
const INK = '#1c1b19';
const MUTED = '#6f6b64';
const LINE = '#e3e0da';
const NOTE: Record<Platform, string> = {
  reddit: 'Reply under the post',
  x: 'Reply under the post or DM',
  linkedin: 'Comment under the post',
};
const row = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: 16,
  borderBottom: '1px solid #f0eeea', flexWrap: 'wrap',
} as const;
const stepBtn = {
  width: 32, height: 32, border: `1px solid ${LINE}`, borderRadius: 6, background: '#ffffff', cursor: 'pointer', fontSize: 16, color: INK,
} as const;
const lightBtn = {
  border: `1px solid ${LINE}`, borderRadius: 7, background: '#ffffff', fontSize: 13, cursor: 'pointer', color: INK,
} as const;

function Title({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: 12, color: MUTED }}>{sub}</div>
    </div>
  );
}

function Stepper({ value, onDown, onUp }: { value: string | number; onDown: () => void; onUp: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button onClick={onDown} style={stepBtn}>−</button>
      <div style={{ width: 44, textAlign: 'center', fontFamily: MONO, fontSize: 15 }}>{value}</div>
      <button onClick={onUp} style={stepBtn}>+</button>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{ width: 40, height: 22, border: 0, borderRadius: 11, background: on ? INK : '#d6d2cb', position: 'relative', cursor: 'pointer', padding: 0, flexShrink: 0 }}
    >
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#ffffff' }} />
    </button>
  );
}

// "Today 09:00", "Tomorrow 09:00", "Mon 09:00" as seen in the schedule's time zone.
function formatNext(d: Date | null, tz: string) {
  if (!d) return 'Off';
  const day = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: tz });
  const now = new Date();
  const time = d.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const label =
    day(d) === day(now) ? 'Today'
    : day(d) === day(new Date(now.getTime() + 86400000)) ? 'Tomorrow'
    : d.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' });
  return `${label} ${time}`;
}

export default function SettingsView({ client, onClientChanged }: { client: Client; onClientChanged: () => void }) {
  const [s, setS] = useState<ClientSettings>(client.settings);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [newTime, setNewTime] = useState('12:00');
  const [triggering, setTriggering] = useState(false);

  const [synced, setSynced] = useState(client.settings);
  if (synced !== client.settings) {
    setSynced(client.settings);
    setS(client.settings);
  }

  async function save(patch: Partial<ClientSettings>) {
    setS((cur) => ({ ...cur, ...patch }));
    setError(null);
    try {
      const r = await api<{ settings: ClientSettings }>(`/api/clients/${client.id}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      setS(r.settings);
      onClientChanged();
    } catch (e) {
      setError(`Not saved: ${(e as Error).message}`);
      setS(client.settings);
    }
  }

  function togglePlatform(p: Platform) {
    const next = { ...s.platforms, [p]: !s.platforms[p] };
    if (!PLATFORMS.some((x) => next[x])) return setError('At least one platform must stay on.');
    save({ platforms: next });
  }

  // ponytail: `enabled` is local until ClientSettings.schedule and the settings PATCH accept it.
  const sched: ClientSettings['schedule'] & { enabled?: boolean } = s.schedule;
  const schedOn = sched.enabled !== false;
  const saveSched = (patch: Partial<typeof sched>) => save({ schedule: { ...sched, ...patch } });

  async function triggerNow() {
    setTriggering(true);
    setError(null);
    setNote(null);
    try {
      const r = await api<StartRunResponse>('/api/runs', {
        method: 'POST',
        body: JSON.stringify({ client_id: client.id, trigger: 'scheduled' }),
      });
      setNote(`Run #${r.run_id} started.`);
      onClientChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760, color: INK }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Settings</h1>
        <div style={{ fontSize: 13, color: MUTED }}>Applies to the next run.</div>
      </div>
      {error && (
        <div style={{ fontSize: 13, color: 'oklch(0.48 0.15 25)', background: 'oklch(0.95 0.03 25)', borderRadius: 7, padding: '8px 12px' }}>
          {error}
        </div>
      )}

      <section style={{ background: '#ffffff', border: `1px solid ${LINE}`, borderRadius: 10, display: 'flex', flexDirection: 'column' }}>
        <div style={row}>
          <Title title="Send mode" sub="Auto prepares every message right away. Review holds every message for approval." />
          <div style={{ display: 'flex', gap: 4, padding: 3, background: '#f2f0ec', borderRadius: 8 }}>
            {(['auto', 'review'] as const).map((m) => (
              <button
                key={m}
                onClick={() => s.send_mode !== m && save({ send_mode: m })}
                style={{
                  padding: '6px 14px', border: 0, borderRadius: 6, background: s.send_mode === m ? '#ffffff' : 'transparent',
                  fontSize: 13, cursor: 'pointer', color: INK,
                }}
              >
                {m === 'auto' ? 'Auto' : 'Review'}
              </button>
            ))}
          </div>
        </div>
        <div style={row}>
          <Title title="Send cap per run" sub="Highest scores go first." />
          <Stepper
            value={s.send_cap ?? '∞'}
            onDown={() => s.send_cap != null && save({ send_cap: s.send_cap > 1 ? s.send_cap - 1 : null })}
            onUp={() => save({ send_cap: Math.min(500, (s.send_cap ?? 0) + 1) })}
          />
        </div>
        <div style={row}>
          <Title title="Top match threshold" sub="Minimum score for a message." />
          <Stepper
            value={s.threshold}
            onDown={() => s.threshold > 0 && save({ threshold: Math.max(0, s.threshold - 5) })}
            onUp={() => s.threshold < 100 && save({ threshold: Math.min(100, s.threshold + 5) })}
          />
        </div>
        {PLATFORMS.map((p) => (
          <div key={p} style={{ ...row, flexWrap: 'nowrap' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <PlatformChip platform={p} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{PLATFORM_LABEL[p]}</div>
                <div style={{ fontSize: 12, color: MUTED }}>{NOTE[p]}</div>
              </div>
            </div>
            <Toggle on={s.platforms[p]} onClick={() => togglePlatform(p)} />
          </div>
        ))}
      </section>

      <section style={{ background: '#ffffff', border: `1px solid ${LINE}`, borderRadius: 10, display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...row, flexWrap: 'nowrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Scheduled runs</div>
            <div style={{ fontSize: 12, color: MUTED }}>
              A background job runs Find leads for {client.name} at these times. Same send cap and threshold as manual runs.
            </div>
          </div>
          <Toggle on={schedOn} onClick={() => saveSched({ enabled: !schedOn })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, opacity: schedOn ? 1 : 0.45 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Times</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {[...sched.times].sort().map((t) => (
                <span
                  key={t}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px 5px 10px', border: `1px solid ${LINE}`,
                    borderRadius: 7, fontFamily: MONO, fontSize: 13,
                  }}
                >
                  {t}
                  <button
                    onClick={() => saveSched({ times: sched.times.filter((x) => x !== t) })}
                    aria-label={`Remove ${t}`}
                    className="text-[#9a968e] hover:text-[#1c1b19]"
                    style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 14, padding: '0 4px', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  style={{
                    padding: '5px 8px', border: `1px solid ${LINE}`, borderRadius: 7, fontSize: 13, fontFamily: MONO,
                    background: '#faf9f7', color: INK,
                  }}
                />
                <button
                  onClick={() => newTime && !sched.times.includes(newTime) && saveSched({ times: [...sched.times, newTime].sort() })}
                  style={{ ...lightBtn, padding: '6px 12px' }}
                >
                  Add time
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Days</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {DAYS.map((d) => {
                const on = sched.days.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => saveSched({ days: on ? sched.days.filter((x) => x !== d) : DAYS.filter((x) => x === d || sched.days.includes(x)) })}
                    style={{
                      width: 44, padding: '6px 0', border: `1px solid ${on ? INK : LINE}`, borderRadius: 7,
                      background: on ? INK : '#ffffff', color: on ? '#ffffff' : MUTED, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    {d[0].toUpperCase() + d.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>
          <div
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8,
              background: '#faf9f7', border: '1px solid #ece9e4', flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 12, color: MUTED }}>Next automatic run · {sched.tz}</div>
              <div style={{ fontSize: 15, fontWeight: 500, fontFamily: MONO }}>{formatNext(schedOn ? nextRunAt(sched) : null, sched.tz)}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {note && <span style={{ fontSize: 12, color: 'oklch(0.45 0.11 155)' }}>{note}</span>}
              <button onClick={triggerNow} disabled={triggering} style={{ ...lightBtn, padding: '7px 12px', opacity: triggering ? 0.6 : 1 }}>
                {triggering ? 'Starting…' : 'Trigger job now'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
