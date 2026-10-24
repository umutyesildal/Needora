'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { PLATFORM_LABEL, isRelevant, isTop, scoreTo100, to100, type LeadWithMessage, type Message, type MessageResponse } from '@/lib/types';
import { noMessageLabel, scoreColor } from '@/components/LeadsTable';
import { C, CopyButton, MONO, PlatformChip, StatusChip, btnDark, btnLight, cap1, chipComp, chipGrey, errMsg, label11, leadAge, leadHandle, leadWhere } from '@/components/ui';

const section = { padding: 16, display: 'flex', flexDirection: 'column', gap: 10, borderBottom: `1px solid ${C.line2}` } as const;

function noMessageNote(l: LeadWithMessage, threshold: number, running: boolean) {
  if (l.score == null) return 'Waiting for scoring.';
  if (l.disqualified) return 'No message. The author is a vendor, a job ad or a content drop.';
  if (!isRelevant(l)) return `No message. Category ${l.category} is not a lead.`;
  if (!isTop(l, threshold)) return `No message. Score ${scoreTo100(l.score)} is below the threshold of ${threshold}.`;
  return running ? 'Message is being written.' : 'No message was written for this lead in this run.';
}

function Bar({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted }}>
        <span>{label}</span>
        <span style={{ fontFamily: MONO }}>{value ?? '—'}</span>
      </div>
      <div style={{ height: 4, background: '#efede9', borderRadius: 2 }}>
        <div style={{ height: 4, borderRadius: 2, background: color, width: `${value ?? 0}%` }} />
      </div>
    </div>
  );
}

export default function LeadDrawer(props: {
  lead: LeadWithMessage;
  threshold: number;
  running: boolean;
  onClose: () => void;
  onMessage: (m: Message) => void;
}) {
  const { lead: l, threshold, onClose } = props;
  const ref = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const m = l.message;
  const p = l.profile;

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const down = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!ref.current?.contains(t) && !t.closest?.('[data-keep-drawer]')) onClose();
    };
    document.addEventListener('keydown', key);
    document.addEventListener('mousedown', down);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('mousedown', down); };
  }, [onClose]);

  async function approve() {
    if (!m) return;
    setBusy(true); setError(null);
    try { props.onMessage((await api<MessageResponse>(`/api/messages/${m.id}/send`, { method: 'POST' })).message); }
    catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  }

  return (
    <aside ref={ref} style={{ background: '#ffffff', border: `1px solid ${C.line}`, borderRadius: 10, position: 'sticky', top: 20, maxHeight: 'calc(100vh - 40px)', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, padding: 16, borderBottom: `1px solid ${C.line2}` }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
          <PlatformChip platform={l.platform} size={30} />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{leadHandle(l)}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{leadWhere(l)} · {leadAge(l)}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ border: `1px solid ${C.line}`, background: '#ffffff', borderRadius: 6, padding: '4px 9px', fontSize: 12, cursor: 'pointer', color: C.muted }}>Close</button>
      </div>

      <div style={section}>
        <div style={label11}>Post</div>
        <div style={{ fontSize: 14, lineHeight: 1.55, paddingLeft: 12, borderLeft: `2px solid ${C.line}`, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {l.title && <div style={{ fontWeight: 500, marginBottom: 4 }}>{l.title}</div>}
          {l.body}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <a href={l.url} target="_blank" rel="noopener noreferrer" className="hover:text-[oklch(0.56_0.2_27)]" style={{ fontSize: 12, color: C.ink, textDecoration: 'underline', textUnderlineOffset: 2 }}>
            Open on {PLATFORM_LABEL[l.platform]}
          </a>
          {l.competitor && <span style={chipComp}>Complaint about {l.competitor}</span>}
        </div>
      </div>

      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: 16, alignItems: 'center', borderBottom: `1px solid ${C.line2}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={label11}>Score</div>
          <div style={{ fontSize: 34, fontWeight: 500, fontFamily: MONO, letterSpacing: '-0.03em', color: scoreColor(l, threshold) }}>{scoreTo100(l.score) ?? '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Bar label="Buying intent" value={to100(l.intent)} color={C.ink} />
          <Bar label="Buying power" value={to100(l.buying_power)} color={C.accent} />
        </div>
      </div>

      {p && (
        <div style={{ ...section, gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={label11}>Buyer profile</div>
            <div style={{ fontSize: 11, color: C.faint }}>from profile + {p.recent_posts} recent posts</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>Intent signals</div>
            {p.signals.map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: 13 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>“{s.evidence}”</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 10, border: `1px solid ${C.line2}`, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: '#8a867f' }}>Buying power</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{p.power_estimate}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{p.power_note}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 10, border: `1px solid ${C.line2}`, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: '#8a867f' }}>Detected tone</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{cap1(p.tone)}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4, fontStyle: 'italic' }}>“{p.tone_evidence}”</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ ...section, borderBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={label11}>Message</div>
          {props.running && m?.status === 'awaiting'
            ? <StatusChip status={null} fallback="Queued" kind="ink" />
            : <StatusChip status={m?.status ?? null} fallback={noMessageLabel(l, threshold)} />}
        </div>
        {m ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 12, color: C.muted }}>
              <span style={chipGrey}>{m.channel === 'dm' ? 'DM' : l.platform === 'linkedin' ? 'Comment' : 'Reply'}</span>
              <span style={chipGrey}>Tone: {cap1(m.tone)}</span>
              {m.angle && <span style={chipComp}>Switch angle vs {m.angle}</span>}
            </div>
            <textarea readOnly rows={6} value={m.body} style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${C.line}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, lineHeight: 1.5, resize: 'vertical', overflow: 'auto', fontFamily: 'inherit', color: C.ink, background: m.status === 'prepared' || m.status === 'failed' ? '#faf9f7' : '#ffffff' }} />
            {m.status === 'failed' && m.error && <div style={{ fontSize: 12, color: 'oklch(0.48 0.15 25)', lineHeight: 1.4 }}>{m.error}</div>}
            {m.status === 'over_cap' && <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>Send cap reached for this run. Queued for the next run.</div>}
            {error && <div style={{ fontSize: 12, color: 'oklch(0.48 0.15 25)', lineHeight: 1.4 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {m.status === 'failed' ? (
                <button onClick={approve} disabled={busy || props.running} style={{ ...btnLight, opacity: busy || props.running ? 0.6 : 1 }}>{busy ? 'Retrying…' : 'Retry'}</button>
              ) : (
                <>
                  {m.status !== 'prepared' && !props.running && (
                    <button onClick={approve} disabled={busy} style={{ ...btnDark, opacity: busy ? 0.6 : 1 }}>{busy ? 'Approving…' : 'Approve'}</button>
                  )}
                  <CopyButton text={m.body} style={btnLight} />
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{noMessageNote(l, threshold, props.running)}</div>
        )}
      </div>
    </aside>
  );
}
