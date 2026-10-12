// Comprehensive TypeScript Definitions for Private Mahjong Analytics & Simulation Platform

export type Suit = 'm' | 'p' | 's' | 'z'; // Manzu, Pinzu, Souzu, Jihai (Honors)
export type Wind = 'EAST' | 'SOUTH' | 'WEST' | 'NORTH';

export interface Tile {
  id: string; // e.g. "1m_0", "5p_red_1"
  suit: Suit;
  value: number; // 1-9 for m,p,s; 1-7 for z (1:東, 2:南, 3:西, 4:北, 5:白, 6:發, 7:中)
  isRed?: boolean; // Red dora (aka-dora)
}

export type MeldType = 'CHI' | 'PON' | 'KAN_OPEN' | 'KAN_CLOSED' | 'KAN_ADDED';

export interface Meld {
  type: MeldType;
  tiles: Tile[];
  fromPlayerIndex?: number; // 0..3
  calledTile?: Tile;
}

export interface PlayerHand {
  tiles: Tile[]; // Concealed tiles in hand (13 or 14 during draw)
  melds: Meld[]; // Exposed calls
  winningTile?: Tile;
}

export type CareLevel = 1 | 2 | 3 | 4;

export interface CareLevelExplanation {
  level: CareLevel;
  title: string;
  description: string;
  badgeColor: string;
  severity: 'MINIMAL' | 'MODERATE' | 'SERIOUS' | 'CRITICAL';
}

export type WaitShape = 'RYANMEN' | 'KANCHAN' | 'PENCHAN' | 'SHANPON' | 'TANKI' | 'KOKUSHI' | 'OTHER';

export interface DealInAnalysis {
  careLevel: CareLevel;
  careDetails: string;
  unreasonablePush: boolean; // Pushing at 2-shanten or 3-shanten against active Riichi
  dealInShanten: number; // Shanten when dealing in
  targetWaitShape: WaitShape;
  winningHandHan: number;
  winningHandFu: number;
  pointsLost: number;
  isAgainstOpenRiichi: boolean;
  isOpenRiichiYakumanPenalty: boolean;
}

export interface TelemetryAction {
  id: string;
  roundNumber: number; // e.g. 1 for East 1
  turnIndex: number;
  playerIndex: number;
  actionType: 'DRAW' | 'DISCARD' | 'RIICHI' | 'OPEN_RIICHI' | 'CHI' | 'PON' | 'KAN' | 'TSUMO' | 'RON' | 'DRAW_CALL' | 'MANE_MANGAN';
  tile?: Tile;
  shanten: number;
  isRiichiActive: boolean;
  isOpenRiichiActive: boolean;
  anyOpponentInRiichi: boolean;
  maneManganStreak: number;
  isDamaTenpai?: boolean;
  dealInAnalysis?: DealInAnalysis;
  timestamp: number;
}

export interface HouseRules {
  startingScore: number; // 25,000 pts
  returnScore: number; // 30,000 pts
  uma: [number, number, number, number]; // [+20, +10, -10, -20]
  tenpaiRenchan: boolean; // Dealer continues only if Tenpai at draw
  honbaValue: number; // 300 pts (100 each for tsumo)
  ryanhanShibariHonba: number; // Automatically enforced starting at 5 honba
  kyushukyuhai: boolean; // Allowed on Turn 1 if no melds
  sufonRenda: boolean; // Draw triggered on 4 same winds in 1st round, Dealer does NOT pass
  nagashiMangan: boolean; // Terminals/honors only in discards & none called
  tripleRonDraw: boolean; // 3 players Ron same tile -> Ryuukyoku draw
  sanrenko: boolean; // 3 consecutive triplets in same suit (2 Han)
  suurenko: boolean; // 4 consecutive triplets in same suit (Yakuman)
  openRiichi: boolean; // 2 Han, exposes hand, non-riichi deal-in = Yakuman penalty
  maneMangan: boolean; // Mimic kamicha discards from turn 1 (5=Mangan .. 9=Yakuman)
  doubleYakuman: boolean; // Kokushi 13, Suuankou Tanki, Daisushi, Chuuren 9
  allowRedDora: boolean; // 3 red dora tiles
  turnTimerSeconds: number | null; // 5, 10, 15, or null (unlimited)
}

export interface PersonaProfile {
  id: string;
  name: string;
  avatarSeed: string;
  description: string;
  styleTag: string;
  isAiBot: boolean;
  // Persona tuning dimensions (0 - 100)
  callTendency: number; // 鳴き率 (Chi/Pon aggression)
  riichiTendency: number; // 立直志向 vs ダマ志向
  defensePriority: number; // 守備力 (Beta-ori fold vs Push)
  badWaitTolerance: number; // 愚形待ち立直許容度
  damaPreference: number; // 闇聴 (Dama) 選択傾向
  maneManganHunter: number; // マネ満狙い傾向
  pushShantenThreshold: number; // 押し引き閾値 (1=Tenpaiのみ押す, 2=1向聴も押す, 3=2向聴まで無謀押し)
}

