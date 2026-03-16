import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { firestore } from '../../shared/firebase/client';
import type {
  BatterRanking,
  BatterRankingSort,
  PitcherRanking,
  PitcherRankingSort,
  RecordGroup,
  RecordPlayoffDivision,
  RecordRegulation,
  RecordScope,
  SeasonSummary,
  TeamRecordStanding,
} from '../../shared/api/backendClient';
import {
  DEFAULT_RECORD_FILTERS,
  PLAYOFF_DIVISION_OPTIONS,
  RECORD_GROUP_OPTIONS,
  RECORD_SCOPE_OPTIONS,
  RECORD_SCOPE_OPTIONS_NO_PLAYOFF,
  matchesRecordFilters,
  type RecordFilterState,
} from '../../shared/lib/recordFilters';
import { TEAM_NAME_TO_GROUP } from '../../shared/lib/teamGroups';
import type {
  PlayerAggregate,
  StandingAggregate,
  StatScopeDoc,
  TeamAggregate,
} from '../../shared/lib/recordAggregates';
import { computeStandingsFromTeamAggregates } from '../../shared/lib/recordAggregates';
import RecordsHubShell from '../../features/records/components/RecordsHubShell';
import RecordsFilterBar from '../../features/records/components/RecordsFilterBar';
import {
  noticeCardStyle,
  quickLinkStyle,
} from '../../features/records/components/recordStyles';
import type { RecordsTab, TopFiveRow } from '../../features/records/types';
import StandingsTab from '../../features/records/tabs/StandingsTab';
import BattersTab from '../../features/records/tabs/BattersTab';
import PitchersTab from '../../features/records/tabs/PitchersTab';

const TAB_OPTIONS: Array<{ value: RecordsTab; label: string }> = [
  { value: 'standings', label: '순위' },
  { value: 'batters', label: '개인기록(타자)' },
  { value: 'pitchers', label: '개인기록(투수)' },
];

const BATTER_SORT_OPTIONS: Array<{ value: BatterRankingSort; label: string }> = [
  { value: 'battingAverage', label: 'AVG' },
  { value: 'ops', label: 'OPS' },
  { value: 'onBasePct', label: 'OBP' },
  { value: 'sluggingPct', label: 'SLG' },
  { value: 'hits', label: 'H' },
  { value: 'homeRuns', label: 'HR' },
  { value: 'rbi', label: 'RBI' },
  { value: 'gamesPlayed', label: 'G' },
  { value: 'plateAppearance', label: 'PA' },
  { value: 'stolenBases', label: 'SB' },
];

const PITCHER_SORT_OPTIONS: Array<{ value: PitcherRankingSort; label: string }> = [
  { value: 'era', label: 'ERA' },
  { value: 'whip', label: 'WHIP' },
  { value: 'strikeouts', label: 'K' },
  { value: 'wins', label: 'W' },
  { value: 'saves', label: 'SV' },
  { value: 'inningsPitched', label: 'IP' },
  { value: 'walksAllowed', label: 'BB' },
  { value: 'gamesPlayed', label: 'G' },
];

const GROUP_TO_PART_CODE: Record<Exclude<RecordGroup, 'ALL'>, string> = {
  A: '1',
  B: '2',
  C: '3',
  D: '4',
  E: '5',
  F: '6',
  G: '7',
  H: '8',
};

function parseTab(value: string | null): RecordsTab {
  const raw = (value || '').toLowerCase();
  if (raw === 'standings' || raw === 'batters' || raw === 'pitchers') return raw;
  return 'standings';
}

function parseScope(value: string | null): RecordScope {
  const raw = (value || '').toUpperCase();
  if (raw === 'ALL' || raw === 'LEAGUE' || raw === 'PLAYOFF') return raw;
  return DEFAULT_RECORD_FILTERS.scope;
}

function parseGroup(value: string | null): RecordGroup {
  const raw = (value || '').toUpperCase();
  if (raw === 'ALL' || raw === 'A' || raw === 'B' || raw === 'C' || raw === 'D' || raw === 'E' || raw === 'F' || raw === 'G' || raw === 'H') {
    return raw;
  }
  return DEFAULT_RECORD_FILTERS.group;
}

function parsePlayoffDivision(value: string | null): RecordPlayoffDivision {
  const raw = (value || '').toUpperCase();
  if (raw === 'ALL' || raw === 'EUTTEUM' || raw === 'BEOGEUM') return raw;
  return DEFAULT_RECORD_FILTERS.playoffDivision;
}

function parseRegulation(value: string | null): Exclude<RecordRegulation, 'ALL'> {
  return value === 'OUT' ? 'OUT' : 'IN';
}

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeSeasonType(value: unknown): 'LEAGUE' | 'PLAYOFF' {
  return value === 'PLAYOFF' ? 'PLAYOFF' : 'LEAGUE';
}

