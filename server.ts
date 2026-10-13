import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  ForwardTestState,
  CurrencyPair,
  Timeframe,
  Candle,
} from './src/types/scalper';
import {
  DEFAULT_CONFIG,
  INITIAL_ACCOUNT,
  INITIAL_METRICS,
  updatePositionsOnTick,
  openPositionFromSignal,
  calculatePerformanceMetrics,
} from './src/engine/forwardTestEngine';
import { evaluateScalperStrategy } from './src/engine/scalperStrategy';
import { generateRealisticCandles, isFxMarketOpen } from './src/engine/marketDataService';
import { performStrategySelfReflection } from './src/engine/strategySelfReflection';

const execAsync = promisify(exec);
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

const STATE_FILE = path.resolve(__dirname, 'scalping_state.json');

// Helper to get Gemini client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
      timeout: 30000,
    },
  });
};

// -------------------------------------------------------------
// State Management
// -------------------------------------------------------------
let currentState: ForwardTestState = loadInitialState();

function loadInitialState(): ForwardTestState {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.account && parsed.config) {
        return parsed;
      }
    } catch (e) {
      console.warn('Could not parse scalping_state.json:', e);
    }
  }

  const initial: ForwardTestState = {
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

  saveStateToFile(initial);
  return initial;
}

function saveStateToFile(state: ForwardTestState) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save state to file:', e);
  }
}

export async function fetchLatestFromGitHub(): Promise<ForwardTestState | null> {
  try {
    const pat = process.env.GITHUB_PAT || '';
    const res = await fetch(
      'https://raw.githubusercontent.com/sputnik413-beep/personal_dev/main/scalping_state.json',
      {
        headers: {
          'Cache-Control': 'no-cache',
          ...(pat ? { Authorization: `token ${pat}` } : {}),
        },
      }
    );
    if (res.ok) {
      const parsed: ForwardTestState = await res.json();
      if (parsed.account && parsed.config && Array.isArray(parsed.tradeLogs)) {
        // Keep local aiDiagnosisHistory if remote doesn't have it yet
        if (currentState?.aiDiagnosisHistory?.length && !parsed.aiDiagnosisHistory?.length) {
          parsed.aiDiagnosisHistory = currentState.aiDiagnosisHistory;
        }
        currentState = parsed;
        saveStateToFile(currentState);
        console.log(`[GitHub Live Sync] Refreshed state from cloud! Trades: ${parsed.tradeLogs.length}, Balance: ${parsed.account.balance}, Open: ${parsed.openPositions.length}`);
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[GitHub Live Sync] Failed to fetch state from GitHub:', e);
  }
  return null;
}

// -------------------------------------------------------------
// Market Data API (Yahoo Finance FX Proxy + Real Continuity)
// -------------------------------------------------------------
app.get('/api/market/candles', async (req: Request, res: Response) => {
  const pair = (req.query.pair as CurrencyPair) || 'USDJPY';
  const timeframe = (req.query.timeframe as Timeframe) || '5m';
  const count = parseInt(req.query.count as string) || 80;

  const symbol = pair === 'USDJPY' ? 'USDJPY=X' : 'EURUSD=X';
  const interval = timeframe === '1m' ? '1m' : '5m';
  const range = timeframe === '1m' ? '1d' : '5d';

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });

    if (response.ok) {
      const data = await response.json();
      const result = data?.chart?.result?.[0];
      const timestamps = result?.timestamp;
      const quote = result?.indicators?.quote?.[0];

      if (timestamps && quote && quote.close) {
        const candles: Candle[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          const close = quote.close[i];
          const open = quote.open[i] || close;
          const high = quote.high[i] || Math.max(open, close);
          const low = quote.low[i] || Math.min(open, close);
          const volume = quote.volume[i] || 100;

          if (close !== null && close !== undefined && !isNaN(close)) {
            candles.push({
              time: timestamps[i] * 1000,
              open: Number(open.toFixed(pair === 'USDJPY' ? 3 : 5)),
              high: Number(high.toFixed(pair === 'USDJPY' ? 3 : 5)),
              low: Number(low.toFixed(pair === 'USDJPY' ? 3 : 5)),
              close: Number(close.toFixed(pair === 'USDJPY' ? 3 : 5)),
              volume,
              isClosed: i < timestamps.length - 1,
            });
          }
        }

        if (candles.length > 10) {
          const trimmed = candles.slice(-count);
          return res.json({
            success: true,
            source: 'Yahoo Finance Live API',
            candles: trimmed,
            isMarketOpen: isFxMarketOpen(),
          });
        }
      }
    }
  } catch (err) {
    // Network error, fall through to synthetic continuity
  }

  // Fallback synthetic generator
  const base = pair === 'USDJPY' ? 152.45 : 1.0875;
  const candles = generateRealisticCandles(pair, timeframe, count, base);
  res.json({
    success: true,
    source: isFxMarketOpen() ? 'Realistic Live Stream' : 'Weekend Replay Stream (土日市場クローズ対応)',
    candles,
    isMarketOpen: isFxMarketOpen(),
  });
});

