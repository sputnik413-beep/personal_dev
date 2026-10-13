import React, { useState } from 'react';
import { MentalModelTopic } from '../types';
import { AWS_MENTAL_MODELS } from '../data/awsKnowledge';
import { VisualDiagram } from './VisualDiagram';
import {
  Layers,
  HelpCircle,
  AlertTriangle,
  Code,
  Check,
  Copy,
  ChevronRight,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

export const MentalModelsGallery: React.FC = () => {
  const [activeModelId, setActiveModelId] = useState<string>(AWS_MENTAL_MODELS[0].id);
  const [copiedCode, setCopiedCode] = useState(false);

  const activeModel = AWS_MENTAL_MODELS.find((m: MentalModelTopic) => m.id === activeModelId) || AWS_MENTAL_MODELS[0];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-amber-950/30 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1 rounded bg-amber-500/20 text-amber-400">
            <Layers className="w-4 h-4" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            アプリ開発者が最初に掴むべきAWS基盤メンタルモデル
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
          アーキテクチャ図解 ＆ パケットフロー・ギャラリー
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
          「なぜこの構成なのか」「どうパケットやイベントが流れるのか」を視覚的に理解できる標準パターン集。各構成をクリックしてトポロジーと通信ステップを確認できます。
        </p>

        {/* Model Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2">
          {AWS_MENTAL_MODELS.map((m: any) => {
            const isSelected = m.id === activeModelId;
            return (
              <button
                key={m.id}
                onClick={() => setActiveModelId(m.id)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500/50'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <div>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border inline-block mb-1.5 ${
                    isSelected ? 'bg-amber-900/60 border-amber-600 text-amber-300' : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}>
                    {m.service}
                  </span>
                  <span className="text-xs sm:text-sm font-bold block text-slate-100 leading-tight">
                    {m.tag}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Model Detail View */}
      <div className="space-y-6">
        {/* Core Question & Summary */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                {activeModel.service}
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-100 mt-0.5">{activeModel.title}</h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-700/60 shrink-0">
              {activeModel.tag}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
              <HelpCircle className="w-4 h-4" />
              <span>アプリ開発者の疑問: 「{activeModel.coreQuestion}」</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {activeModel.summary}
            </p>
          </div>
        </div>

        {/* Interactive Diagram Canvas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>{activeModel.diagram.title}</span>
            </h4>
            <span className="text-xs text-slate-400">ステップボタンでパケットの流れを追跡</span>
          </div>
          <VisualDiagram diagram={activeModel.diagram} height={390} interactive={true} />
        </div>

        {/* Why this way & Common Pitfall */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Why This Way */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <h5 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>なぜこの設計が必要なのか（メリットと理由）</span>
            </h5>
            <ul className="space-y-2.5 text-xs text-slate-300">
              {activeModel.whyThisWay.map((reason: string, rIdx: number) => (
                <li key={rIdx} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Common Pitfall */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <h5 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>アプリ開発者が最もハマりやすい落とし穴</span>
            </h5>
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 text-xs text-rose-200 leading-relaxed space-y-2">
              <p>{activeModel.commonPitfall}</p>
            </div>
            {activeModel.solutionCode && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>設定・実装コード例 ({activeModel.solutionCode.tool}):</span>
                  <button
                    onClick={() => handleCopyCode(activeModel.solutionCode!.code)}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'コピー完了' : 'コピー'}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                  <code>{activeModel.solutionCode.code}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
