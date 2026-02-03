import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useDemoStore } from '../../shared/state/demoStore';
import { calculateLeagueStandings, getRegularSeasonMatches } from '../../shared/lib/leagueStandings';

function scoreGapLabel(diff: number) {
  if (diff > 0) return `+${diff}`;
  return `${diff}`;
}

export default function StandingsPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const { state, actions } = useDemoStore();

  useEffect(() => {
    void actions.loadFullSchedule();
  }, [actions]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const chunks = pageRef.current?.querySelectorAll('.standing-chunk');
      if (!chunks) return;
      gsap.fromTo(chunks, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.07, ease: 'power2.out' });
    });
    return () => ctx.revert();
  }, []);

  const regularMatches = useMemo(() => getRegularSeasonMatches(state.matches), [state.matches]);

  const standings = useMemo(() => calculateLeagueStandings(state.matches), [state.matches]);

  const completedCount = useMemo(
    () => regularMatches.filter((match) => match.status === 'completed').length,
    [regularMatches],
  );

  const avgRuns = useMemo(() => {
    const completed = regularMatches.filter((match) => match.status === 'completed');
    if (!completed.length) return 0;
    const totalRuns = completed.reduce(
      (sum, match) => sum + (typeof match.homeScore === 'number' ? match.homeScore : 0) + (typeof match.awayScore === 'number' ? match.awayScore : 0),
      0,
    );
    return Math.round((totalRuns / completed.length) * 10) / 10;
  }, [regularMatches]);

  const playoffPreview = standings.slice(0, 4);

  return (
    <div ref={pageRef} style={{ display: 'grid', gap: '20px' }}>
      <section
        className="standing-chunk"
        style={{
          borderRadius: '18px',
          border: '1px solid rgba(248,113,113,0.32)',
          background:
            'radial-gradient(circle at 12% 20%, rgba(215,31,41,0.22), transparent 34%), radial-gradient(circle at 88% 0%, rgba(229,231,235,0.16), transparent 24%), linear-gradient(140deg, var(--hs-navy) 0%, var(--hs-ink) 100%)',
          padding: '20px',
          display: 'grid',
          gap: '10px',
        }}
      >
        <p style={{ margin: 0, color: '#fca5a5', fontWeight: 800, letterSpacing: '0.06em', fontSize: '12px' }}>REGULAR LEAGUE STANDINGS</p>
        <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 900 }}>단일리그 순위</h1>
        <p style={{ margin: 0, color: '#e2e8f0', lineHeight: 1.7 }}>
          승점(승3·무1·패0)을 기준으로 정렬하며, 동률 시 <strong>몰수패 여부 → 무승부 수 → 승자승 → 득실차</strong> 순으로 순위를 결정합니다.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link
            to="/schedule"
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'var(--hs-red)',
              color: '#fff',
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            일정 보기
          </Link>
          <Link
            to="/rules"
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(229,231,235,0.35)',
              color: '#e5e7eb',
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            규정 보기
          </Link>
        </div>
      </section>

      <section className="standing-chunk" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <article
          style={{
            borderRadius: '14px',
            border: '1px solid rgba(148,163,184,0.24)',
            background: 'rgba(12,17,48,0.65)',
            padding: '14px',
          }}
        >
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', fontWeight: 800 }}>참가 팀</p>
          <p style={{ margin: '4px 0 0', fontSize: '30px', fontWeight: 900 }}>{standings.length}</p>
        </article>
        <article
          style={{
            borderRadius: '14px',
            border: '1px solid rgba(148,163,184,0.24)',
            background: 'rgba(12,17,48,0.65)',
            padding: '14px',
          }}
        >
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', fontWeight: 800 }}>정규리그 완료 경기</p>
          <p style={{ margin: '4px 0 0', fontSize: '30px', fontWeight: 900 }}>{completedCount}</p>
        </article>
        <article
          style={{
            borderRadius: '14px',
            border: '1px solid rgba(148,163,184,0.24)',
            background: 'rgba(12,17,48,0.65)',
            padding: '14px',
          }}
        >
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', fontWeight: 800 }}>평균 득점 합계</p>
          <p style={{ margin: '4px 0 0', fontSize: '30px', fontWeight: 900 }}>{avgRuns}</p>
        </article>
      </section>

      <section
        className="standing-chunk"
        style={{
          borderRadius: '16px',
          border: '1px solid rgba(148,163,184,0.24)',
          background: 'rgba(12,17,48,0.68)',
          padding: '16px',
          display: 'grid',
          gap: '12px',
          overflowX: 'auto',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900 }}>정규리그 순위표</h2>

        {standings.length === 0 ? (
          <p style={{ margin: 0, color: '#94a3b8' }}>아직 집계할 정규리그 데이터가 없습니다.</p>
        ) : (
          <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', color: '#e2e8f0' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.28)', color: '#cbd5e1', fontSize: '12px' }}>
                <th style={{ textAlign: 'left', padding: '10px' }}>순위</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>팀</th>
                <th style={{ textAlign: 'center', padding: '10px' }}>경기</th>
                <th style={{ textAlign: 'center', padding: '10px' }}>승-무-패</th>
                <th style={{ textAlign: 'center', padding: '10px' }}>승점</th>
                <th style={{ textAlign: 'center', padding: '10px' }}>득/실</th>
                <th style={{ textAlign: 'center', padding: '10px' }}>득실차</th>
                <th style={{ textAlign: 'center', padding: '10px' }}>몰수패</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team) => (
                <tr key={team.teamKey} style={{ borderBottom: '1px solid rgba(148,163,184,0.14)' }}>
                  <td style={{ padding: '11px 10px', fontWeight: 900 }}>{team.rank}</td>
                  <td style={{ padding: '11px 10px', fontWeight: 800 }}>{team.teamName}</td>
                  <td style={{ padding: '11px 10px', textAlign: 'center' }}>{team.played}</td>
                  <td style={{ padding: '11px 10px', textAlign: 'center' }}>
                    {team.wins}-{team.draws}-{team.losses}
                  </td>
                  <td style={{ padding: '11px 10px', textAlign: 'center', fontWeight: 900, color: '#fca5a5' }}>{team.points}</td>
                  <td style={{ padding: '11px 10px', textAlign: 'center' }}>
                    {team.runsFor}/{team.runsAgainst}
                  </td>
                  <td style={{ padding: '11px 10px', textAlign: 'center', color: team.runDiff >= 0 ? '#86efac' : '#fca5a5' }}>
                    {scoreGapLabel(team.runDiff)}
                  </td>
                  <td style={{ padding: '11px 10px', textAlign: 'center' }}>{team.forfeitLosses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section
        className="standing-chunk"
        style={{
          borderRadius: '16px',
          border: '1px solid rgba(248,113,113,0.24)',
          background: 'rgba(215,31,41,0.08)',
          padding: '16px',
          display: 'grid',
          gap: '10px',
        }}
      >
        <h3 style={{ margin: 0, fontWeight: 900, fontSize: '18px', color: '#ffe4e6' }}>포스트시즌 미리보기</h3>
        {playoffPreview.length >= 4 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
            <article style={{ borderRadius: '12px', border: '1px solid rgba(248,113,113,0.35)', background: 'rgba(12,17,48,0.45)', padding: '12px' }}>
              <strong style={{ color: '#fecaca' }}>준결승 1</strong>
              <p style={{ margin: '6px 0 0', color: '#f8fafc' }}>#{playoffPreview[0].rank} {playoffPreview[0].teamName} vs #{playoffPreview[1].rank} {playoffPreview[1].teamName}</p>
            </article>
            <article style={{ borderRadius: '12px', border: '1px solid rgba(248,113,113,0.35)', background: 'rgba(12,17,48,0.45)', padding: '12px' }}>
              <strong style={{ color: '#fecaca' }}>준결승 2</strong>
              <p style={{ margin: '6px 0 0', color: '#f8fafc' }}>#{playoffPreview[2].rank} {playoffPreview[2].teamName} vs #{playoffPreview[3].rank} {playoffPreview[3].teamName}</p>
            </article>
          </div>
        ) : (
          <p style={{ margin: 0, color: '#e2e8f0' }}>상위 4팀이 확정되면 준결승 매치업이 자동으로 표시됩니다.</p>
        )}
      </section>
    </div>
  );
}