export interface PlayerState {
  id: string;
  name: string;
  isBot: boolean;
  persona: PersonaProfile;
  score: number;
  seatWind: Wind;
  hand: PlayerHand;
  discards: Tile[];
  discardShantens: number[]; // Shanten at each discard
  isRiichi: boolean;
  isOpenRiichi: boolean;
  riichiTurn?: number;
  isIppatsu: boolean;
  isTenpai: boolean;
  currentShanten: number;
  maneManganStreak: number; // consecutive matching discards with kamicha
  maneManganFailed: boolean;
  unreasonablePushCount: number;
}

export interface RoundState {
  roundWind: Wind; // EAST (東場) or SOUTH (南場)
  roundNumber: number; // 1 to 4 (e.g. 東1局)
  honba: number; // 本場数
  riichiSticks: number; // 供託立直棒数 (1000 pts each)
  dealerIndex: number; // 0 to 3
  turnPlayerIndex: number;
  remainingTilesCount: number;
  doraIndicators: Tile[];
  uraDoraIndicators: Tile[];
  wall: Tile[];
  deadWall: Tile[];
  currentTurnNumber: number;
  isRyanhanShibari: boolean; // active if honba >= 5
  firstRoundMeldsOccurred: boolean;
  sufonRendaDiscards: Tile[];
  isExhausted: boolean;
  isGameOver: boolean;
  winnerIndexes: number[];
  ronDealerIndex?: number;
}

export interface YakuResult {
  name: string;
  han: number;
  isYakuman?: boolean;
  yakumanMultiplier?: number;
}

export interface HandEvaluation {
  han: number;
  fu: number;
  yakuList: YakuResult[];
  isYakuman: boolean;
  yakumanCount: number;
  scoreTitle: string; // e.g. "満貫 (Mangan)", "跳満 (Haneman)", "役満 (Yakuman)"
  tsumoPayments?: {
    dealer: number;
    nonDealer: number;
  };
  ronPayment?: number;
  isOpenRiichiYakumanPenalty?: boolean;
}

export interface MatchRecord {
  id: string;
  sessionId: string;
  gameIndexInSet: number; // 1 to 6
  startedAt: number;
  finishedAt: number;
  isRecorded: boolean; // true if 4 human players by default, or overridden
  rules: HouseRules;
  players: {
    id: string;
    name: string;
    finalScore: number;
    rank: number;
    umaDiff: number;
    totalDealIns: number;
    unreasonablePushes: number;
    careLevelCounts: Record<CareLevel, number>;
  }[];
  telemetryActions: TelemetryAction[];
}

export interface SetSession {
  id: string;
  name: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED';
  targetGamesCount: number; // e.g. 6 Hanchan
  completedGamesCount: number;
  players: {
    id: string;
    name: string;
    isBot: boolean;
    personaId?: string;
  }[];
  gameRecords: MatchRecord[];
  createdAt: number;
  updatedAt: number;
}

export interface HeadToHeadStats {
  playerAId: string;
  playerAName: string;
  playerBId: string;
  playerBName: string;
  dealInsAtoB: number; // Times A dealt in to B
  pointsPaidAtoB: number; // Total points A paid to B
  dealInsBtoA: number;
  pointsPaidBtoA: number;
  netPointsForA: number;
}

// Standardized Match Log Schema for Decoupled Analytical Agents
export interface StandardizedPlayerRecord {
  id: string;
  name: string;
  seatWind: Wind;
  finalScore: number;
  rank: number;
  umaDiff: number;
  totalDealIns: number;
  unreasonablePushes: number;
  careLevelCounts: Record<CareLevel, number>;
  totalWins: number;
  damaWins: number;
}

export interface StandardizedMatchLog {
  version: '2.0.0-telemetry-standard';
  matchId: string;
  sessionId: string;
  timestamp: number;
  rules: HouseRules;
  players: StandardizedPlayerRecord[];
  events: TelemetryAction[];
}

export interface AnalyticalAgentMetadata {
  id: string;
  name: string;
  tag: string;
  category: 'CARE_AUDIT' | 'SET_QUANT' | 'MATCHUP' | 'PERSONA' | 'CUSTOM_AI';
  description: string;
  author: string;
  badgeColor: string;
}

export type ImportedPlatform = 'TENHOU' | 'MAHJONG_SOUL' | 'LOCAL';

export interface CustomAgentConfig {
  id: string;
  name: string;
  author: string; // メンバー名 (作成者)
  description: string;
  category: 'CARE_AUDIT' | 'SET_QUANT' | 'MATCHUP' | 'PERSONA' | 'CUSTOM_AI';
  badgeColor: string;
  // パラメータ設定
  careLevelScrutiny: number; // 放銃審査の厳しさ (0-100)
  pushToleranceShanten: number; // 無謀押し判定の許容向聴数 (1〜3)
  focusMetric: 'DEFENSE' | 'ATTACK' | 'LEAD_MANAGEMENT' | 'BALANCE';
  customSystemPrompt: string; // Gemini用カスタム指示プロンプト
  createdAt: number;
}

