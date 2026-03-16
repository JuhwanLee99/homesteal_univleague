import type { MatchSchedule } from '../state/demoStore';

export type StatSeasonType = 'LEAGUE' | 'PLAYOFF';
export type StatRecordMode = 'official' | 'practice';
export type LeagueDivision = 'LEAGUE' | 'PLAYOFF' | 'EUTTEUM' | 'BEOGEUM';

export interface StatScopeDoc {
  scopeId: string;
  seasonId: number;
  seasonYear: number;
  division: LeagueDivision;
  seasonType: StatSeasonType;
  recordMode: StatRecordMode;
  updatedAt: number;
  matchCount: number;
  aggregationVersion: number;
}

export interface PlayerAggregate {
  playerKey: string;
  scopeId: string;
  seasonId: number;
  seasonYear: number;
  division: LeagueDivision;
  seasonType: StatSeasonType;
  recordMode: StatRecordMode;
  teamId: string;
  teamName: string;
  playerName: string;
  normalizedName: string;
  backNumber: string;
  batting: {
    gamesPlayed: number;
    pa: number;
    ab: number;
    h: number;
    singles: number;
    doubles: number;
    triples: number;
    hr: number;
    bb: number;
    hbp: number;
    so: number;
    sac: number;
    fc: number;
    r: number;
    rbi: number;
    sb: number;
    battingAverage: number;
    onBasePct: number;
    sluggingPct: number;
    ops: number;
    regulation: 'IN' | 'OUT';
  };
  pitching: {
    gamesPlayed: number;
    outs: number;
    inningsPitched: number;
    wins: number;
    losses: number;
    saves: number;
    strikeouts: number;
    walksAllowed: number;
    hitsAllowed: number;
    runsAllowed: number;
    earnedRuns: number;
    era: number;
    whip: number;
    regulation: 'IN' | 'OUT';
  };
  updatedAt: number;
  lastMatchId: string | null;
  lastMatchAt: number | null;
}

export interface TeamAggregate {
  teamId: string;
  teamName: string;
  scopeId: string;
  seasonId: number;
  seasonYear: number;
  division: LeagueDivision;
  seasonType: StatSeasonType;
  recordMode: StatRecordMode;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  runsFor: number;
  runsAgainst: number;
  runDiff: number;
  forfeitLosses: number;
  updatedAt: number;
}

export interface StandingAggregate extends TeamAggregate {
  rank: number;
  headToHeadPoints: number;
}

type CompletedResult = {
  homeTeamKey: string;
  awayTeamKey: string;
  homeScore: number;
  awayScore: number;
};

const SCOPE_VERSION = 1;

export function toScopeSeasonType(division: string | null | undefined): StatSeasonType {
  if (division === 'PLAYOFF' || division === 'EUTTEUM' || division === 'BEOGEUM') return 'PLAYOFF';
  return 'LEAGUE';
}

export function toScopeDivision(division: string | null | undefined): LeagueDivision {
  if (division === 'PLAYOFF' || division === 'EUTTEUM' || division === 'BEOGEUM') return division;
  return 'LEAGUE';
}

export function buildScopeId(params: {
  seasonId: number;
  division: string | null | undefined;
  recordMode: string | null | undefined;
}): string {
  const normalizedDivision = toScopeDivision(params.division);
  const normalizedMode = params.recordMode === 'practice' ? 'practice' : 'official';
  return `${params.seasonId}__${normalizedDivision}__${normalizedMode}`;
}

export function resolveSeasonIdFromMatch(match: Pick<MatchSchedule, 'startTime'> & { seasonId?: number | null }): number {
  if (typeof match.seasonId === 'number' && Number.isFinite(match.seasonId)) {
    return Math.trunc(match.seasonId);
  }
  const start = typeof match.startTime === 'string' ? match.startTime : '';
  const yearText = start.slice(0, 4);
  const year = Number(yearText);
  if (Number.isFinite(year) && year >= 2000 && year <= 2100) return year;
  return new Date().getFullYear();
}

export function normalizePlayerName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function parsePlayerNameAndBackNumber(rawName: string): { playerName: string; backNumber: string } {
  const trimmed = (rawName || '').trim();
  if (!trimmed) return { playerName: '', backNumber: '' };
  const match = trimmed.match(/^(.*?)(?:\(([^()]+)\))?$/);
  if (!match) return { playerName: trimmed, backNumber: '' };
  const playerName = (match[1] || '').trim() || trimmed;
  const backNumber = (match[2] || '').trim();
  return { playerName, backNumber };
}

function sanitizeKeySegment(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9\-_.]/g, '')
    .toLowerCase();
}

