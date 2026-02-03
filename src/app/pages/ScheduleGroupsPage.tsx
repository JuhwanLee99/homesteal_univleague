import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDemoStore } from '../../shared/state/demoStore';
import type { MatchPhase, MatchSchedule } from '../../shared/state/demoStore';

function safeTime(value: string) {
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function derivePhase(match: MatchSchedule): MatchPhase {
  if (match.phase) return match.phase;
  if ((match.recordMode ?? 'official') === 'practice') return 'PRACTICE';
  return 'REGULAR';
}

const TAB_META: Record<'REGULAR' | 'POSTSEASON', { label: string; color: string }> = {
  REGULAR: { label: '정규리그', color: '#60a5fa' },
  POSTSEASON: { label: '포스트시즌', color: '#f97316' },
};

function statusLabel(match: MatchSchedule) {
  if (match.status === 'inProgress') return { text: '진행 중', color: '#38bdf8', bg: 'rgba(56,189,248,0.16)' };
  if (match.status === 'completed') return { text: '종료', color: '#f97316', bg: 'rgba(249,115,22,0.16)' };
  if (match.status === 'canceled') return { text: '취소', color: '#94a3b8', bg: 'rgba(148,163,184,0.2)' };
  return { text: '예정', color: '#22c55e', bg: 'rgba(34,197,94,0.16)' };
}

export default function ScheduleGroupsPage() {
  const { state, actions } = useDemoStore();
  const [tab, setTab] = useState<'REGULAR' | 'POSTSEASON'>('REGULAR');

  useEffect(() => {
    void actions.loadFullSchedule();
  }, [actions]);

  const { regular, postseason } = useMemo(() => {
    const alive = state.matches.filter((match) => !match.deleted && derivePhase(match) !== 'PRACTICE');
    const regularMatches = alive
      .filter((match) => derivePhase(match) === 'REGULAR')
      .sort((a, b) => safeTime(a.startTime) - safeTime(b.startTime));
    const postseasonMatches = alive
      .filter((match) => derivePhase(match) === 'POSTSEASON')
      .sort((a, b) => safeTime(a.startTime) - safeTime(b.startTime));
    return { regular: regularMatches, postseason: postseasonMatches };
  }, [state.matches]);

  const matches = tab === 'REGULAR' ? regular : postseason;

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <header
        style={{
          display: 'grid',
          gap: '8px',
          borderRadius: '16px',
          border: '1px solid rgba(248,113,113,0.3)',
          background:
            'radial-gradient(circle at 14% 20%, rgba(215,31,41,0.22), transparent 30%), linear-gradient(140deg, var(--hs-navy) 0%, var(--hs-ink) 100%)',
          padding: '18px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900 }}>경기 일정</h1>
        <p style={{ margin: 0, color: '#cbd5e1' }}>단일리그 정규시즌과 포스트시즌 일정을 탭으로 확인하세요.</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(Object.keys(TAB_META) as Array<'REGULAR' | 'POSTSEASON'>).map((key) => {
            const active = tab === key;
            const count = key === 'REGULAR' ? regular.length : postseason.length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: active ? `1px solid ${TAB_META[key].color}` : '1px solid rgba(148,163,184,0.35)',
                  background: active ? `${TAB_META[key].color}22` : 'rgba(255,255,255,0.06)',
                  color: active ? TAB_META[key].color : '#cbd5e1',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {TAB_META[key].label} ({count})
              </button>
            );
          })}
          <Link
            to="/schedule/results"
            style={{
              marginLeft: 'auto',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(148,163,184,0.35)',
              color: '#e2e8f0',
              textDecoration: 'none',
              fontWeight: 800,
            }}
          >
            경기 결과 보기
          </Link>
        </div>
      </header>

      {matches.length === 0 ? (
        <div
          style={{
            borderRadius: '12px',
            border: '1px dashed rgba(148,163,184,0.35)',
            background: 'rgba(12,17,48,0.55)',
            padding: '16px',
            color: '#94a3b8',
            fontWeight: 700,
          }}
        >
          표시할 일정이 없습니다.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {matches.map((match) => {
            const status = statusLabel(match);
            return (
              <article
                key={match.id}
                style={{
                  borderRadius: '12px',
                  border: '1px solid rgba(148,163,184,0.22)',
                  background: 'rgba(12,17,48,0.62)',
                  padding: '12px',
                  display: 'grid',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ color: '#f8fafc', fontWeight: 800 }}>
                    {match.awayTeamName} vs {match.homeTeamName}
                  </div>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: status.bg,
                      color: status.color,
                      fontWeight: 800,
                      fontSize: '11px',
                    }}
                  >
                    {status.text}
                  </span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '13px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span>{new Date(match.startTime).toLocaleString('ko-KR')}</span>
                  <span>· {match.venue}</span>
                </div>
                {(typeof match.homeScore === 'number' || typeof match.awayScore === 'number') && (
                  <div style={{ color: '#e2e8f0', fontWeight: 800 }}>
                    스코어: {match.awayScore ?? '-'} : {match.homeScore ?? '-'}
                    {match.isForfeit ? ' (몰수경기)' : ''}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
