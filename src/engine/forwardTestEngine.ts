import {
  AccountState,
  CurrencyPair,
  ExitReason,
  ForwardTestState,
  PerformanceMetrics,
  Position,
  ScalperConfig,
  TradeLog,
  TradeSignal,
} from '../types/scalper';
import { getPipMultiplier, priceDiffToPips, pipsToPriceDiff } from './technicalIndicators';

export const DEFAULT_CONFIG: ScalperConfig = {
  pair: 'USDJPY',
  timeframe: '5m',
  isAutoTrading: true,
  spreadPips: 0.0, // User requirement: zero-spread account assumption
  defaultLots: 1.0, // 1.0 lot = 100,000 units (1 pip = 1,000 JPY on USDJPY)
  takeProfitPips: 6.0, // 6.0 pips scalping target
  stopLossPips: 4.5, // 4.5 pips tight stop
  useTrailingStop: true,
  trailingStopPips: 2.5,
  trailingActivationPips: 2.0,
  maxOpenTrades: 2,
  minAiConfidence: 75,
  timeExpiryCandles: 12,
  selectedStrategy: 'ALL',
};

export const INITIAL_ACCOUNT: AccountState = {
  initialBalance: 1000000, // 1,000,000 JPY initial balance
  balance: 1000000,
  equity: 1000000,
  freeMargin: 1000000,
  marginLevel: 9999,
  currency: 'JPY',
  spreadPips: 0.0,
  slippagePips: 0.0,
};

export const INITIAL_METRICS: PerformanceMetrics = {
  totalTrades: 0,
  wins: 0,
  losses: 0,
  winRate: 0,
  profitFactor: 0,
  totalPipsWon: 0,
  totalPipsLost: 0,
  netPips: 0,
  netProfit: 0,
  maxDrawdown: 0,
  maxDrawdownPercent: 0,
  averageWinPips: 0,
  averageLossPips: 0,
  riskRewardRatio: 0,
  expectancyPips: 0,
  consecutiveWins: 0,
  consecutiveLosses: 0,
  maxConsecutiveWins: 0,
  maxConsecutiveLosses: 0,
};

/**
 * Calculates profit in currency from pips and lot size
 */
export function calculateProfitInCurrency(
  pair: CurrencyPair,
  lots: number,
  pips: number,
  currentRate: number
): number {
  // 1 standard lot = 100,000 base currency
  // For USDJPY: 1 pip = 0.01 JPY -> 1 lot 1 pip = 1,000 JPY
  // For EURUSD: 1 pip = $10 -> in JPY = $10 * current USDJPY (approx 1,520 JPY)
  if (pair === 'USDJPY') {
    return Math.round(lots * 1000 * pips);
  } else {
    // EURUSD profit in USD = lots * 10 * pips
    // Convert USD to JPY at 152.0
    return Math.round(lots * 10 * pips * 152.0);
  }
}

/**
 * Re-computes performance metrics from trade logs
 */
