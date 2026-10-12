import React, { useState } from 'react';
import {
  TrendingUp,
  Cpu,
  RefreshCw,
  GitBranch,
  Clock,
  ShieldCheck,
  HelpCircle,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { CurrencyPair, Timeframe, MarketStatus, ScalperConfig } from '../types/scalper';

interface HeaderTopBarProps {
  pair: CurrencyPair;
  timeframe: Timeframe;
  onPairChange: (pair: CurrencyPair) => void;
  onTimeframeChange: (tf: Timeframe) => void;
  marketStatus: MarketStatus | null;
  config: ScalperConfig;
  onToggleAutoTrade: () => void;
  onOpen24x7Guide: () => void;
  onSyncGithub: () => Promise<void>;
  isSyncingGithub: boolean;
}

export const HeaderTopBar: React.FC<HeaderTopBarProps> = ({
  pair,
  timeframe,
  onPairChange,
  onTimeframeChange,
  marketStatus,
  config,
  onToggleAutoTrade,
  onOpen24x7Guide,
  onSyncGithub,
  isSyncingGithub,
}) => {
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleSyncClick = async () => {
    await onSyncGithub();
    setSyncMessage('GitHubへ最新戦績を同期完了！');
    setTimeout(() => setSyncMessage(null), 3000);
  };

  return (
    <header className="border-b border-slate-800 bg-[#0d141d]/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Market Identity */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  5分足スキャルピング AIエージェント
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Forward Test
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>スプレッド0口座対応</span>
                <span>•</span>
                <span>Bob Volman式プライスアクション + Gemini AI判定</span>
              </p>
            </div>
          </div>

          {/* Quick 24/7 button on mobile */}
          <button
            onClick={onOpen24x7Guide}
            className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            title="24時間継続稼働ガイド"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Center Controls: Pair & Timeframe Selector */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-center">
          {/* Pair Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => onPairChange('USDJPY')}
              className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                pair === 'USDJPY'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              USD / JPY (ドル円)
            </button>
            <button
              onClick={() => onPairChange('EURUSD')}
              className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                pair === 'EURUSD'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EUR / USD (ユーロドル)
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => onTimeframeChange('1m')}
              className={`px-2.5 py-1 text-xs font-bold rounded transition-all ${
                timeframe === '1m'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="1分足（高頻度スキャルピング）"
            >
              1分足 (1m)
            </button>
            <button
              onClick={() => onTimeframeChange('5m')}
              className={`px-2.5 py-1 text-xs font-bold rounded transition-all ${
                timeframe === '5m'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="5分足（王道スキャルピング・推奨）"
            >
              5分足 (5m)
            </button>
          </div>

          {/* Market Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
            <div
              className={`w-2 h-2 rounded-full ${
                marketStatus?.isWeekendClosed
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-emerald-400 animate-ping'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {marketStatus?.isWeekendClosed ? '土日休場(継続リプレイ)' : 'FX市場稼働中'}
            </span>
          </div>

          {/* Zero Spread Tag */}
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Spread 0.0</span>
          </div>
        </div>

        {/* Right Actions: Auto Trade Toggle & 24/7 Setup */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Auto Trade Toggle */}
          <button
            onClick={onToggleAutoTrade}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
              config.isAutoTrading
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            {config.isAutoTrading ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>自動スキャルプ: ON</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>自動スキャルプ: 停止中</span>
              </>
            )}
          </button>

          {/* Sync to GitHub */}
          <button
            onClick={handleSyncClick}
            disabled={isSyncingGithub}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-all disabled:opacity-50"
            title="GitHubリポジトリに戦績・コードをプッシュ"
          >
            <GitBranch className={`w-3.5 h-3.5 ${isSyncingGithub ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">GitHub同期</span>
          </button>

          {/* 24/7 Setup Guide Button */}
          <button
            onClick={onOpen24x7Guide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 transition-all"
            title="PC停止時の24時間継続稼働手順 (GitHub Actions / さくらVPS)"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>PC閉鎖時の24H稼働</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="max-w-7xl mx-auto mt-2 text-center text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 py-1 rounded">
          {syncMessage}
        </div>
      )}
    </header>
  );
};
