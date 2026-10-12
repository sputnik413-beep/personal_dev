import { Candle, IndicatorValues, CurrencyPair } from '../types/scalper';

/**
 * Returns pip multiplier:
 * USDJPY: 1 pip = 0.01
 * EURUSD: 1 pip = 0.0001
 */
export function getPipMultiplier(pair: CurrencyPair): number {
  return pair === 'USDJPY' ? 0.01 : 0.0001;
}

/**
 * Converts price difference to pips
 */
export function priceDiffToPips(pair: CurrencyPair, diff: number): number {
  const pip = getPipMultiplier(pair);
  return Number((diff / pip).toFixed(2));
}

/**
 * Converts pips to price difference
 */
export function pipsToPriceDiff(pair: CurrencyPair, pips: number): number {
  const pip = getPipMultiplier(pair);
  return pips * pip;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  const k = 2 / (period + 1);
  const emaArray: number[] = new Array(prices.length);

  // First value uses SMA
  let initialSma = 0;
  const initialPeriod = Math.min(period, prices.length);
  for (let i = 0; i < initialPeriod; i++) {
    initialSma += prices[i];
  }
  initialSma /= initialPeriod;

  emaArray[0] = initialSma;

  for (let i = 1; i < prices.length; i++) {
    emaArray[i] = prices[i] * k + emaArray[i - 1] * (1 - k);
  }

  return emaArray;
}

/**
 * Calculate Relative Strength Index (RSI) - Wilder's Smoothing
 */
export function calculateRSI(prices: number[], period: number = 14): number[] {
  if (prices.length <= period) {
    return new Array(prices.length).fill(50);
  }

  const rsiArray: number[] = new Array(prices.length).fill(50);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  if (avgLoss === 0) {
    rsiArray[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    rsiArray[period] = 100 - 100 / (1 + rs);
  }

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsiArray[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsiArray[i] = 100 - 100 / (1 + rs);
    }
  }

  return rsiArray;
}

/**
 * Calculate Bollinger Bands (20 periods, 2 std dev)
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number[]; middle: number[]; lower: number[]; bandwidth: number[] } {
  const upper = new Array(prices.length).fill(0);
  const middle = new Array(prices.length).fill(0);
  const lower = new Array(prices.length).fill(0);
  const bandwidth = new Array(prices.length).fill(0);

  for (let i = 0; i < prices.length; i++) {
    const startIdx = Math.max(0, i - period + 1);
    const window = prices.slice(startIdx, i + 1);
    const mean = window.reduce((a, b) => a + b, 0) / window.length;

    const variance =
      window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
    const stdDev = Math.sqrt(variance);

    middle[i] = mean;
    upper[i] = mean + stdDevMultiplier * stdDev;
    lower[i] = mean - stdDevMultiplier * stdDev;
    bandwidth[i] = mean > 0 ? ((upper[i] - lower[i]) / mean) * 100 : 0;
  }

  return { upper, middle, lower, bandwidth };
}

/**
 * Calculate MACD (12, 26, 9)
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macdLine: number[]; signalLine: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram = macdLine.map((macd, i) => macd - signalLine[i]);

  return { macdLine, signalLine, histogram };
}

/**
 * Calculate Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period: number = 14): number[] {
  if (candles.length === 0) return [];
  const trueRanges: number[] = new Array(candles.length).fill(0);

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      trueRanges[i] = candles[i].high - candles[i].low;
    } else {
      const highLow = candles[i].high - candles[i].low;
      const highClosePrev = Math.abs(candles[i].high - candles[i - 1].close);
      const lowClosePrev = Math.abs(candles[i].low - candles[i - 1].close);
      trueRanges[i] = Math.max(highLow, highClosePrev, lowClosePrev);
    }
  }

  const atrArray: number[] = new Array(candles.length).fill(0);
  let sumTR = 0;
  const initialPeriod = Math.min(period, candles.length);
  for (let i = 0; i < initialPeriod; i++) {
    sumTR += trueRanges[i];
  }
  atrArray[initialPeriod - 1] = sumTR / initialPeriod;

  for (let i = initialPeriod; i < candles.length; i++) {
    atrArray[i] = (atrArray[i - 1] * (period - 1) + trueRanges[i]) / period;
  }

  return atrArray;
}

/**
 * Computes all indicator values for current latest candle
 */
export function computeLatestIndicators(candles: Candle[]): IndicatorValues {
  if (candles.length === 0) {
    return {
      ema9: 0,
      ema21: 0,
      ema50: 0,
      ema200: 0,
      rsi14: 50,
      bbUpper: 0,
      bbMiddle: 0,
      bbLower: 0,
      bbBandwidth: 0,
      macdLine: 0,
      signalLine: 0,
      macdHist: 0,
      atr14: 0,
    };
  }

  const closePrices = candles.map((c) => c.close);
  const lastIdx = closePrices.length - 1;

  const ema9 = calculateEMA(closePrices, 9)[lastIdx] || closePrices[lastIdx];
  const ema21 = calculateEMA(closePrices, 21)[lastIdx] || closePrices[lastIdx];
  const ema50 = calculateEMA(closePrices, 50)[lastIdx] || closePrices[lastIdx];
  const ema200 = calculateEMA(closePrices, 200)[lastIdx] || closePrices[lastIdx];

  const rsi14 = calculateRSI(closePrices, 14)[lastIdx] || 50;

  const bb = calculateBollingerBands(closePrices, 20, 2);
  const macd = calculateMACD(closePrices, 12, 26, 9);
  const atr = calculateATR(candles, 14);

  return {
    ema9,
    ema21,
    ema50,
    ema200,
    rsi14,
    bbUpper: bb.upper[lastIdx] || closePrices[lastIdx],
    bbMiddle: bb.middle[lastIdx] || closePrices[lastIdx],
    bbLower: bb.lower[lastIdx] || closePrices[lastIdx],
    bbBandwidth: bb.bandwidth[lastIdx] || 0,
    macdLine: macd.macdLine[lastIdx] || 0,
    signalLine: macd.signalLine[lastIdx] || 0,
    macdHist: macd.histogram[lastIdx] || 0,
    atr14: atr[lastIdx] || 0.05,
  };
}
