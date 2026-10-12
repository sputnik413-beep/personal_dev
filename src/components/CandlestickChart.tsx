import React, { useState, useMemo, useRef } from 'react';
import { Candle, CurrencyPair, IndicatorValues, Position, TradeLog } from '../types/scalper';
import { calculateEMA, calculateBollingerBands } from '../engine/technicalIndicators';

interface CandlestickChartProps {
  candles: Candle[];
  pair: CurrencyPair;
  indicators: IndicatorValues;
  openPositions: Position[];
  tradeLogs: TradeLog[];
  currentPrice: number;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  pair,
  indicators,
  openPositions,
  tradeLogs,
  currentPrice,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const pip = pair === 'USDJPY' ? 0.01 : 0.0001;
  const decimals = pair === 'USDJPY' ? 3 : 5;

  // Chart dimensions & calculations
  const chartHeight = 360;
  const padding = { top: 20, right: 75, bottom: 30, left: 10 };

  // Calculate EMA lines across all visible candles
  const closePrices = useMemo(() => candles.map((c) => c.close), [candles]);
  const ema21Series = useMemo(() => calculateEMA(closePrices, 21), [closePrices]);
  const ema50Series = useMemo(() => calculateEMA(closePrices, 50), [closePrices]);
  const bbSeries = useMemo(() => calculateBollingerBands(closePrices, 20, 2), [closePrices]);

  // Compute price bounds
  const { minPrice, maxPrice } = useMemo(() => {
    if (candles.length === 0) return { minPrice: 150, maxPrice: 155 };
    let min = Infinity;
    let max = -Infinity;

    for (const c of candles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    }

    // Include open position TP/SL in scale
    for (const pos of openPositions) {
      if (pos.stopLoss < min) min = pos.stopLoss;
      if (pos.stopLoss > max) max = pos.stopLoss;
      if (pos.takeProfit < min) min = pos.takeProfit;
      if (pos.takeProfit > max) max = pos.takeProfit;
    }

    // Add 10% breathing room
    const range = max - min || 1;
    return {
      minPrice: min - range * 0.08,
      maxPrice: max + range * 0.08,
    };
  }, [candles, openPositions]);

  const priceRange = maxPrice - minPrice || 1;

  // Conversion helpers
  const getY = (price: number) => {
    const usableHeight = chartHeight - padding.top - padding.bottom;
    const ratio = (price - minPrice) / priceRange;
    return chartHeight - padding.bottom - ratio * usableHeight;
  };

  const candleCount = candles.length;
  const candleSlotWidth = 100 / Math.max(1, candleCount); // percentage

  // Grid lines
  const gridSteps = 5;
  const gridPrices = useMemo(() => {
    const list: number[] = [];
    const step = priceRange / gridSteps;
    for (let i = 0; i <= gridSteps; i++) {
      list.push(minPrice + i * step);
    }
    return list;
  }, [minPrice, priceRange]);

  const activeCandle = hoveredIndex !== null && candles[hoveredIndex] ? candles[hoveredIndex] : candles[candles.length - 1];