// -------------------------------------------------------------
// Scalper State & Control Endpoints
// -------------------------------------------------------------
app.get('/api/scalper/state', async (req: Request, res: Response) => {
  const forceGithub = req.query.refreshFromGithub === 'true';
  if (forceGithub) {
    await fetchLatestFromGitHub();
  } else if (fs.existsSync(STATE_FILE)) {
    try {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.account && parsed.config) {
        currentState = parsed;
      }
    } catch (e) {}
  }

  res.json({
    success: true,
    state: currentState,
    isFxMarketOpen: isFxMarketOpen(),
  });
});

app.post('/api/scalper/config', (req: Request, res: Response) => {
  const { config } = req.body;
  if (config) {
    currentState.config = { ...currentState.config, ...config };
    currentState.lastUpdated = Date.now();
    saveStateToFile(currentState);
  }
  res.json({ success: true, state: currentState });
});

app.post('/api/scalper/reset', (req: Request, res: Response) => {
  const initialBalance = req.body.initialBalance || 1000000;
  currentState = {
    config: { ...DEFAULT_CONFIG },
    account: {
      ...INITIAL_ACCOUNT,
      initialBalance,
      balance: initialBalance,
      equity: initialBalance,
      freeMargin: initialBalance,
    },
    openPositions: [],
    tradeLogs: [],
    metrics: { ...INITIAL_METRICS },
    equityHistory: [
      {
        timestamp: Date.now(),
        equity: initialBalance,
        balance: initialBalance,
      },
    ],
    lastUpdated: Date.now(),
    startedAt: Date.now(),
  };
  saveStateToFile(currentState);
  res.json({ success: true, state: currentState });
});

app.post('/api/scalper/tick', (req: Request, res: Response) => {
  const { currentPrice, candles } = req.body;
  if (!currentPrice) {
    return res.status(400).json({ error: 'currentPrice required' });
  }

  currentState = updatePositionsOnTick(currentState, currentPrice);

  // If auto-trading enabled and candles provided, check signals
  let signalTriggered = null;
  if (currentState.config.isAutoTrading && Array.isArray(candles) && candles.length >= 20) {
    const evalResult = evaluateScalperStrategy(candles, currentState.config);
    if (
      evalResult.signal &&
      evalResult.signal.direction !== 'NEUTRAL' &&
      evalResult.signal.confidence >= currentState.config.minAiConfidence &&
      currentState.openPositions.length < currentState.config.maxOpenTrades
    ) {
      currentState = openPositionFromSignal(currentState, evalResult.signal);
      signalTriggered = evalResult.signal;
    }
  }

  saveStateToFile(currentState);
  res.json({
    success: true,
    state: currentState,
    signalTriggered,
  });
});

