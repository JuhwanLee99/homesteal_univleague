import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useContent } from '../../shared/state/contentProvider';

export default function IntroPage() {
  const { content } = useContent();
  const { intro, brand, teams } = content;
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const chunks = pageRef.current?.querySelectorAll('.intro-chunk');
      if (!chunks) return;
      gsap.fromTo(chunks, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.07, ease: 'power2.out' });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div style={{ display: 'grid', gap: '26px' }} ref={pageRef}>
      <section
        className="intro-chunk"
        style={{
          display: 'grid',
          gap: '14px',
          padding: 'clamp(24px, 6vw, 34px)',
          borderRadius: 'var(--surface-radius-lg)',
          background:
            'radial-gradient(circle at 12% 20%, rgba(215,31,41,0.24), transparent 34%), radial-gradient(circle at 88% 0%, rgba(229,231,235,0.16), transparent 28%), linear-gradient(140deg, var(--hs-navy) 0%, var(--hs-ink) 100%)',
          border: '1px solid rgba(229, 231, 235, 0.25)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <img src={brand.teamLogoPath} alt="Homsteal Team" style={{ width: 52, height: 52, borderRadius: '12px', objectFit: 'cover' }} />
          <img src={brand.leagueLogoPath} alt="Homsteal League" style={{ width: 52, height: 52, borderRadius: '12px', objectFit: 'cover' }} />
          <span
            style={{
              padding: '7px 12px',
              borderRadius: '999px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              background: 'rgba(215,31,41,0.22)',
              color: '#ffe4e6',
              border: '1px solid rgba(248,113,113,0.4)',
              fontSize: '12px',
            }}
          >
            {intro.tagline}
          </span>
          <span style={{ color: '#cbd5e1', fontWeight: 700 }}>{brand.seasonLabel}</span>
        </div>

        <h2 style={{ margin: 0, fontSize: 'clamp(24px, 5.5vw, 34px)', fontWeight: 900 }}>{intro.heroTitle}</h2>
        <p style={{ margin: 0, color: '#e2e8f0', lineHeight: 1.7, maxWidth: '840px' }}>{intro.heroDescription}</p>
        <p style={{ margin: 0, color: '#bfdbfe', fontWeight: 700, lineHeight: 1.6 }}>
          운영 주체: 중앙대학교 통일공대 야구동아리 홈스틸(Homsteal)
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {intro.heroMetrics.map((metric) => (
            <div
              key={metric.label}
              style={{
                borderRadius: '14px',
                border: '1px solid rgba(229,231,235,0.2)',
                background: 'rgba(255,255,255,0.04)',
                padding: '14px',
                display: 'grid',
                gap: '6px',
              }}
            >
              <span style={{ color: '#fca5a5', fontSize: '12px', fontWeight: 800 }}>{metric.label}</span>
              <strong style={{ color: '#f8fafc', fontSize: '20px' }}>{metric.value}</strong>
              <span style={{ color: '#cbd5e1', fontSize: '13px' }}>{metric.note}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            to="/rules"
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'var(--hs-red)',
              color: '#fff',
              fontWeight: 900,
              textDecoration: 'none',
            }}
          >
            규정 보기
          </Link>
          <Link
            to="/schedule"
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(229,231,235,0.34)',
              color: '#e2e8f0',
              textDecoration: 'none',
              fontWeight: 800,
              background: 'rgba(255,255,255,0.06)',
            }}
          >
            경기 일정 보기
          </Link>
          <a
            href={brand.instagramUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(96,165,250,0.45)',
              color: '#dbeafe',
              textDecoration: 'none',
              fontWeight: 800,
              background: 'rgba(30,58,138,0.28)',
            }}
          >
            공식 인스타그램
          </a>
          <a
            href={brand.rulesPdfPath}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(229,231,235,0.34)',
              color: '#e2e8f0',
              textDecoration: 'none',
              fontWeight: 800,
              background: 'rgba(255,255,255,0.06)',
            }}
          >
            대학야구교류전 규정 PDF
          </a>
        </div>
      </section>

      <section className="intro-chunk" style={{ display: 'grid', gap: '12px' }}>
        <h3 style={{ margin: 0, color: '#e2e8f0', fontWeight: 900 }}>리그 핵심 규정 요약</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {intro.structureCards.map((card) => (
            <article
              key={card.title}
              style={{
                borderRadius: '14px',
                border: '1px solid rgba(148,163,184,0.24)',
                background: 'rgba(12,17,48,0.7)',
                padding: '14px',
                display: 'grid',
                gap: '8px',
              }}
            >
              <strong style={{ color: '#f8fafc', fontSize: '17px' }}>{card.title}</strong>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', lineHeight: 1.65 }}>
                {card.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="intro-chunk" style={{ display: 'grid', gap: '12px' }}>
        <h3 style={{ margin: 0, color: '#e2e8f0', fontWeight: 900 }}>포스트시즌 구조</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {intro.postseasonMatches.map((match) => (
            <article
              key={match.title}
              style={{
                borderRadius: '14px',
                border: '1px solid rgba(248,113,113,0.35)',
                background: 'rgba(215,31,41,0.08)',
                padding: '14px',
                display: 'grid',
                gap: '8px',
              }}
            >
              <strong style={{ color: '#ffe4e6', fontSize: '17px' }}>{match.title}</strong>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#e2e8f0', lineHeight: 1.65 }}>
                {match.matchups.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section
        className="intro-chunk"
        style={{
          borderRadius: '14px',
          border: '1px solid rgba(148,163,184,0.22)',
          background: 'rgba(12,17,48,0.55)',
          padding: '16px',
          display: 'grid',
          gap: '8px',
        }}
      >
        <strong style={{ color: '#e5e7eb' }}>참가팀 ({teams.entries.length}팀)</strong>
        <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.7 }}>
          {teams.entries.map((entry) => entry.name).join(' · ')}
        </p>
      </section>
    </div>
  );
}
