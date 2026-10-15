/**
 * Headless 24/7 Scalping Bot & Forward-Test Daemon
 *
 * Can be run standalone on:
 * - GitHub Actions (scheduled cron)
 * - Sakura Cloud VPS / Sakura Server (さくらVPS / さくらクラウド)
 * - PM2 (pm2 start "npm run daemon")
 * - Docker / Linux systemd
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ForwardTestState,
  Candle,
  CurrencyPair,
  Timeframe,
  ScalperConfig,
} from '../src/types/scalper';
import {
  DEFAULT_CONFIG,
  INITIAL_ACCOUNT,
  INITIAL_METRICS,
  updatePositionsOnTick,
  openPositionFromSignal,
} from '../src/engine/forwardTestEngine';
import { evaluateScalperStrategy } from '../src/engine/scalperStrategy';
import { generateRealisticCandles, isFxMarketOpen } from '../src/engine/marketDataService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.resolve(__dirname, '../scalping_state.json');

// Command line arguments
const isSinglePass = process.argv.includes('--single-pass') || process.argv.includes('--once');
const durationMinutesArg = process.argv.find((arg) => arg.startsWith('--duration-minutes='));
const durationMinutesPos = process.argv.indexOf('--duration-minutes');
const durationMinutes = durationMinutesArg
  ? parseInt(durationMinutesArg.split('=')[1], 10)
  : durationMinutesPos !== -1 && process.argv[durationMinutesPos + 1]
  ? parseInt(process.argv[durationMinutesPos + 1], 10)
  : null;

const intervalSeconds = 15;

function loadState(): ForwardTestState {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const loaded = JSON.parse(raw);
      // Upgrade legacy tight stops to Bob Volman defaults if older than 10 pips
      if (loaded.config && (loaded.config.stopLossPips < 8 || loaded.config.takeProfitPips < 12)) {
        console.log('Upgrading legacy tight stop-loss (4.5 pips) to Bob Volman 10.0 pip standard...');
        loaded.config.stopLossPips = 10.0;
        loaded.config.takeProfitPips = 18.0;
        loaded.config.trailingActivationPips = 8.0;
        loaded.config.trailingStopPips = 5.0;
        loaded.config.trendSlopeFilter = true;
      }
      if (loaded.config && loaded.config.useDualLayerStopLoss === undefined) {
        console.log('Initializing Dual-Layer Stop-Loss (Soft: 10p, Hard: 18p) & XM Zero Account settings...');
        loaded.config.useDualLayerStopLoss = true;
        loaded.config.softStopLossPips = 10.0;
        loaded.config.hardStopLossPips = 18.0;
        loaded.config.softStopHoldSeconds = 20;
        loaded.config.accountType = 'XM_ZERO';
        loaded.config.xmCommissionUsdPerLot = 5.0;
      }
      return loaded;
    } catch (e) {
      console.warn('Could not parse scalping_state.json, creating initial state.');
    }
  }

  return {
    config: { ...DEFAULT_CONFIG },
    account: { ...INITIAL_ACCOUNT },
    openPositions: [],
    tradeLogs: [],
    metrics: { ...INITIAL_METRICS },
    equityHistory: [
      {
        timestamp: Date.now(),
        equity: INITIAL_ACCOUNT.initialBalance,
        balance: INITIAL_ACCOUNT.initialBalance,
      },
    ],
    lastUpdated: Date.now(),
    startedAt: Date.now(),
  };
}

function saveState(state: ForwardTestState) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write state file:', e);
  }
}

async function fetchYahooQuote(pair: CurrencyPair): Promise<number | null> {
  const symbol = pair === 'USDJPY' ? 'USDJPY=X' : 'EURUSD=X';
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FXBot/1.0)' },
    });
    if (res.ok) {
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice) {
        return Number(meta.regularMarketPrice);
      }
    }
  } catch (e) {
    // Ignore, fallback to realistic stream
  }
  return null;
}

async function stepBot(state: ForwardTestState): Promise<ForwardTestState> {
  const pair = state.config.pair;
  const timeframe = state.config.timeframe;
  const isMarketOpen = isFxMarketOpen();

  let livePrice = await fetchYahooQuote(pair);

  if (!livePrice) {
    // Fallback or weekend continuation
    const lastPrice =
      state.openPositions[0]?.currentPrice || (pair === 'USDJPY' ? 152.45 : 1.0875);
    const pip = pair === 'USDJPY' ? 0.01 : 0.0001;
    const tickChange = (Math.random() - 0.49) * 1.5 * pip;
    livePrice = Number((lastPrice + tickChange).toFixed(pair === 'USDJPY' ? 3 : 5));
  }

  // 1. Update existing positions against live price
  let updatedState = updatePositionsOnTick(state, livePrice);

  // 2. Build candle series for strategy evaluation
  const dummyCandles = generateRealisticCandles(pair, timeframe, 50, livePrice);
  dummyCandles[dummyCandles.length - 1].close = livePrice;

  // 3. Evaluate Strategy
  const evaluation = evaluateScalperStrategy(dummyCandles, updatedState.config);

  console.log(
    `[${new Date().toISOString()}] ${pair} ${timeframe} | Rate: ${livePrice} | Market: ${
      isMarketOpen ? 'OPEN' : 'WEEKEND_CLOSED'
    } | Regime: ${evaluation.marketRegime} | Positions: ${updatedState.openPositions.length} | Equity: ${updatedState.account.equity.toLocaleString()} JPY`
  );

  // 4. Trigger auto trade if signal exists and slots available
  if (
    updatedState.config.isAutoTrading &&
    evaluation.signal &&
    evaluation.signal.direction !== 'NEUTRAL' &&
    evaluation.signal.confidence >= updatedState.config.minAiConfidence &&
    updatedState.openPositions.length < updatedState.config.maxOpenTrades
  ) {
    console.log(
      `>>> NEW SIGNAL DETECTED: [${evaluation.signal.direction}] ${evaluation.signal.strategy} @ ${evaluation.signal.price} (Confidence: ${evaluation.signal.confidence}%)`
    );
    updatedState = openPositionFromSignal(updatedState, evaluation.signal);
  }

  saveState(updatedState);
  return updatedState;
}

async function main() {
  console.log('====================================================');
  console.log('  5-Minute / 1-Minute Scalping AI Daemon Started   ');
  console.log(`  State File: ${STATE_FILE}`);
  console.log('====================================================');

  let state = loadState();

  if (isSinglePass) {
    console.log('Running in single-pass mode...');
    await stepBot(state);
    console.log('Single pass completed successfully.');
    process.exit(0);
  }

  if (durationMinutes && durationMinutes > 0) {
    console.log(`Running timed relay session: ${durationMinutes} minutes (interval: ${intervalSeconds}s)...`);
    const endTime = Date.now() + durationMinutes * 60 * 1000;
    let iteration = 0;

    while (Date.now() < endTime) {
      iteration++;
      try {
        state = await stepBot(state);
      } catch (err) {
        console.error(`[Iteration ${iteration}] Error in daemon step:`, err);
      }
      const remainingMs = endTime - Date.now();
      if (remainingMs <= intervalSeconds * 1000) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
    }

    console.log(`Timed relay session completed (${iteration} ticks executed). Exiting cleanly to pass baton to next relay runner.`);
    process.exit(0);
  }

  console.log(`Running continuous daemon loop (interval: ${intervalSeconds}s)...`);
  while (true) {
    try {
      state = await stepBot(state);
    } catch (err) {
      console.error('Error in daemon loop:', err);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
  }
}

main().catch((e) => {
  console.error('Daemon crashed:', e);
  process.exit(1);
});
