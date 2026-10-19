import React, { useState } from 'react';
import {
  Brain,
  TrendingUp,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  Activity,
  Layers,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  FileCode,
} from 'lucide-react';
import { ForwardTestState, StrategyDiagnosis, ScalperConfig } from '../types/scalper';
import { DualLayerSlEvaluationModal } from './DualLayerSlEvaluationModal';
import { Mt5ExportModal } from './Mt5ExportModal';

interface StrategyPdcaPanelProps {
  state: ForwardTestState;
  onRefreshDiagnosis: () => Promise<void>;
  onApplyTuning: (adjustments: StrategyDiagnosis['suggestedParameterAdjustments']) => Promise<void>;
  onTriggerRelayWorkflow: () => Promise<void>;
  onPullLatestCloudState: () => Promise<void>;
  onUpdateConfig?: (adjustments: Partial<ScalperConfig>) => Promise<void>;
  isAnalyzing: boolean;
  isApplying: boolean;
  isTriggeringRelay: boolean;
  isPullingCloud: boolean;
}

export const StrategyPdcaPanel: React.FC<StrategyPdcaPanelProps> = ({
  state,
  onRefreshDiagnosis,
  onApplyTuning,
  onTriggerRelayWorkflow,
  onPullLatestCloudState,
  onUpdateConfig,
  isAnalyzing,
  isApplying,
  isTriggeringRelay,
  isPullingCloud,
}) => {
  const [isDualLayerModalOpen, setIsDualLayerModalOpen] = useState<boolean>(false);
  const [isMt5ModalOpen, setIsMt5ModalOpen] = useState<boolean>(false);
  const latestDiagnosis = state.aiDiagnosisHistory?.[0];
  const { metrics, config, tradeLogs } = state;
  const isVolmanCompliant = config.stopLossPips >= 9.0 && config.takeProfitPips >= 15.0;

  return (
    <div className="bg-[#101722] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                AI戦略自己分析・改修PDCAサイクル
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-700/50">
                Bob Volman Price Action & Gemini
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              直近トレードの勝敗パターンを自己診断し、ボブ・ボルマン流のトレンドブレイクアウト原則へ自律改善
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onPullLatestCloudState}
            disabled={isPullingCloud}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            title="GitHub Actionsで稼働中の最新トレード戦績を取り込む"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPullingCloud ? 'animate-spin' : ''}`} />
            <span>{isPullingCloud ? 'クラウド同期中...' : 'クラウド最新戦績を同期'}</span>
          </button>

          <button
            onClick={onTriggerRelayWorkflow}
            disabled={isTriggeringRelay}
            className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            title="GitHub Actionsの数珠つなぎループを起動"
          >
            <Play className={`w-3.5 h-3.5 ${isTriggeringRelay ? 'animate-spin' : ''}`} />
            <span>24hループ再点火</span>
          </button>

          <button
            onClick={() => setIsDualLayerModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
            title="二重ストップロス構造（ヒゲ狩り耐性）とXMゼロ口座取引手数料の精密シミュレーション"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>二重SL & ブローカー検証</span>
          </button>

          <button
            onClick={() => setIsMt5ModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
            title="OANDA東京 / 国内低スプレッドMT5で動かすMQL5 EAコードを生成"
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>MT5 EA (.mq5) 生成</span>
          </button>

          <button
            onClick={onRefreshDiagnosis}
            disabled={isAnalyzing}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-purple-950/50 disabled:opacity-50"
          >
            <Brain className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'AI自己診断中...' : 'AI自己診断を実行'}</span>
          </button>
        </div>
      </div>

      {/* 24/7 Relay & Cloud Sync Live Status Ribbon */}
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-emerald-950/40 border border-blue-900/50 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300 flex-wrap">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-emerald-300">GitHub Actions 24時間自律稼働中:</span>
          <span className="text-slate-300">
            PC停止中もクラウド上で連続実行中（総取引: <strong className="text-emerald-400">{tradeLogs.length}件</strong> / 残高: <strong className="text-slate-100">¥{state.account.balance.toLocaleString()}</strong>）
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-amber-300 border border-slate-700">
            保有中: {state.openPositions.length} / 上限 {config.maxOpenTrades}枠 (安全管理)
          </span>
        </div>
        <a
          href="https://github.com/sputnik413-beep/personal_dev/actions"
          target="_blank"
          rel="noreferrer"
          className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium underline-offset-2 hover:underline text-[11px] shrink-0"
        >
          <span>Actions稼働ログ</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Dual-Layer SL & XM Zero Cost Spotlight Banner */}
      <div className="bg-gradient-to-r from-cyan-950/30 via-[#101724] to-blue-950/30 border border-cyan-800/40 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-xs">二重ストップロス構造（Dual-Layer SL）× XMゼロ口座 取引コスト検証</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-semibold border border-cyan-700/50">
                ヒゲ狩り耐性＆手数料完全控除
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              XMゼロ口座往復$5手数料（-0.79p）控除後の実質純利益と、ヒゲ狩り回避シミュレーションをワンクリックで分析
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsDualLayerModalOpen(true)}
          className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-lg shadow-cyan-950/50 shrink-0"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>詳細シミュレーターを開く</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0b1016] border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">勝率 (Win Rate)</div>
          <div className="text-xl font-bold mt-1 text-slate-100 flex items-baseline gap-1">
            {metrics.winRate.toFixed(1)}
            <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {metrics.wins}勝 / {metrics.losses}敗 (計{metrics.totalTrades}回)
          </div>
        </div>

        <div className="bg-[#0b1016] border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">累積損益 (Net Pips)</div>
          <div
            className={`text-xl font-bold mt-1 flex items-baseline gap-1 ${
              metrics.netPips >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {metrics.netPips > 0 ? `+${metrics.netPips.toFixed(1)}` : metrics.netPips.toFixed(1)}
            <span className="text-xs text-slate-400">pips</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            損益額: {metrics.netProfit.toLocaleString()} JPY
          </div>
        </div>

        <div className="bg-[#0b1016] border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">トレンド規律スコア</div>
          <div className="text-xl font-bold mt-1 text-purple-300 flex items-baseline gap-1">
            {latestDiagnosis?.trendDisciplineScore ?? 85}
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">20EMA傾き・順張り遵守率</div>
        </div>

        <div className="bg-[#0b1016] border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">設定適合度</div>
          <div className="mt-1 flex items-center gap-1.5">
            {isVolmanCompliant ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-600/50 text-emerald-300 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> ボルマン基準
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-amber-950 border border-amber-600/50 text-amber-300 text-xs font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> ロスカット狭小
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            SL: {config.stopLossPips}p / TP: {config.takeProfitPips}p
          </div>
        </div>
      </div>

      {/* AI Diagnostic Output */}
      {latestDiagnosis ? (
        <div className="bg-[#0b1016] border border-slate-800 rounded-xl p-4 space-y-4">
          <div>
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-purple-400" />
              <span>AI自己診断サマリー（Gemini 3.8 Flashによる敗因分析）</span>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-purple-950/20 border border-purple-800/30 rounded-lg p-3">
              {latestDiagnosis.executiveSummary}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Loss forensics */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-rose-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>過去の連敗要因・ノイズ巻き込まれ分析:</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-400">
                {latestDiagnosis.lossPatternForensics.map((forensic, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 bg-rose-950/10 border border-rose-900/30 rounded-lg p-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{forensic}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Strengths & Edge */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>維持すべきエッジ＆優位性:</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-400">
                {latestDiagnosis.strengthsIdentified.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 bg-emerald-950/10 border border-emerald-900/30 rounded-lg p-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommended Tuning Action */}
          <div className="border-t border-slate-800 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>AI推奨パラメータ改修案（ボブ・ボルマン10pip損切り / 18-20pip利確）</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                <span>
                  ロスカット: <strong className="text-amber-300">{latestDiagnosis.suggestedParameterAdjustments.stopLossPips} pips</strong>
                </span>
                <span>
                  利確目標: <strong className="text-emerald-300">{latestDiagnosis.suggestedParameterAdjustments.takeProfitPips} pips</strong>
                </span>
                <span>
                  AI最低確信度: <strong className="text-purple-300">{latestDiagnosis.suggestedParameterAdjustments.minAiConfidence}%</strong>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {latestDiagnosis.suggestedParameterAdjustments.reason}
              </p>
            </div>

            <button
              onClick={() => onApplyTuning(latestDiagnosis.suggestedParameterAdjustments)}
              disabled={isApplying || latestDiagnosis.applied}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
                latestDiagnosis.applied
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{latestDiagnosis.applied ? '改修適用済み' : '推奨パラメータを反映'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#0b1016] border border-slate-800/80 rounded-xl p-4 text-center space-y-2">
          <p className="text-xs text-slate-400">
            まだAI自己診断が実行されていません。「AI自己診断を実行」をクリックすると、直近のトレード履歴（4連敗のパターン等）をGemini
            3.8 Flashが精査し、改善パラメータを導出します。
          </p>
          <button
            onClick={onRefreshDiagnosis}
            disabled={isAnalyzing}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-lg shadow-purple-950/50"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>今すぐAI自己診断を実行</span>
          </button>
        </div>
      )}

      {/* Dual-Layer Stop-Loss & XM Zero Interactive Simulator Modal */}
      <DualLayerSlEvaluationModal
        isOpen={isDualLayerModalOpen}
        onClose={() => setIsDualLayerModalOpen(false)}
        tradeLogs={tradeLogs}
        config={config}
        onUpdateConfig={onUpdateConfig}
      />

      {/* MetaTrader 5 (MT5) EA Generator Modal */}
      <Mt5ExportModal
        isOpen={isMt5ModalOpen}
        onClose={() => setIsMt5ModalOpen(false)}
        config={config}
      />
    </div>
  );
};
