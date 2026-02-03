import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { doc, getDoc, increment, onSnapshot, setDoc } from 'firebase/firestore';
import { firestore } from '../firebase/client';
import type { GroupLetter } from '../lib/teamGroups';
import { DEFAULT_RULE_HOST_ORDER } from '../content/defaultRules';

export type HistoryHighlight = { title: string; desc: string; accent: string };
export type GovernanceItem = { label: string; value: string; detail: string };
export type StructureCard = { title: string; points: string[] };
export type PostseasonMatch = { title: string; matchups: string[] };
export type HeroMetric = { label: string; value: string; note: string };

export type IntroContent = {
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  historyHighlights: HistoryHighlight[];
  governance: GovernanceItem[];
  structureCards: StructureCard[];
  postseasonMatches: PostseasonMatch[];
  heroMetrics: HeroMetric[];
};

export type LandingValueProp = { title: string; desc: string; icon: string };
export type LandingSnapshotCard = { label: string; value: string; desc: string };
export type LandingSeasonHighlight = { title: string; desc: string; icon: string; link: string };

export type LandingContent = {
  heroEyebrow: string;
  heroBadgeText: string;
  heroTitle: string;
  heroDescription: string;
  heroSubDescription: string;
  valueProps: LandingValueProp[];
  snapshotCards: LandingSnapshotCard[];
  seasonHighlights: LandingSeasonHighlight[];
};

export type RuleArticle = { title: string; body: string[] };
export type RuleChapter = { id: string; title: string; accent: string; articles: RuleArticle[] };
export type RulesContent = {
  headerBadge: string;
  headerTitle: string;
  headerDescription: string;
  chapters: RuleChapter[];
  hostOrder: string[];
  appendixText: string;
};

export type TeamContentEntry = { name: string; group?: GroupLetter };
export type TeamsContent = {
  pageBadge: string;
  pageTitle: string;
  pageDescription: string;
  pageNote: string;
  entries: TeamContentEntry[];
};

export type BrandContent = {
  leagueName: string;
  seasonLabel: string;
  leagueDescription: string;
  instagramUrl: string;
  rulesPdfPath: string;
  teamLogoPath: string;
  leagueLogoPath: string;
  accentRed: string;
  accentNavy: string;
  accentLight: string;
};

export type ContentState = {
  brand: BrandContent;
  tickerItems: string[];
  landing: LandingContent;
  intro: IntroContent;
  rules: RulesContent;
  teams: TeamsContent;
};

const DEFAULT_BRAND: BrandContent = {
  leagueName: 'HOMESTEAL UNIVLEAGUE',
  seasonLabel: '2026 HOMESTEAL CUP',
  leagueDescription: '대학야구교류전 공식 웹 플랫폼',
  instagramUrl: 'https://www.instagram.com/homesteal_univleague/',
  rulesPdfPath: '/assets/homesteal-univleague-rules.pdf',
  teamLogoPath: '/assets/homesteal.jpg',
  leagueLogoPath: '/assets/univ_league.jpg',
  accentRed: '#7a1221',
  accentNavy: '#050a2a',
  accentLight: '#e7eaf4',
};

const DEFAULT_LANDING: LandingContent = {
  heroEyebrow: 'HOMESTEAL UNIVLEAGUE',
  heroBadgeText: '2026 HOMESTEAL CUP · 대학야구교류전',
  heroTitle: 'HOMESTEAL\nUNIVLEAGUE',
  heroDescription:
    '중앙대학교 통일공대 야구동아리 홈스틸(Homsteal)이 운영하는 Homsteal Univ League는 대학야구교류전 규정을 기준으로 진행되는 단일리그입니다.\n정규리그 종료 후 포스트시즌(준결승·결승/3-4위전)으로 시즌 최종 순위를 확정합니다.',
  heroSubDescription: '운영 주체: 중앙대학교 통일공대 동아리 홈스틸 · 공식 소식: @homesteal_univleague',
  valueProps: [
    {
      title: '단일리그',
      desc: '팀당 6경기 풀리그로 정규시즌을 운영합니다.',
      icon: '⚾',
    },
    {
      title: '포스트시즌',
      desc: '정규리그 1vs2, 3vs4 준결승 이후 결승과 3-4위전을 진행합니다.',
      icon: '🏆',
    },
    {
      title: '규정 중심 운영',
      desc: '7이닝·시간제한·콜드게임·몰수 0:7 등 규정 중심 운영을 준수합니다.',
      icon: '📘',
    },
  ],
  snapshotCards: [
    { label: 'LEAGUE FORMAT', value: '팀당 6경기', desc: '단일 풀리그 운영' },
    { label: 'RANKING RULE', value: '승3 · 무1 · 패0', desc: '승점제 + 동률 규정 적용' },
    { label: 'POSTSEASON', value: '준결승/결승', desc: '1vs2, 3vs4 이후 결승/3-4위전' },
  ],
  seasonHighlights: [
    { title: '리그 규정', desc: '대학야구교류전 규정 전문과 핵심 요약을 확인하세요.', icon: '📄', link: '/rules' },
    { title: '일정/결과', desc: '정규리그·포스트시즌 일정과 경기 결과를 확인할 수 있습니다.', icon: '🗓️', link: '/schedule' },
    { title: '공식 채널', desc: '인스타그램(@homesteal_univleague)과 공지사항에서 운영 소식을 확인하세요.', icon: '📱', link: '/community' },
  ],
};