function normalizeDivision(value: unknown): 'LEAGUE' | 'PLAYOFF' | 'EUTTEUM' | 'BEOGEUM' {
  if (value === 'PLAYOFF' || value === 'EUTTEUM' || value === 'BEOGEUM') return value;
  return 'LEAGUE';
}

function toNumericId(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return Math.max(1, hash);
}

function normalizeScopeDoc(scopeId: string, value: unknown): StatScopeDoc | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const seasonId = asNumber(row.seasonId, 0);
  if (seasonId <= 0) return null;
  const seasonYear = asNumber(row.seasonYear, seasonId);
  return {
    scopeId,
    seasonId,
    seasonYear,
    division: normalizeDivision(row.division),
    seasonType: normalizeSeasonType(row.seasonType),
    recordMode: row.recordMode === 'practice' ? 'practice' : 'official',
    updatedAt: asNumber(row.updatedAt, 0),
    matchCount: asNumber(row.matchCount, 0),
    aggregationVersion: asNumber(row.aggregationVersion, 1),
  };
}

function normalizePlayerAggregate(scope: StatScopeDoc, playerKey: string, value: unknown): PlayerAggregate | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const teamId = asText(row.teamId, '').trim();
  const teamName = asText(row.teamName, '').trim();
  const playerName = asText(row.playerName, '').trim();
  if (!teamName || !playerName) return null;
  const battingRaw = (row.batting ?? {}) as Record<string, unknown>;
  const pitchingRaw = (row.pitching ?? {}) as Record<string, unknown>;
  return {
    playerKey,
    scopeId: scope.scopeId,
    seasonId: asNumber(row.seasonId, scope.seasonId),
    seasonYear: asNumber(row.seasonYear, scope.seasonYear),
    division: normalizeDivision(row.division ?? scope.division),
    seasonType: normalizeSeasonType(row.seasonType ?? scope.seasonType),
    recordMode: row.recordMode === 'practice' ? 'practice' : 'official',
    teamId: teamId || teamName,
    teamName,
    playerName,
    normalizedName: asText(row.normalizedName, playerName.toLowerCase()),
    backNumber: asText(row.backNumber, ''),
    batting: {
      gamesPlayed: asNumber(battingRaw.gamesPlayed, 0),
      pa: asNumber(battingRaw.pa, 0),
      ab: asNumber(battingRaw.ab, 0),
      h: asNumber(battingRaw.h, 0),
      singles: asNumber(battingRaw.singles, 0),
      doubles: asNumber(battingRaw.doubles, 0),
      triples: asNumber(battingRaw.triples, 0),
      hr: asNumber(battingRaw.hr, 0),
      bb: asNumber(battingRaw.bb, 0),
      hbp: asNumber(battingRaw.hbp, 0),
      so: asNumber(battingRaw.so, 0),
      sac: asNumber(battingRaw.sac, 0),
      fc: asNumber(battingRaw.fc, 0),
      r: asNumber(battingRaw.r, 0),
      rbi: asNumber(battingRaw.rbi, 0),
      sb: asNumber(battingRaw.sb, 0),
      battingAverage: asNumber(battingRaw.battingAverage, 0),
      onBasePct: asNumber(battingRaw.onBasePct, 0),
      sluggingPct: asNumber(battingRaw.sluggingPct, 0),
      ops: asNumber(battingRaw.ops, 0),
      regulation: battingRaw.regulation === 'OUT' ? 'OUT' : 'IN',
    },
    pitching: {
      gamesPlayed: asNumber(pitchingRaw.gamesPlayed, 0),
      outs: asNumber(pitchingRaw.outs, 0),
      inningsPitched: asNumber(pitchingRaw.inningsPitched, 0),
      wins: asNumber(pitchingRaw.wins, 0),
      losses: asNumber(pitchingRaw.losses, 0),
      saves: asNumber(pitchingRaw.saves, 0),
      strikeouts: asNumber(pitchingRaw.strikeouts, 0),
      walksAllowed: asNumber(pitchingRaw.walksAllowed, 0),
      hitsAllowed: asNumber(pitchingRaw.hitsAllowed, 0),
      runsAllowed: asNumber(pitchingRaw.runsAllowed, 0),
      earnedRuns: asNumber(pitchingRaw.earnedRuns, 0),
      era: asNumber(pitchingRaw.era, 0),
      whip: asNumber(pitchingRaw.whip, 0),
      regulation: pitchingRaw.regulation === 'OUT' ? 'OUT' : 'IN',
    },
    updatedAt: asNumber(row.updatedAt, 0),
    lastMatchId: asText(row.lastMatchId, '') || null,
    lastMatchAt: asNumber(row.lastMatchAt, 0) || null,
  };
}