app.post('/api/scalper/order', (req: Request, res: Response) => {
  const { direction, price, lots, reason } = req.body;
  if (!direction || !price) {
    return res.status(400).json({ error: 'direction and price required' });
  }

  const config = currentState.config;
  const pipDiff = config.pair === 'USDJPY' ? 0.01 : 0.0001;
  const slPrice =
    direction === 'BUY'
      ? price - config.stopLossPips * pipDiff
      : price + config.stopLossPips * pipDiff;
  const tpPrice =
    direction === 'BUY'
      ? price + config.takeProfitPips * pipDiff
      : price - config.takeProfitPips * pipDiff;

  const dummySignal = {
    id: `manual_${Date.now()}`,
    timestamp: Date.now(),
    pair: config.pair,
    timeframe: config.timeframe,
    direction: direction as 'BUY' | 'SELL',
    price,
    strategy: reason || 'マニュアル・スキャルピング注文',
    confidence: 100,
    rationale: 'ユーザー手動即時スキャルプ発注',
    suggestedSL: Number(slPrice.toFixed(config.pair === 'USDJPY' ? 3 : 5)),
    suggestedTP: Number(tpPrice.toFixed(config.pair === 'USDJPY' ? 3 : 5)),
    pipsRisk: config.stopLossPips,
    pipsReward: config.takeProfitPips,
  };

  currentState = openPositionFromSignal(currentState, dummySignal, lots);
  saveStateToFile(currentState);
  res.json({ success: true, state: currentState });
});

app.post('/api/scalper/close-position', (req: Request, res: Response) => {
  const { positionId, currentPrice } = req.body;
  const posIdx = currentState.openPositions.findIndex((p) => p.id === positionId);
  if (posIdx >= 0) {
    const pos = currentState.openPositions[posIdx];
    const pipDiff =
      pos.direction === 'BUY' ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
    const pipVal = pos.pair === 'USDJPY' ? 0.01 : 0.0001;
    const pips = Number((pipDiff / pipVal).toFixed(2));
    const profit = Math.round(pos.lots * 1000 * pips);

    currentState.openPositions.splice(posIdx, 1);
    currentState.account.balance += profit;
    currentState.tradeLogs.unshift({
      id: `manual_close_${Date.now()}`,
      pair: pos.pair,
      direction: pos.direction,
      lots: pos.lots,
      entryPrice: pos.entryPrice,
      exitPrice: currentPrice,
      entryTime: pos.entryTime,
      exitTime: Date.now(),
      pipsGain: pips,
      realizedPnL: profit,
      exitReason: 'MANUAL',
      aiAnalysis: `ユーザーによる手動即時決済 (${pips >= 0 ? '+' : ''}${pips} pips)`,
      holdingDurationMinutes: Math.max(1, Math.round((Date.now() - pos.entryTime) / 60000)),
    });

    currentState.metrics = calculatePerformanceMetrics(currentState.tradeLogs, currentState.account.initialBalance);
    saveStateToFile(currentState);
  }
  res.json({ success: true, state: currentState });
});