const DEFAULT_INTRO: IntroContent = {
  tagline: 'HOMESTEAL · INTRO',
  heroTitle: '2026 HOMESTEAL UNIVLEAGUE 안내',
  heroSubtitle: '대학야구교류전 단일리그',
  heroDescription:
    '중앙대학교 통일공대 야구동아리 홈스틸(Homsteal)이 주관하는 Homsteal Univ League는 대학야구교류전 규정 기반 단일리그입니다. 정규리그 성적을 바탕으로 포스트시즌 대진을 확정하고 시즌 최종 순위를 결정합니다.',
  historyHighlights: [
    { title: '정규리그', desc: '팀당 6경기 풀리그 운영', accent: '#7a1221' },
    { title: '포스트시즌', desc: '준결승(1vs2, 3vs4) 후 결승/3-4위전', accent: '#1e3a8a' },
    { title: '순위 산정', desc: '승점제 + 동률 규정(몰수패→무승부→승자승→득실차)', accent: '#334155' },
  ],
  governance: [
    { label: '운영 주체', value: '중앙대학교 통일공대 동아리 Homsteal', detail: '홈스틸 운영진이 경기 일정·공지·대진을 관리합니다.' },
    { label: '기록', value: '공식 기록원 운영', detail: '경기별 공식 기록을 작성하고 결과를 공유합니다.' },
    { label: '공식 채널', value: 'Instagram @homesteal_univleague', detail: '모집 일정, 경기 공지, 결과 요약을 인스타그램 및 홈페이지로 안내합니다.' },
  ],
  structureCards: [
    {
      title: '리그 운영',
      points: ['단일 풀리그 팀당 6경기', '정규리그 종료 후 상위 4팀 포스트시즌 진출', '경기 지연/미출전/몰수 규정 적용'],
    },
    {
      title: '경기 규정',
      points: ['7이닝 기준, 시간 제한 운영', '콜드게임: 3회15 / 4회10 / 5회8 / 6회7', '몰수경기 점수 0:7 적용'],
    },
    {
      title: '포스트시즌',
      points: ['준결승: 1위vs2위, 3위vs4위', '결승 및 3-4위전 진행', '플레이오프 무승부 시 리그 순위 우선'],
    },
  ],
  postseasonMatches: [
    { title: '준결승', matchups: ['리그 1위 vs 2위', '리그 3위 vs 4위'] },
    { title: '결승/3-4위전', matchups: ['준결승 승자 간 결승', '준결승 패자 간 3-4위전'] },
  ],
  heroMetrics: [
    { label: 'LEAGUE TYPE', value: '단일리그', note: '팀당 6경기 풀리그' },
    { label: 'POSTSEASON', value: '4팀 토너먼트', note: '준결승 + 결승/3-4위전' },
    { label: 'RULE CORE', value: '승점·콜드·몰수', note: '규정 중심 경기 운영' },
  ],
};

function cloneRuleChapters(chapters: RuleChapter[]): RuleChapter[] {
  return chapters.map((chapter) => ({
    ...chapter,
    articles: chapter.articles.map((article) => ({ ...article, body: [...article.body] })),
  }));
}

