export type CurrencyPair = 'USDJPY' | 'EURUSD';
export type Timeframe = '1m' | '5m';

export interface Candle {
  time: number; // unix timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed?: boolean;
}

export interface IndicatorValues {
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  rsi14: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbBandwidth: number;
  macdLine: number;
  signalLine: number;
  macdHist: number;
  atr14: number;
}

export interface TradeSignal {
  id: string;
  timestamp: number;
  pair: CurrencyPair;
  timeframe: Timeframe;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  price: number;
  strategy: string;
  confidence: number; // 0 - 100
  rationale: string;
  aiVerdict?: {
    score: number;
    reasoning: string;
    actionApproved: boolean;
  };
  suggestedSL: number;
  suggestedTP: number;
  pipsRisk: number;
  pipsReward: number;
}

export interface Position {
  id: string;
  pair: CurrencyPair;
  direction: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  entryTime: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  trailingStop?: number;
  hardStopLoss?: number; // Layer 1: Broker-side emergency hard stop (e.g. -18 pips)
  softStopLoss?: number; // Layer 2: Software logical stop with time filter (e.g. -10 pips)
  softStopTriggeredTime?: number | null; // Timestamp when price first breached soft SL
  spikeAvoidanceCount?: number; // Count of transient spike absorptions
  pipsPnL: number;
  unrealizedPnL: number;
  signalReason: string;
  highestPriceSinceEntry: number;
  lowestPriceSinceEntry: number;
}

export type ExitReason =
  | 'TAKE_PROFIT'
  | 'STOP_LOSS'
  | 'SOFT_STOP_LOSS'
  | 'HARD_STOP_LOSS'
  | 'TRAILING_STOP'
  | 'TIME_EXPIRY'
  | 'SIGNAL_REVERSAL'
  | 'MANUAL';

export interface TradeLog {
  id: string;
  pair: CurrencyPair;
  direction: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: number;
  exitTime: number;
  pipsGain: number;
  realizedPnL: number;
  commissionFee?: number; // XM Zero commission in JPY
  netRealizedPnL?: number; // PnL after commission & spread
  exitReason: ExitReason;
  aiAnalysis: string;
  holdingDurationMinutes: number;
}

export interface AccountState {
  initialBalance: number;
  balance: number;
  equity: number;
  freeMargin: number;
  marginLevel: number;
  currency: 'JPY' | 'USD';
  spreadPips: number; // Zero spread = 0.0
  slippagePips: number;
}

export interface PerformanceMetrics {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number; // 0 - 100
  profitFactor: number;
  totalPipsWon: number;
  totalPipsLost: number;
  netPips: number;
  netProfit: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  averageWinPips: number;
  averageLossPips: number;
  riskRewardRatio: number;
  expectancyPips: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
}

export interface StrategyDiagnosis {
  id: string;
  timestamp: number;
  totalAnalyzedTrades: number;
  winRate: number;
  profitFactor: number;
  netPips: number;
  trendDisciplineScore: number; // 0 - 100
  executiveSummary: string;
  lossPatternForensics: string[];
  strengthsIdentified: string[];
  suggestedParameterAdjustments: {
    stopLossPips?: number;
    takeProfitPips?: number;
    minAiConfidence?: number;
    trailingActivationPips?: number;
    trailingStopPips?: number;
    reason: string;
  };
  applied: boolean;
}

export interface ScalperConfig {
  pair: CurrencyPair;
  timeframe: Timeframe;
  isAutoTrading: boolean;
  spreadPips: number;
  defaultLots: number;
  takeProfitPips: number;
  stopLossPips: number;
  useTrailingStop: boolean;
  trailingStopPips: number;
  trailingActivationPips: number;
  maxOpenTrades: number;
  minAiConfidence: number;
  timeExpiryCandles: number;
  selectedStrategy: 'ALL' | 'BOB_VOLMAN_PULLBACK' | 'BB_BREAKOUT' | 'VOLMAN_BLOCK_BREAK';
  simulationSpeedMultiplier?: number;
  trendSlopeFilter?: boolean;
  // Dual-Layer Stop-Loss Architecture
  useDualLayerStopLoss?: boolean;
  softStopLossPips?: number; // Layer 2: Logical stop (e.g. 10.0 pips)
  hardStopLossPips?: number; // Layer 1: Broker emergency stop (e.g. 18.0 pips)
  softStopHoldSeconds?: number; // Delay to confirm breakout vs transient spike (e.g. 20-30s)
  // Broker Realism Settings
  accountType?: 'XM_ZERO' | 'STANDARD_ZERO' | 'RAW_ECN';
  xmCommissionUsdPerLot?: number; // Default $5.0 round-turn / lot
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
  balance: number;
  tradeId?: string;
}

export interface ForwardTestState {
  config: ScalperConfig;
  account: AccountState;
  openPositions: Position[];
  tradeLogs: TradeLog[];
  metrics: PerformanceMetrics;
  equityHistory: EquityPoint[];
  aiDiagnosisHistory?: StrategyDiagnosis[];
  lastUpdated: number;
  startedAt: number;
}

export interface MarketStatus {
  isOpen: boolean;
  currentRate: number;
  change24h: number;
  high24h: number;
  low24h: number;
  serverTime: number;
  source: string;
  isWeekendClosed: boolean;
}