export function calculatePerformanceMetrics(
  tradeLogs: TradeLog[],
  initialBalance: number = 1000000
): PerformanceMetrics {
  if (tradeLogs.length === 0) return { ...INITIAL_METRICS };

  let wins = 0;
  let losses = 0;
  let totalPipsWon = 0;
  let totalPipsLost = 0;
  let netProfit = 0;
  let grossProfit = 0;
  let grossLoss = 0;

  let currentConsecutiveWins = 0;
  let currentConsecutiveLosses = 0;
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;

  let peakEquity = initialBalance;
  let maxDrawdown = 0;
  let runningEquity = initialBalance;

  for (const trade of tradeLogs) {
    runningEquity += trade.realizedPnL;
    if (runningEquity > peakEquity) {
      peakEquity = runningEquity;
    }
    const dd = peakEquity - runningEquity;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }

    if (trade.pipsGain > 0) {
      wins++;
      totalPipsWon += trade.pipsGain;
      grossProfit += trade.realizedPnL;
      currentConsecutiveWins++;
      currentConsecutiveLosses = 0;
      if (currentConsecutiveWins > maxConsecutiveWins) {
        maxConsecutiveWins = currentConsecutiveWins;
      }
    } else {
      losses++;
      totalPipsLost += Math.abs(trade.pipsGain);
      grossLoss += Math.abs(trade.realizedPnL);
      currentConsecutiveLosses++;
      currentConsecutiveWins = 0;
      if (currentConsecutiveLosses > maxConsecutiveLosses) {
        maxConsecutiveLosses = currentConsecutiveLosses;
      }
    }
    netProfit += trade.realizedPnL;
  }

  const totalTrades = tradeLogs.length;
  const winRate = Number(((wins / totalTrades) * 100).toFixed(1));
  const profitFactor =
    grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.9 : 0;
  const netPips = Number((totalPipsWon - totalPipsLost).toFixed(1));
  const averageWinPips = wins > 0 ? Number((totalPipsWon / wins).toFixed(1)) : 0;
  const averageLossPips = losses > 0 ? Number((totalPipsLost / losses).toFixed(1)) : 0;
  const riskRewardRatio =
    averageLossPips > 0 ? Number((averageWinPips / averageLossPips).toFixed(2)) : averageWinPips;

  const winRateDec = wins / totalTrades;
  const lossRateDec = losses / totalTrades;
  const expectancyPips = Number(
    (winRateDec * averageWinPips - lossRateDec * averageLossPips).toFixed(2)
  );
  const maxDrawdownPercent = Number(((maxDrawdown / peakEquity) * 100).toFixed(2));

  return {
    totalTrades,
    wins,
    losses,
    winRate,
    profitFactor,
    totalPipsWon: Number(totalPipsWon.toFixed(1)),
    totalPipsLost: Number(totalPipsLost.toFixed(1)),
    netPips,
    netProfit,
    maxDrawdown: Math.round(maxDrawdown),
    maxDrawdownPercent,
    averageWinPips,
    averageLossPips,
    riskRewardRatio,
    expectancyPips,
    consecutiveWins: currentConsecutiveWins,
    consecutiveLosses: currentConsecutiveLosses,
    maxConsecutiveWins,
    maxConsecutiveLosses,
  };
}

/**
 * Updates positions and account with the latest market price
 */