const PDF_RULE_CHAPTERS: RuleChapter[] = [
  {
    id: 'league-format',
    title: '제1장 리그',
    accent: '#d71f29',
    articles: [
      { title: '리그 편성', body: ['풀리그로 진행하며 팀당 6경기를 치른다.'] },
      { title: '포스트시즌', body: ['준결승: 리그 1위vs2위, 3위vs4위', '결승: 준결승 승자', '3-4위전: 준결승 패자'] },
    ],
  },
  {
    id: 'game-management',
    title: '제2장 경기',
    accent: '#0f1464',
    articles: [
      { title: '경기 시간', body: ['경기는 7회 기준으로 운영한다.', '정규리그 시간 제한 적용, 결승/3-4위전은 별도 기준을 적용한다.'] },
      { title: '콜드게임', body: ['3회 15점, 4회 10점, 5회 8점, 6회 7점 차에서 콜드게임을 선언한다.'] },
      { title: '복장/장비', body: ['전 야수 포인트화 착용, 장비 미비 시 경기 출전이 제한될 수 있다.', '동호인 안전을 위해 나무 배트를 기본 사용한다.'] },
      { title: '기록원', body: ['운영위원회 지정 기록원을 배정하며, 경기 종료 후 기록을 공유한다.'] },
    ],
  },
  {
    id: 'player-eligibility',
    title: '제3장 선수',
    accent: '#f97316',
    articles: [
      { title: '참가 자격', body: ['대학교/대학원 재적생만 참가 가능하다.', '선수 출신 규정은 문서 기준을 따른다.'] },
      { title: '제재', body: ['부정선수·무자격선수는 몰수패 및 리그 제재 대상이다.'] },
    ],
  },
  {
    id: 'forfeit',
    title: '제4장 몰수경기',
    accent: '#991b1b',
    articles: [
      { title: '몰수 처리', body: ['경기 개시 10분 경과 시 9인 미충족이면 몰수 처리될 수 있다.', '몰수경기 점수는 0:7로 처리한다.'] },
      { title: '반복 제재', body: ['2회 이상 몰수패 팀은 협회 판단에 따라 리그 퇴출될 수 있다.'] },
    ],
  },
  {
    id: 'results-awards',
    title: '제6장 성적 및 시상',
    accent: '#475569',
    articles: [
      { title: '팀 순위', body: ['승점제: 승 3점, 무 1점, 패 0점', '동률 시: 몰수패 없는 팀 → 무승부 많은 팀 → 승자승 → 득실차 순'] },
      { title: '시상', body: ['팀 시상: 1~4위 트로피', '개인상 및 MVP 시상 규정은 문서 원문을 따른다.'] },
    ],
  },
  {
    id: 'etc',
    title: '제7장 기타',
    accent: '#334155',
    articles: [
      { title: '보험 및 안전', body: ['출전 선수는 보험 가입이 필수이며 경기 중 사고는 규정에 따라 처리한다.'] },
      { title: '기록 문의', body: ['기록 수정 요청은 경기 종료 후 3일 이내에 제출한다.'] },
    ],
  },
];

const DEFAULT_RULES: RulesContent = {
  headerBadge: 'HOMESTEAL · RULES',
  headerTitle: '대학야구교류전 규정',
  headerDescription:
    '공식 규정 PDF를 기준으로 리그 운영, 경기 진행, 선수 자격, 몰수 규정, 성적·시상 기준을 적용합니다.',
  chapters: cloneRuleChapters(PDF_RULE_CHAPTERS),
  hostOrder: [...DEFAULT_RULE_HOST_ORDER],
  appendixText: '상세 조항 및 예외 규정은 공식 PDF 원문을 우선 적용합니다.',
};

const DEFAULT_TEAMS: TeamsContent = {
  pageBadge: 'HOMESTEAL · TEAMS',
  pageTitle: '2026 시즌 참가팀',
  pageDescription: '홈스틸 유니브리그 참가팀은 시즌 공지를 통해 확정되며, 단일리그 운영 후 상위 4팀이 포스트시즌에 진출합니다.',
  pageNote: '참가팀 명단은 리그 공지 및 대표자 회의 결과에 따라 업데이트됩니다.',
  entries: [],
};

