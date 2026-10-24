'use client';
import { isRelevant, isTop, scoreTo100, to100, type LeadWithMessage } from '@/lib/types';
import { C, MONO, PlatformChip, StatusChip, chipComp, leadAge, leadHandle, leadText, leadWhere } from '@/components/ui';

// '—' for unscored or irrelevant leads, 'Below threshold' for relevant ones under the threshold (design)
export const noMessageLabel = (l: LeadWithMessage, threshold: number) => (isRelevant(l) && !isTop(l, threshold) ? 'Below threshold' : '—');

export function scoreColor(l: LeadWithMessage, threshold: number) {
  return l.score == null ? '#c4c0b8' : isTop(l, threshold) ? C.ink : C.muted;
}

const num = (v: number | null) => (v == null ? '—' : v);

export default function LeadsTable(props: {
  leads: LeadWithMessage[];
  threshold: number;
  selectedId: number | null;
  onSelect: (l: LeadWithMessage) => void;
  emptyText: string;
  showMessage?: boolean; // Prepared tab: show the full message text under each row
}) {
  const { leads, threshold, selectedId, onSelect } = props;
  const compact = selectedId != null; // drawer open: Post, Score, Status only (as in the design)
  const cols = compact ? '26px minmax(0,1fr) 44px 108px' : '26px minmax(0,1fr) 48px 48px 48px 92px 116px';
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, padding: '8px 16px', fontSize: 11, color: '#8a867f', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.line2}` }}>
        <span></span>
        <span>Post</span>
        {!compact && <span style={{ textAlign: 'right' }}>Intent</span>}
        {!compact && <span style={{ textAlign: 'right' }}>Power</span>}
        <span style={{ textAlign: 'right' }}>Score</span>
        {!compact && <span>Competitor</span>}
        <span>Status</span>
      </div>
      {leads.map((l) => (
        <div
          key={l.id}
          data-keep-drawer
          onClick={() => onSelect(l)}
          className={selectedId === l.id ? 'bg-[#f7f5f1]' : 'bg-white hover:bg-[#faf9f6]'}
          style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, padding: '12px 16px', alignItems: 'start', borderBottom: '1px solid #f0eeea', cursor: 'pointer' }}
        >
          <PlatformChip platform={l.platform} />
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 12, color: C.muted, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ color: C.ink, fontWeight: 500 }}>{leadHandle(l)}</span>
              <span>{leadWhere(l)}</span>
              <span>· {leadAge(l)}</span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{leadText(l)}</div>
          </div>
          {!compact && <div style={{ textAlign: 'right', fontFamily: MONO, fontSize: 13, color: C.muted }}>{num(to100(l.intent))}</div>}
          {!compact && <div style={{ textAlign: 'right', fontFamily: MONO, fontSize: 13, color: C.muted }}>{num(to100(l.buying_power))}</div>}
          <div style={{ textAlign: 'right', fontFamily: MONO, fontSize: 14, fontWeight: 500, color: scoreColor(l, threshold) }}>{num(scoreTo100(l.score))}</div>
          {!compact && (
            <div>
              {l.competitor ? <span style={{ ...chipComp, display: 'inline-block' }}>{l.competitor}</span> : <span style={{ color: '#c4c0b8', fontSize: 13 }}>—</span>}
            </div>
          )}
          <div><StatusChip status={l.message?.status ?? null} fallback={noMessageLabel(l, threshold)} /></div>
          {props.showMessage && l.message && (
            <div style={{ gridColumn: '2 / -1', border: `1px solid ${C.line}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, lineHeight: 1.5, background: '#faf9f7', color: C.ink, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{l.message.body}</div>
          )}
        </div>
      ))}
      {leads.length === 0 && <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 13, color: '#8a867f' }}>{props.emptyText}</div>}
    </>
  );
}