export function updatePositionsOnTick(
  state: ForwardTestState,
  currentPrice: number
): ForwardTestState {
  const { openPositions, config, account, tradeLogs } = state;
  if (openPositions.length === 0) {
    return {
      ...state,
      account: {
        ...account,
        equity: account.balance,
        freeMargin: account.balance,
      },
    };
  }

  const survivingPositions: Position[] = [];
  const newlyClosedLogs: TradeLog[] = [];
  let addedPnL = 0;
  const now = Date.now();

  for (const pos of openPositions) {
    let priceDiff =
      pos.direction === 'BUY' ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
    let pipsPnL = priceDiffToPips(pos.pair, priceDiff);

    const highest = Math.max(pos.highestPriceSinceEntry, currentPrice);
    const lowest = Math.min(pos.lowestPriceSinceEntry, currentPrice);

    let updatedPos: Position = {
      ...pos,
      currentPrice,
      highestPriceSinceEntry: highest,
      lowestPriceSinceEntry: lowest,
      pipsPnL,
      unrealizedPnL: calculateProfitInCurrency(pos.pair, pos.lots, pipsPnL, currentPrice),
    };

    // Trailing Stop check
    let shouldUpdateSL = false;
    let newSL = updatedPos.stopLoss;

    if (config.useTrailingStop) {
      if (pos.direction === 'BUY') {
        const peakPips = priceDiffToPips(pos.pair, highest - pos.entryPrice);
        if (peakPips >= config.trailingActivationPips) {
          const trailedPrice = highest - pipsToPriceDiff(pos.pair, config.trailingStopPips);
          if (trailedPrice > updatedPos.stopLoss) {
            newSL = trailedPrice;
            shouldUpdateSL = true;
          }
        }
      } else {
        const peakPips = priceDiffToPips(pos.pair, pos.entryPrice - lowest);
        if (peakPips >= config.trailingActivationPips) {
          const trailedPrice = lowest + pipsToPriceDiff(pos.pair, config.trailingStopPips);
          if (trailedPrice < updatedPos.stopLoss) {
            newSL = trailedPrice;
            shouldUpdateSL = true;
          }
        }
      }
    }

    if (shouldUpdateSL) {
      updatedPos.stopLoss = newSL;
      updatedPos.trailingStop = newSL;
    }

    // Check Take Profit Hit
    let isClosed = false;
    let exitReason: ExitReason = 'MANUAL';
    let exitPrice = currentPrice;

    if (pos.direction === 'BUY') {
      if (currentPrice >= pos.takeProfit) {
        isClosed = true;
        exitReason = 'TAKE_PROFIT';
        exitPrice = pos.takeProfit;
      } else if (currentPrice <= updatedPos.stopLoss) {
        isClosed = true;
        exitReason = updatedPos.trailingStop ? 'TRAILING_STOP' : 'STOP_LOSS';
        exitPrice = updatedPos.stopLoss;
      }
    } else {
      if (currentPrice <= pos.takeProfit) {
        isClosed = true;
        exitReason = 'TAKE_PROFIT';
        exitPrice = pos.takeProfit;
      } else if (currentPrice >= updatedPos.stopLoss) {
        isClosed = true;
        exitReason = updatedPos.trailingStop ? 'TRAILING_STOP' : 'STOP_LOSS';
        exitPrice = updatedPos.stopLoss;
      }
    }

    if (isClosed) {
      const finalDiff =
        pos.direction === 'BUY' ? exitPrice - pos.entryPrice : pos.entryPrice - exitPrice;
      const finalPips = priceDiffToPips(pos.pair, finalDiff);
      const realizedPnL = calculateProfitInCurrency(pos.pair, pos.lots, finalPips, exitPrice);

      addedPnL += realizedPnL;
      const durationMinutes = Math.max(1, Math.round((now - pos.entryTime) / 60000));

      newlyClosedLogs.unshift({
        id: `trade_${now}_${Math.random().toString(36).substring(2, 6)}`,
        pair: pos.pair,
        direction: pos.direction,
        lots: pos.lots,
        entryPrice: pos.entryPrice,
        exitPrice,
        entryTime: pos.entryTime,
        exitTime: now,
        pipsGain: finalPips,
        realizedPnL,
        exitReason,
        aiAnalysis: `【決済完了: ${exitReason}】保有時間 ${durationMinutes}分。スプレッド0環境下で${finalPips >= 0 ? '+' : ''}${finalPips} pips (${realizedPnL >= 0 ? '+' : ''}${realizedPnL.toLocaleString()}円)。`,
        holdingDurationMinutes: durationMinutes,
      });
    } else {
      survivingPositions.push(updatedPos);
    }
  }

  const updatedBalance = account.balance + addedPnL;
  const floatingPnL = survivingPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  const updatedEquity = updatedBalance + floatingPnL;

  const updatedTradeLogs = [...newlyClosedLogs, ...tradeLogs];
  const metrics = calculatePerformanceMetrics(updatedTradeLogs, account.initialBalance);

  let equityHistory = [...state.equityHistory];
  if (newlyClosedLogs.length > 0 || equityHistory.length === 0) {
    equityHistory.push({
      timestamp: now,
      equity: updatedEquity,
      balance: updatedBalance,
      tradeId: newlyClosedLogs[0]?.id,
    });
    if (equityHistory.length > 100) equityHistory.shift();
  }

  return {
    ...state,
    account: {
      ...account,
      balance: updatedBalance,
      equity: updatedEquity,
      freeMargin: updatedEquity - survivingPositions.length * 40000,
    },
    openPositions: survivingPositions,
    tradeLogs: updatedTradeLogs,
    metrics,
    equityHistory,
    lastUpdated: now,
  };
}

/**
 * Opens a new simulated position from a signal
 */
export function openPositionFromSignal(
  state: ForwardTestState,
  signal: TradeSignal,
  lots?: number
): ForwardTestState {
  if (state.openPositions.length >= state.config.maxOpenTrades) {
    return state;
  }

  const posLots = lots || state.config.defaultLots;
  const newPos: Position = {
    id: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    pair: signal.pair,
    direction: signal.direction === 'BUY' ? 'BUY' : 'SELL',
    lots: posLots,
    entryPrice: signal.price,
    entryTime: Date.now(),
    currentPrice: signal.price,
    stopLoss: signal.suggestedSL,
    takeProfit: signal.suggestedTP,
    pipsPnL: 0,
    unrealizedPnL: 0,
    signalReason: `${signal.strategy} (信頼度: ${signal.confidence}%)`,
    highestPriceSinceEntry: signal.price,
    lowestPriceSinceEntry: signal.price,
  };

  const updatedPositions = [...state.openPositions, newPos];
  return {
    ...state,
    openPositions: updatedPositions,
    lastUpdated: Date.now(),
  };
}
