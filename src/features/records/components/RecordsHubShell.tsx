import type { ReactNode } from 'react';
import type { RecordsTab } from '../types';

interface RecordsHubShellProps {
  yearLabel: string;
  tab: RecordsTab;
  tabs: Array<{ value: RecordsTab; label: string }>;
  onTabChange: (tab: RecordsTab) => void;
  filterBar: ReactNode;
}

export default function RecordsHubShell({
  yearLabel,
  tab,
  tabs,
  onTabChange,
  filterBar,
}: RecordsHubShellProps) {
  return (
    <section
      className="record-hub-section"
      style={{
        borderRadius: '22px',
        padding: '24px',
        background:
          'radial-gradient(circle at 10% 15%, rgba(59,130,246,0.16), transparent 32%), radial-gradient(circle at 90% 5%, rgba(249,115,22,0.16), transparent 28%), linear-gradient(135deg, #0f172a 0%, #111827 100%)',
        border: '1px solid rgba(148,163,184,0.24)',
        boxShadow: '0 22px 56px rgba(0,0,0,0.3)',
        display: 'grid',
        gap: '14px',
      }}
    >
      <span
        style={{
          width: 'fit-content',
          padding: '7px 12px',
          borderRadius: '999px',
          border: '1px solid rgba(59,130,246,0.35)',
          background: 'rgba(59,130,246,0.14)',
          color: '#bfdbfe',
          fontWeight: 800,
          fontSize: '12px',
          letterSpacing: '0.03em',
        }}
      >
        RECORDS HUB
      </span>

      <h1 style={{ margin: 0, fontWeight: 900, fontSize: '30px' }}>{yearLabel}</h1>

      <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.6 }}>
        경기 종료 후 Firebase로 집계된 팀 순위와 개인 기록을 통합 조회합니다.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {tabs.map((option) => {
          const active = tab === option.value;
          return (
            <span key={option.value} style={{ display: 'inline-flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => onTabChange(option.value)}
                style={{
                  borderRadius: '999px',
                  border: active ? '1px solid rgba(96,165,250,0.7)' : '1px solid rgba(148,163,184,0.35)',
                  background: active ? 'rgba(59,130,246,0.2)' : 'rgba(15,23,42,0.6)',
                  color: active ? '#dbeafe' : '#cbd5e1',
                  padding: '8px 14px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {option.label}
              </button>
            </span>
          );
        })}
      </div>

      {filterBar}
    </section>
  );
}
