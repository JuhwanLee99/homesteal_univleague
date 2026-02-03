import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useContent } from '../../shared/state/contentProvider';

export default function TeamsPage() {
  const { content } = useContent();
  const { teams } = content;
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const chunks = pageRef.current?.querySelectorAll('.teams-chunk');
      if (!chunks) return;
      gsap.fromTo(chunks, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.07, ease: 'power2.out' });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div style={{ display: 'grid', gap: '20px' }} ref={pageRef}>
      <section
        className="teams-chunk"
        style={{
          display: 'grid',
          gap: '12px',
          borderRadius: '16px',
          padding: 'clamp(24px, 6vw, 34px)',
          border: '1px solid rgba(248,113,113,0.32)',
          background:
            'radial-gradient(circle at 14% 20%, rgba(215,31,41,0.22), transparent 30%), radial-gradient(circle at 80% 8%, rgba(229,231,235,0.16), transparent 22%), linear-gradient(140deg, var(--hs-navy) 0%, var(--hs-ink) 100%)',
        }}
      >
        <span
          style={{
            width: 'fit-content',
            padding: '6px 10px',
            borderRadius: '999px',
            border: '1px solid rgba(248,113,113,0.45)',
            color: '#ffe4e6',
            background: 'rgba(215,31,41,0.2)',
            fontWeight: 800,
            fontSize: '12px',
          }}
        >
          {teams.pageBadge}
        </span>
        <h2 style={{ margin: 0, fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 900 }}>{teams.pageTitle}</h2>
        <p style={{ margin: 0, color: '#e2e8f0', lineHeight: 1.7 }}>{teams.pageDescription}</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link
            to="/intro"
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              textDecoration: 'none',
              color: '#e2e8f0',
              border: '1px solid rgba(229,231,235,0.35)',
              fontWeight: 800,
            }}
          >
            리그 소개
          </Link>
          <Link
            to="/schedule"
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              textDecoration: 'none',
              color: '#fff',
              background: 'var(--hs-red)',
              fontWeight: 900,
            }}
          >
            일정 보기
          </Link>
        </div>
      </section>

      <section className="teams-chunk" style={{ display: 'grid', gap: '10px' }}>
        {teams.entries.length ? (
          teams.entries.map((team, index) => (
            <article
              key={team.name}
              style={{
                borderRadius: '12px',
                border: '1px solid rgba(148,163,184,0.22)',
                background: 'rgba(12,17,48,0.65)',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 900,
                  background: 'rgba(215,31,41,0.2)',
                  color: '#fecaca',
                }}
              >
                {index + 1}
              </span>
              <div style={{ display: 'grid', gap: '2px' }}>
                <strong style={{ color: '#f8fafc', fontSize: '16px' }}>{team.name}</strong>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>단일리그 참가팀</span>
              </div>
            </article>
          ))
        ) : (
          <article
            style={{
              borderRadius: '12px',
              border: '1px dashed rgba(148,163,184,0.35)',
              background: 'rgba(12,17,48,0.55)',
              padding: '16px',
              color: '#cbd5e1',
              lineHeight: 1.7,
            }}
          >
            참가팀 명단은 리그 공지 이후 순차적으로 업데이트됩니다.
          </article>
        )}
      </section>

      <section
        className="teams-chunk"
        style={{
          borderRadius: '12px',
          border: '1px solid rgba(148,163,184,0.2)',
          background: 'rgba(12,17,48,0.56)',
          padding: '14px',
          color: '#cbd5e1',
          lineHeight: 1.7,
        }}
      >
        {teams.pageNote}
      </section>
    </div>
  );
}