function normalizeTeamAggregate(scope: StatScopeDoc, teamId: string, value: unknown): TeamAggregate | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const teamName = asText(row.teamName, '').trim();
  if (!teamName) return null;
  const normalizedTeamId = asText(row.teamId, '').trim() || teamId;
  return {
    teamId: normalizedTeamId,
    teamName,
    scopeId: scope.scopeId,
    seasonId: asNumber(row.seasonId, scope.seasonId),
    seasonYear: asNumber(row.seasonYear, scope.seasonYear),
    division: normalizeDivision(row.division ?? scope.division),
    seasonType: normalizeSeasonType(row.seasonType ?? scope.seasonType),
    recordMode: row.recordMode === 'practice' ? 'practice' : 'official',
    played: asNumber(row.played, 0),
    wins: asNumber(row.wins, 0),
    draws: asNumber(row.draws, 0),
    losses: asNumber(row.losses, 0),
    points: asNumber(row.points, 0),
    runsFor: asNumber(row.runsFor, 0),
    runsAgainst: asNumber(row.runsAgainst, 0),
    runDiff: asNumber(row.runDiff, 0),
    forfeitLosses: asNumber(row.forfeitLosses, 0),
    updatedAt: asNumber(row.updatedAt, 0),
  };
}

function normalizeStandingAggregate(scope: StatScopeDoc, teamId: string, value: unknown): StandingAggregate | null {
  const base = normalizeTeamAggregate(scope, teamId, value);
  if (!base) return null;
  const row = value as Record<string, unknown>;
  return {
    ...base,
    rank: asNumber(row.rank, 0),
    headToHeadPoints: asNumber(row.headToHeadPoints, 0),
  };
}

function getPartCode(teamName: string): string | null {
  const group = TEAM_NAME_TO_GROUP.get(teamName.trim());
  if (!group) return null;
  return GROUP_TO_PART_CODE[group] ?? null;
}

function compareBatter(a: BatterRanking, b: BatterRanking, sort: BatterRankingSort): number {
  switch (sort) {
    case 'battingAverage':
      return b.battingAverage - a.battingAverage;
    case 'hits':
      return b.hits - a.hits;
    case 'homeRuns':
      return b.homeRuns - a.homeRuns;
    case 'rbi':
      return b.runsBattedIn - a.runsBattedIn;
    case 'sluggingPct':
      return b.sluggingPct - a.sluggingPct;
    case 'onBasePct':
      return b.onBasePct - a.onBasePct;
    case 'gamesPlayed':
      return b.gamesPlayed - a.gamesPlayed;
    case 'plateAppearance':
      return b.plateAppearance - a.plateAppearance;
    case 'stolenBases':
      return b.stolenBases - a.stolenBases;
    case 'ops':
    default:
      return b.ops - a.ops;
  }
}

function comparePitcher(a: PitcherRanking, b: PitcherRanking, sort: PitcherRankingSort): number {
  switch (sort) {
    case 'era':
      return a.era - b.era;
    case 'whip':
      return a.whip - b.whip;
    case 'strikeouts':
      return b.strikeouts - a.strikeouts;
    case 'wins':
      return b.wins - a.wins;
    case 'saves':
      return b.saves - a.saves;
    case 'inningsPitched':
      return b.inningsPitched - a.inningsPitched;
    case 'walksAllowed':
      return b.walksAllowed - a.walksAllowed;
    case 'gamesPlayed':
      return b.gamesPlayed - a.gamesPlayed;
    default:
      return 0;
  }
}

