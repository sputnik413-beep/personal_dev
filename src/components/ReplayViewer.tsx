import React, { useState } from 'react';
import { TelemetryAction, SetSession } from '../types/mahjong';
import { TileView } from './TileView';
import {
  Film,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  AlertTriangle,
} from 'lucide-react';

interface ReplayViewerProps {
  sessions: SetSession[];
  activeGameActions?: TelemetryAction[];
}

export const ReplayViewer: React.FC<ReplayViewerProps> = ({
  sessions,
  activeGameActions = [],
}) => {
  // Use either active match actions or historical session actions
  const defaultActions =
    activeGameActions.length > 0
      ? activeGameActions
      : sessions[0]?.gameRecords[0]?.telemetryActions || [];

  const [actionsList, setActionsList] = useState<TelemetryAction[]>(defaultActions);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  React.useEffect(() => {
    if (activeGameActions.length > 0) {
      setActionsList(activeGameActions);
      setCurrentStep(activeGameActions.length - 1);
    }
  }, [activeGameActions]);

  // Auto-play scrubber
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && currentStep < actionsList.length - 1) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= actionsList.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 700);
    } else if (isPlaying) {
      setIsPlaying(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentStep, actionsList.length]);

  const currentAction = actionsList[currentStep];

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(actionsList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mahjong_replay_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          setActionsList(json);
          setCurrentStep(0);
        }
      } catch (err) {
        console.error('Invalid JSON file', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Film className="w-6 h-6 text-emerald-400" />
            対局牌譜リプレイ &amp; 向聴数タイムライン
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            1手ごとの打牌、向聴数の推移、立直・真似満追従状態、放銃ケアレベルをコマ送りで検証
          </p>
        </div>

        {/* JSON Export/Import buttons */}
        <div className="flex items-center gap-2">
          <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>牌譜インポート</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON保存</span>
          </button>
        </div>
      </div>

      {actionsList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
          <p className="text-sm">再生可能な牌譜データがまだありません。対局を進めるとリアルタイムに記録されます。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Inspection View */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
            {/* Scrubber Timeline Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>手番ステップ: {currentStep + 1} / {actionsList.length}</span>
                <span>巡目: {currentAction?.turnIndex || 1}巡目 (東{currentAction?.roundNumber || 1}局)</span>
              </div>
              <input
                type="range"
                min="0"
                max={actionsList.length - 1}
                value={currentStep}
                onChange={(e) => setCurrentStep(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setCurrentStep(0)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? '一時停止' : '再生'}</span>
                </button>
                <button
                  onClick={() => setCurrentStep((prev) => Math.min(actionsList.length - 1, prev + 1))}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentStep(actionsList.length - 1)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Current Action Spotlight */}
            {currentAction && (
              <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold">
                      Seat {currentAction.playerIndex + 1}
                    </span>
                    <span className="text-sm font-bold text-white">
                      アクション: {currentAction.actionType}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    打牌時向聴数:{' '}
                    <span className="font-bold text-emerald-400">
                      {currentAction.shanten === -1
                        ? '和了 (Agari)'
                        : currentAction.shanten === 0
                        ? 'テンパイ (Tenpai)'
                        : `${currentAction.shanten}向聴`}
                    </span>
                  </div>
                </div>

                {/* Tile & Context Details */}
                <div className="flex items-center gap-4">
                  {currentAction.tile && (
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 mb-1">対象牌</span>
                      <TileView tile={currentAction.tile} size="lg" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1 text-xs text-slate-300">
                    <div>
                      立直状態:{' '}
                      <span className="font-semibold text-white">
                        {currentAction.isOpenRiichiActive
                          ? 'オープン立直'
                          : currentAction.isRiichiActive
                          ? '通常立直'
                          : '非立直 (ダマ/鳴き)'}
                      </span>
                    </div>
                    <div>
                      他家立直存在:{' '}
                      <span className={currentAction.anyOpponentInRiichi ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                        {currentAction.anyOpponentInRiichi ? 'あり (警戒局面)' : 'なし (平穏)'}
                      </span>
                    </div>
                    {currentAction.maneManganStreak > 0 && (
                      <div className="text-amber-300 font-semibold">
                        真似満追従: {currentAction.maneManganStreak}巡目継続中
                      </div>
                    )}
                  </div>
                </div>

                {/* Deal In Analysis Alert if Ron */}
                {currentAction.dealInAnalysis && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>放銃ケアレベル: Lv.{currentAction.dealInAnalysis.careLevel}</span>
                      <span className="ml-auto font-mono text-white">
                        -{currentAction.dealInAnalysis.pointsLost.toLocaleString()}点
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">{currentAction.dealInAnalysis.careDetails}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Step-by-Step Action List */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col max-h-[500px]">
            <h3 className="text-sm font-bold text-white mb-3">全手番アクション一覧</h3>
            <div className="space-y-1.5 overflow-y-auto pr-1 flex-1">
              {actionsList.map((act, idx) => {
                const isSelected = idx === currentStep;

                return (
                  <div
                    key={act.id}
                    onClick={() => setCurrentStep(idx)}
                    className={`p-2 rounded-lg border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-500/60 text-white'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500 w-5">#{idx + 1}</span>
                      <span className="font-semibold text-slate-200">
                        P{act.playerIndex + 1} {act.actionType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      {act.tile && (
                        <span>
                          {act.tile.value}
                          {act.tile.suit}
                        </span>
                      )}
                      <span
                        className={
                          act.shanten === 0
                            ? 'text-amber-400 font-bold'
                            : act.shanten === -1
                            ? 'text-emerald-400 font-bold'
                            : 'text-slate-400'
                        }
                      >
                        {act.shanten === -1 ? '和了' : act.shanten === 0 ? '聴牌' : `${act.shanten}向`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
