import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

const cardStyle: CSSProperties = {
  borderRadius: '14px',
  border: '1px solid rgba(148,163,184,0.24)',
  background: 'rgba(12,17,48,0.66)',
  padding: '16px',
  display: 'grid',
  gap: '8px',
};

export default function ManualPage() {
  return (
    <div style={{ display: 'grid', gap: '16px', maxWidth: '980px', margin: '0 auto' }}>
      <section
        style={{
          borderRadius: '16px',
          border: '1px solid rgba(59,130,246,0.34)',
          background:
            'radial-gradient(circle at 16% 18%, rgba(30,58,138,0.25), transparent 32%), linear-gradient(140deg, var(--hs-navy) 0%, var(--hs-ink) 100%)',
          padding: '20px',
          display: 'grid',
          gap: '8px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 900 }}>사용설명서</h1>
        <p style={{ margin: 0, color: '#d1d5db', lineHeight: 1.7 }}>
          Homsteal Univleague 웹사이트 주요 기능 사용 방법입니다.
        </p>
      </section>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#e5e7eb' }}>1) 리그 정보 확인</h2>
        <p style={{ margin: 0, color: '#cbd5e1' }}>리그 소개, 회칙, 참가팀 페이지에서 운영 정보와 규정을 확인할 수 있습니다.</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link to="/intro" style={{ color: '#93c5fd', fontWeight: 800, textDecoration: 'none' }}>
            리그 소개
          </Link>
          <Link to="/rules" style={{ color: '#93c5fd', fontWeight: 800, textDecoration: 'none' }}>
            회칙
          </Link>
          <Link to="/intro/teams" style={{ color: '#93c5fd', fontWeight: 800, textDecoration: 'none' }}>
            참가팀
          </Link>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#e5e7eb' }}>2) 경기 일정/결과 확인</h2>
        <p style={{ margin: 0, color: '#cbd5e1' }}>
          경기 일정에서 정규리그/포스트시즌을 탭으로 확인하고, 경기 결과 페이지에서 종료 경기 기록을 볼 수 있습니다.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link to="/schedule" style={{ color: '#93c5fd', fontWeight: 800, textDecoration: 'none' }}>
            경기 일정
          </Link>
          <Link to="/schedule/results" style={{ color: '#93c5fd', fontWeight: 800, textDecoration: 'none' }}>
            경기 결과
          </Link>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#e5e7eb' }}>3) 커뮤니티 이용</h2>
        <p style={{ margin: 0, color: '#cbd5e1' }}>
          공지사항은 누구나 열람 가능하며, 자유게시판 글/댓글 작성은 로그인 후 이용할 수 있습니다.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link to="/community/notices" style={{ color: '#93c5fd', fontWeight: 800, textDecoration: 'none' }}>
            공지사항
          </Link>
          <Link to="/community/board" style={{ color: '#93c5fd', fontWeight: 800, textDecoration: 'none' }}>
            자유게시판
          </Link>
          <Link to="/login" style={{ color: '#93c5fd', fontWeight: 800, textDecoration: 'none' }}>
            로그인
          </Link>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#e5e7eb' }}>4) 기록원 페이지 상세 안내</h2>
        <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.7 }}>
          기록원 페이지는 관리자 권한이 필요합니다. 상단 메뉴의 <strong>기록원</strong>에서 경기 선택 후 실시간 기록을 입력합니다.
        </p>
        <div style={{ display: 'grid', gap: '6px', color: '#cbd5e1', lineHeight: 1.7 }}>
          <p style={{ margin: 0 }}>
            - <strong>경기 선택</strong>: 먼저 일정에서 대상 경기를 선택하거나, 기록원 페이지에서 경기 상태를 확인합니다.
          </p>
          <p style={{ margin: 0 }}>
            - <strong>경기 시작</strong>: 선발 라인업/벤치를 확인한 뒤 경기 시작 버튼을 눌러 이닝 기록을 시작합니다.
          </p>
          <p style={{ margin: 0 }}>
            - <strong>실시간 입력</strong>: 볼·스트라이크·아웃, 주자 진루, 타석 결과를 순서대로 입력하면 전광판/문자중계에 반영됩니다.
          </p>
          <p style={{ margin: 0 }}>
            - <strong>수정/복구</strong>: 입력 실수 시 undo(되돌리기) 기능을 사용하고, 종료 전 라인스코어를 최종 확인합니다.
          </p>
          <p style={{ margin: 0 }}>
            - <strong>경기 종료</strong>: 경기 종료 처리 후 결과 페이지에서 점수/기록 반영 상태를 확인합니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link to="/scorekeeper" style={{ color: '#93c5fd', fontWeight: 800, textDecoration: 'none' }}>
            기록원 페이지 이동
          </Link>
          <Link to="/scoreboard" style={{ color: '#93c5fd', fontWeight: 800, textDecoration: 'none' }}>
            전광판 확인
          </Link>
          <Link to="/scoreboard-text" style={{ color: '#93c5fd', fontWeight: 800, textDecoration: 'none' }}>
            문자중계 확인
          </Link>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#e5e7eb' }}>5) 상세 문서</h2>
        <p style={{ margin: 0, color: '#cbd5e1' }}>
          아래 아이콘을 누르면 운영 상세 문서를 새 탭으로 열 수 있고, 페이지 내에서도 바로 확인할 수 있습니다.
        </p>
        <a
          href="https://docs.google.com/document/d/e/2PACX-1vRYQNkS6wuqoYWokWN_rnPpmZuWLHcNyn_j5K5Vhw3g8voduO20VMJYFH_3FTjW9Whgk7nxywV8ps_9/pub"
          target="_blank"
          rel="noreferrer"
          style={{
            width: 'fit-content',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid rgba(59,130,246,0.45)',
            background: 'rgba(30,58,138,0.26)',
            color: '#dbeafe',
            fontWeight: 900,
            textDecoration: 'none',
          }}
          title="상세 문서 열기"
        >
          📄 문서 보기
        </a>
        <iframe
          src="https://docs.google.com/document/d/e/2PACX-1vRYQNkS6wuqoYWokWN_rnPpmZuWLHcNyn_j5K5Vhw3g8voduO20VMJYFH_3FTjW9Whgk7nxywV8ps_9/pub?embedded=true"
          title="기록원/운영 상세 문서"
          style={{
            width: '100%',
            minHeight: '760px',
            border: '1px solid rgba(148,163,184,0.3)',
            borderRadius: '10px',
            background: '#ffffff',
          }}
        />
      </section>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#e5e7eb' }}>6) 운영 문의</h2>
        <p style={{ margin: 0, color: '#cbd5e1' }}>
          상세 공지 및 최신 소식은 공식 인스타그램에서 확인하세요.
        </p>
        <a
          href="https://www.instagram.com/homesteal_univleague/"
          target="_blank"
          rel="noreferrer"
          style={{ color: '#93c5fd', fontWeight: 800, textDecoration: 'none' }}
        >
          Instagram @homesteal_univleague
        </a>
      </section>
    </div>
  );
}
