export enum TournamentType {
  PONTOS_CORRIDOS = 'Pontos corridos',
  AMISTOSO = 'Amistoso',
  OITAVAS_IDA = 'Oitavas de Finais - Ida',
  OITAVAS_VOLTA = 'Oitavas de finais - Volta',
  QUARTAS_IDA = 'Quartas de Finais - Ida',
  QUARTAS_VOLTA = 'Quartas de finais - Volta',
  SEMI_IDA = 'Semifinais - Ida',
  SEMI_VOLTA = 'Semifinais - Volta',
  FINAL_IDA = 'Final - Ida',
  FINAL_VOLTA = 'Final - Volta',
  FINAL_UNICA = 'Final - Única'
}

export interface MatchHistory {
  opponent: string;
  goalsFor: number;
  goalsAgainst: number;
  isHome: boolean;
}

export interface TeamStats {
  name: string;
  htGoalPercentage: number;
  avgGoalsScored: number;
  avgGoalsConceded: number;
  recentMatches: MatchHistory[];
  logoUrl?: string;
}

export interface PreLiveStats {
  league: string;
  tournamentType: TournamentType;
  matchDate: string;
  homeTeam: TeamStats;
  awayTeam: TeamStats;
  firstLegScore?: string;
}

export interface LiveOddsMarket {
  home: number;
  draw: number;
  away: number;
}

export interface OverOddLine {
  label: string;
  odd: number;
}

export interface LiveStats {
  minute: number;
  scoreHome: number;
  scoreAway: number;
  possessionHome: number;
  possessionAway: number;
  dangerousAttacksHome: number;
  dangerousAttacksAway: number;
  totalAttacksHome: number;
  totalAttacksAway: number;
  shotsOnGoalHome: number;
  shotsOnGoalAway: number;
  totalShotsHome: number;
  totalShotsAway: number;
  cornersHome: number;
  cornersAway: number;
  yellowCardsHome: number;
  yellowCardsAway: number;
  redCardsHome: number;
  redCardsAway: number;
  xgHome: number;
  xgAway: number;
  marketOdds?: LiveOddsMarket;
  overOdds?: OverOddLine[];
}

export interface AnalysisData {
  preLive: PreLiveStats;
  live?: LiveStats;
}

export interface SavedAnalysis {
  id: string;
  timestamp: number;
  data: AnalysisData;
  prognosis: string;
  finalScore?: { home: number; away: number };
  postMatchReport?: string;
  linkedEntryId?: string; 
}

export type EntryResult = 'GREEN' | 'RED' | 'VOID' | 'PENDING';

export interface BankrollEntry {
  id: string;
  date: string;
  match: string;
  league: string;
  market: string; 
  stake: number;
  odds: number;
  result: EntryResult;
  profit: number; 
  analysisId?: string; 
}

export interface BankrollSummary {
  initialBankroll: number;
  currentBankroll: number;
  totalProfit: number;
  roi: number;
  winRate: number;
  greenCount: number;
  redCount: number;
  voidCount: number;
}