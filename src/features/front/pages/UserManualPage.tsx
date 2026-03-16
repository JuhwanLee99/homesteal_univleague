import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';

type ManualSection = {
  id: string;
  title: string;
  icon: string;
  accent: string;
  items: ManualItem[];
};

type ManualItem = {
  heading: string;
  bullets: string[];
  screenshot?: string;
};

const ROLE_TABS = ['방문자', '일반 회원', '관리자/기록원'] as const;
type RoleTab = (typeof ROLE_TABS)[number];

const WEB_GUEST_SECTIONS: ManualSection[] = [
  {
    id: 'web-guest-main',
    title: '메인 및 리그 정보',
    icon: '🏠',
    accent: '#60A5FA',
    items: [
      {
        heading: '랜딩 페이지 (/)',
        bullets: [
          '상단 LIVE INFO(티커)에서 긴급 공지/실시간 경기 상태를 확인하세요.',
          '주요 시즌 하이라이트와 주요 링크가 카드 형태로 표시됩니다.',
        ],
      },
      {
        heading: '리그 소개 (/intro)',
        bullets: [
          '리그 역사, 조직 구조, 운영 정보를 한눈에 확인할 수 있습니다.',
          '회장단 인사말, 역사와 유산, 참가 팀 정보가 포함됩니다.',
        ],
      },
      {
        heading: '회칙 (/rules)',
        bullets: ['챕터/조항 단위 아코디언으로 회칙 내용을 열람합니다.', '주최 순서와 부칙 정보도 함께 확인 가능합니다.'],
      },
      { heading: '참가팀 · 조편성 (/intro/teams)', bullets: ['조별(A~H) 참가팀 목록을 확인합니다.'] },
      { heading: '팀 허브 (/teams)', bullets: ['전체 팀 검색 및 팀 상세 페이지로 진입합니다.'] },
    ],
  },
  {
    id: 'web-guest-schedule',
    title: '경기 일정 및 결과',
    icon: '📅',
    accent: '#22C55E',
    items: [
      { heading: '경기 일정 (/schedule)', bullets: ['전체 일정을 리스트/캘린더 기반으로 탐색합니다.'] },
      { heading: '라이브 일정 (/schedule/live)', bullets: ['현재 진행 중인 경기만 모아서 확인합니다.'] },
      { heading: '경기 결과 (/schedule/results)', bullets: ['종료된 경기의 스코어와 기록 요약을 확인합니다.'] },
      { heading: '조별 일정 (/schedule/groups)', bullets: ['조(A~H) 기반 필터로 해당 조 경기만 조회합니다.'] },
      { heading: '연습경기 (/schedule/practice)', bullets: ['연습경기 전용 일정을 별도로 조회합니다.'] },
    ],
  },
  {
    id: 'web-guest-records',
    title: '순위 및 기록실',
    icon: '📊',
    accent: '#F97316',
    items: [
      {
        heading: '기록 허브 (/records)',
        bullets: [
          '팀 순위(standings), 투수 기록(pitchers), 타자 기록(batters) 탭을 전환하며 조회합니다.',
          '시즌 선택, 정렬 기준 변경, 검색/필터 기능을 활용하세요.',
        ],
      },
      {
        heading: '선수 상세 (/records/player)',
        bullets: ['선수 단위 시즌/게임 로그를 조회합니다.', '이름 검색, 팀 필터 등으로 원하는 선수를 탐색합니다.'],
      },
    ],
  },
  {
    id: 'web-guest-live',
    title: '경기 중계 시청',
    icon: '📺',
    accent: '#A855F7',
    items: [
      { heading: '스코어보드 (/scoreboard)', bullets: ['라이브 점수, 이닝, BSO(볼-스트라이크-아웃), 라인스코어를 실시간으로 확인합니다.'] },
      { heading: '문자 중계 (/scoreboard-text)', bullets: ['텍스트 기반으로 실시간 경기 상황을 확인합니다.'] },
      { heading: '라이브 오버레이 (/live-overlay)', bullets: ['방송 송출용 오버레이 화면을 확인합니다.'] },
    ],
  },
];

