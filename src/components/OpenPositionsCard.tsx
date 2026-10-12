import React from 'react';
import { Shield, Clock, X, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import { Position, CurrencyPair } from '../types/scalper';

interface OpenPositionsCardProps {
  positions: Position[];
  pair: CurrencyPair;
  currentPrice: number;
  onClosePosition: (positionId: string, currentPrice: number) => void;
  onCloseAllPositions: () => void;
}

export const OpenPositionsCard: React.FC<OpenPositionsCardProps> = ({
  positions,
  pair,
  currentPrice,
  onClosePosition,
  onCloseAllPositions,
}) => {
  const decimals = pair === 'USDJPY' ? 3 : 5;

  if (positions.length === 0) {
    return (
      <div className="bg-[#101824] border border-slate-800 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
          <Shield className="w-4 h-4 text-slate-600" />
          <span>現在保有中のポジションはありません（シグナル検知待機中）</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#101824] border border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-sm text-white">
            保有中ポジション ({positions.length}件)
          </span>
        </div>
        <button
          onClick={onCloseAllPositions}
          className="text-xs px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-colors"
        >
          全ポジション一括決済
        </button>
      </div>

      <div className="space-y-2">
        {positions.map((pos) => {
          const isPositive = pos.pipsPnL >= 0;
          const durationMin = Math.max(1, Math.round((Date.now() - pos.entryTime) / 60000));

          return (
            <div
              key={pos.id}
              className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-extrabold font-mono ${
                    pos.direction === 'BUY'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {pos.direction}
                </span>
                <div>
                  <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <span>{pos.lots} Lot</span>
                    <span>@ {pos.entryPrice.toFixed(decimals)}</span>
                    <span className="text-slate-500">→ 現在: {currentPrice.toFixed(decimals)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>TP: {pos.takeProfit.toFixed(decimals)}</span>
                    <span>•</span>
                    <span>SL: {pos.stopLoss.toFixed(decimals)}</span>
                    {pos.trailingStop && (
                      <span className="text-[10px] px-1 rounded bg-cyan-500/20 text-cyan-300">
                        追従SL作動中
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                <div className="text-right">
                  <div
                    className={`text-sm font-mono font-extrabold flex items-center gap-1 ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="w-4 h-4 inline" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 inline" />
                    )}
                    <span>{isPositive ? '+' : ''}{pos.pipsPnL.toFixed(1)} pips</span>
                    <span className="text-xs ml-1 font-normal opacity-90">
                      ({isPositive ? '+' : ''}¥{pos.unrealizedPnL.toLocaleString()})
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    <span>保有 {durationMin}分</span>
                  </div>
                </div>

                <button
                  onClick={() => onClosePosition(pos.id, currentPrice)}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  成行決済
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
