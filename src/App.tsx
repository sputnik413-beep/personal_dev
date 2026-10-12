import React, { useState, useEffect, useReducer } from 'react';
import { MahjongGameEngine } from './engine/gameLoop';
import { SetSession, DealInAnalysis, HouseRules, PersonaProfile, MatchRecord } from './types/mahjong';
import { INITIAL_PRESET_SESSIONS } from './engine/presetData';
import { HeaderTopBar, ActiveTab } from './components/HeaderTopBar';
import { PaipuImporterView } from './components/PaipuImporterView';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { CustomAgentStudio } from './components/CustomAgentStudio';
import { ReplayViewer } from './components/ReplayViewer';
import { MahjongTable } from './components/MahjongTable';
import { VirtualMemberSimulatorView } from './components/VirtualMemberSimulatorView';
import { LobbyAndRulesModal } from './components/LobbyAndRulesModal';
import { DealInReviewModal } from './components/DealInReviewModal';
import {
  ShieldAlert,
  Flame,
  Zap,
  Activity,
  History,
  RotateCcw,
  Sparkles,
  Bot,
  Sliders,
  CheckCircle,
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('IMPORTER');
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  // Core Game Engine Instance
  const [engine, setEngine] = useState<MahjongGameEngine>(() => new MahjongGameEngine());

  // Sessions History
  const [sessions, setSessions] = useState<SetSession[]>(() => {
    const saved = localStorage.getItem('mahjong_sessions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_PRESET_SESSIONS;
  });

  // Currently focused Match Record for deep analysis
  const [activeMatchRecord, setActiveMatchRecord] = useState<MatchRecord | undefined>(
    () => sessions[0]?.gameRecords[0]
  );

  // Deal-in modal review state
  const [activeDealInAnalyses, setActiveDealInAnalyses] = useState<DealInAnalysis[] | null>(null);

  // House Rules Modal
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  // Notification Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Simulator Sub-Mode: 'BATCH_FACTORY' (1000-hand analytical line charts) vs 'LIVE_TABLE' (manual spectator board)
  const [simSubMode, setSimSubMode] = useState<'BATCH_FACTORY' | 'LIVE_TABLE'>('BATCH_FACTORY');

  // Sync sessions to server and local storage
  useEffect(() => {
    localStorage.setItem('mahjong_sessions', JSON.stringify(sessions));
    fetch('/api/mahjong/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: sessions[0] }),
    }).catch(() => {});
  }, [sessions]);

  const handleStartNewGame = () => {
    const newEngine = new MahjongGameEngine(engine.rules);
    setEngine(newEngine);
    forceUpdate();
  };

  const handleUpdateRules = (newRules: HouseRules, isRecorded: boolean) => {
    engine.rules = newRules;
    engine.isRecorded = isRecorded;
    forceUpdate();
  };

  const handleSelectPersonaForBot = (botSeatIndex: number, persona: PersonaProfile) => {
    if (engine.players[botSeatIndex]) {
      engine.players[botSeatIndex].persona = persona;
      engine.players[botSeatIndex].name = persona.name;
      forceUpdate();
      setToastMessage(`席 P${botSeatIndex + 1} に『${persona.name}』を配置しました。`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleImportMatch = (record: MatchRecord) => {
    setActiveMatchRecord(record);

    // Integrate into existing or new session
    const updatedSessions = [...sessions];
    if (updatedSessions.length === 0) {
      updatedSessions.push({
        id: 'session_imported_' + Date.now(),
        name: 'インポート牌譜セッション',
        status: 'IN_PROGRESS',
        targetGamesCount: 6,
        completedGamesCount: 1,
        players: record.players.map((p) => ({ id: p.id, name: p.name, isBot: false })),
        gameRecords: [record],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      const targetSession = updatedSessions[0];
      targetSession.gameRecords = [record, ...targetSession.gameRecords];
      targetSession.completedGamesCount = targetSession.gameRecords.length;
      targetSession.updatedAt = Date.now();
    }

    setSessions(updatedSessions);
    setToastMessage(`牌譜『${record.id}』を保存しました。戦績分析やエージェント診断で確認できます。`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isStandardRules = !engine.rules.openRiichi && !engine.rules.maneMangan && !engine.rules.sanrenko;

  return (
    <div className="min-h-screen bg-[#0b1016] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* 3-Zone Top Navigation Contract */}
      <HeaderTopBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if ((tab as string) === 'RULES') {
            setShowRulesModal(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onStartNewGame={handleStartNewGame}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Subtle Overview & Active Rules Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white">適用ルール:</span>
            <div className="flex flex-wrap items-center gap-2">
              {isStandardRules ? (
                <>
                  <span className="text-emerald-300 font-semibold">天鳳・雀魂 標準ルール</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-300">25,000点持ち/30,000点返し (ウマ+20/+10/-10/-20)</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-300">赤ドラ3枚 / 喰いタンあり / ローカル役なし</span>
                </>
              ) : (
                <>
                  <span className="text-purple-300 font-semibold">プライベート・ハウスルール</span>
                  {engine.rules.openRiichi && <span className="text-purple-300">· オープン立直</span>}
                  {engine.rules.maneMangan && <span className="text-amber-300">· 真似満</span>}
                  {engine.rules.sanrenko && <span className="text-emerald-300">· 三連刻/四連刻</span>}
                  {engine.rules.ryanhanShibariHonba > 0 && <span className="text-sky-300">· 5本場2翻縛り</span>}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <span className={engine.isRecorded ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {engine.isRecorded ? '● 実戦戦績記録中 (is_recorded: true)' : '○ 練習シミュレーション (未記録)'}
            </span>
            <button
              onClick={() => setShowRulesModal(true)}
              className="hover:text-white underline cursor-pointer text-slate-300"
            >
              ルール切替・設定
            </button>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab 1: Paipu Importer (天鳳 & 雀魂 牌譜インポーター) */}
        {activeTab === 'IMPORTER' && (
          <PaipuImporterView
            onImportMatch={handleImportMatch}
            onNavigateToTab={(t) => setActiveTab(t)}
            sessions={sessions}
          />
        )}

        {/* Tab 2: Long-Term Analytics & Set Dashboard */}
        {activeTab === 'ANALYTICS' && <AnalyticsDashboard sessions={sessions} />}

        {/* Tab 3: Custom Analytical Agent Studio */}
        {activeTab === 'AGENTS' && (
          <CustomAgentStudio
            sessions={sessions}
            activeMatchRecord={activeMatchRecord}
            onSetAgentToSimulator={handleSelectPersonaForBot}
            onNavigateToTab={(t) => setActiveTab(t)}
          />
        )}

        {/* Tab 4: Replay Viewer & Step-by-Step Inspector */}
        {activeTab === 'REPLAY' && (
          <ReplayViewer
            sessions={sessions}
            activeGameActions={engine.actionsHistory}
          />
        )}

        {/* Tab 5: Virtual Member Simulator (仮想メンバー卓) */}
        {activeTab === 'SIMULATOR' && (
          <div className="space-y-6">
            {/* Mode Switcher Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold mr-1">シミュレータ動作モード:</span>
                <button
                  onClick={() => setSimSubMode('BATCH_FACTORY')}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    simSubMode === 'BATCH_FACTORY'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ 1,000局バッチシミュレーション工場 (収支推移・実力線グラフ)</span>
                </button>
                <button
                  onClick={() => setSimSubMode('LIVE_TABLE')}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    simSubMode === 'LIVE_TABLE'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>👁️ 1局詳細リアルタイム卓 (手牌・打牌ビジュアル)</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 font-mono hidden md:block">
                {simSubMode === 'BATCH_FACTORY'
                  ? '※ モンテカルロ超高速分析エンジン稼働中'
                  : '※ リアルタイム手番ステートマシン稼働中'}
              </div>
            </div>

            {simSubMode === 'BATCH_FACTORY' ? (
              <VirtualMemberSimulatorView
                onOpenRulesModal={() => setShowRulesModal(true)}
                onNavigateToAgents={() => setActiveTab('AGENTS')}
              />
            ) : (
              <div className="space-y-6">
                {/* Simulator Header & Bot Seat Assignment Strip */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Bot className="w-6 h-6 text-emerald-400" />
                        <h2 className="text-xl font-bold text-white tracking-tight">
                          仮想メンバー対局シミュレータ (Live Table Spectator)
                        </h2>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        メンバー各自の思考パラメータ（守備力・鳴き率・立直判断・押し引き境界）を持つエージェントBotを卓に配置し、
                        手番ごとの打牌アニメーションや自動進行をリアルタイム観戦・検証できます。
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveTab('AGENTS')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Sliders className="w-4 h-4 text-emerald-400" />
                      <span>エージェント調整スタジオへ</span>
                    </button>
                  </div>

                  {/* 4 Seats Roster Strip */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      着席メンバー・エージェント構成 (P1〜P4)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {engine.players.map((p, idx) => (
                        <div
                          key={p.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">席 P{idx + 1}</span>
                            <span className="text-[10px] text-emerald-400">{p.seatWind}</span>
                          </div>
                          <div className="text-sm font-bold text-white truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {p.isBot
                              ? `Bot: 守備${p.persona.defensePriority}% / 鳴き${p.persona.callTendency}%`
                              : '操作プレイヤー'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Mahjong Table */}
                <MahjongTable
                  engine={engine}
                  onStateChange={forceUpdate}
                  onRonDealInReview={(deals) => setActiveDealInAnalyses(deals)}
                />

                {/* Quick Live Telemetry Drawer Below Table */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">直近の打牌テレメトリーストリーム</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('REPLAY')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span>全牌譜タイムラインで確認</span>
                      <span>→</span>
                    </button>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {engine.actionsHistory.slice(-8).map((act, idx) => (
                      <div
                        key={act.id}
                        className="shrink-0 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs font-mono space-y-1 min-w-[120px]"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>#{engine.actionsHistory.length - 8 + idx + 1}</span>
                          <span>P{act.playerIndex + 1}</span>
                        </div>
                        <div className="font-semibold text-slate-200">{act.actionType}</div>
                        <div className="text-[11px] text-emerald-400">
                          向聴: {act.shanten === -1 ? '和了' : act.shanten === 0 ? 'テンパイ' : `${act.shanten}向`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Ron Deal-in Care Level Review Modal */}
      {activeDealInAnalyses && (
        <DealInReviewModal
          analyses={activeDealInAnalyses}
          onClose={() => setActiveDealInAnalyses(null)}
        />
      )}

      {/* Rules Configuration Modal */}
      {showRulesModal && (
        <LobbyAndRulesModal
          rules={engine.rules}
          isRecorded={engine.isRecorded}
          onUpdateRules={handleUpdateRules}
          onClose={() => setShowRulesModal(false)}
        />
      )}
    </div>
  );
}

export default App;