const WEB_MEMBER_SECTIONS: ManualSection[] = [
  {
    id: 'web-member-auth',
    title: '로그인 및 계정 관리',
    icon: '🔐',
    accent: '#60A5FA',
    items: [
      { heading: '로그인/회원가입 (/login)', bullets: ['이메일 또는 Google 계정으로 로그인/회원가입합니다.'] },
      {
        heading: '계정 페이지 (/account)',
        bullets: [
          '계정 기본 정보(UID, 이메일, 역할)를 확인합니다.',
          '역할/권한 확인, 로그아웃, 회원 탈퇴(재인증 후 처리)가 가능합니다.',
          '계정 삭제 안내 페이지(/account-deletion)에서 웹 삭제 절차를 확인할 수 있습니다.',
        ],
      },
    ],
  },
  {
    id: 'web-member-community',
    title: '커뮤니티 이용',
    icon: '💬',
    accent: '#22C55E',
    items: [
      { heading: '커뮤니티 메인 (/community)', bullets: ['공지, 건의/문의, 선수 등록 게시판 최근 글을 한눈에 확인합니다.'] },
      { heading: '공지 목록 (/community/notices)', bullets: ['카테고리(일반/경기공지/징계/긴급) 기반으로 공지를 확인합니다.'] },
      { heading: '공지 상세', bullets: ['상세 내용을 열람하고, 설정된 공지에 대해 댓글을 사용할 수 있습니다.'] },
      {
        heading: '건의/문의 게시판 (/community/inquiry)',
        bullets: [
          '말머리(5종), 처리상태 필터 및 제목/작성자 검색',
          '말머리: 기능 개선 / 버그 신고 / 사용 문의 / 경기·기록 오류 / 기타',
          '비밀글은 목록에 표시되지만 작성자 및 관리자만 열람 가능',
          '로그인한 사용자가 글쓰기 가능, 본인 및 관리자는 수정/삭제 가능',
          '각 글에 댓글 작성(로그인 필요) 및 본인 댓글 삭제 기능 제공',
        ],
      },
      {
        heading: '건의/문의 작성 (/community/inquiry/new)',
        bullets: ['말머리(카테고리) 선택 후 제목/내용 작성', '비밀글 설정 가능'],
      },
      {
        heading: '선수 등록 게시판 (/community/player-registration)',
        bullets: [
          '열람 권한: 선수/스태프/감독/기록원/관리자 (방문자·일반 회원 불가)',
          '말머리: 선수 등록 / 유니폼 등록',
          '글쓰기 권한: 선수 등록(관리자만), 유니폼 등록(감독/관리자)',
          '권한이 없으면 서버 규칙에서 목록 쿼리 및 상세 조회가 차단됩니다.',
        ],
      },
    ],
  },
  {
    id: 'web-member-team',
    title: '팀 상세 및 팀 공지',
    icon: '⚾',
    accent: '#F97316',
    items: [
      { heading: '팀 상세 (/teams/:teamId)', bullets: ['팀 소개, 로스터, 팀 공지를 확인합니다.'] },
      {
        heading: '팀 공지 게시판',
        bullets: [
          '카테고리(일반/훈련/경기/긴급) 필터, 고정 공지 우선 노출',
          '제목/내용/작성자 검색 및 결과 개수 확인',
          '댓글/답글 작성, 좋아요, 본인 댓글 삭제',
        ],
      },
    ],
  },
  {
    id: 'web-member-coach',
    title: '감독(Coach) 팀 홈 관리',
    icon: '👨‍💼',
    accent: '#A855F7',
    items: [
      { heading: '팀 브랜딩/소개 관리', bullets: ['엠블럼(로고) URL 변경, 짧은 소개/상세 소개/연혁 수정'] },
      { heading: '팀 일정 운영 관리', bullets: ['팀 홈에서 예정/진행 경기 및 최근 결과 확인', '전체 일정(/schedule)·결과(/schedule/results) 화면에서 관리'] },
      { heading: '선수 로스터 관리', bullets: ['선수/스태프 등록 및 제거', '등번호, 포지션, 투/타, 프로필 이미지/소개 수정'] },
      {
        heading: '팀 공지사항 운영',
        bullets: ['공지 작성: 제목/본문/카테고리 지정 후 등록', '공지 고정/해제: 중요 공지 상단 유지', '공지 삭제: 운영 정책에 맞는 공지 정리'],
      },
    ],
  },
];

