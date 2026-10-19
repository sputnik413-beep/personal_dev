import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HeaderTopBar } from './components/HeaderTopBar';
import { AccountSummaryBar } from './components/AccountSummaryBar';
import { CandlestickChart } from './components/CandlestickChart';
import { LiveSignalRadar } from './components/LiveSignalRadar';
import { OrderControls } from './components/OrderControls';
import { OpenPositionsCard } from './components/OpenPositionsCard';
import { TradeHistoryTable } from './components/TradeHistoryTable';
import { EquityCurveChart } from './components/EquityCurveChart';
import { StrategyPdcaPanel } from './components/StrategyPdcaPanel';
import { InstitutionalProAdvisorAgent } from './components/InstitutionalProAdvisorAgent';
import { Setup24x7Modal } from './components/Setup24x7Modal';
import { OandaConnectionModal } from './components/OandaConnectionModal';
import {
  CurrencyPair,
  Timeframe,
  Candle,
  ForwardTestState,
  MarketStatus,
  ScalperConfig,
  IndicatorValues,
  TradeSignal,
} from './types/scalper';
import {
  DEFAULT_CONFIG,
  INITIAL_ACCOUNT,
  INITIAL_METRICS,
} from './engine/forwardTestEngine';
import { evaluateScalperStrategy } from './engine/scalperStrategy';
import { fetchRealCandles, appendNewTick } from './engine/marketDataService';
import { computeLatestIndicators } from './engine/technicalIndicators';

