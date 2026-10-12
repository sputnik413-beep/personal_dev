import React, { useState, useEffect, useMemo } from 'react';
import { PersonaProfile, HouseRules } from '../types/mahjong';
import {
  SimulationMember,
  SimulationRunSummary,
  SimulationMemberResult,
  INITIAL_SIMULATION_HISTORY,
  MEMBER_CHART_COLORS,
  executeBatchSimulation,
} from '../engine/simulationEngine';
import { PRESET_PERSONAS } from '../engine/botAi';
import { STANDARD_GENERAL_RULES } from '../engine/gameLoop';
import {
  Zap,
  TrendingUp,
  Activity,
  History,
  Play,
  RotateCcw,
  Sliders,
  CheckCircle,
  Award,
  Shield,
  Flame,
  BarChart3,
  Calendar,
  Sparkles,
  Download,
  Save,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface VirtualMemberSimulatorViewProps {
  onOpenRulesModal?: () => void;
  onNavigateToAgents?: () => void;
}

export const VirtualMemberSimulatorView: React.FC<VirtualMemberSimulatorViewProps> = ({
  onOpenRulesModal,
  onNavigateToAgents,
}) => {
  // Historical Simulation Runs
  const [historyRuns, setHistoryRuns] = useState<SimulationRunSummary[]>(() => {
    const saved = localStorage.getItem('mahjong_simulation_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_SIMULATION_HISTORY;
  });

  // Active Selected Run to inspect
  const [selectedRunId, setSelectedRunId] = useState<string>(
    historyRuns[historyRuns.length - 1]?.runId || historyRuns[0]?.runId
  );

  const activeRun: SimulationRunSummary = useMemo(() => {
    return historyRuns.find((r) => r.runId === selectedRunId) || historyRuns[historyRuns.length - 1];
  }, [historyRuns, selectedRunId]);

  // Simulation Setup Config
  const [totalHandsCount, setTotalHandsCount] = useState<number>(1000);
  const [isRunningSim, setIsRunningSim] = useState<boolean>(false);
  const [simProgress, setSimProgress] = useState<number>(0);

  // Active 4 Members on Table (editable)
  const [tableMembers, setTableMembers] = useState<SimulationMember[]>(() => {
    return [
      {
        id: 'player_you',
        name: 'あなた',
        color: MEMBER_CHART_COLORS[0],
        persona: {
          id: 'p_you_cur',
          name: 'あなた (最新)',
          avatarSeed: 'you',
          description: '牌譜反映済み・守備と打点のバランス型',
          styleTag: '適応バランス',
          isAiBot: true,
          callTendency: 40,
          riichiTendency: 65,
          defensePriority: 80,
          badWaitTolerance: 25,
          damaPreference: 50,
          maneManganHunter: 0,
          pushShantenThreshold: 1,
        },
      },
      {
        id: 'player_sato',
        name: '佐藤 (Sato)',
        color: MEMBER_CHART_COLORS[1],
        persona: PRESET_PERSONAS[0], // Iron Fortress
      },
      {
        id: 'player_tanaka',
        name: '田中 (Tanaka)',
        color: MEMBER_CHART_COLORS[2],
        persona: PRESET_PERSONAS[1], // Hyper Rush
      },
      {
        id: 'player_suzuki',
        name: '鈴木 (Suzuki)',
        color: MEMBER_CHART_COLORS[3],
        persona: PRESET_PERSONAS[2], // Mane-Mangan Specialist
      },
    ];
  });

  // Active Chart View Mode: 'CURVE_IN_RUN' (1,000局の収支推移) vs 'TIMELINE_ACROSS_RUNS' (日々の実力推移履歴)
  const [chartViewMode, setChartViewMode] = useState<'CURVE_IN_RUN' | 'TIMELINE_ACROSS_RUNS'>('CURVE_IN_RUN');

  // Hovered sample index on curve
  const [hoveredSampleIdx, setHoveredSampleIdx] = useState<number | null>(null);

  // Save history to local storage
  useEffect(() => {
    localStorage.setItem('mahjong_simulation_history', JSON.stringify(historyRuns));
  }, [historyRuns]);

  // Execute Batch Simulation Run
  const handleExecuteSimulation = () => {
    setIsRunningSim(true);
    setSimProgress(15);

    setTimeout(() => {
      setSimProgress(60);
      setTimeout(() => {
        const newRun = executeBatchSimulation(
          tableMembers,
          totalHandsCount,
          STANDARD_GENERAL_RULES,
          `Ver ${historyRuns.length + 1}.0 最新反映シミュレーション (${totalHandsCount.toLocaleString()}局)`
        );

        const updated = [...historyRuns, newRun];
        setHistoryRuns(updated);
        setSelectedRunId(newRun.runId);
        setIsRunningSim(false);
        setSimProgress(100);
      }, 250);
    }, 200);
  };

  // Quick Member Persona Slider adjustment
  const handleUpdateMemberPersona = (
    memberIdx: number,
    key: keyof PersonaProfile,
    value: number
  ) => {
    setTableMembers((prev) => {
      const copy = [...prev];
      copy[memberIdx] = {
        ...copy[memberIdx],
        persona: {
          ...copy[memberIdx].persona,
          [key]: value,
        },
      };
      return copy;
    });
  };

  // -------------------------------------------------------------
  // SVG Chart 1: Cumulative Score Progression in Active Run
  // -------------------------------------------------------------
  const renderCurveChart = () => {
    if (!activeRun || !activeRun.curveSamples || activeRun.curveSamples.length === 0) return null;

    const samples = activeRun.curveSamples;
    const width = 800;
    const height = 280;
    const padding = { top: 20, right: 30, bottom: 35, left: 65 };

    // Find min and max score for scaling
    let minScore = 0;
    let maxScore = 0;
    samples.forEach((s) => {
      s.scores.forEach((sc) => {
        if (sc < minScore) minScore = sc;
        if (sc > maxScore) maxScore = sc;
      });
    });

    // Add 10% breathing room
    const range = Math.max(20000, maxScore - minScore);
    const yMin = Math.floor((minScore - range * 0.1) / 10000) * 10000;
    const yMax = Math.ceil((maxScore + range * 0.1) / 10000) * 10000;
    const yRange = yMax - yMin || 1;

    const maxHands = activeRun.totalHands;

    const getX = (handIdx: number) => {
      return padding.left + (handIdx / maxHands) * (width - padding.left - padding.right);
    };

    const getY = (score: number) => {
      return height - padding.bottom - ((score - yMin) / yRange) * (height - padding.top - padding.bottom);
    };

    const zeroY = getY(0);

    // Build SVG paths for each of the 4 members
    const paths = [0, 1, 2, 3].map((mIdx) => {
      const d = samples
        .map((s, i) => {
          const x = getX(s.handIndex);
          const y = getY(s.scores[mIdx]);
          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(' ');
      return {
        path: d,
        color: activeRun.members[mIdx]?.color || MEMBER_CHART_COLORS[mIdx],
        name: activeRun.members[mIdx]?.name,
      };
    });

    const activeHoverSample = hoveredSampleIdx !== null ? samples[hoveredSampleIdx] : null;

    return (
      <div className="relative w-full overflow-hidden bg-slate-950/80 rounded-2xl border border-slate-800 p-4">
        {/* Chart Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs">
          <div className="flex items-center gap-2 font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-bold text-white">{activeRun.runTitle}</span>
            <span>· 局数: {activeRun.totalHands.toLocaleString()}局 (約{activeRun.estimatedHanchans}半荘)</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            {activeRun.members.map((m, idx) => (
              <div key={m.id} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: m.color }}
                ></span>
                <span className="text-slate-300 font-semibold">{m.name}:</span>
                <span className={m.totalScore >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {m.totalScore > 0 ? '+' : ''}{m.totalScore.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SVG Drawing Area */}
        <div className="relative w-full aspect-[800/280]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full select-none"
            onMouseLeave={() => setHoveredSampleIdx(null)}
          >
            {/* Grid Lines */}
            {[yMin, (yMin + yMax) / 2, 0, yMax].map((tickVal, i) => {
              const y = getY(tickVal);
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke={tickVal === 0 ? '#475569' : '#1e293b'}
                    strokeWidth={tickVal === 0 ? '1.5' : '1'}
                    strokeDasharray={tickVal === 0 ? '' : '3 3'}
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill={tickVal === 0 ? '#94a3b8' : '#64748b'}
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {tickVal > 0 ? `+${tickVal / 1000}k` : `${tickVal / 1000}k`}
                  </text>
                </g>
              );
            })}

            {/* X-axis ticks */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((frac, i) => {
              const hand = Math.round(frac * maxHands);
              const x = getX(hand);
              return (
                <g key={i}>
                  <line x1={x} y1={height - padding.bottom} x2={x} y2={height - padding.bottom + 5} stroke="#334155" />
                  <text
                    x={x}
                    y={height - padding.bottom + 18}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {hand}局
                  </text>
                </g>
              );
            })}

            {/* Zero Baseline highlight */}
            <line
              x1={padding.left}
              y1={zeroY}
              x2={width - padding.right}
              y2={zeroY}
              stroke="#64748b"
              strokeWidth="1.2"
            />

            {/* The 4 Member Cumulative Score Lines */}
            {paths.map((p, idx) => (
              <path
                key={idx}
                d={p.path}
                fill="none"
                stroke={p.color}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all opacity-90 hover:opacity-100"
              />
            ))}

            {/* Interactive Cursor Overlay on Hover */}
            {samples.map((s, sIdx) => {
              const x = getX(s.handIndex);
              return (
                <rect
                  key={sIdx}
                  x={x - 8}
                  y={padding.top}
                  width={16}
                  height={height - padding.top - padding.bottom}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredSampleIdx(sIdx)}
                />
              );
            })}

            {/* Active Hover Guide Line */}
            {activeHoverSample && (
              <g>
                <line
                  x1={getX(activeHoverSample.handIndex)}
                  y1={padding.top}
                  x2={getX(activeHoverSample.handIndex)}
                  y2={height - padding.bottom}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                {activeHoverSample.scores.map((sc, mIdx) => (
                  <circle
                    key={mIdx}
                    cx={getX(activeHoverSample.handIndex)}
                    cy={getY(sc)}
                    r="4"
                    fill={activeRun.members[mIdx]?.color || MEMBER_CHART_COLORS[mIdx]}
                    stroke="#0b1016"
                    strokeWidth="2"
                  />
                ))}
              </g>
            )}
          </svg>

          {/* Floating Tooltip during Hover */}
          {activeHoverSample && (
            <div
              className="absolute pointer-events-none p-2.5 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl text-[11px] font-mono space-y-1 z-20 backdrop-blur-md"
              style={{
                left: `${Math.min(75, Math.max(10, (activeHoverSample.handIndex / maxHands) * 100))}%`,
                top: '15px',
              }}
            >
              <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
                <span>第 {activeHoverSample.handIndex} 局時点</span>
                <span className="text-[10px] text-slate-400">約{Math.round(activeHoverSample.handIndex / 8)}半荘</span>
              </div>
              {activeRun.members.map((m, idx) => (
                <div key={m.id} className="flex items-center justify-between gap-3">
                  <span style={{ color: m.color }} className="font-semibold">
                    {m.name}:
                  </span>
                  <span className={activeHoverSample.scores[idx] >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {activeHoverSample.scores[idx] > 0 ? '+' : ''}
                    {activeHoverSample.scores[idx].toLocaleString()} 点
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // SVG Chart 2: Historical Timeline Across Dates (実力推移履歴)
  // -------------------------------------------------------------
  const renderHistoricalTimelineChart = () => {
    if (historyRuns.length === 0) return null;

    const width = 800;
    const height = 280;
    const padding = { top: 25, right: 40, bottom: 40, left: 60 };

    // We plot Average Placement (平均着順: 1.00〜4.00, lower is better!)
    // Y-axis from 3.5 down to 1.5
    const yMinRank = 3.2;
    const yMaxRank = 1.8;
    const yRankRange = yMinRank - yMaxRank;

    const getX = (runIdx: number) => {
      if (historyRuns.length === 1) return (width - padding.left - padding.right) / 2 + padding.left;
      return padding.left + (runIdx / (historyRuns.length - 1)) * (width - padding.left - padding.right);
    };

    const getY = (rank: number) => {
      // Invert: 1.8 at top (padding.top), 3.2 at bottom (height - padding.bottom)
      const clamped = Math.max(yMaxRank, Math.min(yMinRank, rank));
      return padding.top + ((clamped - yMaxRank) / yRankRange) * (height - padding.top - padding.bottom);
    };

    return (
      <div className="relative w-full overflow-hidden bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>対戦牌譜・シミュレータ反映に伴うメンバー実力推移（平均着順履歴）</span>
            </h4>
            <span className="text-[11px] text-slate-400">
              ※ 各シミュレーション実施時点での平均着順（1.00に近いほど好成績）の変遷
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            {tableMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }}></span>
                <span className="text-slate-300 font-semibold">{m.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative w-full aspect-[800/280]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            {/* Rank Grid Lines */}
            {[2.0, 2.5, 3.0].map((rk) => {
              const y = getY(rk);
              return (
                <g key={rk}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {rk.toFixed(1)}位
                  </text>
                </g>
              );
            })}

            {/* Run Labels on X axis */}
            {historyRuns.map((r, rIdx) => {
              const x = getX(rIdx);
              return (
                <g key={r.runId}>
                  <line x1={x} y1={height - padding.bottom} x2={x} y2={height - padding.bottom + 5} stroke="#334155" />
                  <text
                    x={x}
                    y={height - padding.bottom + 16}
                    textAnchor="middle"
                    fill={r.runId === selectedRunId ? '#10b981' : '#64748b'}
                    fontSize="10"
                    fontWeight={r.runId === selectedRunId ? 'bold' : 'normal'}
                    fontFamily="monospace"
                  >
                    {r.dateStr}
                  </text>
                  <text
                    x={x}
                    y={height - padding.bottom + 28}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize="9"
                  >
                    Run #{rIdx + 1}
                  </text>
                </g>
              );
            })}

            {/* Lines for each of the 4 members */}
            {[0, 1, 2, 3].map((mIdx) => {
              const pts = historyRuns.map((r, rIdx) => {
                const rank = r.members[mIdx]?.averageRank || 2.5;
                return { x: getX(rIdx), y: getY(rank), rank };
              });

              const d = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
              const color = MEMBER_CHART_COLORS[mIdx];

              return (
                <g key={mIdx}>
                  <path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-90"
                  />
                  {pts.map((pt, i) => (
                    <g key={i}>
                      <circle cx={pt.x} cy={pt.y} r="5" fill={color} stroke="#0b1016" strokeWidth="2.5" />
                      <text
                        x={pt.x}
                        y={pt.y - 8}
                        textAnchor="middle"
                        fill="#f8fafc"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {pt.rank.toFixed(2)}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Simulation Factory Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-6 h-6 text-amber-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                仮想メンバー対局シミュレーション工場 (Simulation Factory)
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              天鳳・雀魂の実戦ログから抽出したメンバーBotを4人卓に配置し、
              <strong>1,000局〜2,000局の超高速モンテカルロ対戦</strong>を実行。
              日々の牌譜アップデートを反映しながらシミュレーション履歴を蓄積し、メンバー間の実力推移をグラフィカルに可視化します。
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Run Button */}
            <button
              onClick={handleExecuteSimulation}
              disabled={isRunningSim}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Zap className={`w-4 h-4 ${isRunningSim ? 'animate-spin' : ''}`} />
              <span>{isRunningSim ? 'シミュレーション計算中...' : `⚡ ${totalHandsCount.toLocaleString()}局 高速シミュレーション`}</span>
            </button>
          </div>
        </div>

        {/* Batch Hands Count selector */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">シミュレーション規模:</span>
            {[
              { label: '500局 (~62半荘)', val: 500 },
              { label: '1,000局 (~125半荘)', val: 1000 },
              { label: '2,000局 (~250半荘)', val: 2000 },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setTotalHandsCount(opt.val)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer border ${
                  totalHandsCount === opt.val
                    ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">表示チャート切替:</span>
            <button
              onClick={() => setChartViewMode('CURVE_IN_RUN')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer border ${
                chartViewMode === 'CURVE_IN_RUN'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              1,000局の累積収支推移線
            </button>
            <button
              onClick={() => setChartViewMode('TIMELINE_ACROSS_RUNS')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer border ${
                chartViewMode === 'TIMELINE_ACROSS_RUNS'
                  ? 'bg-sky-950/80 text-sky-300 border-sky-600'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              実力推移履歴 (タイムライン)
            </button>
          </div>
        </div>

        {/* Progress Bar when running */}
        {isRunningSim && (
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs text-amber-300 font-mono">
              <span>モンテカルロ打牌シミュレーション進行中...</span>
              <span>{simProgress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${simProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Main Graphical Chart View */}
      {chartViewMode === 'CURVE_IN_RUN' ? renderCurveChart() : renderHistoricalTimelineChart()}

      {/* Scoreboard & Granular Metrics Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>{activeRun.runTitle} · メンバー戦績ランキング</span>
            </h3>
            <span className="text-xs text-slate-400">
              総対局数: {activeRun.totalHands.toLocaleString()}局 (約{activeRun.estimatedHanchans}半荘) · 実施日時: {activeRun.dateStr}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono"
            >
              {historyRuns.map((r, i) => (
                <option key={r.runId} value={r.runId}>
                  Run #{i + 1}: {r.dateStr} ({r.totalHands}局)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Member Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeRun.members.map((m, idx) => (
            <div
              key={m.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 relative overflow-hidden"
            >
              {/* Top Accent Strip */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: m.color }}
              ></div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: m.color }}
                  ></span>
                  <span className="font-bold text-sm text-white">{m.name}</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">
                  #{idx + 1}位
                </span>
              </div>

              {/* Total Balance */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 font-mono">
                <div className="text-[10px] text-slate-500">累積素点 / 収支</div>
                <div className={`text-lg font-bold ${m.totalScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {m.totalScore > 0 ? '+' : ''}{m.totalScore.toLocaleString()} 点
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  半荘平均: {m.averageScorePerHanchan > 0 ? `+${m.averageScorePerHanchan}` : m.averageScorePerHanchan}点
                </div>
              </div>

              {/* Placement Stats */}
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>平均着順:</span>
                  <span className="font-bold text-white">{m.averageRank} 位</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>1位率 / ラス率:</span>
                  <span>{m.rankRates[0]}% / <strong className="text-rose-400">{m.rankRates[3]}%</strong></span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>和了率 / 放銃率:</span>
                  <span>{m.winRate}% / <strong className={m.dealInRate <= 10 ? 'text-emerald-400' : 'text-slate-300'}>{m.dealInRate}%</strong></span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>無謀押し回数:</span>
                  <span className="text-amber-400">{m.unreasonablePushCount} 回</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800/60">
                  <span>推定Rating:</span>
                  <span className="text-emerald-400 font-bold">{m.skillRating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Automated Key Insights */}
        {activeRun.keyInsights && activeRun.keyInsights.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/50 space-y-1.5 text-xs text-slate-300">
            <span className="font-bold text-emerald-400 block flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>シミュレーション総括クオンツ分析</span>
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed pl-1">
              {activeRun.keyInsights.map((insight, i) => (
                <li key={i}>{insight}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Member Persona Adjustment Bench (シミュレータ用パラメータ調律卓) */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <span>シミュレータ卓 メンバーパラメータ調整ベンチ</span>
            </h3>
            <p className="text-xs text-slate-400">
              各メンバーの守備力や鳴き率のスライダーを微調整し、「もし守備力を10%上げたら1,000局の収支はどう変わるか？」の感度分析が即座に行えます。
            </p>
          </div>

          <button
            onClick={onNavigateToAgents}
            className="px-3.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-semibold transition-colors cursor-pointer shrink-0"
          >
            エージェントスタジオで詳細設定 →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tableMembers.map((m, idx) => (
            <div
              key={m.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="font-bold text-white" style={{ color: m.color }}>
                  席 P{idx + 1}: {m.name}
                </span>
                <span className="text-[10px] text-slate-500 font-sans">
                  {m.persona.styleTag}
                </span>
              </div>

              {/* Defense Priority Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">守備力 (ベタオリ):</span>
                  <span className="text-emerald-400 font-bold">{m.persona.defensePriority}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="95"
                  value={m.persona.defensePriority}
                  onChange={(e) => handleUpdateMemberPersona(idx, 'defensePriority', Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5"
                />
              </div>

              {/* Call Tendency Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">鳴き速度 (副露率):</span>
                  <span className="text-rose-400 font-bold">{m.persona.callTendency}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={m.persona.callTendency}
                  onChange={(e) => handleUpdateMemberPersona(idx, 'callTendency', Number(e.target.value))}
                  className="w-full accent-rose-500 h-1.5"
                />
              </div>

              {/* Riichi Tendency Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">立直攻撃性:</span>
                  <span className="text-amber-400 font-bold">{m.persona.riichiTendency}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="90"
                  value={m.persona.riichiTendency}
                  onChange={(e) => handleUpdateMemberPersona(idx, 'riichiTendency', Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5"
                />
              </div>

              {/* Push Shanten Selector */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">無謀押し基準:</span>
                  <span className="text-sky-400 font-bold">{m.persona.pushShantenThreshold}向聴</span>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleUpdateMemberPersona(idx, 'pushShantenThreshold', val)}
                      className={`flex-1 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer border ${
                        m.persona.pushShantenThreshold === val
                          ? 'bg-sky-950 text-sky-300 border-sky-600'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {val === 1 ? 'テンパイのみ' : val === 2 ? '1向聴押す' : '2向聴押す'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
