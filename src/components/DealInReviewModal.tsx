import React from 'react';
import { DealInAnalysis } from '../types/mahjong';
import { CARE_LEVEL_DEFINITIONS } from '../engine/telemetry';
import { AlertTriangle, ShieldCheck, X, Zap } from 'lucide-react';

interface DealInReviewModalProps {
  analyses: DealInAnalysis[];
  onClose: () => void;
}

export const DealInReviewModal: React.FC<DealInReviewModalProps> = ({
  analyses,
  onClose,
}) => {
  if (!analyses || analyses.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <h2 className="text-lg font-bold">放銃テレメトリー &amp; ケアレベル詳細診断</h2>
        </div>

        <div className="space-y-4">
          {analyses.map((analysis, idx) => {
            const def = CARE_LEVEL_DEFINITIONS[analysis.careLevel];

            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3"
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-lg border ${def.badgeColor}`}
                  >
                    {def.title}
                  </span>
                  <span className="font-mono text-sm font-bold text-rose-400">
                    -{analysis.pointsLost.toLocaleString()}点
                  </span>
                </div>

                {/* Unreasonable Push Warning */}
                {analysis.unreasonablePush && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <div>
                      <span className="font-bold block">無謀押しスコア加算 (Unreasonable Push)</span>
                      相手の有効立直に対し、自身が【{analysis.dealInShanten}向聴】の愚形で危険牌を勝負した不用意な押し引きと判定されました。
                    </div>
                  </div>
                )}

                {/* Open Riichi Yakuman Penalty */}
                {analysis.isOpenRiichiYakumanPenalty && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-950/60 border border-purple-800 text-purple-300 text-xs">
                    <Zap className="w-4 h-4 shrink-0 text-purple-400 mt-0.5" />
                    <div>
                      <span className="font-bold block">オープン立直 役満払いペナルティ適用</span>
                      オープン立直者に対して自身が非立直の状態で放銃したため、ハウスルールに基づき役満払い（満額責任払い）が執行されました。
                    </div>
                  </div>
                )}

                {/* Analysis Notes */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {analysis.careDetails}
                </p>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">放銃時向聴数</span>
                    <span className="font-bold text-white">
                      {analysis.dealInShanten === 0 ? 'テンパイ' : `${analysis.dealInShanten}向聴`}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">相手待ち形</span>
                    <span className="font-bold text-white">{analysis.targetWaitShape}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">相手打点</span>
                    <span className="font-bold text-white">
                      {analysis.winningHandHan}翻 {analysis.winningHandFu}符
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            確認して閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
