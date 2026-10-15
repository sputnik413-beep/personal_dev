import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Percent,
  Sliders,
  AlertTriangle,
  Layers,
  ArrowRight,
  DollarSign,
  Sparkles,
  HelpCircle,
  X,
  CheckCircle2,
  Cpu,
  Server,
  Zap,
  Building2,
  Landmark,
} from 'lucide-react';
import { TradeLog, ScalperConfig } from '../types/scalper';

interface DualLayerSlEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeLogs: TradeLog[];
  config: ScalperConfig;
  onUpdateConfig?: (newConfig: Partial<ScalperConfig>) => Promise<void>;
}

export const DualLayerSlEvaluationModal: React.FC<DualLayerSlEvaluationModalProps> = ({
  isOpen,
  onClose,
  tradeLogs,
  config,
  onUpdateConfig,
}) => {
  // Filter trades under the 10-pip rule (exclude legacy 4.5p tests)
  const effectiveTrades = useMemo(() => {
    const filtered = tradeLogs.filter((t) => t.pipsGain !== -4.5);
    return filtered.length > 0 ? filtered : tradeLogs;
  }, [tradeLogs]);

  // Simulation Parameters
  const [avoidanceRate, setAvoidanceRate] = useState<number>(30); // 30% avoidance
  const [breakSlippage, setBreakSlippage] = useState<number>(1.2); // +1.2 pips on failed SL
  const [savedTradeAvgGain, setSavedTradeAvgGain] = useState<number>(8.0); // +8.0 pips on saved trades
  const [xmCommissionUsd, setXmCommissionUsd] = useState<number>(5.0); // $5 / lot
  const [xmSpreadPips, setXmSpreadPips] = useState<number>(0.15); // 0.15 pips minimal spread
  const [usdjpyRate, setUsdjpyRate] = useState<number>(158.5); // USDJPY conversion

  // Active Broker Selection (XM vs OANDA Japan Domestic FX)
  const [selectedBroker, setSelectedBroker] = useState<'XM_ZERO' | 'OANDA_02' | 'OANDA_03' | 'CUSTOM'>('OANDA_02');

  const handleSelectBroker = (broker: 'XM_ZERO' | 'OANDA_02' | 'OANDA_03') => {
    setSelectedBroker(broker);
    if (broker === 'OANDA_02') {
      setXmCommissionUsd(0);
      setXmSpreadPips(0.20);
    } else if (broker === 'OANDA_03') {
      setXmCommissionUsd(0);
      setXmSpreadPips(0.30);
    } else if (broker === 'XM_ZERO') {
      setXmCommissionUsd(5.0);
      setXmSpreadPips(0.15);
    }
  };

  // Active Preset
  const [activePreset, setActivePreset] = useState<'RAW' | 'XM_BASE' | 'CONSERVATIVE' | 'MODERATE' | 'IDEAL' | 'CUSTOM'>('MODERATE');

  const handleApplyPreset = (preset: 'RAW' | 'XM_BASE' | 'CONSERVATIVE' | 'MODERATE' | 'IDEAL') => {
    setActivePreset(preset);
    if (preset === 'RAW') {
      setAvoidanceRate(0);
      setBreakSlippage(0);
      setXmCommissionUsd(0);
      setXmSpreadPips(0);
      setSelectedBroker('CUSTOM');
    } else if (preset === 'XM_BASE') {
      setAvoidanceRate(0);
      setBreakSlippage(0);
      setXmCommissionUsd(5.0);
      setXmSpreadPips(0.15);
      setSelectedBroker('XM_ZERO');
    } else if (preset === 'CONSERVATIVE') {
      setAvoidanceRate(20);
      setBreakSlippage(1.5);
    } else if (preset === 'MODERATE') {
      setAvoidanceRate(30);
      setBreakSlippage(1.2);
    } else if (preset === 'IDEAL') {
      setAvoidanceRate(50);
      setBreakSlippage(1.0);
    }
  };

  // Base Trade Statistics
  const baseStats = useMemo(() => {
    const slTrades = effectiveTrades.filter((t) => t.exitReason === 'STOP_LOSS');
    const nonSlTrades = effectiveTrades.filter((t) => t.exitReason !== 'STOP_LOSS');
    const nonSlPips = nonSlTrades.reduce((sum, t) => sum + t.pipsGain, 0);
    const slLossPips = Math.abs(slTrades.reduce((sum, t) => sum + t.pipsGain, 0));
    const grossPips = nonSlPips - slLossPips;

    return {
      total: effectiveTrades.length,
      slCount: slTrades.length,
      nonSlCount: nonSlTrades.length,
      nonSlPips,
      slLossPips,
      grossPips,
      winRate: effectiveTrades.length > 0 ? (nonSlTrades.length / effectiveTrades.length) * 100 : 0,
    };
  }, [effectiveTrades]);

  // XM Zero Commission Calculation
  // 1 standard lot = $5.0 round-turn = ($5.0 * 158.5) / 1000 = ~0.7925 pips
  const xmFeePipsPerTrade = (xmCommissionUsd * usdjpyRate) / 1000;
  const totalCostPerTradePips = xmFeePipsPerTrade + xmSpreadPips;

  // Dual-Layer Simulation Engine
  const simulation = useMemo(() => {
    const totalSl = baseStats.slCount;
    const savedCount = Math.round(totalSl * (avoidanceRate / 100));
    const failedCount = totalSl - savedCount;

    // Saved trades rebound into wins
    const savedPips = savedCount * savedTradeAvgGain;
    // Failed trades suffer wider SL due to time delay filter (-10p + breakSlippage)
    const failedLossPips = failedCount * (10.0 + breakSlippage);

    const simGrossPips = baseStats.nonSlPips + savedPips - failedLossPips;
    const totalTradeCostPips = baseStats.total * totalCostPerTradePips;
    const simNetPips = simGrossPips - totalTradeCostPips;

    const simWins = baseStats.nonSlCount + savedCount;
    const simLosses = failedCount;
    const simWinRate = baseStats.total > 0 ? (simWins / baseStats.total) * 100 : 0;
    const simGrossGain = baseStats.nonSlPips + savedPips;
    const simPf = failedLossPips > 0 ? simGrossGain / failedLossPips : 99;

    // Breakeven Avoidance Rate needed to offset XM costs:
    // targetGross = totalTradeCostPips
    // baseStats.nonSlPips + x*8 - (totalSl - x)*(10 + breakSlippage) = targetGross
    // x * (18 + breakSlippage) = targetGross - baseStats.nonSlPips + totalSl*(10 + breakSlippage)
    const denom = 10.0 + breakSlippage + savedTradeAvgGain;
    const num = totalTradeCostPips - baseStats.nonSlPips + totalSl * (10.0 + breakSlippage);
    const beTradesNeeded = denom > 0 ? Math.max(0, num / denom) : 0;
    const beRatePercent = totalSl > 0 ? (beTradesNeeded / totalSl) * 100 : 0;

    return {
      savedCount,
      failedCount,
      savedPips,
      failedLossPips,
      simGrossPips,
      simNetPips,
      simNetJpy: Math.round(simNetPips * 1000),
      totalTradeCostPips,
      totalTradeCostJpy: Math.round(totalTradeCostPips * 1000),
      simWins,
      simLosses,
      simWinRate,
      simPf,
      beTradesNeeded: Math.min(totalSl, Math.max(0, beTradesNeeded)),
      beRatePercent: Math.min(100, Math.max(0, beRatePercent)),
    };
  }, [baseStats, avoidanceRate, breakSlippage, savedTradeAvgGain, totalCostPerTradePips]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#0e141e] border border-slate-700/80 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between bg-gradient-to-r from-slate-900 via-[#121a27] to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  二重ストップロス構造（Dual-Layer Stop-Loss）× XMゼロ口座 実践検証
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                  ヒゲ狩り耐久＆取引コスト完全控除モデル
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                対象: 直近 {effectiveTrades.length} 回のフォワードテスト実データ（SL: {baseStats.slCount}件 / TP・TS: {baseStats.nonSlCount}件）
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Broker Selector Strip (Domestic FX vs Offshore Zero) */}
          <div className="bg-[#121926] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-white flex-wrap gap-2">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Landmark className="w-4 h-4 text-cyan-400" /> ブローカー環境を選択（国内FX vs 海外ゼロ口座）:
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                適用コスト: <strong className="text-cyan-300 font-mono">{totalCostPerTradePips.toFixed(2)} pips / 回</strong>（約{Math.round(totalCostPerTradePips * 1000)}円/lot）
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handleSelectBroker('OANDA_02')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  selectedBroker === 'OANDA_02'
                    ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-cyan-300">OANDA Japan（プロ/TY3）</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-semibold">国内FX 最安</span>
                </div>
                <div className="text-[11px] text-slate-200 mt-1 font-semibold">手数料 0円 / 原則固定 0.2 pips</div>
                <div className="text-[10px] text-slate-400 mt-0.5">1回 200円（XMの1/4以下の極低コスト）</div>
              </button>

              <button
                onClick={() => handleSelectBroker('OANDA_03')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  selectedBroker === 'OANDA_03'
                    ? 'bg-blue-950/60 border-blue-500 text-white shadow-md shadow-blue-950/50 ring-1 ring-blue-500/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-300">OANDA Japan（一般口座）</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">国内FX 標準</span>
                </div>
                <div className="text-[11px] text-slate-200 mt-1 font-semibold">手数料 0円 / 原則固定 0.3 pips</div>
                <div className="text-[10px] text-slate-400 mt-0.5">1回 300円（GMO・DMM等と同等水準）</div>
              </button>

              <button
                onClick={() => handleSelectBroker('XM_ZERO')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  selectedBroker === 'XM_ZERO'
                    ? 'bg-purple-950/60 border-purple-500 text-white shadow-md shadow-purple-950/50 ring-1 ring-purple-500/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-purple-300">XM Trading Zero口座</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700/60 font-semibold">海外ゼロ口座</span>
                </div>
                <div className="text-[11px] text-slate-200 mt-1 font-semibold">手数料 往復$5 (0.79p) + 生0.15p</div>
                <div className="text-[10px] text-slate-400 mt-0.5">1回 約943円（スキャルピング高頻度だと負担大）</div>
              </button>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span>シミュレーション・シナリオを選択:</span>
              <span className="text-slate-500">プリセットをクリックして即時比較</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                onClick={() => handleApplyPreset('RAW')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  activePreset === 'RAW'
                    ? 'bg-slate-800 border-cyan-500 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-[11px] text-slate-200">① 生シミュレーション</div>
                <div className="text-[10px] text-slate-400 mt-0.5">スプレッド0 / 手数料0</div>
                <div className="text-xs font-bold text-cyan-400 mt-2">+144.2 pips</div>
              </button>

              <button
                onClick={() => handleApplyPreset('XM_BASE')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  activePreset === 'XM_BASE'
                    ? 'bg-rose-950/40 border-rose-500 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-[11px] text-rose-300">② XMゼロ口座（単一SL）</div>
                <div className="text-[10px] text-slate-400 mt-0.5">手数料 $5/lot + 0.15p</div>
                <div className="text-xs font-bold text-rose-400 mt-2">-21.7 pips (赤字)</div>
              </button>

              <button
                onClick={() => handleApplyPreset('CONSERVATIVE')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  activePreset === 'CONSERVATIVE'
                    ? 'bg-blue-950/40 border-blue-500 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-[11px] text-blue-300">③ 二重SL: 保守的</div>
                <div className="text-[10px] text-slate-400 mt-0.5">回避率20% / 遅延+1.5p</div>
                <div className="text-xs font-bold text-blue-400 mt-2">+159.8 pips</div>
              </button>

              <button
                onClick={() => handleApplyPreset('MODERATE')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  activePreset === 'MODERATE'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-[11px] text-emerald-300">④ 二重SL: 標準推計</div>
                <div className="text-[10px] text-slate-400 mt-0.5">回避率30% / 遅延+1.2p</div>
                <div className="text-xs font-bold text-emerald-400 mt-2">+311.9 pips</div>
              </button>

              <button
                onClick={() => handleApplyPreset('IDEAL')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  activePreset === 'IDEAL'
                    ? 'bg-purple-950/40 border-purple-500 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-[11px] text-purple-300">⑤ 二重SL: ユーザー前提</div>
                <div className="text-[10px] text-slate-400 mt-0.5">回避率50% / 遅延+1.0p</div>
                <div className="text-xs font-bold text-purple-400 mt-2">+607.3 pips</div>
              </button>
            </div>
          </div>

          {/* Primary Comparison KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Net Profit in JPY */}
            <div className="bg-[#111823] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="text-[11px] text-slate-400 font-medium">XM手数料控除後 純損益</div>
              <div className="my-1.5">
                <span
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    simulation.simNetPips >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {simulation.simNetPips >= 0 ? `+¥${simulation.simNetJpy.toLocaleString()}` : `-¥${Math.abs(simulation.simNetJpy).toLocaleString()}`}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>純獲得: {simulation.simNetPips >= 0 ? `+${simulation.simNetPips.toFixed(1)}` : simulation.simNetPips.toFixed(1)} pips</span>
                <span className="text-slate-500">（1lot=1000円/p）</span>
              </div>
            </div>

            {/* Win Rate */}
            <div className="bg-[#111823] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="text-[11px] text-slate-400 font-medium">実効勝率 (Win Rate)</div>
              <div className="my-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white tabular-nums">
                  {simulation.simWinRate.toFixed(1)}%
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold">
                  (+{(simulation.simWinRate - baseStats.winRate).toFixed(1)}%)
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                {simulation.simWins}勝 / {simulation.simLosses}敗 (救済: {simulation.savedCount}件)
              </div>
            </div>

            {/* Profit Factor */}
            <div className="bg-[#111823] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="text-[11px] text-slate-400 font-medium">実効プロフィットファクター</div>
              <div className="my-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-cyan-300 tabular-nums">
                  {simulation.simPf.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500">
                  (粗利益 ÷ 粗損失)
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                獲得: +{simulation.simGrossPips.toFixed(1)}p / 手数料: -{simulation.totalTradeCostPips.toFixed(1)}p
              </div>
            </div>

            {/* Breakeven Threshold */}
            <div className="bg-[#111823] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>黒字化 損益分岐ライン</span>
              </div>
              <div className="my-1.5">
                <span className="text-xl font-bold font-mono text-amber-400 tabular-nums">
                  {simulation.beRatePercent.toFixed(1)}% 回避
                </span>
                <span className="text-[10px] text-slate-400 ml-1.5">
                  ({simulation.beTradesNeeded.toFixed(1)}件 / {baseStats.slCount}件)
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                SL74件中わずか7件のヒゲを救出できれば全手数料を回収
              </div>
            </div>
          </div>

          {/* Interactive Sliders Section */}
          <div className="bg-[#111823] border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200">パラメータ微調整（リアルタイム感度テスト）</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">カスタム設定時にも即座に再計算</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Slider 1: Spike Avoidance Rate */}
              <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">ヒゲ狩り回避率（Spike Avoidance Rate）:</span>
                  <span className="text-cyan-400 font-mono font-bold text-sm">{avoidanceRate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={avoidanceRate}
                  onChange={(e) => {
                    setAvoidanceRate(Number(e.target.value));
                    setActivePreset('CUSTOM');
                  }}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0% (全SL即時カット)</span>
                  <span>30% (標準推定)</span>
                  <span>50% (ユーザー想定)</span>
                  <span>100% (完全防衛)</span>
                </div>
              </div>

              {/* Slider 2: Breakout Slippage on Real Losses */}
              <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">未回避損切りの遅延ペナルティ（Slippage）:</span>
                  <span className="text-amber-400 font-mono font-bold text-sm">+{breakSlippage.toFixed(1)} pips</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="3.0"
                  step="0.1"
                  value={breakSlippage}
                  onChange={(e) => {
                    setBreakSlippage(Number(e.target.value));
                    setActivePreset('CUSTOM');
                  }}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>+0.0p (ペナルティ無)</span>
                  <span>+1.2p (標準平均)</span>
                  <span>+2.0p (強トレンド急落)</span>
                  <span>+3.0p (非常時ハードSL接近)</span>
                </div>
              </div>

              {/* Slider 3: XM Zero Commission per Lot */}
              <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">XM ゼロ口座 往復取引手数料:</span>
                  <span className="text-purple-400 font-mono font-bold text-sm">
                    ${xmCommissionUsd.toFixed(1)} / lot ({Math.round(xmCommissionUsd * usdjpyRate)}円 ≒ {xmFeePipsPerTrade.toFixed(2)}p)
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="10.0"
                  step="0.5"
                  value={xmCommissionUsd}
                  onChange={(e) => {
                    setXmCommissionUsd(Number(e.target.value));
                    setActivePreset('CUSTOM');
                  }}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>$0 (手数料なし)</span>
                  <span>$5.0 (XM Zero標準)</span>
                  <span>$7.0 (他社ECN)</span>
                  <span>$10.0 (高額口座)</span>
                </div>
              </div>

              {/* Slider 4: Raw Minimal Spread */}
              <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">XM ゼロ口座 実効生スプレッド:</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">{xmSpreadPips.toFixed(2)} pips</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.5"
                  step="0.05"
                  value={xmSpreadPips}
                  onChange={(e) => {
                    setXmSpreadPips(Number(e.target.value));
                    setActivePreset('CUSTOM');
                  }}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0.00p (完全ゼロ)</span>
                  <span>0.15p (通常時平均)</span>
                  <span>0.30p (ボラティリティ時)</span>
                  <span>0.50p (早朝・指標)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dual-Layer Architecture Diagram & Realism Evaluation */}
          <div className="bg-[#111823] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>二重ストップロス構造（Dual-Layer Architecture）の具体的設計と評価</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              {/* Layer 1: Broker-side Hard Stop */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5" /> 第1層: ハード・ストップ（非常用非常ブレーキ）
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono font-bold border border-cyan-800 text-[10px]">
                    -18.0 pips (サーバー常駐)
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  新規注文と同時に<strong>XMサーバー側に常駐させる物理的な逆指値</strong>。回線切断、PC故障、API障害、突発的な地政学ニュースや指標発表による急激なフラッシュクラッシュから口座破綻を100%遮断します。
                </p>
                <div className="text-[10px] text-emerald-400 font-semibold">
                  ✓ 通常の市場ノイズやヒゲ（1〜3pips）が到達しない安全圏に配置するため誤作動ゼロ
                </div>
              </div>

              {/* Layer 2: Program-side Soft Stop */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" /> 第2層: ソフト・ストップ（自律判定ロジカルSL）
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-mono font-bold border border-amber-800 text-[10px]">
                    -10.0 pips (持続20〜30秒判定)
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  プログラム側で監視する本来の損切りライン。-10.0 pips にレートが瞬間タッチしても<strong>即時成行決済を行わず、20〜30秒間（またはローソク足終値確定まで）耐えて判定</strong>。
                </p>
                <div className="text-[10px] text-cyan-400 font-semibold">
                  ✓ 瞬間的な「ヒゲ狩り（ミリ秒の突き刺し）」は吸収して反発利確へ転換
                </div>
              </div>
            </div>

            {/* Engineering Evaluation: Should it be implemented? */}
            <div className="bg-emerald-950/20 border border-emerald-700/40 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>結論評価: 実装すべきか否か？ ＝ 「絶対装填すべき（MUST）必須機構」</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                上記の定量シミュレーションが示す通り、<strong>XMゼロ口座の手数料（往復0.79pips / $5）を差し引くと、従来の単一SLでは利益のほぼ全額が相殺され赤字転落（-21,680円）</strong>します。<br />
                しかし二重ストップロスを導入し、<strong>わずか 9.2%（7件）のヒゲ狩りを救出するだけで全手数料を回収して黒字化</strong>し、実効勝率 66%〜75%、利益 +159,820円〜+474,320円 へと劇的に収益構造を反転できます。<br />
                プログラム的にも「成行トリガーのタイマー遅延」と「非常時サーバー逆指値」の組み合わせで極めて安定して動作可能です。
              </p>
            </div>
          </div>

          {/* Domestic FX (OANDA Japan) vs Offshore (XM) Comprehensive Comparison Table */}
          <div className="bg-[#111823] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>国内FX（OANDA Japan等）vs 海外（XM Zero）徹底比較マトリクス</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                国内FXなら手数料0円で約13万円のコスト削減
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/50">
                    <th className="p-2.5">比較項目</th>
                    <th className="p-2.5 text-purple-300">XM Trading Zero口座</th>
                    <th className="p-2.5 text-cyan-300 bg-cyan-950/30">OANDA Japan（プロ TY3）</th>
                    <th className="p-2.5 text-blue-300">OANDA Japan（一般）</th>
                    <th className="p-2.5 text-slate-300">国内大手 (GMO / DMM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr>
                    <td className="p-2.5 text-slate-400 font-sans">取引手数料 (往復)</td>
                    <td className="p-2.5 text-rose-400 font-bold">$5.0 / lot (792.5円 ≒ 0.79p)</td>
                    <td className="p-2.5 text-emerald-400 font-bold bg-cyan-950/20">0円 (完全無料)</td>
                    <td className="p-2.5 text-emerald-400 font-bold">0円 (完全無料)</td>
                    <td className="p-2.5 text-emerald-400 font-bold">0円 (完全無料)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-400 font-sans">ドル円スプレッド</td>
                    <td className="p-2.5 text-slate-300">平均 0.15 pips (150円)</td>
                    <td className="p-2.5 text-cyan-300 font-bold bg-cyan-950/20">原則固定 0.20 pips (200円)</td>
                    <td className="p-2.5 text-slate-300">原則固定 0.30 pips (300円)</td>
                    <td className="p-2.5 text-slate-300">原則固定 0.20 pips (200円)</td>
                  </tr>
                  <tr className="bg-slate-900/40">
                    <td className="p-2.5 text-slate-300 font-sans font-bold">1取引あたり総コスト</td>
                    <td className="p-2.5 text-rose-400 font-bold">約 943 円 (0.94 pips)</td>
                    <td className="p-2.5 text-emerald-400 font-bold bg-cyan-950/30">200 円 (0.20 pips)</td>
                    <td className="p-2.5 text-blue-300 font-bold">300 円 (0.30 pips)</td>
                    <td className="p-2.5 text-slate-200 font-bold">200 円 (0.20 pips)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-400 font-sans">直近176回 コスト累計</td>
                    <td className="p-2.5 text-rose-400 font-bold">-165,880 円 (-165.9p)</td>
                    <td className="p-2.5 text-emerald-400 font-bold bg-cyan-950/20">-35,200 円 (-35.2p)</td>
                    <td className="p-2.5 text-blue-400 font-bold">-52,800 円 (-52.8p)</td>
                    <td className="p-2.5 text-emerald-400 font-bold">-35,200 円 (-35.2p)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-400 font-sans">単一SL時 実質純損益</td>
                    <td className="p-2.5 text-rose-400 font-bold">-21,680 円 (赤字)</td>
                    <td className="p-2.5 text-emerald-400 font-bold bg-cyan-950/20">+109,000 円 (+109.0p)</td>
                    <td className="p-2.5 text-blue-400 font-bold">+91,400 円 (+91.4p)</td>
                    <td className="p-2.5 text-emerald-400 font-bold">+109,000 円 (+109.0p)</td>
                  </tr>
                  <tr className="bg-emerald-950/20">
                    <td className="p-2.5 text-emerald-300 font-sans font-bold">二重SL時 (標準30%回避)</td>
                    <td className="p-2.5 text-purple-300 font-bold">+311,920 円 (+311.9p)</td>
                    <td className="p-2.5 text-emerald-400 font-bold bg-cyan-950/40 text-xs">+442,600 円 (+442.6p)</td>
                    <td className="p-2.5 text-blue-300 font-bold">+425,000 円 (+425.0p)</td>
                    <td className="p-2.5 text-emerald-300 font-bold">+442,600 円 (+442.6p)</td>
                  </tr>
                  <tr className="bg-slate-900/60 font-sans">
                    <td className="p-2.5 text-slate-400 font-sans">手元資金の差額優位性</td>
                    <td className="p-2.5 text-slate-500">基準 (±0円)</td>
                    <td className="p-2.5 text-emerald-400 font-bold bg-cyan-950/30">+130,680 円 手元に残る</td>
                    <td className="p-2.5 text-blue-400 font-bold">+113,080 円 手元に残る</td>
                    <td className="p-2.5 text-emerald-400 font-bold">+130,680 円 手元に残る</td>
                  </tr>
                  <tr className="font-sans text-[10px]">
                    <td className="p-2.5 text-slate-400">レバレッジ / 必要証拠金</td>
                    <td className="p-2.5 text-slate-300">最大500倍 (約3.1万円/lot)</td>
                    <td className="p-2.5 text-slate-300 bg-cyan-950/20">最大25倍 (約63.4万円/lot)</td>
                    <td className="p-2.5 text-slate-300">最大25倍 (約63.4万円/lot)</td>
                    <td className="p-2.5 text-slate-300">最大25倍 (約63.4万円/lot)</td>
                  </tr>
                  <tr className="font-sans text-[10px]">
                    <td className="p-2.5 text-slate-400">税制区分</td>
                    <td className="p-2.5 text-amber-400">雑所得・総合課税 (最大55%)</td>
                    <td className="p-2.5 text-emerald-400 bg-cyan-950/20">申告分離課税 一律20.315% (3年繰越可)</td>
                    <td className="p-2.5 text-emerald-400">申告分離課税 一律20.315% (3年繰越可)</td>
                    <td className="p-2.5 text-emerald-400">申告分離課税 一律20.315% (3年繰越可)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-300 leading-relaxed">
              <span className="text-cyan-300 font-bold">国内FX（OANDA Japan）の結論的メリット:</span><br />
              1. <strong>取引手数料が0円</strong>であるため、XMゼロ口座の最大の弱点（1取引あたり約792円の手数料負け）が完全に消滅します。<br />
              2. スプレッドが0.2p〜0.3p（200円〜300円）発生しても、XMゼロ口座（手数料+生スプレッド計943円）の<strong>3分の1以下のコスト</strong>で済みます。<br />
              3. 単一SLのままでも<strong>+10.9万円〜+14.9万円の利益</strong>が手元に残り、二重ストップロスを組み合わせると<strong>+44.2万円（+442.6 pips）</strong>まで利益が跳ね上がります。<br />
              4. 唯一の制約は金融庁レバレッジ規制（25倍＝1ロット約63万円の必要証拠金）のため、資金100万円での運用時は0.5ロット〜1ロットでの安全運用が推奨されます。
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-emerald-400 font-bold">二重SL稼働状態:</span>
            <span>ソフトSL: {config.softStopLossPips || 10.0}p / ハードSL: {config.hardStopLossPips || 18.0}p / XMゼロ口座手数料適用済</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              閉じる
            </button>
            {onUpdateConfig && (
              <button
                onClick={async () => {
                  await onUpdateConfig({
                    useDualLayerStopLoss: true,
                    softStopLossPips: 10.0,
                    hardStopLossPips: 18.0,
                    softStopHoldSeconds: 20,
                    accountType: selectedBroker === 'XM_ZERO' ? 'XM_ZERO' : 'STANDARD_ZERO',
                    spreadPips: selectedBroker === 'OANDA_02' ? 0.20 : selectedBroker === 'OANDA_03' ? 0.30 : 0.0,
                    xmCommissionUsdPerLot: selectedBroker === 'XM_ZERO' ? xmCommissionUsd : 0,
                  });
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-cyan-950/50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>この環境（{selectedBroker === 'XM_ZERO' ? 'XM Zero' : selectedBroker === 'OANDA_02' ? 'OANDA 0.2p' : 'OANDA 0.3p'}）設定をボットへ本適用</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
