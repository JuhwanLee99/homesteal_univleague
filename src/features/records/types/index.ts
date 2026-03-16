import type { RecordPlayoffDivision, RecordScope } from '../../../shared/api/backendClient';

export type RecordsTab = 'standings' | 'batters' | 'pitchers';

export type CellScope = Exclude<RecordScope, 'ALL'>;
export type CellPlayoffDivision = Exclude<RecordPlayoffDivision, 'ALL'>;

export interface TopFiveRow {
  id: string;
  rank: number;
  name: string;
  team: string;
  value: string;
  link: string;
}

export interface PlayoffStageSummaryRow {
  tier: string;
  round: string;
  count: number;
  teams: string[];
  points: number;
}
