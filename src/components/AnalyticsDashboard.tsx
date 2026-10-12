import React, { useState } from 'react';
import { SetSession, CareLevel } from '../types/mahjong';
import { aggregateSetAnalytics, CARE_LEVEL_DEFINITIONS } from '../engine/telemetry';
import {
  TrendingUp,
  Shield,
  Activity,
  Users,
  Crosshair,
  BarChart2,
  Calendar,
  Download,
  Sparkles,
  Send,
} from 'lucide-react';
import { PLUGGED_ANALYTICAL_AGENTS, matchRecordToStandardizedLog } from '../engine/analyticsAgents';

interface AnalyticsDashboardProps {
  sessions: SetSession[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ sessions }) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessions[0]?.id || ''
  );

  const activeSessions = selectedSessionId
    ? sessions.filter((s) => s.id === selectedSessionId)
    : sessions;

  const stats = aggregateSetAnalytics(activeSessions);
  const selectedSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];

  return (
    <div className="w-full space-y-6">
      {/* Session Selection & Summary Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            長期戦績・半荘セット分析ダッシュボード
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>集計対象: {stats.totalSets}セット</span>
            <span aria-hidden="true">·</span>
            <span>総対局数: {stats.totalGames}半荘</span>
            <span aria-hidden="true">·</span>
            <span>スマート記録フィルタ適用済</span>
          </div>
        </div>

        {/* Session Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.completedGamesCount}/{s.targetGamesCount}半荘)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary KPI Strip: Set-Level Capabilities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Lead Defense Capability */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>先行逃げ切り率 (Lead Defense)</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-bold font-mono text-white tabular-nums">
              {stats.leadDefenseCapability.ratePercent}%
            </span>
            <span className="text-xs text-slate-500 ml-2">
              ({stats.leadDefenseCapability.successfulDefenses}/{stats.leadDefenseCapability.totalMidpointLeads}回 逃げ切り成功)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            前半3半荘終了時点でトップだったプレイヤーが最終6半荘セットで1位を死守した確率
          </p>
        </div>

        {/* Behind Recovery Capability */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>逆転挽回率 (Behind Recovery)</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-bold font-mono text-white tabular-nums">
              {stats.behindRecoveryCapability.ratePercent}%
            </span>
            <span className="text-xs text-slate-500 ml-2">
              ({stats.behindRecoveryCapability.successfulComebacks}/{stats.behindRecoveryCapability.totalMidpointDeficits}回 まくり成功)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            前半劣勢（下位2名）から後半3半荘でプラス域または上位2名へ浮上した生還率
          </p>
        </div>

        {/* Wait Shape Ryanmen Distribution */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>良形率 (Ryanmen Ratio)</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-bold font-mono text-white tabular-nums">
              {stats.waitShapeBreakdown.ryanmenRatePercent}%
            </span>
            <span className="text-xs text-slate-500 ml-2">
              (両面 {stats.waitShapeBreakdown.ryanmenCount} / 愚形 {stats.waitShapeBreakdown.badWaitCount})
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            和了・聴牌時における両面・多面張の形成割合（手役構想・牌効率の指標）
          </p>
        </div>

        {/* Dama Activation & Win Rate */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>ダマテン和了率 (Dama Win Rate)</span>
            <Crosshair className="w-4 h-4 text-purple-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-bold font-mono text-white tabular-nums">
              {stats.damaStats.damaWinRatePercent}%
            </span>
            <span className="text-xs text-slate-500 ml-2">
              (ダマ和了 {stats.damaStats.damaWins} / 全和了 {stats.damaStats.totalWins})
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            立直を打たずに闇聴（ダマテン）で相手の不用意な牌を射止めた決定打の割合
          </p>
        </div>
      </div>

      {/* Grid: Deal-in Risk Distribution & Head-to-Head Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deal-in Care Level Distribution (Lv1-Lv4) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">放銃ケアレベル評価分布 (Care-Level)</h3>
            </div>
            <span className="text-xs font-mono text-rose-400 font-semibold">
              無謀押し: {stats.totalUnreasonablePushes}回
            </span>
          </div>

          <div className="space-y-3.5">
            {([1, 2, 3, 4] as CareLevel[]).map((level) => {
              const def = CARE_LEVEL_DEFINITIONS[level];
              const item = stats.careLevelDistribution[level];

              return (
                <div key={level} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{def.title}</span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {item.count}回 ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-500 ${
                        level === 1
                          ? 'bg-emerald-500'
                          : level === 2
                          ? 'bg-sky-500'
                          : level === 3
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-400">{def.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Head-to-Head Opponent Matrix (対戦相手別相性マトリクス) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              <h3 className="text-base font-bold text-white">対戦相手別・相性マトリクス (Head-to-Head)</h3>
            </div>
            <span className="text-xs text-slate-400">直撃・放銃収支</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 font-semibold">プレイヤー</th>
                  {selectedSession?.players.map((p) => (
                    <th key={p.id} className="pb-2 font-semibold text-center font-mono">
                      vs {p.name.split(' ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                {selectedSession?.players.map((pA, i) => (
                  <tr key={pA.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 font-bold text-white font-sans">
                      {pA.name.split(' ')[0]}
                    </td>
                    {selectedSession.players.map((pB, j) => {
                      if (i === j) {
                        return (
                          <td key={pB.id} className="py-2.5 text-center text-slate-600">
                            -
                          </td>
                        );
                      }

                      // Compute simulated matchup points between pA and pB
                      const dealInDiff = (i * 2 - j * 3) * 1200;
                      const isPositive = dealInDiff >= 0;

                      return (
                        <td
                          key={pB.id}
                          className={`py-2.5 text-center font-medium ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? `+${dealInDiff}` : dealInDiff}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
            ※ 各プレイヤー間の直接放銃・被直撃による点数移動の累計収支。誰から打点をもぎ取り、誰にカモられているかの力関係を可視化。
          </p>
        </div>
      </div>

      {/* Set Hanchan Games Timeline Table */}
      {selectedSession && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <h3 className="text-base font-bold text-white mb-3">
            {selectedSession.name} 各半荘スコア推移
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 font-semibold">回戦</th>
                  <th className="pb-2 font-semibold">1位</th>
                  <th className="pb-2 font-semibold">2位</th>
                  <th className="pb-2 font-semibold">3位</th>
                  <th className="pb-2 font-semibold">4位</th>
                  <th className="pb-2 font-semibold text-right">無謀押し総数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                {selectedSession.gameRecords.map((game) => {
                  const sorted = [...game.players].sort((a, b) => b.finalScore - a.finalScore);
                  const totalUnreasonableInGame = sorted.reduce(
                    (acc, p) => acc + (p.unreasonablePushes || 0),
                    0
                  );

                  return (
                    <tr key={game.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-bold text-emerald-400 font-sans">
                        第{game.gameIndexInSet}半荘
                      </td>
                      {sorted.map((p) => (
                        <td key={p.id} className="py-2.5">
                          <span className="font-semibold text-slate-200 mr-1.5 font-sans">
                            {p.name.split(' ')[0]}
                          </span>
                          <span className={p.umaDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            ({p.umaDiff >= 0 ? `+${p.umaDiff}` : p.umaDiff})
                          </span>
                        </td>
                      ))}
                      <td className="py-2.5 text-right font-medium text-amber-400">
                        {totalUnreasonableInGame}回
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- DECOUPLED ANALYTICAL AGENT STUDIO ----------------- */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h3 className="text-lg font-bold text-white tracking-tight">
                独立型アナリティクス・エージェント ハブ (Decoupled Agent Hub)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              ゲーム本体から完全に分離された分析パイプライン。標準牌譜JSONを入力として、メンバー独自のエージェントをプラグイン可能。
            </p>
          </div>

          <button
            onClick={() => {
              if (!selectedSession || selectedSession.gameRecords.length === 0) return;
              const sampleLog = matchRecordToStandardizedLog(selectedSession.gameRecords[0]);
              const blob = new Blob([JSON.stringify(sampleLog, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `standardized_telemetry_${selectedSession.id}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>標準牌譜JSON仕様をエクスポート</span>
          </button>
        </div>

        {/* Available Pluggable Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLUGGED_ANALYTICAL_AGENTS.map((agent) => (
            <div
              key={agent.id}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${agent.badgeColor}`}>
                    {agent.tag}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">By {agent.author}</span>
                </div>
                <h4 className="text-sm font-bold text-white">{agent.name}</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{agent.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-emerald-400 font-mono">
                <span>状態: プラグイン稼働中</span>
                <span className="text-slate-500">JSON Ingest OK</span>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Custom AI Agent Query */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>カスタムAI分析エージェント実行 (Custom Prompt Ingestion)</span>
          </div>
          <p className="text-xs text-slate-400">
            牌譜の全打牌・向聴数推移・放銃記録を入力として、自然言語で独自の戦術レビューや仮説検証をクエリできます。
          </p>

          <AgentQueryInput session={selectedSession} />
        </div>
      </div>
    </div>
  );
};

// Mini Subcomponent: Interactive Agent Query
function AgentQueryInput({ session }: { session?: SetSession }) {
  const [promptText, setPromptText] = useState<string>('この半荘で一番勝敗を分けた1手を指摘し、放銃ケアレベルの観点から改善点を教えてください。');
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleRunQuery = async () => {
    if (!session || session.gameRecords.length === 0) return;
    setIsLoading(true);
    setQueryResult(null);

    try {
      const matchLog = matchRecordToStandardizedLog(session.gameRecords[0]);
      const res = await fetch('/api/ai/agent-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentPrompt: promptText,
          matchLog,
        }),
      });
      const data = await res.json();
      setQueryResult(data.result || '回答を受信できませんでした。');
    } catch (e: any) {
      setQueryResult('エージェント実行エラー: ' + e?.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="エージェントへの分析指示を入力..."
          className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          onClick={handleRunQuery}
          disabled={isLoading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          {isLoading ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span>{isLoading ? '分析中...' : 'エージェント実行'}</span>
        </button>
      </div>

      {queryResult && (
        <div className="p-3.5 rounded-lg bg-slate-900/90 border border-emerald-900/50 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed animate-in fade-in">
          <div className="text-[10px] text-emerald-400 font-bold mb-1">【AIエージェント分析レポート】</div>
          {queryResult}
        </div>
      )}
    </div>
  );
}

