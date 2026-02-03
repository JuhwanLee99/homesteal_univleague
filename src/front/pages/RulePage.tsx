import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useContent } from '../../shared/state/contentProvider';

export default function RulePage() {
  const { content } = useContent();
  const { brand, rules } = content;
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const chunks = pageRef.current?.querySelectorAll('.rule-chunk');
      if (!chunks) return;
      gsap.fromTo(chunks, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.06, ease: 'power2.out' });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div style={{ display: 'grid', gap: '20px' }} ref={pageRef}>
      <section
        className="rule-chunk"
        style={{
          display: 'grid',
          gap: '12px',
          borderRadius: '16px',
          padding: 'clamp(24px, 6vw, 34px)',
          border: '1px solid rgba(248,113,113,0.32)',
          background:
            'radial-gradient(circle at 12% 18%, rgba(215,31,41,0.25), transparent 32%), radial-gradient(circle at 84% 0%, rgba(229,231,235,0.16), transparent 24%), linear-gradient(140deg, var(--hs-navy) 0%, var(--hs-ink) 100%)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            width: 'fit-content',
            padding: '6px 10px',
            borderRadius: '999px',
            border: '1px solid rgba(248,113,113,0.45)',
            color: '#ffe4e6',
            background: 'rgba(215,31,41,0.22)',
            fontWeight: 800,
            fontSize: '12px',
          }}
        >
          {rules.headerBadge}
        </span>
        <h2 style={{ margin: 0, fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 900 }}>{rules.headerTitle}</h2>
        <p style={{ margin: 0, color: '#e2e8f0', lineHeight: 1.7 }}>{rules.headerDescription}</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a
            href={brand.rulesPdfPath}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              textDecoration: 'none',
              background: 'var(--hs-red)',
              color: '#fff',
              fontWeight: 900,
            }}
          >
            규정 PDF 원문 보기
          </a>
          <Link
            to="/intro"
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(229,231,235,0.35)',
              color: '#e5e7eb',
              textDecoration: 'none',
              fontWeight: 800,
            }}
          >
            리그 소개로 이동
          </Link>
        </div>
      </section>

      <section
        className="rule-chunk"
        style={{
          borderRadius: '12px',
          border: '1px solid rgba(148,163,184,0.28)',
          background: 'rgba(12,17,48,0.62)',
          padding: '12px',
          display: 'grid',
          gap: '10px',
        }}
      >
        <p style={{ margin: 0, color: '#cbd5e1', fontWeight: 700 }}>
          아래 뷰어에 대학야구교류전 규정 PDF 원문 전체를 그대로 표시합니다.
        </p>
        <iframe
          src={brand.rulesPdfPath}
          title="대학야구교류전 규정 PDF"
          style={{
            width: '100%',
            height: '78vh',
            minHeight: '760px',
            border: '1px solid rgba(148,163,184,0.32)',
            borderRadius: '10px',
            background: '#fff',
          }}
        />
      </section>
    </div>
  );
}
