import type { MatchSchedule, MatchPhase } from '../state/demoStore';

export interface LeagueStandingRow {
  rank: number;
  teamKey: string;
  teamId?: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  runsFor: number;
  runsAgainst: number;
  runDiff: number;
  forfeitLosses: number;
}

type TeamAccumulator = Omit<LeagueStandingRow, 'rank'>;

type CompletedResult = {
  homeTeamKey: string;
  awayTeamKey: string;
  homeScore: number;
  awayScore: number;
  isForfeit: boolean;
};

function derivePhase(match: MatchSchedule): MatchPhase {
  if (match.phase) return match.phase;
  if ((match.recordMode ?? 'official') === 'practice') return 'PRACTICE';
  return 'REGULAR';
}

function getTeamKey(teamId: string | undefined, teamName: string): string {
  if (teamId && teamId.trim()) return `id:${teamId.trim()}`;
  return `name:${teamName.trim().toLowerCase()}`;
}

function ensureTeam(
  map: Map<string, TeamAccumulator>,
  teamKey: string,
  teamName: string,
  teamId?: string,
): TeamAccumulator {
  const existing = map.get(teamKey);
  if (existing) {
    if (teamId && !existing.teamId) existing.teamId = teamId;
    if (teamName && existing.teamName !== teamName) existing.teamName = teamName;
    return existing;
  }

  const next: TeamAccumulator = {
    teamKey,
    teamId,
    teamName,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    points: 0,
    runsFor: 0,
    runsAgainst: 0,
    runDiff: 0,
    forfeitLosses: 0,
  };
  map.set(teamKey, next);
  return next;
}

function resolveCompletedScore(match: MatchSchedule): { homeScore: number; awayScore: number } | null {
  const homeRaw = typeof match.homeScore === 'number' ? match.homeScore : null;
  const awayRaw = typeof match.awayScore === 'number' ? match.awayScore : null;

  if (homeRaw !== null && awayRaw !== null) {
    return { homeScore: homeRaw, awayScore: awayRaw };
  }

  if (!match.isForfeit) return null;

  if (homeRaw === null && awayRaw === null) {
    return { homeScore: 0, awayScore: 7 };
  }

  if (homeRaw === null) {
    const inferredHome = awayRaw === 0 ? 7 : 0;
    return { homeScore: inferredHome, awayScore: awayRaw ?? 0 };
  }

  const inferredAway = homeRaw === 0 ? 7 : 0;
  return { homeScore: homeRaw, awayScore: inferredAway };
}

function computeHeadToHeadPoints(
  results: CompletedResult[],
  tiedTeamKeys: Set<string>,
): Map<string, number> {
  const pointsMap = new Map<string, number>();
  tiedTeamKeys.forEach((key) => {
    pointsMap.set(key, 0);
  });

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

export function getRegularSeasonMatches(matches: MatchSchedule[]): MatchSchedule[] {
  return matches.filter((match) => {
    if (match.deleted) return false;
    if (derivePhase(match) !== 'REGULAR') return false;
    return (match.recordMode ?? 'official') !== 'practice';
  });
}

export function calculateLeagueStandings(matches: MatchSchedule[]): LeagueStandingRow[] {
  const regularMatches = getRegularSeasonMatches(matches);
  const teams = new Map<string, TeamAccumulator>();
  const completedResults: CompletedResult[] = [];

  regularMatches.forEach((match) => {
    const homeName = match.homeTeamName?.trim() || '홈팀';
    const awayName = match.awayTeamName?.trim() || '원정팀';

    const homeTeamKey = getTeamKey(match.homeTeamId, homeName);
    const awayTeamKey = getTeamKey(match.awayTeamId, awayName);

    const home = ensureTeam(teams, homeTeamKey, homeName, match.homeTeamId);
    const away = ensureTeam(teams, awayTeamKey, awayName, match.awayTeamId);

    if (match.status !== 'completed') return;

    const score = resolveCompletedScore(match);
    if (!score) return;

    const { homeScore, awayScore } = score;

    completedResults.push({
      homeTeamKey,
      awayTeamKey,
      homeScore,
      awayScore,
      isForfeit: Boolean(match.isForfeit),
    });

    home.played += 1;
    away.played += 1;
    home.runsFor += homeScore;
    home.runsAgainst += awayScore;
    away.runsFor += awayScore;
    away.runsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
      if (match.isForfeit) away.forfeitLosses += 1;
    } else if (homeScore < awayScore) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
      if (match.isForfeit) home.forfeitLosses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  });

  const byPoints = new Map<number, TeamAccumulator[]>();
  teams.forEach((team) => {
    team.runDiff = team.runsFor - team.runsAgainst;
    const list = byPoints.get(team.points) ?? [];
    list.push(team);
    byPoints.set(team.points, list);
  });

  const sortedPoints = Array.from(byPoints.keys()).sort((a, b) => b - a);
  const ordered: TeamAccumulator[] = [];

  sortedPoints.forEach((points) => {
    const group = byPoints.get(points) ?? [];
    if (group.length === 1) {
      ordered.push(group[0]);
      return;
    }

    const tiedKeys = new Set(group.map((team) => team.teamKey));
    const h2hPoints = computeHeadToHeadPoints(completedResults, tiedKeys);

    const sortedGroup = [...group].sort((a, b) => {
      if (a.forfeitLosses !== b.forfeitLosses) return a.forfeitLosses - b.forfeitLosses;
      if (a.draws !== b.draws) return b.draws - a.draws;

      const h2hDiff = (h2hPoints.get(b.teamKey) ?? 0) - (h2hPoints.get(a.teamKey) ?? 0);
      if (h2hDiff !== 0) return h2hDiff;

      if (a.runDiff !== b.runDiff) return b.runDiff - a.runDiff;
      if (a.runsFor !== b.runsFor) return b.runsFor - a.runsFor;
      return a.teamName.localeCompare(b.teamName, 'ko');
    });

    ordered.push(...sortedGroup);
  });

  return ordered.map((team, index) => ({
    ...team,
    rank: index + 1,
  }));
}
