import React, { useState } from 'react';
import {
  Radar,
  Zap,
  Bot,
  Compass,
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Gauge,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { IndicatorValues, CurrencyPair, Timeframe, TradeSignal } from '../types/scalper';

interface LiveSignalRadarProps {
  pair: CurrencyPair;
  timeframe: Timeframe;
  indicators: IndicatorValues;
  marketRegime: string;
  regimeDescription: string;
  latestSignal: TradeSignal | null;
  currentPrice: number;
  onTriggerAiDiagnosis: () => Promise<void>;
  aiAnalysis: {
    score: number;
    action: string;
    oneLineVerdict: string;
    scalpAdvice: string;
    keyFactors: string[];
  } | null;
  isAiAnalyzing: boolean;
}

export const LiveSignalRadar: React.FC<LiveSignalRadarProps> = ({
  pair,
  timeframe,
  indicators,
  marketRegime,
  regimeDescription,
  latestSignal,
  currentPrice,
  onTriggerAiDiagnosis,
  aiAnalysis,
  isAiAnalyzing,
}) => {
  const isEmaBull = indicators.ema21 > indicators.ema50;
  const isSqueeze = indicators.bbBandwidth < 0.8;
  const rsi = indicators.rsi14;

  const getRsiColor = () => {
    if (rsi >= 70) return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    if (rsi <= 30) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: Technical Multi-Indicator Radar */}
      <div className="bg-[#101824] border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
            <div className="flex items-center gap-2">
              <Radar className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-sm text-white">シグナル＆指標レーダー</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {timeframe} スキャルプ基準
            </span>
          </div>

          {/* Market Regime Banner */}
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  市場レジーム (トレンド判定)
                </div>
                <div className="text-xs font-bold text-slate-100">{regimeDescription}</div>
              </div>
            </div>
            <div
              className={`text-xs px-2 py-0.5 rounded font-extrabold flex items-center gap-1 ${
                isEmaBull
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isEmaBull ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isEmaBull ? 'BUY 順張り優位' : 'SELL 戻り売り優位'}
            </div>
          </div>

          {/* Indicator Micro Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {/* RSI */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-2 text-center">
              <div className="text-[10px] text-slate-400">RSI (14)</div>
              <div className="text-sm font-black font-mono text-cyan-400 my-0.5">
                {rsi.toFixed(1)}
              </div>
              <div className="text-[9px] text-slate-500">
                {rsi > 70 ? '買われすぎ警戒' : rsi < 30 ? '売られすぎ反発圏' : '中立・トレンド追従'}
              </div>
            </div>

            {/* 21 EMA / 50 EMA */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-2 text-center">
              <div className="text-[10px] text-slate-400">21 / 50 EMA</div>
              <div
                className={`text-xs font-black my-1 ${
                  isEmaBull ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isEmaBull ? 'ゴールデンクロス' : 'デッドクロス'}
              </div>
              <div className="text-[9px] text-slate-500">
                {indicators.ema21.toFixed(pair === 'USDJPY' ? 2 : 4)}
              </div>
            </div>

            {/* BB Bandwidth (Squeeze) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-2 text-center">
              <div className="text-[10px] text-slate-400">ボリンジャーバンド</div>
              <div
                className={`text-xs font-black my-1 ${
                  isSqueeze ? 'text-amber-400' : 'text-slate-300'
                }`}
              >
                {isSqueeze ? 'スクイーズ収束' : 'エクスパンション'}
              </div>
              <div className="text-[9px] text-slate-500">
                幅: {indicators.bbBandwidth.toFixed(2)}%
              </div>
            </div>

            {/* ATR Volatility */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-2 text-center">
              <div className="text-[10px] text-slate-400">ATRボラティリティ</div>
              <div className="text-xs font-black font-mono text-indigo-400 my-1">
                {(indicators.atr14 / (pair === 'USDJPY' ? 0.01 : 0.0001)).toFixed(1)} pips
              </div>
              <div className="text-[9px] text-slate-500">スキャルプ適正レンジ</div>
            </div>
          </div>
        </div>

        {/* Latest Strategy Trigger */}
        {latestSignal ? (
          <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-700/40 text-xs">
            <div className="flex items-center justify-between text-emerald-400 font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-current" />
                最新検知シグナル: [{latestSignal.direction}] {latestSignal.strategy}
              </span>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 rounded text-[11px] font-mono">
                信頼度 {latestSignal.confidence}%
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">
              {latestSignal.rationale}
            </p>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Bob Volman式 21EMAロールリバーサル監視中...
            </span>
            <span className="text-[11px] text-slate-500">待機中</span>
          </div>
        )}
      </div>

      {/* Right: Gemini AI Institutional Scalping Verdict */}
      <div className="bg-gradient-to-br from-[#101824] to-[#121c2e] border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-indigo-500/20 text-indigo-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sm text-white">Gemini AI クオンツ診断</span>
                <span className="text-[10px] ml-2 text-indigo-400 font-mono">gemini-2.5-flash</span>
              </div>
            </div>
            <button
              onClick={onTriggerAiDiagnosis}
              disabled={isAiAnalyzing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-xs font-semibold text-indigo-200 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAiAnalyzing ? '診断中...' : '即時AI診断'}</span>
            </button>
          </div>

          {aiAnalysis ? (
            <div className="space-y-3">
              {/* Verdict Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">AIエントリー判定</div>
                  <div className="text-base font-extrabold text-white mt-0.5">
                    {aiAnalysis.oneLineVerdict}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">確信度スコア</div>
                  <div className="text-xl font-black font-mono text-cyan-400">
                    {aiAnalysis.score}
                    <span className="text-xs text-slate-500">/100</span>
                  </div>
                </div>
              </div>

              {/* Advice */}
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/90 text-xs text-slate-300 leading-relaxed">
                <span className="text-indigo-400 font-bold mr-1">【戦略解説】</span>
                {aiAnalysis.scalpAdvice}
              </div>

              {/* Factors */}
              <div className="flex flex-wrap gap-1.5">
                {aiAnalysis.keyFactors?.map((factor, idx) => (
                  <span
                    key={`factor_${idx}`}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700/60"
                  >
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <Sparkles className="w-8 h-8 text-indigo-400/50 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                リアルタイム為替レートとマルチ指標をGemini AIがクオンツ分析します。
              </p>
              <button
                onClick={onTriggerAiDiagnosis}
                className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow"
              >
                AI相場診断を実行
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 flex items-center justify-between">
          <span>ゼロスプレッド特化スキャルプ評価</span>
          <span>推奨保有: 3〜15分</span>
        </div>
      </div>
    </div>
  );
};
