import React from 'react';
import { BookOpen, GraduationCap, ArrowLeftRight, Layers, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';

export type TabType = 'research' | 'quiz' | 'aws_cross' | 'architecture';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'quiz' as TabType, label: '🎓 資格試験対策・模擬テスト', icon: GraduationCap, desc: '認定技術者試験対策・分野別演習＆模擬試験' },
    { id: 'research' as TabType, label: '📋 公式調査レポート', icon: BookOpen, desc: '公式マニュアル・仕様・制限事項の深掘り' },
    { id: 'aws_cross' as TabType, label: '🔄 AWS ↔ さくら比較・変換', icon: ArrowLeftRight, desc: 'サービス対応表・アーキテクチャ相互補完' },
    { id: 'architecture' as TabType, label: '📐 構築例・構成図ギャラリー', icon: Layers, desc: '標準高可用性・ハイブリッド構成図' },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-lg shadow-rose-950/50">
              <span className="text-white font-black text-lg">🌸</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                  さくらクラウド 資格試験・調査サポートエージェント
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/70 text-rose-300 border border-rose-800/50">
                  <ShieldCheck className="w-3 h-3 text-rose-400" />
                  認定技術者試験シラバス準拠
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden md:block">
                さくらのクラウド資格試験対策 ✕ AWS技術者向け相互補完 ✕ 公式仕様調査
              </p>
            </div>
          </div>

          {/* Quick links & badge */}
          <div className="flex items-center gap-3">
            <a
              href="https://cloud.sakura.ad.jp/specification/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition py-1 px-2 rounded-md hover:bg-slate-800"
            >
              <span>公式仕様一覧</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="font-mono text-[11px] text-slate-400">Gemini 3.8 Flash</span>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex space-x-1 sm:space-x-2 border-t border-slate-900 py-2 overflow-x-auto scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