const WEB_ADMIN_SECTIONS: ManualSection[] = [
  {
    id: 'web-admin-panel',
    title: '관리자 패널 (/admin)',
    icon: '🛡️',
    accent: '#EF4444',
    items: [
      { heading: '랜딩 관리 (/admin/landing)', bullets: ['LIVE INFO 티커, 메인 히어로 문구, 스냅샷 카드 등을 편집합니다.'] },
      { heading: '리그 소개 관리 (/admin/intro)', bullets: ['소개/히스토리/구조/포스트시즌 등 소개 콘텐츠를 편집합니다.'] },
      { heading: '회칙 관리 (/admin/rules)', bullets: ['회칙 헤더/챕터 JSON 구조를 편집합니다.'] },
      { heading: '팀 소개 관리 (/admin/teams)', bullets: ['참가팀/조편성 및 관련 문구를 편집합니다.'] },
      { heading: '권한 관리 (/admin/roles)', bullets: ['감독 권한 부여/해제를 관리합니다.'] },
      { heading: '서비스 점검 (/admin/maintenance)', bullets: ['점검 모드 ON/OFF 토글 — 관리자 외 모든 접근 차단', '서비스 재개 예정일 및 점검 메시지 설정', '저장 즉시 실시간 반영 (재배포 불필요)'] },
    ],
  },
  {
    id: 'web-admin-community',
    title: '공지 및 건의/문의 관리',
    icon: '💬',
    accent: '#22C55E',
    items: [
      {
        heading: '공지사항 작성 (/community/notices/new)',
        bullets: ['관리자 전용 공지 작성 — 카테고리: 일반/경기공지/징계/긴급', '등록 후 목록/상세에 즉시 반영'],
      },
      {
        heading: '건의/문의 처리 상태 관리',
        bullets: ['건의/문의 상세 페이지에서 처리 상태를 즉시 변경', '상태: 미처리(빨강) / 처리 중(노랑) / 처리 완료(초록)', '비밀글 포함 모든 글 열람 가능', '모든 글·댓글 수정 및 삭제 가능'],
      },
    ],
  },
  {
    id: 'web-admin-schedule',
    title: '경기 일정 관리',
    icon: '📋',
    accent: '#F97316',
    items: [
      {
        heading: '일정 관리 (/schedule/manage)',
        bullets: ['경기 생성/수정/삭제(휴지통 이동)', '경기 상태 전환: 예정/진행 중/종료/취소', '리그/플레이오프 구분 조정', '연습경기 포함 일정 운영'],
      },
    ],
  },
  {
    id: 'web-admin-game-edit',
    title: '경기 기록 수정 (/admin/games)',
    icon: '✏️',
    accent: '#F59E0B',
    items: [
      {
        heading: '경기 목록 (/admin/games)',
        bullets: ['완료·취소 경기를 최신순으로 나열합니다.', '날짜·대진·스코어를 확인 후 수정할 경기를 클릭합니다.'],
      },
      {
        heading: '라인업/박스스코어 수정',
        bullets: [
          '라인업: 홈팀·원정팀 선수의 이름·등번호·포지션을 인라인 수정합니다.',
          '박스스코어: 라인스코어, 합계, 타자/투수 기록표를 직접 편집합니다.',
          '수정 후 저장하면 Firestore에 즉시 반영됩니다.',
          '기록 집계는 경기 종료/수정 후 자동 반영되며 필요 시 관리자 재집계(rebuild stats)를 실행합니다.',
        ],
      },
    ],
  },
  {
    id: 'web-admin-scorekeeper',
    title: '전자 기록지 작성',
    icon: '📝',
    accent: '#22C55E',
    items: [
      {
        heading: '기록지 (/scorekeeper) — PC/태블릿 가로 모드 권장',
        bullets: ['경기 선택 및 라인업 입력', '플레이 기록: 볼/스트라이크/아웃, 타격 결과, 수비 결과, 주자 진루', '기록원 Lock: 동시 접속 충돌 방지', '저장/종료: 경기 종료 처리, CSV 기록지 다운로드'],
      },
    ],
  },
  {
    id: 'web-admin-live',
    title: '라이브 방송 제어',
    icon: '🎬',
    accent: '#A855F7',
    items: [
      {
        heading: '스코어보드 / 문자중계 / 오버레이',
        bullets: ['스코어보드(/scoreboard), 문자중계(/scoreboard-text) 상태 모니터링', '라이브 오버레이(/live-overlay) 송출 화면 점검', '기록원 입력 데이터가 중계 화면에 실시간 반영'],
      },
    ],
  },
];

type TroubleshootItem = { title: string; steps: string[] };