  return (
    <div className="bg-[#101824] border border-slate-800 rounded-xl p-4 shadow-sm relative flex flex-col">
      {/* Chart Top Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-sm text-white tracking-wide">{pair}</span>
          {activeCandle && (
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
              <span>
                O: <b className="text-white">{activeCandle.open.toFixed(decimals)}</b>
              </span>
              <span>
                H: <b className="text-emerald-400">{activeCandle.high.toFixed(decimals)}</b>
              </span>
              <span>
                L: <b className="text-rose-400">{activeCandle.low.toFixed(decimals)}</b>
              </span>
              <span>
                C: <b className={activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-rose-400'}>
                  {activeCandle.close.toFixed(decimals)}
                </b>
              </span>
              <span className="text-slate-500">
                Vol: {activeCandle.volume}
              </span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-cyan-400 rounded-full" />
            <span className="text-slate-300">EMA 21 (ロールリバーサル)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-amber-400 rounded-full" />
            <span className="text-slate-300">EMA 50 (トレンド)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-purple-400/80 rounded-full" />
            <span className="text-slate-300">BB (20, 2σ)</span>
          </div>
        </div>
      </div>

      {/* Main SVG Chart Container */}
      <div
        ref={containerRef}
        className="w-full relative select-none mt-2"
        style={{ height: `${chartHeight}px` }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <svg className="w-full h-full overflow-visible" viewBox={`0 0 1000 ${chartHeight}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="bullCandleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="bearCandleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
            <linearGradient id="bbFillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Horizontal Price Grid */}
          {gridPrices.map((p, idx) => {
            const y = getY(p);
            return (
              <g key={`grid_${idx}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={1000 - padding.right}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={1000 - padding.right + 6}
                  y={y + 3}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {p.toFixed(decimals)}
                </text>
              </g>
            );
          })}

          {/* Bollinger Bands Shaded Cloud & Upper/Lower Lines */}
          {bbSeries.upper.length > 1 && (
            <>
              {/* BB Fill */}
              <path
                d={
                  candles
                    .map((_, i) => {
                      const x = padding.left + (i + 0.5) * ((1000 - padding.left - padding.right) / candleCount);
                      const y = getY(bbSeries.upper[i]);
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ') +
                  ' ' +
                  candles
                    .slice()
                    .reverse()
                    .map((_, revIdx) => {
                      const i = candleCount - 1 - revIdx;
                      const x = padding.left + (i + 0.5) * ((1000 - padding.left - padding.right) / candleCount);
                      const y = getY(bbSeries.lower[i]);
                      return `L ${x} ${y}`;
                    })
                    .join(' ') +
                  ' Z'
                }
                fill="url(#bbFillGrad)"
              />

              {/* Upper Line */}
              <path
                d={candles
                  .map((_, i) => {
                    const x = padding.left + (i + 0.5) * ((1000 - padding.left - padding.right) / candleCount);
                    const y = getY(bbSeries.upper[i]);
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#c084fc"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="2 2"
              />

              {/* Lower Line */}
              <path
                d={candles
                  .map((_, i) => {
                    const x = padding.left + (i + 0.5) * ((1000 - padding.left - padding.right) / candleCount);
                    const y = getY(bbSeries.lower[i]);
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#c084fc"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="2 2"
              />
            </>
          )}

          {/* EMA 50 Line (Orange) */}
          {ema50Series.length > 1 && (
            <path
              d={candles
                .map((_, i) => {
                  const x = padding.left + (i + 0.5) * ((1000 - padding.left - padding.right) / candleCount);
                  const y = getY(ema50Series[i]);
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeOpacity="0.85"
            />
          )}

          {/* EMA 21 Line (Cyan - Bob Volman anchor line) */}
          {ema21Series.length > 1 && (
            <path
              d={candles
                .map((_, i) => {
                  const x = padding.left + (i + 0.5) * ((1000 - padding.left - padding.right) / candleCount);
                  const y = getY(ema21Series[i]);
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
            />
          )}

          {/* Candlesticks */}
          {candles.map((candle, i) => {
            const chartAreaWidth = 1000 - padding.left - padding.right;
            const candleWidth = Math.max(3, (chartAreaWidth / candleCount) * 0.7);
            const xCenter = padding.left + (i + 0.5) * (chartAreaWidth / candleCount);
            const xLeft = xCenter - candleWidth / 2;

            const isBull = candle.close >= candle.open;
            const openY = getY(candle.open);
            const closeY = getY(candle.close);
            const highY = getY(candle.high);
            const lowY = getY(candle.low);

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

            return (
              <g
                key={`candle_${candle.time}_${i}`}
                className="cursor-pointer transition-opacity"
                opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.65}
                onMouseEnter={() => setHoveredIndex(i)}
              >
                {/* Wick */}
                <line
                  x1={xCenter}
                  y1={highY}
                  x2={xCenter}
                  y2={lowY}
                  stroke={isBull ? '#10b981' : '#f43f5e'}
                  strokeWidth="1.2"
                />

                {/* Candle Body */}
                <rect
                  x={xLeft}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  rx="1"
                  fill={isBull ? 'url(#bullCandleGrad)' : 'url(#bearCandleGrad)'}
                  stroke={isBull ? '#059669' : '#e11d48'}
                  strokeWidth="0.5"
                />
              </g>
            );
          })}

          {/* Open Position Overlay: Entry Line, TP and SL Lines */}
          {openPositions.map((pos) => {
            const entryY = getY(pos.entryPrice);
            const tpY = getY(pos.takeProfit);
            const slY = getY(pos.stopLoss);
            const chartAreaWidth = 1000 - padding.left - padding.right;

            return (
              <g key={`overlay_${pos.id}`}>
                {/* Entry Price Line */}
                <line
                  x1={padding.left}
                  y1={entryY}
                  x2={1000 - padding.right}
                  y2={entryY}
                  stroke={pos.direction === 'BUY' ? '#38bdf8' : '#fb7185'}
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                <rect
                  x={1000 - padding.right + 2}
                  y={entryY - 8}
                  width={68}
                  height={16}
                  rx="3"
                  fill={pos.direction === 'BUY' ? '#0369a1' : '#be123c'}
                />
                <text
                  x={1000 - padding.right + 6}
                  y={entryY + 4}
                  fill="#ffffff"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {pos.direction} {pos.entryPrice.toFixed(decimals)}
                </text>

                {/* Take Profit Line (Green Dotted) */}
                <line
                  x1={padding.left}
                  y1={tpY}
                  x2={1000 - padding.right}
                  y2={tpY}
                  stroke="#10b981"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <rect
                  x={1000 - padding.right + 2}
                  y={tpY - 7}
                  width={68}
                  height={14}
                  rx="2"
                  fill="#065f46"
                />
                <text
                  x={1000 - padding.right + 6}
                  y={tpY + 4}
                  fill="#34d399"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  TP {pos.takeProfit.toFixed(decimals)}
                </text>

                {/* Stop Loss Line (Red Dotted) */}
                <line
                  x1={padding.left}
                  y1={slY}
                  x2={1000 - padding.right}
                  y2={slY}
                  stroke="#ef4444"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <rect
                  x={1000 - padding.right + 2}
                  y={slY - 7}
                  width={68}
                  height={14}
                  rx="2"
                  fill="#991b1b"
                />
                <text
                  x={1000 - padding.right + 6}
                  y={slY + 4}
                  fill="#fca5a5"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  SL {pos.stopLoss.toFixed(decimals)}
                </text>
              </g>
            );
          })}

          {/* Current Live Price Horizontal Marker */}
          {currentPrice && (
            <g>
              <line
                x1={padding.left}
                y1={getY(currentPrice)}
                x2={1000 - padding.right}
                y2={getY(currentPrice)}
                stroke="#38bdf8"
                strokeWidth="1.2"
              />
              <rect
                x={1000 - padding.right}
                y={getY(currentPrice) - 10}
                width={74}
                height={20}
                rx="3"
                fill="#0284c7"
              />
              <text
                x={1000 - padding.right + 5}
                y={getY(currentPrice) + 4}
                fill="#ffffff"
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {currentPrice.toFixed(decimals)}
              </text>
            </g>
          )}

          {/* Crosshair when hovering */}
          {hoveredIndex !== null && (
            <g>
              <line
                x1={padding.left + (hoveredIndex + 0.5) * ((1000 - padding.left - padding.right) / candleCount)}
                y1={padding.top}
                x2={padding.left + (hoveredIndex + 0.5) * ((1000 - padding.left - padding.right) / candleCount)}
                y2={chartHeight - padding.bottom}
                stroke="#94a3b8"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Time axis labels */}
      <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1 px-2 border-t border-slate-800/60 pt-1">
        <span>{candles[0] ? new Date(candles[0].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
        <span>{candles[Math.floor(candles.length / 2)] ? new Date(candles[Math.floor(candles.length / 2)].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
        <span>{candles[candles.length - 1] ? new Date(candles[candles.length - 1].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
      </div>
    </div>
  );
};
