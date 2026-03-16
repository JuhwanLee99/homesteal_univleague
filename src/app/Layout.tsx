// **`src/app/Layout.tsx`**

import { Outlet, Link, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../shared/auth/AuthProvider';
import { useAdmin } from '../shared/auth/useAdmin';
import { useDemoStore } from '../shared/state/demoStore';
import { ContentProvider } from '../shared/state/contentProvider';

const MOBILE_NOTICE_KEY = 'homesteal:mobileNotice:v1';
const MOBILE_NOTICE_SNOOZE_MS = 1000 * 60 * 60 * 24; // 모바일 팝업 24시간 스누즈

export default function Layout() {
  const location = useLocation();
  const { user, logout, initializing } = useAuth();
  const { isAdmin, canUseScorekeeper, roleLabel, roleDetail } = useAdmin();
  const { state } = useDemoStore();
  const isLiveOverlay = location.pathname.startsWith('/live-overlay');
  const isScoreboardText = location.pathname.startsWith('/scoreboard-text');
  const headerInnerRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches ? 'mobile' : 'desktop',
  );
  const [showMobileNotice, setShowMobileNotice] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-preview-mode', previewMode);
  }, [previewMode]);

  // 첫 방문 모바일 사용자에게 PC 최적화 안내
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isLiveOverlay) return;
    const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
    if (!isMobileViewport) return;
    const stored = window.localStorage.getItem(MOBILE_NOTICE_KEY);
    let snoozedUntil = 0;
    let dismissedPermanently = false;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { snoozedUntil?: number; dismissedPermanently?: boolean; updatedAt?: number };
        snoozedUntil = parsed.snoozedUntil ?? 0;
        dismissedPermanently = Boolean(parsed.dismissedPermanently);
      } catch {
        // 기존 ISO 문자열 등은 무시하고 다시 표시
      }
    }
    const now = Date.now();
    if (dismissedPermanently) return;
    if (now < snoozedUntil) return;
    const timer = window.setTimeout(() => setShowMobileNotice(true), 0);
    return () => window.clearTimeout(timer);
  }, [isLiveOverlay]);

  const handleMobileNoticeConfirm = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MOBILE_NOTICE_KEY, JSON.stringify({ updatedAt: Date.now(), lastAction: 'confirm' }));
    }
    setShowMobileNotice(false);
  }, []);

  const handleMobileNoticeSnoozeDay = useCallback(() => {
    if (typeof window !== 'undefined') {
      const now = Date.now();
      window.localStorage.setItem(
        MOBILE_NOTICE_KEY,
        JSON.stringify({ updatedAt: now, lastAction: 'snooze', snoozedUntil: now + MOBILE_NOTICE_SNOOZE_MS }),
      );
    }
    setShowMobileNotice(false);
  }, []);

  const handleMobileNoticeNever = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        MOBILE_NOTICE_KEY,
        JSON.stringify({ updatedAt: Date.now(), lastAction: 'never', dismissedPermanently: true }),
      );
    }
    setShowMobileNotice(false);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  const activeMatch = useMemo(() => state.matches.find((m) => m.id === state.activeMatchId), [state.matches, state.activeMatchId]);
  const hasLiveOverlay = Boolean((activeMatch?.liveVideoUrl || '').trim());
  const isMobileHeader = previewMode === 'mobile';
  const scorekeeperPath = state.activeMatchId ? `/scorekeeper/${state.activeMatchId}` : '/scorekeeper';

  const navItems = useMemo(
    () => [
      {
        path: '/intro',
        label: '리그 소개',
        children: [
          { path: '/rules', label: '회칙' },
          { path: '/intro/teams', label: '참가팀' },
        ],
      },
      {
        path: '/schedule',
        label: '경기 일정',
        children: [
          { path: '/schedule', label: '정규리그 · 포스트시즌' },
          { path: '/schedule/results', label: '경기 결과' },
          { path: '/schedule/practice', label: '연습경기' },
          { path: '/schedule/manage', label: '일정 관리', requiresAdmin: true },
        ],
      },
      {
        path: '/records?tab=batters',
        label: '기록',
        children: [
          { path: '/records?tab=pitchers', label: '투수 기록' },
          { path: '/records?tab=batters', label: '타자 기록' },
        ],
      },
      {
        path: '/community',
        label: '커뮤니티',
        children: [
          { path: '/community/notices', label: '공지사항' },
          { path: '/community/board', label: '자유게시판' },
        ],
      },
      {
        path: '/records?tab=standings',
        label: '순위',
      },
      // 기록원: 항상 보이지만 비권한 사용자는 클릭 시 안내 버블만 노출
      { path: scorekeeperPath, label: '기록원', requiresScorekeeper: true, showWhenBlocked: true },
      { path: '/manual', label: '사용설명서' },
    ],
    [scorekeeperPath],
  );
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [hoveredChildMenu, setHoveredChildMenu] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const filteredNavItems = useMemo(
    () =>
      navItems.filter((item) => {
        if (item.requiresAdmin && !isAdmin) {
          return item.showWhenBlocked === true;
        }
        if (item.requiresScorekeeper && !canUseScorekeeper) {
          return item.showWhenBlocked === true;
        }
        return true;
      }),
    [navItems, isAdmin, canUseScorekeeper],
  );

  const isRouteActive = useCallback(
    (target: string, options?: { prefix?: boolean }) => {
      const [targetPathname, targetSearch = ''] = target.split('?');
      const prefix = options?.prefix === true;
      const pathnameMatches = prefix
        ? location.pathname === targetPathname || location.pathname.startsWith(`${targetPathname}/`)
        : location.pathname === targetPathname;
      if (!pathnameMatches) return false;
      if (!targetSearch) return true;

      const expected = new URLSearchParams(targetSearch);
      const current = new URLSearchParams(location.search);
      for (const [key, value] of expected.entries()) {
        if (current.get(key) !== value) return false;
      }
      return true;
    },
    [location.pathname, location.search],
  );

  const isStandingsView = useMemo(() => {
    if (location.pathname === '/standings') return true;
    if (location.pathname !== '/records') return false;
    const tabParam = new URLSearchParams(location.search).get('tab');
    return tabParam == null || tabParam === '' || tabParam === 'standings';
  }, [location.pathname, location.search]);

  const activeParentPath = useMemo(() => {
    if (hoveredMenu) {
      const hoveredHasChildren = filteredNavItems.some((item) => item.path === hoveredMenu && item.children);
      if (hoveredHasChildren) return hoveredMenu;
    }

    if (isStandingsView) return '/records?tab=standings';
    if (location.pathname.startsWith('/records')) return '/records?tab=batters';
    if (location.pathname === '/rules' || location.pathname.startsWith('/intro')) return '/intro';
    if (location.pathname.startsWith('/schedule')) return '/schedule';
    if (location.pathname.startsWith('/community')) return '/community';
    if (location.pathname.startsWith('/scorekeeper')) return scorekeeperPath;
    if (location.pathname === '/manual') return '/manual';

    const matched = filteredNavItems.find((item) => {
      // External link check
      if ((item as { isExternal?: boolean }).isExternal) return false;

      if (item.children?.some((child) => isRouteActive(child.path, { prefix: Boolean((child as { matchPrefix?: boolean }).matchPrefix) }))) {
        return true;
      }
      if (item.children && isRouteActive(item.path)) return true;
      return isRouteActive(item.path);
    });

    return matched?.path ?? null;
  }, [hoveredMenu, filteredNavItems, isStandingsView, location.pathname, scorekeeperPath, isRouteActive]);

  const activeChildren = useMemo(() => {
    const parent = filteredNavItems.find((item) => item.path === activeParentPath);
    return parent?.children?.filter((child) => !child.requiresAdmin || isAdmin) ?? [];
  }, [activeParentPath, filteredNavItems, isAdmin]);
  const showSubnav = activeChildren.length > 0;
  const [subnavAnchor, setSubnavAnchor] = useState<number | null>(null);

  useEffect(() => {
    if (!showSubnav || !activeParentPath) {
      return;
    }

    const recalcAnchor = () => {
      const parentEl = linkRefs.current[activeParentPath];
      const headerEl = headerInnerRef.current;
      if (!parentEl || !headerEl) return;

      const parentRect = parentEl.getBoundingClientRect();
      const headerRect = headerEl.getBoundingClientRect();
      setSubnavAnchor(parentRect.left + parentRect.width / 2 - headerRect.left);
    };

    recalcAnchor();
    window.addEventListener('resize', recalcAnchor);
    return () => window.removeEventListener('resize', recalcAnchor);
  }, [showSubnav, activeParentPath, location.pathname]);

  return (
    <ContentProvider>
      <div className="app-shell">
      {!isLiveOverlay && (
        <header className="app-header">
          <div
            className="app-header__inner"
            ref={headerInnerRef}
            onMouseLeave={() => {
              setHoveredMenu(null);
              setHoveredChildMenu(null);
            }}
            style={{
              position: 'relative',
              alignItems: 'center',
              height: isMobileHeader
                ? showSubnav
                  ? 'calc(var(--header-height) + 64px)'
                  : 'calc(var(--header-height) + 32px)'
                : showSubnav
                  ? 'calc(var(--header-height) + 32px)'
                  : 'var(--header-height)',
              transition: 'height 180ms ease',
              padding: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 'var(--header-height)',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: isMobileHeader ? 'wrap' : 'nowrap',
                rowGap: isMobileHeader ? '8px' : '0px',
                columnGap: '12px',
                padding: 'var(--header-padding)',
                paddingTop: isMobileHeader ? '8px' : '10px',
                boxSizing: 'border-box',
              }}
            >
              <Link
                to="/"
                style={{
                  fontSize: 'clamp(20px, 4vw, 24px)',
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  color: '#cbd5e1',
                  whiteSpace: 'nowrap',
                }}
              >
                HOMESTEAL
                <span
                  style={{
                    color: '#cbd5e1',
                    transition: 'color 140ms ease',
                  }}
                >
                  .
                </span>
              </Link>
              <nav
                className="nav-scroll"
                style={{
                  marginLeft: isMobileHeader ? 0 : 'auto',
                  flex: isMobileHeader ? '0 0 100%' : 1,
                  width: isMobileHeader ? '100%' : undefined,
                  minWidth: 0,
                  paddingLeft: isMobileHeader ? '14px' : '18px',
                  paddingRight: isMobileHeader ? '8px' : 0,
                  marginRight: isMobileHeader ? '-6px' : 0,
                  position: 'relative',
                  order: isMobileHeader ? 3 : undefined,
                  marginTop: isMobileHeader ? '4px' : 0,
                }}
              >
                <div className="nav-scroll__rail">
                  {filteredNavItems.map((item) => {
                    const isActive = activeParentPath === item.path || isRouteActive(item.path);
                    const isHovering = hoveredMenu === item.path;
                    const blocked = (item.requiresAdmin && !isAdmin) || (item.requiresScorekeeper && !canUseScorekeeper);
                    const isExternal = (item as { isExternal?: boolean }).isExternal;

                    const handleBlockedHover = (el: HTMLAnchorElement | null) => {
                      if (!blocked || !el) return;
                      const rect = el.getBoundingClientRect();
                      setTooltip({
                        text: item.requiresScorekeeper ? '기록원/관리자 권한이 필요합니다' : '관리자 로그인이 필요합니다',
                        x: rect.left + rect.width / 2,
                        y: rect.bottom,
                      });
                    };

                    const style = {
                      fontSize: 'var(--nav-font-size)',
                      fontWeight: 900,
                      color: blocked ? 'rgba(203,213,225,0.55)' : isActive || isHovering ? '#93c5fd' : '#e2e8f0',
                      transition: 'color 120ms ease',
                      whiteSpace: 'nowrap',
                      scrollSnapAlign: 'start',
                      padding: '10px 0',
                      cursor: blocked ? 'not-allowed' : 'pointer',
                      textDecoration: 'none',
                    };

                    if (isExternal) {
                      return (
                        <a
                          key={item.path}
                          href={item.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={style}
                          ref={(el) => {
                            linkRefs.current[item.path] = el;
                          }}
                          onMouseEnter={() => {
                            setHoveredMenu(item.path);
                            setHoveredChildMenu(null);
                          }}
                          onMouseLeave={() => {
                            setTooltip(null);
                          }}
                          onFocus={() => {
                            setHoveredMenu(item.path);
                          }}
                          onBlur={() => setTooltip(null)}
                        >
                          {item.label}
                        </a>
                      );
                    }

                    return (
                      <Link
                        key={item.path}
                        to={blocked ? location.pathname : item.path}
                        style={style}
                        ref={(el) => {
                          linkRefs.current[item.path] = el;
                        }}
                        onMouseEnter={() => {
                          setHoveredMenu(item.path);
                          setHoveredChildMenu(null);
                          handleBlockedHover(linkRefs.current[item.path]);
                        }}
                        onMouseLeave={() => {
                          setTooltip(null);
                        }}
                        onFocus={() => {
                          setHoveredMenu(item.path);
                          setHoveredChildMenu(null);
                          handleBlockedHover(linkRefs.current[item.path]);
                        }}
                        onBlur={() => setTooltip(null)}
                        onClick={(e) => {
                          if (blocked) {
                            e.preventDefault();
                            handleBlockedHover(linkRefs.current[item.path]);
                            return;
                          }
                          if (item.children) {
                            setHoveredMenu(item.path);
                            setHoveredChildMenu(null);
                          }
                        }}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </nav>

              {tooltip && (
                <div
                  style={{
                    position: 'fixed',
                    left: tooltip.x,
                    top: tooltip.y + 10,
                    transform: 'translate(-50%, 0)',
                    background: 'rgba(15,23,42,0.95)',
                    color: '#bfdbfe',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(148,163,184,0.35)',
                    fontSize: '12px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                    zIndex: 2000,
                  }}
                >
                  {tooltip.text}
                </div>
              )}

              {isScoreboardText && !isMobileHeader && (
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    marginLeft: isMobileHeader ? 0 : '12px',
                    background: 'rgba(148,163,184,0.12)',
                    borderRadius: '999px',
                    padding: '6px 8px',
                    flexShrink: 0,
                    order: isMobileHeader ? 2 : undefined,
                    flexWrap: 'wrap',
                  }}
                >
                  <Link
                    to="/scoreboard-text"
                    aria-current="page"
                    style={{
                      border: 'none',
                      background: 'linear-gradient(120deg, #1e3a8a, #1d4ed8)',
                      color: '#eaf2ff',
                      fontWeight: 800,
                      fontSize: '13px',
                      borderRadius: '999px',
                      padding: '6px 12px',
                      textDecoration: 'none',
                      boxShadow: '0 8px 18px rgba(29,78,216,0.3)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    문자중계
                  </Link>
                  {hasLiveOverlay ? (
                    <Link
                      to="/live-overlay"
                      style={{
                        border: 'none',
                        background: 'rgba(148,163,184,0.25)',
                        color: '#e2e8f0',
                        fontWeight: 800,
                        fontSize: '13px',
                        borderRadius: '999px',
                        padding: '6px 12px',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                      }}
                      title="라이브 오버레이"
                    >
                      라이브 오버레이
                    </Link>
                  ) : (
                    <span
                      style={{
                        border: '1px dashed rgba(59,130,246,0.65)',
                        background: 'rgba(30,58,138,0.2)',
                        color: '#bfdbfe',
                        fontWeight: 800,
                        fontSize: '13px',
                        borderRadius: '999px',
                        padding: '6px 12px',
                        whiteSpace: 'nowrap',
                      }}
                      title="이 경기에는 라이브 링크가 없습니다"
                    >
                      라이브 없음
                    </span>
                  )}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobileHeader ? '6px' : '10px',
                  marginLeft: isMobileHeader ? 'auto' : isScoreboardText ? '8px' : '12px',
                  order: isMobileHeader ? 2 : undefined,
                  flexWrap: 'nowrap',
                  justifyContent: isMobileHeader ? 'flex-end' : 'flex-start',
                  width: 'auto',
                  flexShrink: isMobileHeader ? 0 : undefined,
                }}
              >
                {initializing ? (
                  <span style={{ color: '#cbd5e1', fontSize: '13px' }}>로그인 확인 중...</span>
                ) : user ? (
                  <>
                    {isAdmin ? (
                      <Link to="/admin" style={{ textDecoration: 'none' }}>
                        <span
                          className="badge-hoverable"
                          style={{
                            padding: '6px 10px',
                            borderRadius: '10px',
                            background: 'linear-gradient(120deg, rgba(30,58,138,0.34), rgba(37,99,235,0.32))',
                            color: '#bfdbfe',
                            fontWeight: 800,
                            fontSize: '12px',
                            border: '1px solid rgba(59,130,246,0.45)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                            display: 'inline-block',
                          }}
                          title={`권한: ${roleLabel} (${roleDetail}) · 클릭하면 관리자 페이지로 이동`}
                        >
                          {roleLabel}
                        </span>
                      </Link>
                    ) : (
                      <span
                        className="badge-hoverable"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '10px',
                          background: 'rgba(148,163,184,0.18)',
                          color: '#e2e8f0',
                          fontWeight: 800,
                          fontSize: '12px',
                          border: '1px solid rgba(148,163,184,0.35)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                        }}
                        title={`권한: ${roleLabel} (${roleDetail})`}
                      >
                        {roleLabel}
                      </span>
                    )}
                    <Link
                      to="/account"
                      className="badge-hoverable"
                      style={{
                        padding: isMobileHeader ? '6px 10px' : '8px 12px',
                        borderRadius: '999px',
                        background: 'rgba(148,163,184,0.16)',
                        color: '#e2e8f0',
                        fontWeight: 700,
                        fontSize: isMobileHeader ? '12px' : '13px',
                        maxWidth: isMobileHeader ? '120px' : '180px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textDecoration: 'none',
                        border: '1px solid rgba(148,163,184,0.3)',
                        display: 'inline-block',
                      }}
                      title="계정 페이지로 이동"
                    >
                      {user.email ?? user.uid}
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      style={{
                        background: 'rgba(148,163,184,0.25)',
                        color: '#e2e8f0',
                        padding: isMobileHeader ? '6px 10px' : '8px 12px',
                        borderRadius: '12px',
                        fontSize: isMobileHeader ? '12px' : '13px',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      로그아웃
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    style={{
                      background: 'linear-gradient(120deg, #1e3a8a, #1d4ed8)',
                      color: '#eaf2ff',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      fontWeight: 900,
                      fontSize: '13px',
                      boxShadow: '0 10px 24px rgba(29,78,216,0.34)',
                    }}
                  >
                    로그인
                  </Link>
                )}
              </div>
            </div>

            <div
              onMouseEnter={() => {
                if (activeParentPath) setHoveredMenu(activeParentPath);
              }}
              onMouseLeave={() => {
                setHoveredMenu(null);
                setHoveredChildMenu(null);
              }}
              style={{
                position: 'absolute',
                top: isMobileHeader ? 'calc(var(--header-height) + 24px)' : 'calc(var(--header-height) - 6px)',
                left: 0,
                width: '100%',
                height: showSubnav ? '32px' : '0px',
                overflow: 'visible',
                pointerEvents: showSubnav ? 'auto' : 'none',
                opacity: showSubnav ? 1 : 0,
                transform: showSubnav ? 'translateY(0px)' : 'translateY(-4px)',
                transition: 'opacity 140ms ease, transform 160ms ease',
                zIndex: 20,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: subnavAnchor !== null ? `${subnavAnchor}px` : '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '3px',
                  padding: '1px 4px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 0,
                  boxShadow: 'none',
                  backdropFilter: 'none',
                  alignItems: 'center',
                  minHeight: '10px',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeChildren.map((child) => {
                  const isActiveChild = isRouteActive(
                    child.path,
                    { prefix: Boolean((child as { matchPrefix?: boolean }).matchPrefix) },
                  );
                  const isHoveringChild = hoveredChildMenu === child.path;
                  return (
                    <Link
                      key={child.path}
                      to={child.path}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 800,
                        fontSize: '13px',
                        color: isActiveChild || isHoveringChild ? '#bfdbfe' : '#e2e8f0',
                        padding: '6px 6px',
                        borderBottom: isActiveChild ? '2px solid #60a5fa' : '2px solid transparent',
                        transition: 'color 120ms ease, border-color 120ms ease, transform 120ms ease',
                        whiteSpace: 'nowrap',
                        transform: isActiveChild ? 'translateY(-1px)' : 'translateY(0)',
                      }}
                      onMouseEnter={() => {
                        if (activeParentPath) setHoveredMenu(activeParentPath);
                        setHoveredChildMenu(child.path);
                      }}
                      onMouseLeave={() => setHoveredChildMenu(null)}
                      onFocus={() => {
                        if (activeParentPath) setHoveredMenu(activeParentPath);
                        setHoveredChildMenu(child.path);
                      }}
                      onBlur={() => setHoveredChildMenu(null)}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="app-main" style={isLiveOverlay ? { maxWidth: '100%', margin: 0, padding: 0 } : undefined}>
        {!isLiveOverlay && showMobileNotice && (
          <div
            role="alertdialog"
            aria-live="polite"
            style={{
              position: 'relative',
              display: 'flex',
              gap: '14px',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              padding: '18px 20px',
              marginBottom: '18px',
              borderRadius: '18px',
              border: '1px solid rgba(248,184,12,0.4)',
              background: 'linear-gradient(120deg, rgba(30,41,59,0.92), rgba(15,23,42,0.92))',
              boxShadow: '0 18px 46px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: '220px' }}>
              <span style={{ fontSize: '24px', lineHeight: 1 }}>💻</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#fde68a' }}>PC 화면에 최적화된 사이트입니다.</div>
                <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.55 }}>
                  모바일 버전은 아직 최적화 중이라 일부 레이아웃이 깨질 수 있어요. 원활한 이용을 위해 PC 브라우저 사용을 권장합니다.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleMobileNoticeConfirm}
                style={{
                  background: 'linear-gradient(120deg, #1e3a8a, #1d4ed8)',
                  color: '#eaf2ff',
                  padding: '11px 14px',
                  fontWeight: 900,
                  fontSize: '13px',
                  borderRadius: '12px',
                  boxShadow: '0 10px 24px rgba(29,78,216,0.32)',
                }}
              >
                확인
              </button>
              <button
                type="button"
                onClick={handleMobileNoticeSnoozeDay}
                style={{
                  background: 'rgba(15,23,42,0.7)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(148,163,184,0.45)',
                  padding: '10px 12px',
                  fontWeight: 800,
                  fontSize: '12px',
                  borderRadius: '10px',
                }}
              >
                하루 동안 보지 않기
              </button>
              <button
                type="button"
                onClick={handleMobileNoticeNever}
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  color: '#fecdd3',
                  border: '1px solid rgba(248,113,113,0.45)',
                  padding: '10px 12px',
                  fontWeight: 800,
                  fontSize: '12px',
                  borderRadius: '10px',
                }}
              >
                다시 보지 않기
              </button>
            </div>
          </div>
        )}

        <Outlet />
      </main>

      {!isLiveOverlay && (
        <footer
          style={{
            marginTop: 'auto',
            borderTop: '1px solid rgba(148, 163, 184, 0.2)',
            padding: '32px 0',
            color: '#94a3b8',
            fontSize: '14px',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 24px' }}>
            &copy; 2026 Homsteal Univleague. All rights reserved.
          </div>
          <div className="preview-toggle-inline">
            <span className="preview-toggle-inline__label">보기 전환</span>
            {(['desktop', 'mobile'] as const).map((mode) => {
              const isActive = previewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreviewMode(mode)}
                  className={`preview-toggle-inline__button${isActive ? ' is-active' : ''}`}
                >
                  {mode === 'desktop' ? 'PC 보기' : '모바일 보기'}
                </button>
              );
            })}
          </div>
        </footer>
      )}
      </div>
    </ContentProvider>
  );
}
