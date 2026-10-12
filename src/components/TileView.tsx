import React from 'react';
import { Tile } from '../types/mahjong';
import { getTileDisplayName } from '../engine/tiles';

interface TileViewProps {
  tile: Tile;
  size?: 'sm' | 'md' | 'lg' | 'hand';
  isSelected?: boolean;
  isHoverable?: boolean;
  isDora?: boolean;
  isHorizontal?: boolean;
  isCovered?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
}

export const TileView: React.FC<TileViewProps> = ({
  tile,
  size = 'md',
  isSelected = false,
  isHoverable = false,
  isDora = false,
  isHorizontal = false,
  isCovered = false,
  isHighlighted = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className = '',
}) => {
  // Tile dimensions
  const sizeClasses = {
    sm: isHorizontal ? 'w-6 h-5 text-[10px]' : 'w-5 h-7 text-[10px]',
    md: isHorizontal ? 'w-8 h-6 text-xs' : 'w-6 h-9 text-xs',
    lg: isHorizontal ? 'w-10 h-7 text-sm' : 'w-7 h-11 text-sm',
    hand: isHorizontal ? 'w-12 h-9 text-base' : 'w-9 h-13 text-base',
  }[size];

  if (isCovered) {
    return (
      <div
        className={`relative rounded bg-linear-to-b from-amber-600 to-amber-800 border border-amber-900 shadow-md ${sizeClasses} ${className}`}
      >
        <div className="absolute inset-1 rounded-xs bg-amber-700/60 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400/40"></div>
        </div>
      </div>
    );
  }

  // Visual glyph rendering based on suit and value
  const renderTileGlyph = () => {
    const { suit, value, isRed } = tile;

    if (suit === 'm') {
      const kanjiNums = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
      return (
        <div className="flex flex-col items-center justify-center leading-none">
          <span className={`font-serif font-bold ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
            {kanjiNums[value]}
          </span>
          <span className="text-[9px] font-serif text-rose-700 font-bold -mt-0.5">萬</span>
        </div>
      );
    }

    if (suit === 'p') {
      return (
        <div className="flex flex-col items-center justify-center">
          <span className={`font-mono font-black ${isRed ? 'text-rose-600' : 'text-sky-700'}`}>
            {value}
          </span>
          <span className="text-[8px] font-sans text-sky-800 font-bold -mt-0.5">●</span>
        </div>
      );
    }

    if (suit === 's') {
      return (
        <div className="flex flex-col items-center justify-center">
          <span className={`font-mono font-black ${isRed ? 'text-rose-600' : 'text-emerald-700'}`}>
            {value}
          </span>
          <span className="text-[8px] font-sans text-emerald-800 font-bold -mt-0.5">索</span>
        </div>
      );
    }

    if (suit === 'z') {
      const honorMap: Record<number, { text: string; color: string }> = {
        1: { text: '東', color: 'text-slate-900' },
        2: { text: '南', color: 'text-slate-900' },
        3: { text: '西', color: 'text-slate-900' },
        4: { text: '北', color: 'text-slate-900' },
        5: { text: '白', color: 'text-slate-400' },
        6: { text: '發', color: 'text-emerald-700 font-black' },
        7: { text: '中', color: 'text-rose-700 font-black' },
      };
      const info = honorMap[value] || { text: '?', color: 'text-slate-800' };

      if (value === 5) {
        // Haku is a clean empty white block with border frame
        return (
          <div className="w-3.5 h-4.5 rounded-xs border-2 border-slate-400/80 bg-white/50 flex items-center justify-center"></div>
        );
      }

      return (
        <span className={`font-serif font-black ${info.color}`}>
          {info.text}
        </span>
      );
    }

    return <span>{getTileDisplayName(tile)}</span>;
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`
        relative select-none shrink-0 flex items-center justify-center
        rounded-xs font-semibold
        bg-linear-to-b from-[#fffff7] via-[#f7f5e8] to-[#eae5d0]
        border border-[#b8b39e]
        shadow-sm
        transition-all duration-150
        ${sizeClasses}
        ${isSelected ? '-translate-y-3 ring-2 ring-amber-400 ring-offset-1 shadow-lg' : ''}
        ${isHighlighted ? 'ring-2 ring-emerald-400 ring-offset-1 bg-emerald-50 shadow-md scale-105 z-10' : ''}
        ${isHoverable ? 'hover:-translate-y-1.5 hover:shadow-md cursor-pointer' : ''}
        ${isDora ? 'border-amber-400 bg-amber-50/90' : ''}
        ${className}
      `}
    >
      {/* 3D Tile Side Depth */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-[#d5cfb8] rounded-b-xs pointer-events-none"></div>

      {/* Red Five Aka-Dora indicator indicator dot */}
      {tile.isRed && (
        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-xs"></div>
      )}

      {/* Dora highlight shimmer */}
      {isDora && (
        <div className="absolute top-0 left-0 w-1.5 h-1.5 rounded-full bg-amber-400"></div>
      )}

      <div className="pb-1">{renderTileGlyph()}</div>
    </div>
  );
};
