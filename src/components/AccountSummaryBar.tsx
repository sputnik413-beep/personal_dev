import React from 'react';
import {
  Wallet,
  Percent,
  Award,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
} from 'lucide-react';
import { AccountState, PerformanceMetrics, Position } from '../types/scalper';

interface AccountSummaryBarProps {
  account: AccountState;
  metrics: PerformanceMetrics;
  openPositions: Position[];
}

export const AccountSummaryBar: React.FC<AccountSummaryBarProps> = ({
  account,
  metrics,
  openPositions,
}) => {
  const floatingPnL = openPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  const floatingPips = openPositions.reduce((sum, p) => sum + p.pipsPnL, 0);
  const isNetProfitPositive = metrics.netProfit >= 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Account Equity */}
      <div className="bg-[#101824] border border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="flex items-center gap-1 font-medium">
            <Wallet className="w-3.5 h-3.5 text-cyan-400" />
            有効証拠金 (Equity)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            残高: ¥{account.balance.toLocaleString()}
          </span>
        </div>
        <div className="text-lg lg:text-xl font-black font-mono tracking-tight text-white">
          ¥{account.equity.toLocaleString()}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-500 text-[11px]">含み損益:</span>
          <span
            className={`font-bold flex items-center ${
              floatingPnL > 0
                ? 'text-emerald-400'
                : floatingPnL < 0
                ? 'text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {floatingPnL > 0 ? '+' : ''}¥{floatingPnL.toLocaleString()}
            <span className="text-[10px] ml-1 opacity-80">
              ({floatingPips > 0 ? '+' : ''}
              {floatingPips.toFixed(1)}p)
            </span>
          </span>
        </div>
      </div>

      {/* Win Rate */}
      <div className="bg-[#101824] border border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="flex items-center gap-1 font-medium">
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
            スキャルプ勝率
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {metrics.wins}勝 {metrics.losses}敗
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg lg:text-xl font-black font-mono tracking-tight text-emerald-400">
            {metrics.winRate}%
          </span>
          <span className="text-xs text-slate-500 font-mono">/ {metrics.totalTrades}取引</span>
        </div>
        <div className="mt-1.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${Math.min(100, metrics.winRate)}%` }}
          />
        </div>
      </div>

      {/* Profit Factor */}
      <div className="bg-[#101824] border border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="flex items-center gap-1 font-medium">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Profit Factor (PF)
          </span>
          <span className="text-[10px] text-slate-400">
            期待値: {metrics.expectancyPips > 0 ? '+' : ''}
            {metrics.expectancyPips}p
          </span>
        </div>
        <div className="text-lg lg:text-xl font-black font-mono tracking-tight text-amber-300">
          {metrics.profitFactor > 0 ? metrics.profitFactor.toFixed(2) : '-'}
        </div>
        <div className="mt-1 text-xs text-slate-400 flex items-center justify-between">
          <span className="text-[11px]">平均利: +{metrics.averageWinPips}p</span>
          <span className="text-[11px] text-slate-500">平均損: -{metrics.averageLossPips}p</span>
        </div>
      </div>

      {/* Cumulative Net PnL */}
      <div className="bg-[#101824] border border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="flex items-center gap-1 font-medium">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            累積実現損益
          </span>
          <span
            className={`text-[10px] font-mono font-bold ${
              metrics.netPips >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {metrics.netPips >= 0 ? '+' : ''}
            {metrics.netPips} pips
          </span>
        </div>
        <div
          className={`text-lg lg:text-xl font-black font-mono tracking-tight flex items-center gap-1 ${
            isNetProfitPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {isNetProfitPositive ? (
            <ArrowUpRight className="w-4 h-4 text-emerald-400 inline" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-rose-400 inline" />
          )}
          {isNetProfitPositive ? '+' : ''}¥{metrics.netProfit.toLocaleString()}
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          初期原資比: {(((account.equity - account.initialBalance) / account.initialBalance) * 100).toFixed(2)}%
        </div>
      </div>

      {/* Max Drawdown */}
      <div className="bg-[#101824] border border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="flex items-center gap-1 font-medium">
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            最大ドローダウン
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            連敗数: {metrics.maxConsecutiveLosses}
          </span>
        </div>
        <div className="text-lg lg:text-xl font-black font-mono tracking-tight text-rose-400">
          {metrics.maxDrawdownPercent}%
        </div>
        <div className="mt-1 text-[11px] text-slate-400 font-mono">
          -¥{metrics.maxDrawdown.toLocaleString()}
        </div>
      </div>

      {/* Open Positions & Margin Status */}
      <div className="bg-[#101824] border border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="flex items-center gap-1 font-medium">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            保有ポジション
          </span>
          <span className="text-[10px] text-emerald-400 font-medium">スプレッド: 0.0p</span>
        </div>
        <div className="text-lg lg:text-xl font-black font-mono tracking-tight text-white flex items-center gap-2">
          <span>{openPositions.length} 件</span>
          {openPositions.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-normal">
              稼働中
            </span>
          )}
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          余力: ¥{Math.max(0, account.freeMargin).toLocaleString()}
        </div>
      </div>
    </div>
  );
};