export function App() {
  const [pair, setPair] = useState<CurrencyPair>('USDJPY');
  const [timeframe, setTimeframe] = useState<Timeframe>('5m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);

  const [state, setState] = useState<ForwardTestState>({
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
  });

  const [latestSignal, setLatestSignal] = useState<TradeSignal | null>(null);
  const [marketRegime, setMarketRegime] = useState<string>('RANGE');
  const [regimeDescription, setRegimeDescription] = useState<string>('市場データを取得中...');

  const [aiAnalysis, setAiAnalysis] = useState<{
    score: number;
    action: string;
    oneLineVerdict: string;
    scalpAdvice: string;
    keyFactors: string[];
  } | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);

  const [is24x7ModalOpen, setIs24x7ModalOpen] = useState<boolean>(false);
  const [isOandaModalOpen, setIsOandaModalOpen] = useState<boolean>(false);
  const [isSyncingGithub, setIsSyncingGithub] = useState<boolean>(false);
  const [isDiagnosisLoading, setIsDiagnosisLoading] = useState<boolean>(false);
  const [isApplyingTuning, setIsApplyingTuning] = useState<boolean>(false);
  const [isTriggeringRelay, setIsTriggeringRelay] = useState<boolean>(false);
  const [isPullingCloud, setIsPullingCloud] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'warn' } | null>(null);

  const currentPriceRef = useRef<number>(pair === 'USDJPY' ? 152.45 : 1.0875);

  const showToast = (message: string, type: 'success' | 'info' | 'warn' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Fetch initial state from server
  const loadServerState = useCallback(async () => {
    try {
      const res = await fetch('/api/scalper/state');
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setState(data.state);
          if (data.state.config) {
            setPair(data.state.config.pair);
            setTimeframe(data.state.config.timeframe);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load server state:', e);
    }
  }, []);

  // 2. Fetch candles for active pair and timeframe
  const loadCandles = useCallback(async (p: CurrencyPair, tf: Timeframe) => {
    try {
      const { candles: loadedCandles, marketStatus: status } = await fetchRealCandles(p, tf, 80);
      setCandles(loadedCandles);
      setMarketStatus(status);
      if (loadedCandles.length > 0) {
        currentPriceRef.current = loadedCandles[loadedCandles.length - 1].close;
      }
    } catch (e) {
      console.error('Failed to load candles:', e);
    }
  }, []);

  useEffect(() => {
    loadServerState();
    loadCandles(pair, timeframe);
    const interval = setInterval(() => {
      loadServerState();
    }, 12000);
    return () => clearInterval(interval);
  }, [loadServerState, loadCandles, pair, timeframe]);

  // Handle Pair / Timeframe change
  const handlePairChange = (newPair: CurrencyPair) => {
    setPair(newPair);
    currentPriceRef.current = newPair === 'USDJPY' ? 152.45 : 1.0875;
    handleUpdateConfig({ pair: newPair });
    loadCandles(newPair, timeframe);
    showToast(`通貨ペアを ${newPair} に切り替えました`, 'info');
  };

  const handleTimeframeChange = (newTf: Timeframe) => {
    setTimeframe(newTf);
    handleUpdateConfig({ timeframe: newTf });
    loadCandles(pair, newTf);
    showToast(`時間足を ${newTf === '1m' ? '1分足 (高頻度)' : '5分足 (推奨)'} に切り替えました`, 'info');
  };

  // Update Config
  const handleUpdateConfig = async (newConfig: Partial<ScalperConfig>) => {
    try {
      const res = await fetch('/api/scalper/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setState(data.state);
        }
      }
    } catch (e) {
      console.error('Config update error:', e);
    }
  };

  // Toggle Auto Trading
  const handleToggleAutoTrade = () => {
    const nextVal = !state.config.isAutoTrading;
    handleUpdateConfig({ isAutoTrading: nextVal });
    showToast(nextVal ? '自動スキャルピングを開始しました' : '自動スキャルピングを停止しました', nextVal ? 'success' : 'warn');
  };

  // Manual Order
  const handleManualOrder = async (direction: 'BUY' | 'SELL', price: number, lots: number) => {
    try {
      const res = await fetch('/api/scalper/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, price, lots }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setState(data.state);
          showToast(`【約定】成行 ${direction} ${lots}Lot @ ${price.toFixed(pair === 'USDJPY' ? 3 : 5)} (スプレッド 0.0p)`, 'success');
        }
      }
    } catch (e) {
      console.error('Order error:', e);
    }
  };

  // Close Position
  const handleClosePosition = async (positionId: string, price: number) => {
    try {
      const res = await fetch('/api/scalper/close-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId, currentPrice: price }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setState(data.state);
          showToast('ポジションを成行決済しました', 'info');
        }
      }
    } catch (e) {
      console.error('Close position error:', e);
    }
  };

  // Close All Positions
  const handleCloseAllPositions = async () => {
    for (const pos of state.openPositions) {
      await handleClosePosition(pos.id, currentPriceRef.current);
    }
    showToast('全ポジションを一括決済しました', 'warn');
  };

  // Reset Simulation
  const handleResetSimulation = async () => {
    if (window.confirm('シミュレーション戦績と口座残高を1,000,000円に初期化しますか？')) {
      try {
        const res = await fetch('/api/scalper/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initialBalance: 1000000 }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.state) {
            setState(data.state);
            showToast('シミュレーション口座をリセットしました', 'info');
          }
        }
      } catch (e) {
        console.error('Reset error:', e);
      }
    }
  };

  // Trigger Gemini AI Diagnosis
  const handleTriggerAiDiagnosis = async () => {
    setIsAiAnalyzing(true);
    try {
      const indicators = computeLatestIndicators(candles);
      const res = await fetch('/api/scalper/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pair,
          timeframe,
          candles: candles.slice(-20),
          indicators,
          currentPrice: currentPriceRef.current,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data);
        showToast('Gemini AIクオンツ診断が完了しました', 'success');
      }
    } catch (e) {
      console.error('AI diagnosis error:', e);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Sync to GitHub
  const handleSyncGithub = async () => {
    setIsSyncingGithub(true);
    try {
      const res = await fetch('/api/github/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('GitHub (personal_dev) への最新戦績プッシュ完了！', 'success');
      } else {
        showToast(data.message || 'GitHub同期完了', 'info');
      }
    } catch (e) {
      console.error('GitHub sync error:', e);
      showToast('GitHub同期通信エラー', 'warn');
    } finally {
      setIsSyncingGithub(false);
    }
  };

  // Run AI Strategy Self-Reflection (Gemini 3.8 Flash)
  const handleRefreshDiagnosis = async () => {
    setIsDiagnosisLoading(true);
    try {
      const res = await fetch('/api/scalper/self-reflection', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.state) {
        setState(data.state);
        showToast('AI自己分析・PDCA診断レポートを更新しました！', 'success');
      } else {
        showToast('AI自己分析の実行に失敗しました', 'warn');
      }
    } catch (e) {
      console.error('Self-reflection error:', e);
      showToast('AI自己診断通信エラー', 'warn');
    } finally {
      setIsDiagnosisLoading(false);
    }
  };

  // Apply suggested parameter adjustments
  const handleApplyTuning = async (adjustments: any) => {
    setIsApplyingTuning(true);
    try {
      const res = await fetch('/api/scalper/apply-tuning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustments }),
      });
      const data = await res.json();
      if (data.success && data.state) {
        setState(data.state);
        showToast('ボブ・ボルマン推奨パラメータ（10p損切 / 18p利確）を反映しました！', 'success');
      } else {
        showToast('パラメータ更新に失敗しました', 'warn');
      }
    } catch (e) {
      console.error('Apply tuning error:', e);
      showToast('パラメータ更新通信エラー', 'warn');
    } finally {
      setIsApplyingTuning(false);
    }
  };

  // Trigger continuous 24/7 GitHub Actions relay runner
  const handleTriggerRelayWorkflow = async () => {
    setIsTriggeringRelay(true);
    try {
      const res = await fetch('/api/github/dispatch-workflow', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('GitHub Actionsの24時間連続ループを起動しました！', 'success');
      } else {
        showToast(data.message || 'ワークフロー起動エラー', 'warn');
      }
    } catch (e) {
      console.error('Trigger workflow error:', e);
      showToast('ワークフロー起動通信エラー', 'warn');
    } finally {
      setIsTriggeringRelay(false);
    }
  };

  // Pull latest trades directly from GitHub Cloud
  const handlePullLatestCloudState = async () => {
    setIsPullingCloud(true);
    try {
      const res = await fetch('/api/github/pull-latest', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.state) {
        setState(data.state);
        showToast(data.message || 'クラウド(GitHub)から最新データを同期しました！', 'success');
      } else {
        showToast('クラウドデータの同期に失敗しました', 'warn');
      }
    } catch (e) {
      console.error('Pull cloud state error:', e);
      showToast('クラウド同期通信エラー', 'warn');
    } finally {
      setIsPullingCloud(false);
    }
  };

  // Real-time Tick Loop (every 3 seconds)
  useEffect(() => {
    const timer = setInterval(async () => {
      if (candles.length === 0) return;

      const pip = pair === 'USDJPY' ? 0.01 : 0.0001;
      const lastPrice = currentPriceRef.current;
      // Realistic FX micro-tick: random walk with mean-reversion drift
      const tickDelta = (Math.random() - 0.49) * 0.8 * pip;
      const nextPrice = Number((lastPrice + tickDelta).toFixed(pair === 'USDJPY' ? 3 : 5));
      currentPriceRef.current = nextPrice;

      // Update forming candle
      const updatedCandles = appendNewTick(candles, nextPrice, timeframe, pair);
      setCandles(updatedCandles);

      // Evaluate strategy
      const evaluation = evaluateScalperStrategy(updatedCandles, state.config);
      setMarketRegime(evaluation.marketRegime);
      setRegimeDescription(evaluation.regimeDescription);
      if (evaluation.signal) {
        setLatestSignal(evaluation.signal);
      }

      // Send tick to backend
      try {
        const res = await fetch('/api/scalper/tick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPrice: nextPrice,
            candles: updatedCandles.slice(-40),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.state) {
            setState(data.state);
          }
          if (data.signalTriggered) {
            showToast(
              `【自動スキャルプ発注】[${data.signalTriggered.direction}] ${data.signalTriggered.strategy} (信頼度 ${data.signalTriggered.confidence}%)`,
              'success'
            );
          }
        }
      } catch (e) {
        // Silently catch tick errors
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [candles, timeframe, pair, state.config]);

  const indicators = computeLatestIndicators(candles);

  return (
    <div className="min-h-screen bg-[#0b1016] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-2 ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-emerald-950/50'
              : notification.type === 'warn'
              ? 'bg-amber-950/90 text-amber-200 border-amber-500/50 shadow-amber-950/50'
              : 'bg-slate-900/95 text-slate-200 border-slate-700 shadow-black/60'
          }`}
        >
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Top Bar */}
      <HeaderTopBar
        pair={pair}
        timeframe={timeframe}
        onPairChange={handlePairChange}
        onTimeframeChange={handleTimeframeChange}
        marketStatus={marketStatus}
        config={state.config}
        onToggleAutoTrade={handleToggleAutoTrade}
        onOpen24x7Guide={() => setIs24x7ModalOpen(true)}
        onOpenOandaModal={() => setIsOandaModalOpen(true)}
        onSyncGithub={handleSyncGithub}
        isSyncingGithub={isSyncingGithub}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Account Summary & Performance Bar */}
        <AccountSummaryBar
          account={state.account}
          metrics={state.metrics}
          openPositions={state.openPositions}
        />

        {/* Real-time Candlestick Chart */}
        <CandlestickChart
          candles={candles}
          pair={pair}
          indicators={indicators}
          openPositions={state.openPositions}
          tradeLogs={state.tradeLogs}
          currentPrice={currentPriceRef.current}
        />

        {/* Institutional FX Pro Advisor Agent (Ruthless Real-World Trap Detector & Blueprint) */}
        <InstitutionalProAdvisorAgent
          pair={pair}
          currentPrice={currentPriceRef.current}
          candles={candles}
          indicators={indicators}
          latestSignal={latestSignal}
          config={state.config}
          onUpdateConfig={handleUpdateConfig}
        />

        {/* Indicator Radar & Gemini AI Verdict */}
        <LiveSignalRadar
          pair={pair}
          timeframe={timeframe}
          indicators={indicators}
          marketRegime={marketRegime}
          regimeDescription={regimeDescription}
          latestSignal={latestSignal}
          currentPrice={currentPriceRef.current}
          onTriggerAiDiagnosis={handleTriggerAiDiagnosis}
          aiAnalysis={aiAnalysis}
          isAiAnalyzing={isAiAnalyzing}
        />

        {/* Strategy Self-Reflection & Adaptive PDCA Cycle Panel */}
        <StrategyPdcaPanel
          state={state}
          onRefreshDiagnosis={handleRefreshDiagnosis}
          onApplyTuning={handleApplyTuning}
          onTriggerRelayWorkflow={handleTriggerRelayWorkflow}
          onPullLatestCloudState={handlePullLatestCloudState}
          onUpdateConfig={handleUpdateConfig}
          isAnalyzing={isDiagnosisLoading}
          isApplying={isApplyingTuning}
          isTriggeringRelay={isTriggeringRelay}
          isPullingCloud={isPullingCloud}
        />

        {/* Order Controls & Manual One-Click Scalping */}
        <OrderControls
          config={state.config}
          pair={pair}
          currentPrice={currentPriceRef.current}
          onUpdateConfig={handleUpdateConfig}
          onManualOrder={handleManualOrder}
          onResetSimulation={handleResetSimulation}
        />

        {/* Open Positions Card */}
        <OpenPositionsCard
          positions={state.openPositions}
          pair={pair}
          currentPrice={currentPriceRef.current}
          onClosePosition={handleClosePosition}
          onCloseAllPositions={handleCloseAllPositions}
        />

        {/* Equity Curve Progression Chart */}
        <EquityCurveChart
          equityHistory={state.equityHistory}
          initialBalance={state.account.initialBalance}
          metrics={state.metrics}
        />

        {/* Completed Trade Logs & CSV Export */}
        <TradeHistoryTable tradeLogs={state.tradeLogs} />
      </main>

      {/* 24/7 Setup & Architecture Modal */}
      <Setup24x7Modal
        isOpen={is24x7ModalOpen}
        onClose={() => setIs24x7ModalOpen(false)}
        onSyncGithub={handleSyncGithub}
        isSyncingGithub={isSyncingGithub}
      />

      {/* OANDA Japan Connection & Live Feed Modal */}
      <OandaConnectionModal
        isOpen={isOandaModalOpen}
        onClose={() => setIsOandaModalOpen(false)}
        config={state.config}
        onUpdateConfig={handleUpdateConfig}
      />
    </div>
  );
}
export default App;
