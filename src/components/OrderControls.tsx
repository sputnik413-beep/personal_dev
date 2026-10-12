import React from 'react';
import {
  Sliders,
  Play,
  Pause,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Shield,
  Target,
  Zap,
} from 'lucide-react';
import { ScalperConfig, CurrencyPair } from '../types/scalper';

interface OrderControlsProps {
  config: ScalperConfig;
  pair: CurrencyPair;
  currentPrice: number;
  onUpdateConfig: (newConfig: Partial<ScalperConfig>) => void;
  onManualOrder: (direction: 'BUY' | 'SELL', price: number, lots: number) => void;
  onResetSimulation: () => void;
}

export const OrderControls: React.FC<OrderControlsProps> = ({
  config,
  pair,
  currentPrice,
  onUpdateConfig,
  onManualOrder,
  onResetSimulation,
}) => {
  const decimals = pair === 'USDJPY' ? 3 : 5;

  return (
    <div className="bg-[#101824] border border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-sm text-white">スキャルピング設定＆マニュアル発注</span>
        </div>
        <button
          onClick={onResetSimulation}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
          title="戦績と口座残高を初期化"
        >
          <RotateCcw className="w-3 h-3" />
          <span>シミュレーション初期化</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Strategy Selector */}
        <div>
          <label className="text-[11px] text-slate-400 font-semibold mb-1 block">
            採用ロジック
          </label>
          <select
            value={config.selectedStrategy}
            onChange={(e) => onUpdateConfig({ selectedStrategy: e.target.value as any })}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">全自動ハイブリッド (推奨)</option>
            <option value="BOB_VOLMAN_PULLBACK">Bob Volman 21EMAロールリバーサル</option>
            <option value="BB_BREAKOUT">BBスクイーズ・エクスパンション</option>
            <option value="RSI_MOMENTUM">RSI極限域ダイナミック反発</option>
          </select>
        </div>

        {/* Lot Size */}
        <div>
          <div className="flex justify-between text-[11px] text-slate-400 font-semibold mb-1">
            <span>ロット数 (Lots)</span>
            <span className="text-white font-mono">{config.defaultLots} Lot (10万通貨)</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[0.1, 0.5, 1.0, 2.0].map((l) => (
              <button
                key={`lot_${l}`}
                onClick={() => onUpdateConfig({ defaultLots: l })}
                className={`py-1 text-xs font-mono font-bold rounded transition-all ${
                  config.defaultLots === l
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Take Profit & Stop Loss */}
        <div>
          <div className="flex justify-between text-[11px] text-slate-400 font-semibold mb-1">
            <span>利確 (TP) / 損切 (SL)</span>
            <span className="text-emerald-400 font-mono">
              +{config.takeProfitPips}p / -{config.stopLossPips}p
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded px-2 py-1">
              <span className="text-[10px] text-slate-500">TP:</span>
              <input
                type="number"
                step="0.5"
                min="2"
                max="20"
                value={config.takeProfitPips}
                onChange={(e) => onUpdateConfig({ takeProfitPips: parseFloat(e.target.value) || 6 })}
                className="w-full bg-transparent text-xs font-mono text-emerald-400 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">p</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded px-2 py-1">
              <span className="text-[10px] text-slate-500">SL:</span>
              <input
                type="number"
                step="0.5"
                min="2"
                max="15"
                value={config.stopLossPips}
                onChange={(e) => onUpdateConfig({ stopLossPips: parseFloat(e.target.value) || 4 })}
                className="w-full bg-transparent text-xs font-mono text-rose-400 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">p</span>
            </div>
          </div>
        </div>

        {/* Trailing Stop */}
        <div>
          <div className="flex justify-between text-[11px] text-slate-400 font-semibold mb-1">
            <span>トレーリングストップ</span>
            <span className="text-cyan-400 font-mono">
              {config.useTrailingStop ? `+${config.trailingActivationPips}p発動 → ${config.trailingStopPips}p追従` : 'OFF'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateConfig({ useTrailingStop: !config.useTrailingStop })}
              className={`flex-1 py-1 px-2 text-xs font-bold rounded transition-all ${
                config.useTrailingStop
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400'
              }`}
            >
              {config.useTrailingStop ? '有効化中 (利益確保)' : '無効'}
            </button>
          </div>
        </div>
      </div>

      {/* Manual Quick Execution Buttons */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-3">
        <div className="text-xs text-slate-400 flex items-center gap-1.5 w-full sm:w-auto">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>ワンクリック手動即時スキャルプ発注 (スプレッド0約定):</span>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full sm:flex-1">
          <button
            onClick={() => onManualOrder('BUY', currentPrice, config.defaultLots)}
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md transition-all active:scale-[0.98]"
          >
            <ArrowUp className="w-4 h-4" />
            <span>成行 買い (BUY @ {currentPrice.toFixed(decimals)})</span>
          </button>
          <button
            onClick={() => onManualOrder('SELL', currentPrice, config.defaultLots)}
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md transition-all active:scale-[0.98]"
          >
            <ArrowDown className="w-4 h-4" />
            <span>成行 売り (SELL @ {currentPrice.toFixed(decimals)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