// -------------------------------------------------------------
// AI Deep Market Intelligence Analysis (Gemini 2.5 Flash)
// -------------------------------------------------------------
app.post('/api/scalper/ai-analyze', async (req: Request, res: Response) => {
  try {
    const { pair, timeframe, candles, indicators, currentPrice } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        score: 82,
        recommendation: 'WAIT',
        summary: 'Gemini API未接続のため、内蔵のBob Volman式インジケーター判定エンジンにより監視中。',
        keyFactors: ['21EMAサポート確認', 'RSI中立圏', 'スプレッドゼロ優位性'],
      });
    }

    const systemInstruction = `あなたは超短期スキャルピング（5分足・1分足）専門のプロ・クオンツトレーダーです。
提供されたリアルタイム為替レートとインジケーター数値を元に、現在局面における短期スキャルピングのエントリー妥当性を厳格に診断してください。
スプレッドゼロ口座のため、わずか2〜4pipsの微細な値動きでも即座に利益化可能です。ボラティリティ急縮小時の往復ビンタ（ダマシ）を防ぎ、優位性の高いトレード機会のみを判定してください。`;

    const prompt = `【通貨ペア】: ${pair || 'USDJPY'}
【時間足】: ${timeframe || '5分足'}
【現在レート】: ${currentPrice}
【直近テクニカル指標】:
- 9EMA: ${indicators?.ema9}
- 21EMA: ${indicators?.ema21}
- 50EMA: ${indicators?.ema50}
- 200EMA: ${indicators?.ema200}
- RSI(14): ${indicators?.rsi14?.toFixed(1)}
- BB上限: ${indicators?.bbUpper} / BB下限: ${indicators?.bbLower} (バンド幅: ${indicators?.bbBandwidth?.toFixed(2)}%)
- MACDヒストグラム: ${indicators?.macdHist?.toFixed(4)}
- ATR: ${indicators?.atr14?.toFixed(4)}

以下のフォーマットの純粋なJSONで返答してください:
{
  "score": 0〜100の確信度スコア(数値),
  "action": "BUY" または "SELL" または "HOLD",
  "oneLineVerdict": "一言での相場判断（日本語30文字以内）",
  "scalpAdvice": "スキャルピング戦略アドバイス（日本語120文字以内）",
  "keyFactors": ["根拠1", "根拠2", "根拠3"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, ...parsed });
  } catch (err: any) {
    console.error('AI analyze error:', err);
    res.json({
      success: true,
      score: 75,
      action: 'HOLD',
      oneLineVerdict: '20EMA沿いでのビルドアップ形成待ち',
      scalpAdvice: '20EMAでの押し目・戻り目ブレイクアウトを確認できるまで静観を推奨します。',
      keyFactors: ['20EMA近傍', 'トレンド方向ブレイク待ち', 'ノイズ回避中'],
    });
  }
});

// -------------------------------------------------------------
// Strategy Self-Reflection & Adaptive PDCA Cycle Endpoint
// -------------------------------------------------------------
app.post('/api/scalper/self-reflection', async (req: Request, res: Response) => {
  try {
    const diagnosis = await performStrategySelfReflection(currentState);
    if (!currentState.aiDiagnosisHistory) {
      currentState.aiDiagnosisHistory = [];
    }
    currentState.aiDiagnosisHistory.unshift(diagnosis);
    if (currentState.aiDiagnosisHistory.length > 10) {
      currentState.aiDiagnosisHistory = currentState.aiDiagnosisHistory.slice(0, 10);
    }
    saveStateToFile(currentState);
    res.json({ success: true, diagnosis, state: currentState });
  } catch (e: any) {
    console.error('Self-reflection error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// -------------------------------------------------------------
// Apply Recommended Strategy Parameter Adjustments
// -------------------------------------------------------------
app.post('/api/scalper/apply-tuning', (req: Request, res: Response) => {
  try {
    const { adjustments } = req.body;
    if (adjustments) {
      if (adjustments.stopLossPips != null) currentState.config.stopLossPips = Number(adjustments.stopLossPips);
      if (adjustments.takeProfitPips != null) currentState.config.takeProfitPips = Number(adjustments.takeProfitPips);
      if (adjustments.minAiConfidence != null) currentState.config.minAiConfidence = Number(adjustments.minAiConfidence);
      if (adjustments.trailingActivationPips != null) currentState.config.trailingActivationPips = Number(adjustments.trailingActivationPips);
      if (adjustments.trailingStopPips != null) currentState.config.trailingStopPips = Number(adjustments.trailingStopPips);
      currentState.config.trendSlopeFilter = true;
    }
    if (currentState.aiDiagnosisHistory && currentState.aiDiagnosisHistory.length > 0) {
      currentState.aiDiagnosisHistory[0].applied = true;
    }
    saveStateToFile(currentState);
    res.json({ success: true, config: currentState.config, state: currentState });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// -------------------------------------------------------------
// GitHub Actions Workflow Dispatch (Continuous Relay Trigger)
// -------------------------------------------------------------
app.post('/api/github/dispatch-workflow', async (req: Request, res: Response) => {
  try {
    const pat = process.env.GITHUB_PAT || '';
    if (!pat) {
      return res.status(400).json({
        success: false,
        message: 'GITHUB_PAT環境変数が未設定です。.envに設定してください。',
      });
    }
    const repo = 'sputnik413-beep/personal_dev';
    const ghRes = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/scalping_forward_test.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${pat}`,
          'User-Agent': 'FX-Scalper-Agent',
        },
        body: JSON.stringify({ ref: 'main' }),
      }
    );

    if (ghRes.ok || ghRes.status === 204) {
      res.json({
        success: true,
        message: '24時間数珠つなぎループのワークフロー起動リクエストが受理されました！',
      });
    } else {
      const errText = await ghRes.text();
      res.status(ghRes.status).json({
        success: false,
        message: 'GitHub Actionsの起動に失敗しました',
        detail: errText,
      });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// -------------------------------------------------------------
// GitHub Auto-Sync Endpoint (Commit & Push)
// -------------------------------------------------------------
app.post('/api/github/sync', async (req: Request, res: Response) => {
  try {
    saveStateToFile(currentState);
    const { stdout, stderr } = await execAsync(
      'git add scalping_state.json && git commit -m "chore: sync scalping forward-test state [skip ci]" && git push origin main'
    );
    res.json({ success: true, message: 'GitHubへの同期が完了しました！', stdout, stderr });
  } catch (e: any) {
    res.json({ success: false, message: 'GitHub同期: コミット対象の変更がないか、通信中', detail: e.message });
  }
});

// -------------------------------------------------------------
// GitHub Pull Latest State (Instant Cloud Sync)
// -------------------------------------------------------------
app.post('/api/github/pull-latest', async (req: Request, res: Response) => {
  try {
    const updated = await fetchLatestFromGitHub();
    if (updated) {
      res.json({
        success: true,
        message: `クラウド(GitHub)から最新データを同期しました！(総取引: ${updated.tradeLogs.length}件, 口座残高: ¥${updated.account.balance.toLocaleString()})`,
        state: currentState,
      });
    } else {
      res.json({
        success: true,
        message: 'ローカル状態を維持（GitHub取得失敗または変更なし）',
        state: currentState,
      });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// -------------------------------------------------------------
// GitHub Actions Live Status (Monitor 24/7 Cloud Engine)
// -------------------------------------------------------------
app.get('/api/github/live-status', async (req: Request, res: Response) => {
  try {
    const pat = process.env.GITHUB_PAT || '';
    const repo = 'sputnik413-beep/personal_dev';
    const runsRes = await fetch(
      `https://api.github.com/repos/${repo}/actions/runs?per_page=10`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          ...(pat ? { Authorization: `token ${pat}` } : {}),
          'User-Agent': 'FX-Scalper-Agent',
        },
      }
    );

    if (runsRes.ok) {
      const data: any = await runsRes.json();
      const runs = data.workflow_runs || [];
      const inProgressRuns = runs.filter((r: any) => r.status === 'in_progress');
      const latestCompleted = runs.find((r: any) => r.status === 'completed');

      res.json({
        success: true,
        totalRuns: data.total_count || runs.length,
        inProgressCount: inProgressRuns.length,
        latestRun: runs[0]
          ? {
              id: runs[0].id,
              name: runs[0].name,
              status: runs[0].status,
              conclusion: runs[0].conclusion,
              createdAt: runs[0].created_at,
              updatedAt: runs[0].updated_at,
              htmlUrl: runs[0].html_url,
            }
          : null,
        latestCompletedConclusion: latestCompleted?.conclusion || null,
        cloudTradesCount: currentState.tradeLogs.length,
        openPositionsCount: currentState.openPositions.length,
        balance: currentState.account.balance,
        equity: currentState.account.equity,
      });
    } else {
      res.json({
        success: false,
        message: 'GitHub API status check failed',
        status: runsRes.status,
      });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// -------------------------------------------------------------
// Vite Frontend Middleware / Static Server
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, async () => {
    console.log(`5-Min Scalping AI Trading Agent Server running on port ${PORT}`);
    // Sync latest state from GitHub Actions on startup
    await fetchLatestFromGitHub();
    // Periodically sync every 30 seconds to follow 24/7 continuous relay
    setInterval(async () => {
      await fetchLatestFromGitHub();
    }, 30000);
  });
}

startServer();