function applyRank<T extends { rank: number }>(rows: T[]): T[] {
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

function formatTopBatterValue(row: BatterRanking, sort: BatterRankingSort): string {
  switch (sort) {
    case 'battingAverage':
      return `AVG ${row.battingAverage.toFixed(3)}`;
    case 'hits':
      return `H ${row.hits}`;
    case 'homeRuns':
      return `HR ${row.homeRuns}`;
    case 'rbi':
      return `RBI ${row.runsBattedIn}`;
    case 'onBasePct':
      return `OBP ${row.onBasePct.toFixed(3)}`;
    case 'sluggingPct':
      return `SLG ${row.sluggingPct.toFixed(3)}`;
    case 'ops':
    default:
      return `OPS ${row.ops.toFixed(3)}`;
  }
}

function formatTopPitcherValue(row: PitcherRanking, sort: PitcherRankingSort): string {
  switch (sort) {
    case 'whip':
      return `WHIP ${row.whip.toFixed(2)}`;
    case 'strikeouts':
      return `K ${row.strikeouts}`;
    case 'wins':
      return `W ${row.wins}`;
    case 'saves':
      return `SV ${row.saves}`;
    case 'era':
    default:
      return `ERA ${row.era.toFixed(2)}`;
  }
}

export default function RecordPage() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [scopeDocs, setScopeDocs] = useState<StatScopeDoc[]>([]);
  const [playersByScope, setPlayersByScope] = useState<Record<string, PlayerAggregate[]>>({});
  const [teamsByScope, setTeamsByScope] = useState<Record<string, TeamAggregate[]>>({});
  const [standingsByScope, setStandingsByScope] = useState<Record<string, StandingAggregate[]>>({});
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [topBatterSort, setTopBatterSort] = useState<BatterRankingSort>('ops');
  const [topPitcherSort, setTopPitcherSort] = useState<PitcherRankingSort>('era');

  const tab = parseTab(searchParams.get('tab'));
  const scope = parseScope(searchParams.get('scope'));
  const group = parseGroup(searchParams.get('group'));
  const playoffDivision = parsePlayoffDivision(searchParams.get('playoffDivision'));
  const regulation = parseRegulation(searchParams.get('regulation'));
  const seasonIdFromQuery = parsePositiveInt(searchParams.get('seasonId'));
  const searchTerm = searchParams.get('search')?.trim() ?? '';

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      let changed = false;

      Object.entries(patch).forEach(([key, value]) => {
        const current = next.get(key);
        if (value == null || value === '') {
          if (current != null) {
            next.delete(key);
            changed = true;
          }
          return;
        }
        if (current !== value) {
          next.set(key, value);
          changed = true;
        }
      });

      if (changed) {
        setSearchParams(next, { replace: true });
      }
    },
    [searchParams, setSearchParams],
  );

  const setTab = useCallback(
    (nextTab: RecordsTab) => {
      updateParams({ tab: nextTab === 'standings' ? null : nextTab });
    },
    [updateParams],
  );

  const setSeasonId = useCallback(
    (nextSeasonId: number) => {
      updateParams({ seasonId: String(nextSeasonId) });
    },
    [updateParams],
  );

  const setScope = useCallback(
    (nextScope: RecordScope) => {
      const patch: Record<string, string | null> = {
        scope: nextScope === 'ALL' ? null : nextScope,
      };
      if (nextScope !== 'PLAYOFF') patch.playoffDivision = null;
      updateParams(patch);
    },
    [updateParams],
  );

  const setGroup = useCallback(
    (nextGroup: RecordGroup) => {
      updateParams({ group: nextGroup === 'ALL' ? null : nextGroup });
    },
    [updateParams],
  );

  const setPlayoffDivision = useCallback(
    (nextDivision: RecordPlayoffDivision) => {
      if (nextDivision === 'ALL') {
        updateParams({ playoffDivision: null });
        return;
      }
      updateParams({ playoffDivision: nextDivision, scope: 'PLAYOFF' });
    },
    [updateParams],
  );

  const setRegulation = useCallback(
    (nextRegulation: Exclude<RecordRegulation, 'ALL'>) => {
      updateParams({ regulation: nextRegulation });
    },
    [updateParams],
  );

  const toggleTeamSearch = useCallback(
    (teamName: string) => {
      const keyword = teamName.trim();
      if (!keyword) return;
      const current = searchTerm.trim().toLowerCase();
      if (current === keyword.toLowerCase()) {
        updateParams({ search: null });
        return;
      }
      updateParams({ search: keyword });
    },
    [searchTerm, updateParams],
  );

  const toggleRegulationFromCell = useCallback(
    (nextRegulation: Exclude<RecordRegulation, 'ALL'>) => {
      if (regulation === nextRegulation) return;
      setRegulation(nextRegulation);
    },
    [regulation, setRegulation],
  );

  const toggleGroupFromCell = useCallback(
    (nextGroup: Exclude<RecordGroup, 'ALL'> | null) => {
      if (!nextGroup) return;
      setGroup(group === nextGroup ? 'ALL' : nextGroup);
    },
    [group, setGroup],
  );

  const toggleScopeFromCell = useCallback(
    (nextScope: Exclude<RecordScope, 'ALL'> | null) => {
      if (!nextScope) return;
      setScope(scope === nextScope ? 'ALL' : nextScope);
    },
    [scope, setScope],
  );

  const toggleDivisionFromCell = useCallback(
    (nextDivision: RecordPlayoffDivision | null) => {
      if (!nextDivision || nextDivision === 'ALL') return;
      if (scope === 'PLAYOFF' && playoffDivision === nextDivision) {
        updateParams({ scope: null, playoffDivision: null });
        return;
      }
      setPlayoffDivision(nextDivision);
    },
    [playoffDivision, scope, setPlayoffDivision, updateParams],
  );

  useEffect(() => {
    const q = query(collection(firestore, 'stats'), orderBy('seasonId', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs
          .map((doc) => normalizeScopeDoc(doc.id, doc.data()))
          .filter((item): item is StatScopeDoc => item !== null)
          .sort((a, b) => {
            if (b.seasonId !== a.seasonId) return b.seasonId - a.seasonId;
            if (a.seasonType !== b.seasonType) return a.seasonType.localeCompare(b.seasonType);
            return a.scopeId.localeCompare(b.scopeId);
          });
        setScopeDocs(docs);
        setScopeError(null);
      },
      (error) => {
        setScopeError(error.message || '기록 집계 데이터를 불러오지 못했습니다.');
      },
    );
    return () => unsubscribe();
  }, []);

  const seasons = useMemo<SeasonSummary[]>(() => {
    const yearBySeason = new Map<number, number>();
    scopeDocs
      .filter((scopeDoc) => scopeDoc.recordMode === 'official')
      .forEach((scopeDoc) => {
        if (!yearBySeason.has(scopeDoc.seasonId)) {
          yearBySeason.set(scopeDoc.seasonId, scopeDoc.seasonYear);
        }
      });
    return [...yearBySeason.entries()]
      .map(([id, year]) => ({ id, year }))
      .sort((a, b) => b.id - a.id);
  }, [scopeDocs]);

  const selectedSeason = useMemo(
    () => seasons.find((season) => season.id === seasonIdFromQuery) ?? null,
    [seasons, seasonIdFromQuery],
  );

  useEffect(() => {
    if (selectedSeason || seasons.length === 0) return;
    setSeasonId(seasons[0].id);
  }, [selectedSeason, seasons, setSeasonId]);

  const playoffFilterEnabled = useMemo(
    () => scopeDocs.some((scopeDoc) => scopeDoc.seasonType === 'PLAYOFF' && scopeDoc.recordMode === 'official'),
    [scopeDocs],
  );

  const scopeOptions = playoffFilterEnabled ? RECORD_SCOPE_OPTIONS : RECORD_SCOPE_OPTIONS_NO_PLAYOFF;

  const currentFilters = useMemo<RecordFilterState>(
    () => ({ scope, group, playoffDivision }),
    [scope, group, playoffDivision],
  );

  const selectedScopes = useMemo(
    () =>
      scopeDocs.filter((scopeDoc) => {
        if (scopeDoc.recordMode !== 'official') return false;
        if (selectedSeason && scopeDoc.seasonId !== selectedSeason.id) return false;
        if (currentFilters.scope === 'LEAGUE' && scopeDoc.seasonType !== 'LEAGUE') return false;
        if (currentFilters.scope === 'PLAYOFF' && scopeDoc.seasonType !== 'PLAYOFF') return false;
        if (currentFilters.playoffDivision !== 'ALL') {
          if (scopeDoc.division !== currentFilters.playoffDivision) return false;
        }
        return true;
      }),
    [scopeDocs, selectedSeason, currentFilters],
  );

  const scopeKey = useMemo(
    () => selectedScopes.map((scopeDoc) => scopeDoc.scopeId).sort().join('|'),
    [selectedScopes],
  );

  useEffect(() => {
    if (!scopeKey) return;

    const unsubscribers: Array<() => void> = [];

    selectedScopes.forEach((scopeDoc) => {
      const playersRef = collection(firestore, 'stats', scopeDoc.scopeId, 'players');
      const teamsRef = collection(firestore, 'stats', scopeDoc.scopeId, 'teams');
      const standingsRef = collection(firestore, 'stats', scopeDoc.scopeId, 'standings');

      unsubscribers.push(
        onSnapshot(
          playersRef,
          (snapshot) => {
            const rows = snapshot.docs
              .map((doc) => normalizePlayerAggregate(scopeDoc, doc.id, doc.data()))
              .filter((item): item is PlayerAggregate => item !== null);
            setPlayersByScope((prev) => ({ ...prev, [scopeDoc.scopeId]: rows }));
          },
          () => {
            setPlayersByScope((prev) => ({ ...prev, [scopeDoc.scopeId]: [] }));
          },
        ),
      );

      unsubscribers.push(
        onSnapshot(
          teamsRef,
          (snapshot) => {
            const rows = snapshot.docs
              .map((doc) => normalizeTeamAggregate(scopeDoc, doc.id, doc.data()))
              .filter((item): item is TeamAggregate => item !== null);
            setTeamsByScope((prev) => ({ ...prev, [scopeDoc.scopeId]: rows }));
          },
          () => {
            setTeamsByScope((prev) => ({ ...prev, [scopeDoc.scopeId]: [] }));
          },
        ),
      );

      unsubscribers.push(
        onSnapshot(
          standingsRef,
          (snapshot) => {
            const rows = snapshot.docs
              .map((doc) => normalizeStandingAggregate(scopeDoc, doc.id, doc.data()))
              .filter((item): item is StandingAggregate => item !== null);
            setStandingsByScope((prev) => ({ ...prev, [scopeDoc.scopeId]: rows }));
          },
          () => {
            setStandingsByScope((prev) => ({ ...prev, [scopeDoc.scopeId]: [] }));
          },
        ),
      );
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [scopeKey, selectedScopes]);

  const statsReady = useMemo(() => {
    if (!selectedScopes.length) return true;
    return selectedScopes.every(
      (scopeDoc) =>
        Array.isArray(playersByScope[scopeDoc.scopeId]) &&
        Array.isArray(teamsByScope[scopeDoc.scopeId]) &&
        Array.isArray(standingsByScope[scopeDoc.scopeId]),
    );
  }, [playersByScope, selectedScopes, standingsByScope, teamsByScope]);

  const allPlayers = useMemo(
    () => selectedScopes.flatMap((scopeDoc) => playersByScope[scopeDoc.scopeId] ?? []),
    [selectedScopes, playersByScope],
  );

  const allStandings = useMemo(() => {
    const rows = selectedScopes.flatMap((scopeDoc) => standingsByScope[scopeDoc.scopeId] ?? []);
    if (rows.length > 0) return rows;
    return selectedScopes.flatMap((scopeDoc) => {
      const teams = teamsByScope[scopeDoc.scopeId] ?? [];
      return computeStandingsFromTeamAggregates(teams, []);
    });
  }, [selectedScopes, standingsByScope, teamsByScope]);

  const teamStandings = useMemo<TeamRecordStanding[]>(
    () =>
      allStandings
        .slice()
        .sort((a, b) => a.rank - b.rank)
        .map((row) => ({
          teamId: toNumericId(row.teamId),
          teamName: row.teamName,
          wins: row.wins,
          losses: row.losses,
          ties: row.draws,
          winPct: row.played > 0 ? row.wins / row.played : 0,
          partCode: getPartCode(row.teamName),
          group: TEAM_NAME_TO_GROUP.get(row.teamName) ?? null,
          seasonType: row.seasonType === 'PLAYOFF' ? row.division : null,
          scope: row.seasonType,
        })),
    [allStandings],
  );

  const allBatters = useMemo<BatterRanking[]>(() => {
    const rows = allPlayers
      .filter((player) => player.batting.pa > 0)
      .map((player) => {
        const teamIdValue = player.teamId || player.teamName;
        return {
          rank: 0,
          playerId: toNumericId(player.playerKey),
          playerName: player.playerName,
          teamId: toNumericId(teamIdValue),
          teamName: player.teamName,
          seasonId: player.seasonId,
          seasonYear: player.seasonYear,
          jerseyNumber: player.backNumber,
          gamesPlayed: player.batting.gamesPlayed,
          plateAppearance: player.batting.pa,
          atBats: player.batting.ab,
          hits: player.batting.h,
          homeRuns: player.batting.hr,
          runsBattedIn: player.batting.rbi,
          stolenBases: player.batting.sb,
          walks: player.batting.bb,
          strikeouts: player.batting.so,
          battingAverage: player.batting.battingAverage,
          onBasePct: player.batting.onBasePct,
          sluggingPct: player.batting.sluggingPct,
          ops: player.batting.ops,
          partCode: getPartCode(player.teamName),
          group: TEAM_NAME_TO_GROUP.get(player.teamName) ?? null,
          seasonType: player.seasonType === 'PLAYOFF' ? player.division : null,
          scope: player.seasonType,
          regulation: player.batting.regulation,
        } satisfies BatterRanking;
      })
      .sort((a, b) => {
        const score = compareBatter(a, b, 'battingAverage');
        if (score !== 0) return score;
        return a.playerName.localeCompare(b.playerName, 'ko');
      });

    return applyRank(rows);
  }, [allPlayers]);

  const allPitchers = useMemo<PitcherRanking[]>(() => {
    const rows = allPlayers
      .filter((player) => player.pitching.gamesPlayed > 0 || player.pitching.outs > 0)
      .map((player) => {
        const teamIdValue = player.teamId || player.teamName;
        return {
          rank: 0,
          playerId: toNumericId(player.playerKey),
          playerName: player.playerName,
          teamId: toNumericId(teamIdValue),
          teamName: player.teamName,
          seasonId: player.seasonId,
          seasonYear: player.seasonYear,
          jerseyNumber: player.backNumber,
          gamesPlayed: player.pitching.gamesPlayed,
          inningsPitched: player.pitching.inningsPitched,
          wins: player.pitching.wins,
          losses: player.pitching.losses,
          saves: player.pitching.saves,
          strikeouts: player.pitching.strikeouts,
          walksAllowed: player.pitching.walksAllowed,
          era: player.pitching.era,
          whip: player.pitching.whip,
          partCode: getPartCode(player.teamName),
          group: TEAM_NAME_TO_GROUP.get(player.teamName) ?? null,
          seasonType: player.seasonType === 'PLAYOFF' ? player.division : null,
          scope: player.seasonType,
          regulation: player.pitching.regulation,
        } satisfies PitcherRanking;
      })
      .sort((a, b) => {
        const score = comparePitcher(a, b, 'era');
        if (score !== 0) return score;
        return a.playerName.localeCompare(b.playerName, 'ko');
      });

    return applyRank(rows);
  }, [allPlayers]);

  const filteredStandingsByFilters = useMemo(
    () =>
      teamStandings.filter((row) =>
        matchesRecordFilters(
          {
            teamName: row.teamName,
            partCode: row.partCode,
            seasonType: row.seasonType,
            scope: row.scope,
          },
          currentFilters,
        ),
      ),
    [teamStandings, currentFilters],
  );

  const filteredBattersByFilters = useMemo(
    () =>
      allBatters.filter((row) => {
        if (row.regulation !== regulation) return false;
        return matchesRecordFilters(
          {
            teamName: row.teamName,
            partCode: row.partCode,
            seasonType: row.seasonType,
            scope: row.scope,
          },
          currentFilters,
        );
      }),
    [allBatters, regulation, currentFilters],
  );

  const filteredPitchersByFilters = useMemo(
    () =>
      allPitchers.filter((row) => {
        if (row.regulation !== regulation) return false;
        return matchesRecordFilters(
          {
            teamName: row.teamName,
            partCode: row.partCode,
            seasonType: row.seasonType,
            scope: row.scope,
          },
          currentFilters,
        );
      }),
    [allPitchers, regulation, currentFilters],
  );

  const filteredStandingsBySearch = useMemo(() => {
    if (!searchTerm) return filteredStandingsByFilters;
    const keyword = searchTerm.toLowerCase();
    return filteredStandingsByFilters.filter((row) => row.teamName.toLowerCase().includes(keyword));
  }, [filteredStandingsByFilters, searchTerm]);

  const filteredBattersBySearch = useMemo(() => {
    if (!searchTerm) return filteredBattersByFilters;
    const keyword = searchTerm.toLowerCase();
    return filteredBattersByFilters.filter((row) => `${row.playerName} ${row.teamName}`.toLowerCase().includes(keyword));
  }, [filteredBattersByFilters, searchTerm]);

  const filteredPitchersBySearch = useMemo(() => {
    if (!searchTerm) return filteredPitchersByFilters;
    const keyword = searchTerm.toLowerCase();
    return filteredPitchersByFilters.filter((row) => `${row.playerName} ${row.teamName}`.toLowerCase().includes(keyword));
  }, [filteredPitchersByFilters, searchTerm]);

  const topInBatters = useMemo(() => {
    const rows = allBatters
      .filter((row) => row.regulation !== 'OUT')
      .slice()
      .sort((a, b) => {
        const score = compareBatter(a, b, topBatterSort);
        if (score !== 0) return score;
        return a.playerName.localeCompare(b.playerName, 'ko');
      });
    return applyRank(rows);
  }, [allBatters, topBatterSort]);

  const topInPitchers = useMemo(() => {
    const rows = allPitchers
      .filter((row) => row.regulation !== 'OUT')
      .slice()
      .sort((a, b) => {
        const score = comparePitcher(a, b, topPitcherSort);
        if (score !== 0) return score;
        return a.playerName.localeCompare(b.playerName, 'ko');
      });
    return applyRank(rows);
  }, [allPitchers, topPitcherSort]);

  const topBatterRows = useMemo<TopFiveRow[]>(
    () =>
      topInBatters.slice(0, 5).map((row) => ({
        id: `b-${row.playerId}-${row.seasonId}`,
        rank: row.rank,
        name: row.playerName,
        team: `${row.teamName}${row.jerseyNumber ? ` · #${row.jerseyNumber}` : ''}`,
        value: formatTopBatterValue(row, topBatterSort),
        link: `/records/player/${row.playerId}`,
      })),
    [topBatterSort, topInBatters],
  );

  const topPitcherRows = useMemo<TopFiveRow[]>(
    () =>
      topInPitchers.slice(0, 5).map((row) => ({
        id: `p-${row.playerId}-${row.seasonId}`,
        rank: row.rank,
        name: row.playerName,
        team: `${row.teamName}${row.jerseyNumber ? ` · #${row.jerseyNumber}` : ''}`,
        value: formatTopPitcherValue(row, topPitcherSort),
        link: `/records/player/${row.playerId}`,
      })),
    [topInPitchers, topPitcherSort],
  );

  const playoffStageSummary = useMemo(
    () =>
      selectedScopes
        .filter((scopeDoc) => scopeDoc.seasonType === 'PLAYOFF')
        .map((scopeDoc) => {
          const standingsRows = allStandings.filter((row) => row.scopeId === scopeDoc.scopeId);
          return {
            tier: scopeDoc.division,
            round: '종합',
            count: standingsRows.length,
            teams: standingsRows.map((row) => row.teamName),
            points: standingsRows.reduce((max, row) => Math.max(max, row.points), 0),
          };
        }),
    [selectedScopes, allStandings],
  );

  const loading = !scopeError && scopeDocs.length > 0 && (!selectedSeason || !statsReady);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const nodes = sectionRef.current?.querySelectorAll('.record-hub-section');
      if (!nodes) return;
      gsap.fromTo(
        nodes,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.62, stagger: 0.05, ease: 'power2.out' },
      );
    });

    return () => ctx.revert();
  }, [tab, selectedSeason?.id, loading]);

  return (
    <div style={{ display: 'grid', gap: '22px' }} ref={sectionRef}>
      <RecordsHubShell
        yearLabel={selectedSeason ? `${selectedSeason.year} 시즌 기록` : '기록'}
        tab={tab}
        tabs={TAB_OPTIONS}
        onTabChange={setTab}
        filterBar={
          <RecordsFilterBar
            seasons={seasons}
            selectedSeasonId={selectedSeason?.id ?? null}
            onSeasonChange={setSeasonId}
            scope={scope}
            scopeOptions={scopeOptions}
            onScopeChange={setScope}
            group={group}
            groupOptions={RECORD_GROUP_OPTIONS}
            onGroupChange={setGroup}
            playoffDivision={playoffDivision}
            playoffDivisionOptions={PLAYOFF_DIVISION_OPTIONS}
            playoffFilterEnabled={playoffFilterEnabled}
            onPlayoffDivisionChange={setPlayoffDivision}
            searchTerm={searchTerm}
            onSearchChange={(value) => updateParams({ search: value || null })}
            actions={
              <>
                <Link
                  to="/records/player"
                  style={quickLinkStyle('#e2e8f0', 'rgba(148,163,184,0.2)', 'rgba(148,163,184,0.36)')}
                >
                  선수 상세
                </Link>
                <Link
                  to="/prediction"
                  style={quickLinkStyle('#a7f3d0', 'rgba(16,185,129,0.14)', 'rgba(16,185,129,0.35)')}
                >
                  승부예측
                </Link>
              </>
            }
          />
        }
      />

      {loading && (
        <section className="record-hub-section" style={noticeCardStyle('#94a3b8')}>
          데이터를 불러오는 중입니다...
        </section>
      )}

      {scopeError && (
        <section className="record-hub-section" style={noticeCardStyle('#f87171')}>
          오류: {scopeError}
        </section>
      )}

      {!loading && !scopeError && scopeDocs.length === 0 && (
        <section className="record-hub-section" style={noticeCardStyle('#94a3b8')}>
          집계된 경기 기록이 아직 없습니다. 경기 종료 후 수 초 내에 기록이 반영됩니다.
        </section>
      )}

      {!loading && !scopeError && tab === 'standings' && (
        <StandingsTab
          rows={filteredStandingsBySearch}
          playoffStageSummary={playoffStageSummary}
          scope={scope}
          group={group}
          playoffDivision={playoffDivision}
          searchTerm={searchTerm}
          onToggleScope={toggleScopeFromCell}
          onToggleGroup={toggleGroupFromCell}
          onToggleDivision={toggleDivisionFromCell}
          onToggleTeamSearch={toggleTeamSearch}
        />
      )}

      {!loading && !scopeError && tab === 'batters' && (
        <BattersTab
          rows={filteredBattersBySearch}
          topRows={topBatterRows}
          seasonYear={selectedSeason?.year ?? null}
          scope={scope}
          group={group}
          playoffDivision={playoffDivision}
          regulation={regulation}
          onRegulationChange={setRegulation}
          onToggleScope={toggleScopeFromCell}
          onToggleGroup={toggleGroupFromCell}
          onToggleDivision={toggleDivisionFromCell}
          searchTerm={searchTerm}
          onToggleTeamSearch={toggleTeamSearch}
          onToggleRegulationFromCell={toggleRegulationFromCell}
          topSort={topBatterSort}
          topSortOptions={BATTER_SORT_OPTIONS}
          onTopSortChange={setTopBatterSort}
        />
      )}

      {!loading && !scopeError && tab === 'pitchers' && (
        <PitchersTab
          rows={filteredPitchersBySearch}
          topRows={topPitcherRows}
          seasonYear={selectedSeason?.year ?? null}
          scope={scope}
          group={group}
          playoffDivision={playoffDivision}
          regulation={regulation}
          onRegulationChange={setRegulation}
          onToggleScope={toggleScopeFromCell}
          onToggleGroup={toggleGroupFromCell}
          onToggleDivision={toggleDivisionFromCell}
          searchTerm={searchTerm}
          onToggleTeamSearch={toggleTeamSearch}
          onToggleRegulationFromCell={toggleRegulationFromCell}
          topSort={topPitcherSort}
          topSortOptions={PITCHER_SORT_OPTIONS}
          onTopSortChange={setTopPitcherSort}
        />
      )}
    </div>
  );
}