export function buildPlayerKey(teamId: string, playerName: string, backNumber: string): string {
  const normalizedName = normalizePlayerName(playerName);
  const teamPart = sanitizeKeySegment(teamId || 'unknown-team') || 'unknown-team';
  const namePart = sanitizeKeySegment(normalizedName || 'unknown-player') || 'unknown-player';
  const backNumberPart = sanitizeKeySegment(backNumber || '00') || '00';
  return `${teamPart}__${namePart}__${backNumberPart}`;
}

function computeHeadToHeadPoints(
  results: CompletedResult[],
  tiedTeamKeys: Set<string>,
): Map<string, number> {
  const pointsMap = new Map<string, number>();
  tiedTeamKeys.forEach((key) => pointsMap.set(key, 0));

  results.forEach((result) => {
    if (!tiedTeamKeys.has(result.homeTeamKey) || !tiedTeamKeys.has(result.awayTeamKey)) return;
    if (result.homeScore > result.awayScore) {
      pointsMap.set(result.homeTeamKey, (pointsMap.get(result.homeTeamKey) ?? 0) + 3);
      return;
    }
    if (result.homeScore < result.awayScore) {
      pointsMap.set(result.awayTeamKey, (pointsMap.get(result.awayTeamKey) ?? 0) + 3);
      return;
    }
    pointsMap.set(result.homeTeamKey, (pointsMap.get(result.homeTeamKey) ?? 0) + 1);
    pointsMap.set(result.awayTeamKey, (pointsMap.get(result.awayTeamKey) ?? 0) + 1);
  });

  return pointsMap;
}

function toTeamKey(teamId: string | undefined, teamName: string): string {
  if (teamId && teamId.trim()) return `id:${teamId.trim()}`;
  return `name:${teamName.trim().toLowerCase()}`;
}

export function computeStandingsFromTeamAggregates(
  teams: TeamAggregate[],
  matches: Array<
    Pick<MatchSchedule, 'homeTeamId' | 'awayTeamId' | 'homeTeamName' | 'awayTeamName' | 'homeScore' | 'awayScore'> & {
      isForfeit?: boolean;
    }
  >,
): StandingAggregate[] {
  const teamByKey = new Map<string, TeamAggregate>();
  teams.forEach((team) => {
    teamByKey.set(toTeamKey(team.teamId, team.teamName), team);
  });

  const completedResults: CompletedResult[] = [];
  matches.forEach((match) => {
    if (typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return;
    const homeName = (match.homeTeamName || '').trim() || '홈팀';
    const awayName = (match.awayTeamName || '').trim() || '원정팀';
    const homeTeamKey = toTeamKey(match.homeTeamId, homeName);
    const awayTeamKey = toTeamKey(match.awayTeamId, awayName);
    if (!teamByKey.has(homeTeamKey) || !teamByKey.has(awayTeamKey)) return;
    completedResults.push({
      homeTeamKey,
      awayTeamKey,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    });
  });

  const byPoints = new Map<number, TeamAggregate[]>();
  teams.forEach((team) => {
    const list = byPoints.get(team.points) ?? [];
    list.push(team);
    byPoints.set(team.points, list);
  });

  const sortedPoints = [...byPoints.keys()].sort((a, b) => b - a);
  const ordered: Array<{ team: TeamAggregate; headToHeadPoints: number }> = [];

  sortedPoints.forEach((points) => {
    const group = byPoints.get(points) ?? [];
    if (group.length === 1) {
      ordered.push({ team: group[0], headToHeadPoints: 0 });
      return;
    }
    const tiedKeys = new Set(group.map((team) => toTeamKey(team.teamId, team.teamName)));
    const h2hPoints = computeHeadToHeadPoints(completedResults, tiedKeys);

    const sortedGroup = [...group].sort((a, b) => {
      if (a.forfeitLosses !== b.forfeitLosses) return a.forfeitLosses - b.forfeitLosses;
      if (a.draws !== b.draws) return b.draws - a.draws;

      const aKey = toTeamKey(a.teamId, a.teamName);
      const bKey = toTeamKey(b.teamId, b.teamName);
      const h2hDiff = (h2hPoints.get(bKey) ?? 0) - (h2hPoints.get(aKey) ?? 0);
      if (h2hDiff !== 0) return h2hDiff;

      if (a.runDiff !== b.runDiff) return b.runDiff - a.runDiff;
      if (a.runsFor !== b.runsFor) return b.runsFor - a.runsFor;
      return a.teamName.localeCompare(b.teamName, 'ko');
    });

    sortedGroup.forEach((team) => {
      const key = toTeamKey(team.teamId, team.teamName);
      ordered.push({ team, headToHeadPoints: h2hPoints.get(key) ?? 0 });
    });
  });

  return ordered.map(({ team, headToHeadPoints }, index) => ({
    ...team,
    rank: index + 1,
    headToHeadPoints,
  }));
}

export function getAggregationVersion(): number {
  return SCOPE_VERSION;
}
