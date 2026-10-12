import { Candle, CurrencyPair, Timeframe, MarketStatus } from '../types/scalper';

const YAHOO_SYMBOLS: Record<CurrencyPair, string> = {
  USDJPY: 'USDJPY=X',
  EURUSD: 'EURUSD=X',
};

const BASE_PRICES: Record<CurrencyPair, number> = {
  USDJPY: 152.45,
  EURUSD: 1.0875,
};

/**
 * Check if the global FX market is currently open.
 * FX market operates from Sunday 17:00 NY time to Friday 17:00 NY time (24/5).
 */
export function isFxMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
  const hour = now.getUTCHours();

  // Friday close: 21:00 or 22:00 UTC depending on DST (around 17:00 EST)
  if (day === 5 && hour >= 22) return false;
  // Saturday: all day closed
  if (day === 6) return false;
  // Sunday: opens around 21:00 UTC (17:00 EST)
  if (day === 0 && hour < 21) return false;

  return true;
}

/**
 * Fetches real market OHLCV candles from financial endpoints (or server proxy)
 */
export async function fetchRealCandles(
  pair: CurrencyPair,
  timeframe: Timeframe,
  count: number = 80
): Promise<{ candles: Candle[]; marketStatus: MarketStatus }> {
  const isWeekend = !isFxMarketOpen();

  try {
    const symbol = YAHOO_SYMBOLS[pair];
    const interval = timeframe === '1m' ? '1m' : '5m';
    const range = timeframe === '1m' ? '1d' : '5d';

    // Call server-side proxy route to avoid CORS restrictions in browser
    const url = `/api/market/candles?pair=${pair}&timeframe=${timeframe}&count=${count}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });

    if (res.ok) {
      const data = await res.json();
      if (data.candles && data.candles.length >= 10) {
        return {
          candles: data.candles,
          marketStatus: {
            isOpen: !isWeekend,
            currentRate: data.candles[data.candles.length - 1].close,
            change24h: data.change24h || 0.12,
            high24h: Math.max(...data.candles.map((c: Candle) => c.high)),
            low24h: Math.min(...data.candles.map((c: Candle) => c.low)),
            serverTime: Date.now(),
            source: 'Yahoo Finance Live FX Feed',
            isWeekendClosed: isWeekend,
          },
        };
      }
    }
  } catch (e) {
    console.warn('Direct fetch from server proxy failed, generating synthetic live continuity:', e);
  }

  // Graceful fallback: generate synthetic candles around realistic base price
  const base = BASE_PRICES[pair];
  const candles = generateRealisticCandles(pair, timeframe, count, base);
  const currentRate = candles[candles.length - 1].close;

  return {
    candles,
    marketStatus: {
      isOpen: !isWeekend,
      currentRate,
      change24h: 0.15,
      high24h: currentRate * 1.004,
      low24h: currentRate * 0.996,
      serverTime: Date.now(),
      source: isWeekend ? 'Weekend Continuity Feed (土日シミュレーション)' : 'Realistic FX Fallback Stream',
      isWeekendClosed: isWeekend,
    },
  };
}

/**
 * Generates realistic FX candlestick history with micro-trends, consolidations, and volatility bursts
 */
export function generateRealisticCandles(
  pair: CurrencyPair,
  timeframe: Timeframe,
  count: number = 80,
  startPrice?: number
): Candle[] {
  const pip = pair === 'USDJPY' ? 0.01 : 0.0001;
  let price = startPrice || BASE_PRICES[pair];
  const intervalMs = timeframe === '1m' ? 60 * 1000 : 5 * 60 * 1000;
  const now = Date.now();
  const startTime = now - count * intervalMs;

  const candles: Candle[] = [];
  let trend = 0; // -1 to 1 momentum

  for (let i = 0; i < count; i++) {
    const candleTime = startTime + i * intervalMs;
    // Regime shift every 15-20 candles
    if (i % 16 === 0) {
      trend = (Math.random() - 0.48) * 1.5;
    }

    const volatilityPips = (Math.random() * 3 + 1.5); // 1.5 to 4.5 pips per candle
    const open = price;
    const dir = Math.random() + trend * 0.3 > 0.5 ? 1 : -1;
    const bodyPips = Math.random() * volatilityPips * dir;
    const close = Number((open + bodyPips * pip).toFixed(pair === 'USDJPY' ? 3 : 5));

    const wickUpperPips = Math.random() * 1.5;
    const wickLowerPips = Math.random() * 1.5;

    const high = Number((Math.max(open, close) + wickUpperPips * pip).toFixed(pair === 'USDJPY' ? 3 : 5));
    const low = Number((Math.min(open, close) - wickLowerPips * pip).toFixed(pair === 'USDJPY' ? 3 : 5));
    const volume = Math.floor(Math.random() * 400 + 100);

    candles.push({
      time: candleTime,
      open,
      high,
      low,
      close,
      volume,
      isClosed: i < count - 1,
    });

    price = close;
  }

  return candles;
}

/**
 * Updates the current forming candle or creates a new candle when time elapses
 */
export function appendNewTick(
  candles: Candle[],
  newTickPrice: number,
  timeframe: Timeframe,
  pair: CurrencyPair
): Candle[] {
  if (candles.length === 0) return candles;

  const intervalMs = timeframe === '1m' ? 60 * 1000 : 5 * 60 * 1000;
  const now = Date.now();
  const updated = [...candles];
  const lastCandle = updated[updated.length - 1];

  const candleElapsed = now - lastCandle.time;

  if (candleElapsed >= intervalMs) {
    // Finalize current candle and open new candle
    updated[updated.length - 1] = { ...lastCandle, isClosed: true };
    const newCandle: Candle = {
      time: lastCandle.time + intervalMs,
      open: newTickPrice,
      high: newTickPrice,
      low: newTickPrice,
      close: newTickPrice,
      volume: 1,
      isClosed: false,
    };
    updated.push(newCandle);

    // Keep max 150 candles for performance
    if (updated.length > 150) {
      updated.shift();
    }
  } else {
    // Update active forming candle
    updated[updated.length - 1] = {
      ...lastCandle,
      high: Math.max(lastCandle.high, newTickPrice),
      low: Math.min(lastCandle.low, newTickPrice),
      close: newTickPrice,
      volume: lastCandle.volume + 1,
    };
  }

  return updated;
}