const defaultContent: ContentState = {
  brand: DEFAULT_BRAND,
  tickerItems: [
    '📢 [공지] 2026 시즌 단일리그 운영 (팀당 6경기)',
    '🏆 [포스트시즌] 준결승(1vs2, 3vs4) → 결승/3-4위전',
    '📘 [규정] 승점제(승3/무1/패0), 몰수경기 0:7 적용',
    '📱 [공식채널] Instagram @homesteal_univleague',
  ],
  landing: DEFAULT_LANDING,
  intro: DEFAULT_INTRO,
  rules: DEFAULT_RULES,
  teams: DEFAULT_TEAMS,
};

type ContentContextValue = {
  content: ContentState;
  updateContent: (next: Partial<ContentState>) => void;
  resetContent: () => void;
};

const LEGACY_STORAGE_KEY = 'homesteal:content:v2';
const LIVE_STORAGE_KEY = 'homesteal:content:live:v2';
const STATIC_STORAGE_KEY = 'homesteal:content:static:v2';

const LEGACY_CONTENT_PATTERN =
  /AUBL|으뜸|버금|조편성|조별|승부예측|예선|본선|파워랭킹|Power Ranking|Bradley|Elo|BT Index|연합회|중앙대학교\\(서울\\)|중앙대학교 서울/i;
const HOMESTEAL_IDENTITY_PATTERN = /HOMESTEAL|홈스틸|UNIVLEAGUE|유니브리그/i;

const LEGACY_DOC = 'settings/homestealContent';
const LIVE_DOC = 'settings/homestealLiveInfo';
const STATIC_DOC = 'settings/homestealStaticContent';
const META_DOC = 'settings/homestealContentMeta';

const STATIC_KEYS: (keyof Omit<ContentState, 'tickerItems'>)[] = ['brand', 'landing', 'intro', 'rules', 'teams'];

const ContentContext = createContext<ContentContextValue>({
  content: defaultContent,
  updateContent: () => {},
  resetContent: () => {},
});

function deepMerge(base: ContentState, patch: Partial<ContentState>): ContentState {
  return {
    ...base,
    ...patch,
    brand: patch.brand ? { ...base.brand, ...patch.brand } : base.brand,
    landing: patch.landing ? { ...base.landing, ...patch.landing } : base.landing,
    intro: patch.intro ? { ...base.intro, ...patch.intro } : base.intro,
    rules: patch.rules ? { ...base.rules, ...patch.rules } : base.rules,
    teams: patch.teams ? { ...base.teams, ...patch.teams } : base.teams,
  };
}

function readLocalCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeLocalCache(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

function hasField<T extends object>(obj: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizeTicker(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeTeamsEntries(value: unknown, fallback: TeamContentEntry[]): TeamContentEntry[] {
  if (!Array.isArray(value)) return fallback;
  const next: TeamContentEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const name = typeof (item as { name?: unknown }).name === 'string' ? (item as { name: string }).name.trim() : '';
    if (!name) continue;
    next.push({ name });
  }
  return next.length ? next : fallback;
}

function hasLegacyTerm(value: string) {
  return LEGACY_CONTENT_PATTERN.test(value);
}

function hasHomstealIdentity(value: string) {
  return HOMESTEAL_IDENTITY_PATTERN.test(value);
}

function hasLegacyTermInList(values: string[]) {
  return values.some((value) => hasLegacyTerm(value));
}

function flattenRuleText(rules: RulesContent) {
  const chapterText = rules.chapters.flatMap((chapter) => [
    chapter.id,
    chapter.title,
    ...chapter.articles.flatMap((article) => [article.title, ...article.body]),
  ]);
  return [rules.headerBadge, rules.headerTitle, rules.headerDescription, rules.appendixText, ...chapterText];
}

function isLegacyLandingContent(landing: LandingContent) {
  const values = [
    landing.heroEyebrow,
    landing.heroBadgeText,
    landing.heroTitle,
    landing.heroDescription,
    landing.heroSubDescription,
    ...landing.valueProps.flatMap((item) => [item.title, item.desc]),
    ...landing.snapshotCards.flatMap((item) => [item.label, item.value, item.desc]),
    ...landing.seasonHighlights.flatMap((item) => [item.title, item.desc]),
  ];
  const identityText = `${landing.heroBadgeText} ${landing.heroTitle} ${landing.heroDescription}`;
  return hasLegacyTermInList(values) || !hasHomstealIdentity(identityText);
}

function isLegacyIntroContent(intro: IntroContent) {
  const values = [
    intro.tagline,
    intro.heroTitle,
    intro.heroSubtitle,
    intro.heroDescription,
    ...intro.historyHighlights.flatMap((item) => [item.title, item.desc]),
    ...intro.governance.flatMap((item) => [item.label, item.value, item.detail]),
    ...intro.structureCards.flatMap((item) => [item.title, ...item.points]),
    ...intro.postseasonMatches.flatMap((item) => [item.title, ...item.matchups]),
    ...intro.heroMetrics.flatMap((item) => [item.label, item.value, item.note]),
  ];
  const identityText = `${intro.tagline} ${intro.heroTitle} ${intro.heroDescription}`;
  return hasLegacyTermInList(values) || !hasHomstealIdentity(identityText);
}

function isLegacyRulesContent(rules: RulesContent) {
  const identityText = `${rules.headerBadge} ${rules.headerTitle} ${rules.headerDescription}`;
  return hasLegacyTermInList(flattenRuleText(rules)) || !(hasHomstealIdentity(identityText) || identityText.includes('교류전'));
}

function isLegacyTeamsContent(teams: TeamsContent) {
  const values = [teams.pageBadge, teams.pageTitle, teams.pageDescription, teams.pageNote, ...teams.entries.map((entry) => entry.name)];
  const identityText = `${teams.pageBadge} ${teams.pageTitle} ${teams.pageDescription}`;
  return hasLegacyTermInList(values) || !hasHomstealIdentity(identityText);
}

function normalizeBrand(value: unknown, fallback: BrandContent): BrandContent {
  if (!value || typeof value !== 'object') return fallback;
  const next = value as Partial<BrandContent>;
  const normalized: BrandContent = {
    leagueName: typeof next.leagueName === 'string' && next.leagueName.trim() ? next.leagueName.trim() : fallback.leagueName,
    seasonLabel: typeof next.seasonLabel === 'string' && next.seasonLabel.trim() ? next.seasonLabel.trim() : fallback.seasonLabel,
    leagueDescription:
      typeof next.leagueDescription === 'string' && next.leagueDescription.trim()
        ? next.leagueDescription.trim()
        : fallback.leagueDescription,
    instagramUrl: typeof next.instagramUrl === 'string' && next.instagramUrl.trim() ? next.instagramUrl.trim() : fallback.instagramUrl,
    rulesPdfPath: typeof next.rulesPdfPath === 'string' && next.rulesPdfPath.trim() ? next.rulesPdfPath.trim() : fallback.rulesPdfPath,
    teamLogoPath: typeof next.teamLogoPath === 'string' && next.teamLogoPath.trim() ? next.teamLogoPath.trim() : fallback.teamLogoPath,
    leagueLogoPath:
      typeof next.leagueLogoPath === 'string' && next.leagueLogoPath.trim() ? next.leagueLogoPath.trim() : fallback.leagueLogoPath,
    accentRed: typeof next.accentRed === 'string' && next.accentRed.trim() ? next.accentRed.trim() : fallback.accentRed,
    accentNavy: typeof next.accentNavy === 'string' && next.accentNavy.trim() ? next.accentNavy.trim() : fallback.accentNavy,
    accentLight: typeof next.accentLight === 'string' && next.accentLight.trim() ? next.accentLight.trim() : fallback.accentLight,
  };

  const identityText = `${normalized.leagueName} ${normalized.seasonLabel} ${normalized.leagueDescription}`;
  if (hasLegacyTerm(identityText) || !hasHomstealIdentity(identityText)) return fallback;
  return normalized;
}

function normalizeRuleChapters(value: unknown, fallback: RuleChapter[]): RuleChapter[] {
  if (!Array.isArray(value)) return fallback;
  const chapters: RuleChapter[] = [];
  for (const chapter of value) {
    if (!chapter || typeof chapter !== 'object') continue;
    const title = typeof (chapter as { title?: unknown }).title === 'string' ? (chapter as { title: string }).title.trim() : '';
    const id = typeof (chapter as { id?: unknown }).id === 'string' ? (chapter as { id: string }).id.trim() : '';
    const accent = typeof (chapter as { accent?: unknown }).accent === 'string' ? (chapter as { accent: string }).accent.trim() : '#60a5fa';
    const rawArticles = (chapter as { articles?: unknown }).articles;
    if (!title || !id || !Array.isArray(rawArticles)) continue;

    const articles: RuleArticle[] = rawArticles
      .map((article) => {
        if (!article || typeof article !== 'object') return null;
        const articleTitle = typeof (article as { title?: unknown }).title === 'string' ? (article as { title: string }).title.trim() : '';
        const rawBody = (article as { body?: unknown }).body;
        const body = Array.isArray(rawBody)
          ? rawBody.filter((line): line is string => typeof line === 'string').map((line) => line.trim())
          : [];
        if (!articleTitle || !body.length) return null;
        return { title: articleTitle, body };
      })
      .filter((article): article is RuleArticle => Boolean(article));

    if (!articles.length) continue;
    chapters.push({ id, title, accent, articles });
  }
  if (!chapters.length) return fallback;

  const incomingById = new Map(chapters.map((chapter) => [chapter.id, chapter]));

  const mergeArticles = (incoming: RuleChapter['articles'], defaults: RuleChapter['articles']) => {
    const incomingByTitle = new Map(incoming.map((article) => [article.title, article]));
    const merged = defaults.map((article) => incomingByTitle.get(article.title) ?? article);
    const extra = incoming.filter((article) => !defaults.some((def) => def.title === article.title));
    return [...merged, ...extra];
  };

  const mergedWithDefaults = fallback.map((defaultChapter) => {
    const incoming = incomingById.get(defaultChapter.id);
    if (!incoming) return defaultChapter;
    return {
      id: incoming.id || defaultChapter.id,
      title: incoming.title || defaultChapter.title,
      accent: incoming.accent || defaultChapter.accent,
      articles: mergeArticles(incoming.articles, defaultChapter.articles),
    };
  });

  const extraChapters = chapters.filter((chapter) => {
    if (fallback.some((def) => def.id === chapter.id)) return false;
    const chapterText = [chapter.id, chapter.title, ...chapter.articles.flatMap((article) => [article.title, ...article.body])];
    return !hasLegacyTermInList(chapterText);
  });
  return [...mergedWithDefaults, ...extraChapters];
}

function normalizeContentPatch(input: Partial<ContentState>): Partial<ContentState> {
  const patch: Partial<ContentState> = {};

  if (hasField(input, 'brand')) {
    patch.brand = normalizeBrand((input as { brand?: unknown }).brand, defaultContent.brand);
  }

  if (hasField(input, 'tickerItems')) {
    const nextTicker = normalizeTicker((input as { tickerItems?: unknown }).tickerItems, defaultContent.tickerItems);
    patch.tickerItems = hasLegacyTermInList(nextTicker) ? defaultContent.tickerItems : nextTicker;
  }

  if (input.landing) {
    const nextLanding: LandingContent = {
      ...input.landing,
      valueProps: Array.isArray(input.landing.valueProps)
        ? input.landing.valueProps.filter((item) => item?.title && item?.desc)
        : defaultContent.landing.valueProps,
      snapshotCards: Array.isArray(input.landing.snapshotCards)
        ? input.landing.snapshotCards.filter((item) => item?.label && item?.value)
        : defaultContent.landing.snapshotCards,
      seasonHighlights: Array.isArray(input.landing.seasonHighlights)
        ? input.landing.seasonHighlights.filter((item) => item?.title && item?.desc && item?.link)
        : defaultContent.landing.seasonHighlights,
    };
    patch.landing = isLegacyLandingContent(nextLanding) ? defaultContent.landing : nextLanding;
  }

  if (input.intro) {
    const nextIntro: IntroContent = {
      ...input.intro,
      historyHighlights: Array.isArray(input.intro.historyHighlights) ? input.intro.historyHighlights : defaultContent.intro.historyHighlights,
      governance: Array.isArray(input.intro.governance) ? input.intro.governance : defaultContent.intro.governance,
      structureCards: Array.isArray(input.intro.structureCards) ? input.intro.structureCards : defaultContent.intro.structureCards,
      postseasonMatches: Array.isArray(input.intro.postseasonMatches) ? input.intro.postseasonMatches : defaultContent.intro.postseasonMatches,
      heroMetrics: Array.isArray(input.intro.heroMetrics) ? input.intro.heroMetrics : defaultContent.intro.heroMetrics,
    };
    patch.intro = isLegacyIntroContent(nextIntro) ? defaultContent.intro : nextIntro;
  }

  if (input.rules) {
    const nextRules: RulesContent = {
      ...input.rules,
      chapters: normalizeRuleChapters(input.rules.chapters, defaultContent.rules.chapters),
      hostOrder: Array.isArray(input.rules.hostOrder)
        ? input.rules.hostOrder.filter((name): name is string => typeof name === 'string' && name.trim().length > 0).map((name) => name.trim())
        : defaultContent.rules.hostOrder,
    };
    patch.rules = isLegacyRulesContent(nextRules) ? defaultContent.rules : nextRules;
  }

  if (input.teams) {
    const nextTeams: TeamsContent = {
      ...input.teams,
      entries: normalizeTeamsEntries(input.teams.entries, defaultContent.teams.entries),
    };
    patch.teams = isLegacyTeamsContent(nextTeams) ? defaultContent.teams : nextTeams;
  }

  return patch;
}

function areSameStrings(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((item, idx) => item === b[idx]);
}

function staticPayload(content: ContentState): Omit<ContentState, 'tickerItems'> {
  return {
    brand: content.brand,
    landing: content.landing,
    intro: content.intro,
    rules: content.rules,
    teams: content.teams,
  };
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ContentState>(defaultContent);
  const contentRef = useRef<ContentState>(defaultContent);
  const savingRef = useRef(false);
  const staticVersionRef = useRef<number | null>(null);

  const applyPatch = useCallback((patch: Partial<ContentState>) => {
    const normalized = normalizeContentPatch(patch);
    const next = deepMerge(contentRef.current, normalized);
    contentRef.current = next;
    setContent(next);
    writeLocalCache(LEGACY_STORAGE_KEY, next);
    return next;
  }, []);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    const cachedLegacy = readLocalCache<Partial<ContentState>>(LEGACY_STORAGE_KEY);
    const cachedStatic = readLocalCache<Partial<ContentState>>(STATIC_STORAGE_KEY);
    const cachedLive = readLocalCache<{ tickerItems?: unknown }>(LIVE_STORAGE_KEY);

    const patch: Partial<ContentState> = {};
    if (cachedStatic) {
      patch.brand = cachedStatic.brand;
      patch.landing = cachedStatic.landing;
      patch.intro = cachedStatic.intro;
      patch.rules = cachedStatic.rules;
      patch.teams = cachedStatic.teams;
    } else if (cachedLegacy) {
      patch.brand = cachedLegacy.brand;
      patch.landing = cachedLegacy.landing;
      patch.intro = cachedLegacy.intro;
      patch.rules = cachedLegacy.rules;
      patch.teams = cachedLegacy.teams;
    }

    if ((cachedLive && hasField(cachedLive, 'tickerItems')) || (cachedLegacy && hasField(cachedLegacy, 'tickerItems'))) {
      patch.tickerItems = normalizeTicker(cachedLive?.tickerItems ?? cachedLegacy?.tickerItems, defaultContent.tickerItems);
    }

    if (Object.keys(patch).length) {
      applyPatch(patch);
    }
  }, [applyPatch]);

  const fetchStaticContent = useCallback(async () => {
    try {
      const staticSnapshot = await getDoc(doc(firestore, STATIC_DOC));
      if (staticSnapshot.exists()) {
        const data = staticSnapshot.data() as Partial<ContentState>;
        const patch = normalizeContentPatch({
          brand: data.brand,
          landing: data.landing,
          intro: data.intro,
          rules: data.rules,
          teams: data.teams,
        });
        if (Object.keys(patch).length) {
          const next = applyPatch(patch);
          writeLocalCache(STATIC_STORAGE_KEY, staticPayload(next));
        }
        return;
      }

      const legacySnapshot = await getDoc(doc(firestore, LEGACY_DOC));
      if (!legacySnapshot.exists()) return;
      const legacy = legacySnapshot.data() as Partial<ContentState>;
      const patch = normalizeContentPatch(legacy);
      const next = applyPatch(patch);
      writeLocalCache(STATIC_STORAGE_KEY, staticPayload(next));
      writeLocalCache(LIVE_STORAGE_KEY, { tickerItems: next.tickerItems });
    } catch (error) {
      console.error('[ContentProvider] Failed to fetch static content:', error);
    }
  }, [applyPatch]);

  useEffect(() => {
    const liveRef = doc(firestore, LIVE_DOC);
    const legacyRef = doc(firestore, LEGACY_DOC);

    const loadLegacyTicker = async () => {
      try {
        const legacySnapshot = await getDoc(legacyRef);
        if (!legacySnapshot.exists()) return;
        const legacy = legacySnapshot.data() as Partial<ContentState>;
        const tickerItems = normalizeTicker(legacy.tickerItems, defaultContent.tickerItems);
        if (areSameStrings(contentRef.current.tickerItems, tickerItems)) return;
        applyPatch({ tickerItems });
        writeLocalCache(LIVE_STORAGE_KEY, { tickerItems });
      } catch {
        // ignore fallback
      }
    };

    const unsubscribe = onSnapshot(
      liveRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as { tickerItems?: unknown };
          const tickerItems = normalizeTicker(data.tickerItems, defaultContent.tickerItems);
          if (!areSameStrings(contentRef.current.tickerItems, tickerItems)) {
            applyPatch({ tickerItems });
            writeLocalCache(LIVE_STORAGE_KEY, { tickerItems });
          }
          return;
        }
        void loadLegacyTicker();
      },
      (error) => {
        console.error('[ContentProvider] LIVE INFO subscription error:', error);
      },
    );

    return () => unsubscribe();
  }, [applyPatch]);

  useEffect(() => {
    const metaRef = doc(firestore, META_DOC);
    const unsubscribe = onSnapshot(
      metaRef,
      (snapshot) => {
        const rawVersion = snapshot.data()?.staticVersion;
        const nextVersion = typeof rawVersion === 'number' ? rawVersion : 0;
        if (staticVersionRef.current === nextVersion) return;
        staticVersionRef.current = nextVersion;
        void fetchStaticContent();
      },
      () => {
        if (staticVersionRef.current === null) {
          staticVersionRef.current = 0;
          void fetchStaticContent();
        }
      },
    );

    return () => unsubscribe();
  }, [fetchStaticContent]);

  const updateContent = useCallback(async (next: Partial<ContentState>) => {
    if (savingRef.current) return;

    const hasTickerPatch = hasField(next, 'tickerItems');
    const hasStaticPatch = STATIC_KEYS.some((key) => hasField(next, key));
    if (!hasTickerPatch && !hasStaticPatch) return;

    savingRef.current = true;
    try {
      const merged = applyPatch(next);
      writeLocalCache(LIVE_STORAGE_KEY, { tickerItems: merged.tickerItems });
      writeLocalCache(STATIC_STORAGE_KEY, staticPayload(merged));

      const writes: Promise<unknown>[] = [];
      if (hasTickerPatch) {
        writes.push(
          setDoc(
            doc(firestore, LIVE_DOC),
            { tickerItems: merged.tickerItems, updatedAt: Date.now() },
            { merge: true },
          ),
        );
      }
      if (hasStaticPatch) {
        writes.push(
          setDoc(
            doc(firestore, STATIC_DOC),
            { ...staticPayload(merged), updatedAt: Date.now() },
            { merge: true },
          ),
        );
        writes.push(
          setDoc(
            doc(firestore, META_DOC),
            { staticVersion: increment(1), updatedAt: Date.now() },
            { merge: true },
          ),
        );
      }

      await Promise.all(writes);
    } catch (error) {
      console.error('[ContentProvider] Failed to save content:', error);
    } finally {
      savingRef.current = false;
    }
  }, [applyPatch]);

  const resetContent = useCallback(async () => {
    applyPatch(defaultContent);
    writeLocalCache(LIVE_STORAGE_KEY, { tickerItems: defaultContent.tickerItems });
    writeLocalCache(STATIC_STORAGE_KEY, staticPayload(defaultContent));

    try {
      await Promise.all([
        setDoc(doc(firestore, LIVE_DOC), { tickerItems: defaultContent.tickerItems, updatedAt: Date.now() }),
        setDoc(doc(firestore, STATIC_DOC), { ...staticPayload(defaultContent), updatedAt: Date.now() }),
        setDoc(
          doc(firestore, META_DOC),
          { staticVersion: increment(1), updatedAt: Date.now() },
          { merge: true },
        ),
      ]);
    } catch (error) {
      console.error('[ContentProvider] Failed to reset content:', error);
    }
  }, [applyPatch]);

  const value = useMemo(() => ({ content, updateContent, resetContent }), [content, updateContent, resetContent]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);

export const defaultContentState = defaultContent;
