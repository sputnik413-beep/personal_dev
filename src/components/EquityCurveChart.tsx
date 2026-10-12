import React, { useMemo } from 'react';
import { TrendingUp, Award, Activity } from 'lucide-react';
import { EquityPoint, PerformanceMetrics } from '../types/scalper';

interface EquityCurveChartProps {
  equityHistory: EquityPoint[];
  initialBalance: number;
  metrics: PerformanceMetrics;
}

export const EquityCurveChart: React.FC<EquityCurveChartProps> = ({
  equityHistory,
  initialBalance,
  metrics,
}) => {
  const chartHeight = 160;
  const padding = { top: 15, right: 60, bottom: 25, left: 10 };

  const points = useMemo(() => {
    if (equityHistory.length === 0) {
      return [{ timestamp: Date.now(), equity: initialBalance, balance: initialBalance }];
    }
    return equityHistory;
  }, [equityHistory, initialBalance]);

  const { minVal, maxVal } = useMemo(() => {
    let min = initialBalance;
    let max = initialBalance;
    for (const p of points) {
      if (p.equity < min) min = p.equity;
      if (p.equity > max) max = p.equity;
      if (p.balance < min) min = p.balance;
      if (p.balance > max) max = p.balance;
    }
    const range = max - min || 10000;
    return {
      minVal: min - range * 0.1,
      maxVal: max + range * 0.1,
    };
  }, [points, initialBalance]);

  const valRange = maxVal - minVal || 1;

  const getY = (val: number) => {
    const usableHeight = chartHeight - padding.top - padding.bottom;
    const ratio = (val - minVal) / valRange;
    return chartHeight - padding.bottom - ratio * usableHeight;
  };

  const chartAreaWidth = 800 - padding.left - padding.right;
  const count = points.length;

  const getX = (i: number) => {
    if (count <= 1) return padding.left + chartAreaWidth / 2;
    return padding.left + (i / (count - 1)) * chartAreaWidth;
  };

  const equitySvgPath = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.equity)}`)
      .join(' ');
  }, [points, minVal, maxVal]);

  const balanceSvgPath = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.balance)}`)
      .join(' ');
  }, [points, minVal, maxVal]);

  const areaGradientPath = useMemo(() => {
    if (points.length === 0) return '';
    const base = getY(initialBalance);
    return `${equitySvgPath} L ${getX(points.length - 1)} ${chartHeight - padding.bottom} L ${getX(
      0
    )} ${chartHeight - padding.bottom} Z`;
  }, [equitySvgPath, points]);

  return (
    <div className="bg-[#101824] border border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-sm text-white">資産推移 (Equity / Balance 曲線)</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-emerald-400 rounded-full" />
            <span className="text-slate-300">有効証拠金</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-cyan-400 rounded-full" />
            <span className="text-slate-300">確定残高</span>
          </div>
        </div>
      </div>

      <div className="w-full relative select-none" style={{ height: `${chartHeight}px` }}>
        <svg
          className="w-full h-full overflow-visible"
          viewBox={`0 0 800 ${chartHeight}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="equityFillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Initial Balance Base Line */}
          <line
            x1={padding.left}
            y1={getY(initialBalance)}
            x2={800 - padding.right}
            y2={getY(initialBalance)}
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <text
            x={800 - padding.right + 5}
            y={getY(initialBalance) + 3}
            fill="#64748b"
            fontSize="9"
            fontFamily="monospace"
          >
            原資: ¥{initialBalance.toLocaleString()}
          </text>

          {/* Max Value Label */}
          <text
            x={800 - padding.right + 5}
            y={padding.top + 8}
            fill="#10b981"
            fontSize="9"
            fontFamily="monospace"
          >
            最高: ¥{Math.round(maxVal).toLocaleString()}
          </text>

          {/* Fill under equity */}
          {areaGradientPath && <path d={areaGradientPath} fill="url(#equityFillGrad)" />}

          {/* Balance Line (Cyan) */}
          {balanceSvgPath && (
            <path
              d={balanceSvgPath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Equity Line (Emerald) */}
          {equitySvgPath && (
            <path d={equitySvgPath} fill="none" stroke="#10b981" strokeWidth="2" />
          )}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
        <span>フォワードテスト開始時: ¥{initialBalance.toLocaleString()}</span>
        <span className="font-mono text-emerald-400 font-bold">
          現在純損益: {metrics.netProfit >= 0 ? '+' : ''}¥{metrics.netProfit.toLocaleString()} ({metrics.netPips >= 0 ? '+' : ''}{metrics.netPips}p)
        </span>
      </div>
    </div>
  );
};
