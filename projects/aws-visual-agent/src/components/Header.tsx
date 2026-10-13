import React from 'react';
import { Layers, Sparkles, ShieldAlert, Cpu, ExternalLink } from 'lucide-react';

export type AwsTabType = 'consult' | 'models' | 'pitfalls';

interface Props {
  activeTab: AwsTabType;
  onTabChange: (tab: AwsTabType) => void;
}

export const Header: React.FC<Props> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'consult' as AwsTabType, label: '💡 AI技術相談 & 動的構成図生成', desc: '質問から構成図と通信フローを自動作成' },
    { id: 'models' as AwsTabType, label: '📐 8大基盤メンタルモデル図解', desc: 'Step Functions/EventBridge/S3/OAC/OpenSearch/FSx' },
    { id: 'pitfalls' as AwsTabType, label: '⚠️ 基盤の落とし穴・トラブル診断', desc: 'VPC Lambda外部不通やCloudFront 403等の原因解決' },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/85 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-950/50">
              <span className="text-slate-950 font-black text-lg">☁️</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                  AWS 実装イメージ・アーキテクチャ視覚支援エージェント
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/70 text-amber-300 border border-amber-800/50">
                  <Cpu className="w-3 h-3 text-amber-400" />
                  アプリ開発者向け基盤メンタルモデル
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden md:block">
                Step Functions ✕ Lambda ✕ EventBridge ✕ S3 ✕ CloudFront ✕ OpenSearch ✕ FSx ONTAP ✕ SQS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="font-mono text-[11px] text-slate-400">Gemini 3.8 Flash</span>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex space-x-1 sm:space-x-2 border-t border-slate-900 py-2 overflow-x-auto scrollbar-none">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