const WEB_TROUBLESHOOTING: TroubleshootItem[] = [
  {
    title: '로그인/권한 문제가 있을 때',
    steps: ['로그아웃 후 재로그인', '관리자 계정 여부 확인 (/account)', '관리자 기능 미노출 시 권한(admin claim, roles) 재확인'],
  },
  {
    title: '중계/기록 반영이 지연될 때',
    steps: ['페이지 새로고침', '활성 경기(match) 선택 상태 확인', '기록원 Lock 점유 상태 확인'],
  },
  {
    title: '종료 경기 기록을 수정해야 할 때',
    steps: [
      '/admin/games에서 해당 경기를 선택합니다.',
      '라인업 또는 박스스코어를 수정하고 저장합니다.',
      '집계 반영이 지연되면 관리자 재집계(rebuild stats)를 실행합니다.',
      '재집계 후에도 반영이 안 되면 잠시 후 기록 페이지를 새로고침합니다.',
    ],
  },
];

const ROLE_SECTION_MAP: Record<RoleTab, ManualSection[]> = {
  '방문자': WEB_GUEST_SECTIONS,
  '일반 회원': WEB_MEMBER_SECTIONS,
  '관리자/기록원': WEB_ADMIN_SECTIONS,
};

const WEB_META = {
  badge: 'HOMESTEAL · WEB MANUAL',
  title: 'HOMESTEAL 웹 플랫폼 사용 설명서',
  description: '방문자, 일반 회원, 관리자/기록원별로 웹에서 사용 가능한 기능을 안내합니다.',
  note: '브라우저 권장: 최신 Chrome, Safari, Edge',
  gradient:
    'radial-gradient(circle at 10% 20%, rgba(96,165,250,0.14), transparent 30%), radial-gradient(circle at 88% 5%, rgba(34,197,94,0.12), transparent 24%), linear-gradient(140deg, #0a1a3f 0%, #0f2f8f 100%)',
} as const;

function ScreenshotSlot({ label }: { label: string }) {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '16/9',
        borderRadius: '12px',
        border: '2px dashed rgba(148,163,184,0.3)',
        background: 'rgba(255,255,255,0.02)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        color: '#64748B',
        fontSize: '13px',
        marginTop: '12px',
      }}
    >
      <span style={{ fontSize: '28px', opacity: 0.5 }}>🖼️</span>
      <span>스크린샷: {label}</span>
    </div>
  );
}

