
export enum AppState {
  MENU = 'MENU',
  TOURNAMENT_TREE = 'TOURNAMENT_TREE',
  LEAGUE = 'LEAGUE',
  GAME = 'GAME',
  GAME_OVER = 'GAME_OVER',
  ONLINE_MENU = 'ONLINE_MENU',
  QUICK_MATCH = 'QUICK_MATCH'
}

export type Difficulty = 'easy' | 'normal' | 'hard' | 'legend';
export type Pattern = 'solid' | 'stripes' | 'sash' | 'half';
export type Emblem = 'shield' | 'zap' | 'skull' | 'crown' | 'star' | 'none';
export type AITrait = 'balanced' | 'defensive' | 'aggressive';
export type Language = 'es' | 'en' | 'pt';

export interface Stadium {
  id: string;
  nameKey: string; // Translation key
  grassColor: string;
  grassStripesColor: string;
  linesColor: string;
  goalColor: string;
  backgroundColor: string;
  playerDamping: number; // 0.94 default. Higher = stickier, Lower = slippery
  ballDamping: number; // 0.985 default.
}

export interface MatchSettings {
  timeLimit: number; // in seconds
  difficulty: Difficulty;
  stadiumId?: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  secondaryColor?: string;
  pattern?: Pattern;
  emblem?: Emblem;
  aiTrait?: AITrait; // New AI Personality
  isPlayer: boolean;
}

// League Specific Types
export interface LeagueTeam extends Team {
  stats: {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    points: number;
  };
}

export interface LeagueMatch {
  id: string;
  homeId: string;
  awayId: string;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
  round: number;
}

export interface LeagueState {
  div1: LeagueTeam[];
  div2: LeagueTeam[];
  div3: LeagueTeam[];
  scheduleDiv1: LeagueMatch[][];
  scheduleDiv2: LeagueMatch[][];
  scheduleDiv3: LeagueMatch[][];
  currentRound: number;
  totalRounds: number;
  userTeamId: string;
  settings: MatchSettings;
  season: number;
}

export interface Match {
  id: string;
  teamA: Team;
  teamB: Team;
  
  playedLeg1: boolean;
  playedLeg2: boolean;
  scoreLeg1A: number;
  scoreLeg1B: number;
  scoreLeg2A: number;
  scoreLeg2B: number;
  
  winner?: Team;
  round: number;
}

export interface TournamentState {
  matches: Match[];
  currentMatchId: string | null;
  champion: Team | null;
  settings: MatchSettings;
  userTeamId: string;
}

export interface PhysicsCircle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  mass: number;
  damping: number;
  color: string;
  secondaryColor?: string; // For rendering patterns
  pattern?: Pattern;
}

export interface GameConfig {
  scoreLimit: number;
  timeLimit: number;
}

// Network Types
export interface GameStatePayload {
  type?: 'GAME_STATE';
  p1: { x: number, y: number, vx: number, vy: number };
  p2: { x: number, y: number, vx: number, vy: number };
  ball: { x: number, y: number, vx: number, vy: number };
  scoreA: number;
  scoreB: number;
  timeLeft: number;
}

export interface InputPayload {
  type?: 'INPUT';
  keys: { [key: string]: boolean };
}

export interface ChatPayload {
  type: 'CHAT';
  text: string;
}

export interface TeamConfigPayload {
  type: 'TEAM_CONFIG';
  team: Team;
}

export interface GameStartPayload {
  type: 'GAME_START';
  stadiumId: string;
}

export interface ChatEntry {
  id: string;
  sender: 'me' | 'opponent' | 'system';
  text: string;
  timestamp: number;
}
