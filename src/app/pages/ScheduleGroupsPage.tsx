import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemoStore } from '../../shared/state/demoStore';
import type { MatchPhase, MatchSchedule } from '../../shared/state/demoStore';
import { useAdmin } from '../../shared/auth/useAdmin';

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

const quickActionStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 10px',
  borderRadius: '999px',
  border: '1px solid rgba(148,163,184,0.35)',
  background: 'rgba(255,255,255,0.03)',
  color: '#e2e8f0',
  fontWeight: 800,
  fontSize: '12px',
  cursor: 'pointer',
};

const quickActionDisabledStyle: CSSProperties = {
  ...quickActionStyle,
  border: '1px dashed rgba(248, 113, 113, 0.6)',
  color: '#f87171',
  background: 'rgba(248, 113, 113, 0.08)',
  cursor: 'not-allowed',
};

export default function ScheduleGroupsPage() {
  const { state, actions } = useDemoStore();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [tab, setTab] = useState<'REGULAR' | 'POSTSEASON'>('REGULAR');
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

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

  const showBlockedTooltip = (el: HTMLElement | null) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTooltip({
      text: '관리자 로그인이 필요합니다',
      x: rect.left + rect.width / 2,
      y: rect.bottom,
    });
  };

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
            const hasLiveOverlay = Boolean((match.liveVideoUrl || '').trim());
            const textButtonLabel = match.status === 'completed' ? '경기 결과' : match.status === 'canceled' ? '취소됨' : '문자중계';
            const goTo = (path: string) => {
              actions.selectMatch(match.id);
              setTooltip(null);
              navigate(path);
            };
            const goToScorekeeper = (buttonEl: HTMLButtonElement | null) => {
              if (!isAdmin) {
                showBlockedTooltip(buttonEl);
                return;
              }
              goTo('/scorekeeper');
            };
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
                <div style={{ color: '#f8fafc', fontWeight: 800 }}>
                  {match.awayTeamName} vs {match.homeTeamName}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ color: '#94a3b8', fontSize: '13px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span>{new Date(match.startTime).toLocaleString('ko-KR')}</span>
                    <span>· {match.venue}</span>
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
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => goTo('/scoreboard')} style={quickActionStyle} title="전광판">
                      <span aria-hidden>📺</span>
                      전광판
                    </button>
                    <button type="button" onClick={() => goTo('/scoreboard-text')} style={quickActionStyle} title={textButtonLabel}>
                      <span aria-hidden>💬</span>
                      {textButtonLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => hasLiveOverlay && goTo('/live-overlay')}
                      style={hasLiveOverlay ? quickActionStyle : quickActionDisabledStyle}
                      title={hasLiveOverlay ? '라이브 오버레이' : '기록원에서 유튜브 링크 미입력'}
                      disabled={!hasLiveOverlay}
                    >
                      <span aria-hidden>{hasLiveOverlay ? '🛰️' : '🚫'}</span>
                      {hasLiveOverlay ? '라이브오버레이' : '라이브 없음'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => goToScorekeeper(e.currentTarget)}
                      onMouseEnter={(e) => {
                        if (!isAdmin) showBlockedTooltip(e.currentTarget);
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onFocus={(e) => {
                        if (!isAdmin) showBlockedTooltip(e.currentTarget);
                      }}
                      onBlur={() => setTooltip(null)}
                      style={{
                        ...quickActionStyle,
                        cursor: isAdmin ? 'pointer' : 'not-allowed',
                        color: isAdmin ? quickActionStyle.color : 'rgba(203,213,225,0.6)',
                      }}
                      title="기록원"
                    >
                      <span aria-hidden>📝</span>
                      기록원
                    </button>
                    <button
                      type="button"
                      onClick={(e) => goToScorekeeper(e.currentTarget)}
                      onMouseEnter={(e) => {
                        if (!isAdmin) showBlockedTooltip(e.currentTarget);
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onFocus={(e) => {
                        if (!isAdmin) showBlockedTooltip(e.currentTarget);
                      }}
                      onBlur={() => setTooltip(null)}
                      style={{
                        ...quickActionStyle,
                        cursor: isAdmin ? 'pointer' : 'not-allowed',
                        color: isAdmin ? quickActionStyle.color : 'rgba(203,213,225,0.6)',
                      }}
                      title="라인업 편집"
                    >
                      <span aria-hidden>📋</span>
                      라인업 편집
                    </button>
                  </div>
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
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltip.x}px`,
            top: `${tooltip.y + 10}px`,
            transform: 'translateX(-50%)',
            background: 'rgba(15,23,42,0.96)',
            color: '#e2e8f0',
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid rgba(148,163,184,0.35)',
            fontSize: '12px',
            fontWeight: 700,
            zIndex: 60,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