function SectionAccordion({ section }: { section: ManualSection }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bodyRef.current) return;
    if (open) {
      gsap.fromTo(bodyRef.current, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.35, ease: 'power2.out' });
    } else {
      gsap.to(bodyRef.current, { height: 0, opacity: 0, duration: 0.25, ease: 'power2.in' });
    }
  }, [open]);

  return (
    <div
      style={{
        borderRadius: '16px',
        border: `1px solid ${open ? section.accent + '55' : 'rgba(148,163,184,0.2)'}`,
        background: open ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
        transition: 'border-color 0.3s, background 0.3s',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '18px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#e2e8f0',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>{section.icon}</span>
          <span style={{ fontWeight: 800, fontSize: 'clamp(15px, 4vw, 17px)' }}>{section.title}</span>
        </span>
        <span
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#94a3b8',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s',
            flexShrink: 0,
          }}
        >
          ▾
        </span>
      </button>

      <div ref={bodyRef} style={{ height: 0, opacity: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gap: '20px', padding: '0 20px 20px' }}>
          {section.items.map((item) => (
            <div key={item.heading}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '15px', color: section.accent, marginBottom: '8px' }}>{item.heading}</p>
              <div style={{ display: 'grid', gap: '4px' }}>
                {item.bullets.map((bullet, i) => (
                  <p
                    key={i}
                    style={{
                      margin: 0,
                      color: '#cbd5e1',
                      lineHeight: 1.7,
                      fontSize: 'clamp(13px, 3.4vw, 14px)',
                      paddingLeft: '12px',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: section.accent }}>•</span>
                    {bullet}
                  </p>
                ))}
              </div>
              {item.screenshot ? (
                <img
                  src={item.screenshot}
                  alt={item.heading}
                  style={{ width: '100%', borderRadius: '12px', marginTop: '12px', border: '1px solid rgba(148,163,184,0.2)' }}
                />
              ) : (
                <ScreenshotSlot label={item.heading} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UserManualPage() {
  const [activeTab, setActiveTab] = useState<RoleTab>('방문자');
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const blocks = pageRef.current?.querySelectorAll('.manual-chunk');
      if (blocks) {
        gsap.fromTo(blocks, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: 'power2.out' });
      }
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const sections = pageRef.current?.querySelectorAll('.manual-section');
      if (sections) {
        gsap.fromTo(sections, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power2.out' });
      }
    });
    return () => ctx.revert();
  }, [activeTab]);

  const sections = ROLE_SECTION_MAP[activeTab];

  return (
    <div style={{ display: 'grid', gap: '28px' }} ref={pageRef}>
      <section
        className="manual-chunk"
        style={{
          display: 'grid',
          gap: '14px',
          padding: 'clamp(24px, 6vw, 34px)',
          borderRadius: 'var(--surface-radius-lg, 24px)',
          background: WEB_META.gradient,
          border: '1px solid rgba(148,163,184,0.25)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '8px 12px',
              borderRadius: '999px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              background: 'rgba(96,165,250,0.16)',
              color: '#bfdbfe',
              border: '1px solid rgba(96,165,250,0.35)',
              fontSize: 'clamp(11px, 2.8vw, 12px)',
            }}
          >
            {WEB_META.badge}
          </span>
        </div>
        <h2 style={{ margin: 0, fontSize: 'clamp(22px, 5.5vw, 32px)', lineHeight: 1.25, fontWeight: 900 }}>{WEB_META.title}</h2>
        <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.7, maxWidth: '800px', fontSize: 'clamp(14px, 3.6vw, 15px)' }}>
          {WEB_META.description}
        </p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: '#94a3b8', fontSize: '12px' }}>{WEB_META.note}</span>
        </div>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#93c5fd',
            fontWeight: 700,
            fontSize: 'clamp(13px, 3.4vw, 14px)',
          }}
        >
          ← 메인으로 돌아가기
        </Link>
      </section>

      <section className="manual-chunk">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {ROLE_TABS.map((tab) => {
            const isActive = activeTab === tab;
            const colors: Record<RoleTab, string> = { '방문자': '#60A5FA', '일반 회원': '#22C55E', '관리자/기록원': '#EF4444' };
            const icons: Record<RoleTab, string> = { '방문자': '👥', '일반 회원': '👤', '관리자/기록원': '🛡️' };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: `1px solid ${isActive ? colors[tab] + '88' : 'rgba(148,163,184,0.2)'}`,
                  background: isActive ? colors[tab] + '18' : 'rgba(255,255,255,0.02)',
                  color: isActive ? colors[tab] : '#94a3b8',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{icons[tab]}</span>
                {tab}
              </button>
            );
          })}
        </div>
      </section>

      <section className="manual-chunk" style={{ display: 'grid', gap: '12px' }}>
        {sections.map((section) => (
          <div key={section.id} className="manual-section">
            <SectionAccordion section={section} />
          </div>
        ))}
      </section>

      <section
        className="manual-chunk"
        style={{
          display: 'grid',
          gap: '14px',
          padding: '24px',
          borderRadius: '18px',
          border: '1px solid rgba(148,163,184,0.2)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1' }}>
          <span style={{ fontSize: '18px' }}>🔧</span>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '17px' }}>문제 해결</p>
        </div>
        {WEB_TROUBLESHOOTING.map((item) => (
          <div
            key={item.title}
            style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(148,163,184,0.15)' }}
          >
            <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#e2e8f0', fontSize: '14px' }}>{item.title}</p>
            {item.steps.map((step, i) => (
              <p
                key={i}
                style={{ margin: '0 0 4px', color: '#94a3b8', fontSize: '13px', paddingLeft: '18px', position: 'relative', lineHeight: 1.6 }}
              >
                <span style={{ position: 'absolute', left: 0, fontWeight: 700, color: '#60A5FA' }}>{i + 1}.</span>
                {step}
              </p>
            ))}
          </div>
        ))}
      </section>

      <section
        className="manual-chunk"
        style={{
          padding: '20px 24px',
          borderRadius: '14px',
          border: '1px solid rgba(148,163,184,0.15)',
          background: 'rgba(255,255,255,0.02)',
          color: '#64748B',
          fontSize: 'clamp(12px, 3vw, 13px)',
          lineHeight: 1.7,
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0 }}>문서 버전: 2026-03-07 · 일부 관리 기능은 데스크톱 또는 태블릿 가로 모드를 권장합니다.</p>
      </section>
    </div>
  );
}
