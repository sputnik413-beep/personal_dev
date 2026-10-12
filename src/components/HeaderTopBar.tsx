import React from 'react';

export type ActiveTab = 'IMPORTER' | 'ANALYTICS' | 'AGENTS' | 'REPLAY' | 'SIMULATOR';

interface HeaderTopBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onStartNewGame: () => void;
}

export const HeaderTopBar: React.FC<HeaderTopBarProps> = ({
  activeTab,
  onTabChange,
  onStartNewGame,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
        Tenhou &amp; Majsoul Analytics
      </span>

      {/* Zone 2: 4-5 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => onTabChange('IMPORTER')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'IMPORTER' ? 'text-emerald-400 font-semibold' : ''
          }`}
        >
          牌譜インポーター
        </button>
        <button
          onClick={() => onTabChange('ANALYTICS')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'ANALYTICS' ? 'text-emerald-400 font-semibold' : ''
          }`}
        >
          戦績・セット分析
        </button>
        <button
          onClick={() => onTabChange('AGENTS')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'AGENTS' ? 'text-emerald-400 font-semibold' : ''
          }`}
        >
          カスタムエージェント
        </button>
        <button
          onClick={() => onTabChange('REPLAY')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'REPLAY' ? 'text-emerald-400 font-semibold' : ''
          }`}
        >
          牌譜リプレイ
        </button>
        <button
          onClick={() => onTabChange('SIMULATOR')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'SIMULATOR' ? 'text-emerald-400 font-semibold' : ''
          }`}
        >
          仮想メンバー卓
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onTabChange('IMPORTER')}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-md shadow-emerald-950 cursor-pointer"
        >
          牌譜URLインポート
        </button>
      </div>
    </header>
  );
};
