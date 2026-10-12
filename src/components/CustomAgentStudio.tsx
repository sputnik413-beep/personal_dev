import React, { useState } from 'react';
import { CustomAgentConfig, MatchRecord, SetSession, PersonaProfile } from '../types/mahjong';
import { matchRecordToStandardizedLog, runPersonaExtractorAgent } from '../engine/analyticsAgents';
import { TileView } from './TileView';
import {
  Bot,
  Plus,
  Sliders,
  Sparkles,
  Send,
  Shield,
  Flame,
  Check,
  TrendingUp,
  User,
  Trash2,
  BrainCircuit,
  Compass,
  ArrowRight,
  PlayCircle,
  HelpCircle,
  Award,
} from 'lucide-react';

interface CustomAgentStudioProps {
  sessions: SetSession[];
  activeMatchRecord?: MatchRecord;
  onSetAgentToSimulator?: (seatIndex: number, persona: PersonaProfile) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const INITIAL_CUSTOM_AGENTS: CustomAgentConfig[] = [
  {
    id: 'agent_sato_defense',
    name: '佐藤式・ベタオリ精度＆失点抑止監査官',
    author: '佐藤 (Sato)',
    description: '相手立直に対する現物・スジの選択精度を厳しく監査。Lv.4（不用意放銃）を断固として摘発する鉄壁志向エージェント。',
    category: 'CARE_AUDIT',
    badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
    careLevelScrutiny: 95,
    pushToleranceShanten: 1,
    focusMetric: 'DEFENSE',
    customSystemPrompt: 'あなたは守備重視の麻雀プロです。相手の立直や仕掛けに対する放銃が、不可避(Lv1)だったのか、それとも回避できたミス(Lv4)だったのかを、現物・スジ・カベの観点から厳格に監査してください。',
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'agent_tanaka_rush',
    name: '田中式・鳴き速攻＆打点期待値アナライザー',
    author: '田中 (Tanaka)',
    description: 'アガリ速度と手牌構想の積極性を評価。過度なベタオリによるアガリ逃しや、鳴き判断のタイミングを評価する攻撃特化エージェント。',
    category: 'CUSTOM_AI',
    badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-800',
    careLevelScrutiny: 40,
    pushToleranceShanten: 2,
    focusMetric: 'ATTACK',
    customSystemPrompt: 'あなたは攻撃重視のスピード系プロ雀士です。各局における鳴き仕掛けのタイミング、向聴数進行の速度、および攻めきれずにアガリを逃した局面がないかを指摘してください。',
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'agent_quant_lead_guard',
    name: 'クオンツ式・半荘セット先行逃げ切りアドバイザー',
    author: 'クオンツ研究部',
    description: 'リード時の加点・局消化（トップ防衛）と、ビハインド時の高打点逆転ルートの選択を数理的に分析するセット特化エージェント。',
    category: 'SET_QUANT',
    badgeColor: 'text-sky-400 bg-sky-950/60 border-sky-800',
    careLevelScrutiny: 75,
    pushToleranceShanten: 1,
    focusMetric: 'LEAD_MANAGEMENT',
    customSystemPrompt: 'あなたはゲーム理論および点棒状況判断の数理アナリストです。点差状況に応じたトップ防衛策（平場とオーラスの立ち回りの違い）や、着順浮上のためのリスク選好度を数理的にレビューしてください。',
    createdAt: Date.now() - 86400000 * 2,
  },
];

type StudioSubTab = 'AGENTS_CONFIG' | 'LOG_EXTRACTOR' | 'WHAT_TO_DISCARD_BENCH';

export const CustomAgentStudio: React.FC<CustomAgentStudioProps> = ({
  sessions,
  activeMatchRecord,
  onSetAgentToSimulator,
  onNavigateToTab,
}) => {
  const [subTab, setSubTab] = useState<StudioSubTab>('AGENTS_CONFIG');
  const [agents, setAgents] = useState<CustomAgentConfig[]>(() => {
    const saved = localStorage.getItem('mahjong_custom_agents');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_CUSTOM_AGENTS;
  });

  const [activeAgentId, setActiveAgentId] = useState<string>(agents[0]?.id || '');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Form State for Agent Customization
  const [formName, setFormName] = useState<string>('');
  const [formAuthor, setFormAuthor] = useState<string>('あなた');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formScrutiny, setFormScrutiny] = useState<number>(80);
  const [formPushShanten, setFormPushShanten] = useState<number>(1);
  const [formFocus, setFormFocus] = useState<CustomAgentConfig['focusMetric']>('BALANCE');
  const [formPrompt, setFormPrompt] = useState<string>(
    'この半荘における致命的な押し引き判断と、勝敗の分岐点となった1手を論理的に解説してください。'
  );

  // Diagnostics Execution State
  const [diagnosticReport, setDiagnosticReport] = useState<string | null>(null);
  const [isRunningAgent, setIsRunningAgent] = useState<boolean>(false);

  // Log Extractor State
  const allMatches: MatchRecord[] = sessions.flatMap((s) => s.gameRecords);
  const [selectedMatchIdForExtract, setSelectedMatchIdForExtract] = useState<string>(
    allMatches[0]?.id || ''
  );
  const targetMatchForExtract =
    allMatches.find((m) => m.id === selectedMatchIdForExtract) || allMatches[0];
  const [selectedPlayerIdForExtract, setSelectedPlayerIdForExtract] = useState<string>(
    targetMatchForExtract?.players[0]?.id || ''
  );
  const [extractSuccessMsg, setExtractSuccessMsg] = useState<string | null>(null);

  // Situation Bench State
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState<number>(0);

  const activeAgent = agents.find((a) => a.id === activeAgentId) || agents[0];

  // Target Match to Analyze for Agent Diagnostics
  const targetMatch: MatchRecord | undefined =
    activeMatchRecord || allMatches[0];

  const handleSaveNewAgent = () => {
    if (!formName.trim()) return;

    const newAgent: CustomAgentConfig = {
      id: `agent_custom_${Date.now()}`,
      name: formName,
      author: formAuthor || 'メンバー',
      description: formDesc || 'メンバー独自設定のカスタム分析エージェント。',
      category: 'CUSTOM_AI',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800',
      careLevelScrutiny: formScrutiny,
      pushToleranceShanten: formPushShanten,
      focusMetric: formFocus,
      customSystemPrompt: formPrompt,
      createdAt: Date.now(),
    };

    const updated = [newAgent, ...agents];
    setAgents(updated);
    localStorage.setItem('mahjong_custom_agents', JSON.stringify(updated));
    setActiveAgentId(newAgent.id);
    setIsCreatingNew(false);
  };

  const handleDeleteAgent = (id: string) => {
    const updated = agents.filter((a) => a.id !== id);
    setAgents(updated);
    localStorage.setItem('mahjong_custom_agents', JSON.stringify(updated));
    if (activeAgentId === id && updated.length > 0) {
      setActiveAgentId(updated[0].id);
    }
  };

  const handleExtractFromLog = () => {
    if (!targetMatchForExtract) return;
    const standardized = matchRecordToStandardizedLog(targetMatchForExtract);
    const persona = runPersonaExtractorAgent(standardized, selectedPlayerIdForExtract);

    const playerName =
      targetMatchForExtract.players.find((p) => p.id === selectedPlayerIdForExtract)?.name ||
      'メンバー';

    const newAgent: CustomAgentConfig = {
      id: `agent_extracted_${Date.now()}`,
      name: `${playerName.split(' ')[0]}式・牌譜抽出アナライザー`,
      author: playerName,
      description: `牌譜 [${targetMatchForExtract.id.slice(0, 10)}] より抽出。鳴き率${persona.callTendency}%・守備度${persona.defensePriority}%の雀風に基づくエージェント。`,
      category: 'PERSONA',
      badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
      careLevelScrutiny: persona.defensePriority,
      pushToleranceShanten: persona.pushShantenThreshold,
      focusMetric: persona.defensePriority > 70 ? 'DEFENSE' : 'ATTACK',
      customSystemPrompt: `あなたはこのメンバー(${playerName})の雀風を再現するAIアナリストです。守備力${persona.defensePriority}%、鳴き志向${persona.callTendency}%の観点から局面を評価してください。`,
      createdAt: Date.now(),
    };

    const updated = [newAgent, ...agents];
    setAgents(updated);
    localStorage.setItem('mahjong_custom_agents', JSON.stringify(updated));
    setActiveAgentId(newAgent.id);
    setExtractSuccessMsg(`『${newAgent.name}』を生成しエージェント一覧に追加しました！`);
    setSubTab('AGENTS_CONFIG');
  };

  const handleRunAgentDiagnostics = async () => {
    if (!targetMatch || !activeAgent) return;
    setIsRunningAgent(true);
    setDiagnosticReport(null);

    try {
      const matchLog = matchRecordToStandardizedLog(targetMatch);
      const res = await fetch('/api/ai/agent-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentPrompt: `${activeAgent.customSystemPrompt}\n\n【エージェント監査条件】:\n- 放銃審査厳しさ: ${activeAgent.careLevelScrutiny}/100\n- 無謀押し許容向聴数: ${activeAgent.pushToleranceShanten}向聴\n- 重視指標: ${activeAgent.focusMetric}`,
          matchLog,
        }),
      });
      const data = await res.json();
      setDiagnosticReport(data.result || '診断レポートを受信できませんでした。');
    } catch (e: any) {
      setDiagnosticReport('エージェント診断エラー: ' + e?.message);
    } finally {
      setIsRunningAgent(false);
    }
  };

  // Convert CustomAgentConfig to PersonaProfile for Simulator Bot
  const handleDeployToSimulator = (seatIndex: number) => {
    if (!onSetAgentToSimulator) return;
    const persona: PersonaProfile = {
      id: activeAgent.id,
      name: activeAgent.name.split('・')[0] || activeAgent.name,
      avatarSeed: activeAgent.id,
      description: activeAgent.description,
      styleTag: activeAgent.focusMetric,
      isAiBot: true,
      callTendency: activeAgent.focusMetric === 'ATTACK' ? 70 : 35,
      riichiTendency: activeAgent.focusMetric === 'ATTACK' ? 75 : 55,
      defensePriority: activeAgent.careLevelScrutiny,
      badWaitTolerance: activeAgent.focusMetric === 'ATTACK' ? 50 : 25,
      damaPreference: activeAgent.focusMetric === 'LEAD_MANAGEMENT' ? 65 : 40,
      maneManganHunter: 10,
      pushShantenThreshold: activeAgent.pushToleranceShanten,
    };
    onSetAgentToSimulator(seatIndex, persona);
    if (onNavigateToTab) {
      onNavigateToTab('SIMULATOR');
    }
  };

  // Tactical Situations for "What to Discard Bench" (何切る比較ベンチ)
  const TACTICAL_SCENARIOS = [
    {
      title: '局面1: 相手先制立直に対し、自手ドラ2の一向聴（勝負 vs ベタオリ）',
      context: '東2局 8巡目 平場。対面が先制リーチ。自分は赤1ドラ1の良形一向聴（1シャンテン）。',
      hand: [
        { id: '2m', suit: 'm' as const, value: 2 },
        { id: '3m', suit: 'm' as const, value: 3 },
        { id: '4m', suit: 'm' as const, value: 4 },
        { id: '5m_red', suit: 'm' as const, value: 5, isRed: true },
        { id: '6m', suit: 'm' as const, value: 6 },
        { id: '7m', suit: 'm' as const, value: 7 },
        { id: '4p', suit: 'p' as const, value: 4 },
        { id: '5p', suit: 'p' as const, value: 5 },
        { id: '6s', suit: 's' as const, value: 6 },
        { id: '7s', suit: 's' as const, value: 7 },
        { id: '8s', suit: 's' as const, value: 8 },
        { id: '4p_danger', suit: 'p' as const, value: 4 },
        { id: 'north_safe', suit: 'z' as const, value: 4 },
      ],
      drawnTile: { id: '4p_danger', suit: 'p' as const, value: 4 },
      decisions: (agent: CustomAgentConfig) => {
        if (agent.careLevelScrutiny >= 75 || agent.focusMetric === 'DEFENSE') {
          return {
            choice: '北 (完全現物でベタオリ)',
            reason: `守備厳しさ${agent.careLevelScrutiny}%のため、相手立直に一向聴から無筋4筒を押すリスクを排除。即座に現物『北』を切って撤退。`,
            badge: '徹底守備・失点回避',
            badgeColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-800',
          };
        } else if (agent.focusMetric === 'ATTACK' || agent.pushToleranceShanten >= 2) {
          return {
            choice: '4筒 (危険牌プッシュ・打点勝負)',
            reason: `攻撃重視（無謀押し許容${agent.pushToleranceShanten}向聴）のため、赤5萬ドラ含みの勝負手と判断。4筒を勝負してテンパイ取りへ直進。`,
            badge: '強気の攻め・打点重視',
            badgeColor: 'text-rose-400 bg-rose-950/80 border-rose-800',
          };
        } else {
          return {
            choice: '6索 (スジ牌で回り込み)',
            reason: `バランス型として、完全無筋の4筒は切りきれず、スジや端寄りの牌で一歩後退しつつ様子見。`,
            badge: 'バランス回し打ち',
            badgeColor: 'text-sky-400 bg-sky-950/80 border-sky-800',
          };
        }
      },
    },
    {
      title: '局面2: 東1局 序盤5巡目 役牌「中」の1枚目ポン判断',
      context: '東1局 5巡目。自手はドラ1の門前手牌。上家から生牌の「中」が出た。',
      hand: [
        { id: '1m', suit: 'm' as const, value: 1 },
        { id: '2m', suit: 'm' as const, value: 2 },
        { id: '3m', suit: 'm' as const, value: 3 },
        { id: '5p', suit: 'p' as const, value: 5 },
        { id: '6p', suit: 'p' as const, value: 6 },
        { id: '7p', suit: 'p' as const, value: 7 },
        { id: '2s', suit: 's' as const, value: 2 },
        { id: '3s', suit: 's' as const, value: 3 },
        { id: '4s', suit: 's' as const, value: 4 },
        { id: '8s', suit: 's' as const, value: 8 },
        { id: '8s_2', suit: 's' as const, value: 8 },
        { id: 'chun_1', suit: 'z' as const, value: 7 },
        { id: 'chun_2', suit: 'z' as const, value: 7 },
      ],
      drawnTile: { id: 'chun_call', suit: 'z' as const, value: 7 },
      decisions: (agent: CustomAgentConfig) => {
        if (agent.focusMetric === 'ATTACK') {
          return {
            choice: 'ポン (速攻でアガリを確定)',
            reason: `攻撃速度優先。1枚目から鳴いてアガリに向かい、相手の進行を牽制。`,
            badge: 'スピード速攻',
            badgeColor: 'text-rose-400 bg-rose-950/80 border-rose-800',
          };
        } else {
          return {
            choice: 'スルー (門前高打点・立直志向)',
            reason: `門前の好形手牌のため、1枚目の安易な鳴きは控え、門前リーチによる高打点(満貫以上)を狙う。`,
            badge: '門前高打点志向',
            badgeColor: 'text-sky-400 bg-sky-950/80 border-sky-800',
          };
        }
      },
    },
    {
      title: '局面3: 南4局 オーラス 自分がトップ目 (29,000点持ち、2着と3,500点差)',
      context: 'オーラス。2着と僅差のトップ。3着目から早めのリーチが入った。',
      hand: [
        { id: '2m', suit: 'm' as const, value: 2 },
        { id: '3m', suit: 'm' as const, value: 3 },
        { id: '4m', suit: 'm' as const, value: 4 },
        { id: '6p', suit: 'p' as const, value: 6 },
        { id: '7p', suit: 'p' as const, value: 7 },
        { id: '8p', suit: 'p' as const, value: 8 },
        { id: '1s', suit: 's' as const, value: 1 },
        { id: '1s_2', suit: 's' as const, value: 1 },
        { id: '9m', suit: 'm' as const, value: 9 },
        { id: '9m_2', suit: 'm' as const, value: 9 },
        { id: 'east', suit: 'z' as const, value: 1 },
        { id: 'west', suit: 'z' as const, value: 3 },
        { id: 'south', suit: 'z' as const, value: 2 },
      ],
      drawnTile: { id: 'danger_7s', suit: 's' as const, value: 7 },
      decisions: (agent: CustomAgentConfig) => {
        if (agent.focusMetric === 'LEAD_MANAGEMENT' || agent.careLevelScrutiny >= 70) {
          return {
            choice: 'ベタオリ (トップ死守最優先)',
            reason: `3着目のアガリでも自分がトップ終了する可能性が高いため、絶対に直撃放銃を回避。現物を連打して局消化を待つ。`,
            badge: 'リード死守・逃げ切り',
            badgeColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-800',
          };
        } else {
          return {
            choice: '安手かわし手作り',
            reason: `テンパイ料での逆転やツモられによる着順降下を警戒し、最小限の安全度を保ちながら安手での局消化を狙う。`,
            badge: 'リスクコントロール',
            badgeColor: 'text-amber-400 bg-amber-950/80 border-amber-800',
          };
        }
      },
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bot className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                カスタム分析エージェント・スタジオ (Custom Agent Studio)
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              メンバー各自の麻雀観（守備・攻撃・リード防衛・Mリーグ基準など）に基づき、
              独自の分析エージェントを自由に設計・命名・登録できます。
              さらに天鳳・雀魂の牌譜からメンバーの思考癖を自動抽出したり、何切る局面での思考比較が可能です。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsCreatingNew(true);
                setSubTab('AGENTS_CONFIG');
                setFormName('');
                setFormDesc('');
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>新規エージェント作成</span>
            </button>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800/80 text-xs font-semibold">
          <button
            onClick={() => setSubTab('AGENTS_CONFIG')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'AGENTS_CONFIG'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>エージェント管理＆対局診断</span>
          </button>
          <button
            onClick={() => setSubTab('LOG_EXTRACTOR')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'LOG_EXTRACTOR'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>牌譜からペルソナ自動抽出</span>
          </button>
          <button
            onClick={() => setSubTab('WHAT_TO_DISCARD_BENCH')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'WHAT_TO_DISCARD_BENCH'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>メンバー何切るベンチ比較</span>
          </button>
        </div>
      </div>

      {extractSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between">
          <span>{extractSuccessMsg}</span>
          <button
            onClick={() => setExtractSuccessMsg(null)}
            className="text-emerald-400 hover:text-emerald-200 underline font-semibold ml-4 cursor-pointer"
          >
            閉じる
          </button>
        </div>
      )}

      {/* SubTab 1: Agents Config & Diagnostics */}
      {subTab === 'AGENTS_CONFIG' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Agent List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
              <span>登録エージェント一覧 ({agents.length})</span>
            </div>

            <div className="space-y-2">
              {agents.map((ag) => {
                const isSelected = ag.id === activeAgentId && !isCreatingNew;

                return (
                  <div
                    key={ag.id}
                    onClick={() => {
                      setActiveAgentId(ag.id);
                      setIsCreatingNew(false);
                      setDiagnosticReport(null);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-white">{ag.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-2">
                      <span>
                        作成者: <strong className="text-slate-300 font-medium">{ag.author}</strong>
                      </span>
                      <span>·</span>
                      <span className="font-mono text-emerald-400">厳しさ: {ag.careLevelScrutiny}%</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {ag.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Agent Config & Test Diagnostics */}
          <div className="lg:col-span-2 space-y-6">
            {isCreatingNew ? (
              /* Creation Form */
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 animate-in fade-in">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-400" />
                  <span>新しい分析エージェントの作成</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      エージェント名
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="例: 山田式・押し引き境界値アナライザー"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      作成者 (メンバー名)
                    </label>
                    <input
                      type="text"
                      value={formAuthor}
                      onChange={(e) => setFormAuthor(e.target.value)}
                      placeholder="例: 山田"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    エージェントの解説・設計意図
                  </label>
                  <input
                    type="text"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="例: 2向聴からの危険牌押しを厳しくチェックする守備特化"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">放銃審査の厳しさ</span>
                      <span className="font-mono text-emerald-400 font-bold">{formScrutiny}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formScrutiny}
                      onChange={(e) => setFormScrutiny(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">無謀押し判定向聴数</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {formPushShanten}向聴以上
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      value={formPushShanten}
                      onChange={(e) => setFormPushShanten(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="block text-xs text-slate-300 mb-1">重視指標</span>
                    <select
                      value={formFocus}
                      onChange={(e) => setFormFocus(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                    >
                      <option value="DEFENSE">守備・ベタオリ重視</option>
                      <option value="ATTACK">攻撃・アガリ速度重視</option>
                      <option value="LEAD_MANAGEMENT">リード防衛重視</option>
                      <option value="BALANCE">バランス型</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    AIプロンプト指示（このエージェントにどう分析させるか）
                  </label>
                  <textarea
                    rows={3}
                    value={formPrompt}
                    onChange={(e) => setFormPrompt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed font-mono"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setIsCreatingNew(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg cursor-pointer"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveNewAgent}
                    disabled={!formName.trim()}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs text-white font-semibold rounded-lg shadow-lg shadow-emerald-950 cursor-pointer"
                  >
                    エージェントを登録
                  </button>
                </div>
              </div>
            ) : (
              /* Active Agent Detail & Run Box */
              activeAgent && (
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
                  <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{activeAgent.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800">
                          Author: {activeAgent.author}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {activeAgent.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeAgent.id.startsWith('agent_custom_') && (
                        <button
                          onClick={() => handleDeleteAgent(activeAgent.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="このエージェントを削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Agent Parameter Strip */}
                  <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px]">放銃審査厳しさ</span>
                      <span className="font-bold text-emerald-400">{activeAgent.careLevelScrutiny}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">無謀押し基準</span>
                      <span className="font-bold text-emerald-400">
                        {activeAgent.pushToleranceShanten}向聴以上
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">重視戦術</span>
                      <span className="font-bold text-emerald-400">{activeAgent.focusMetric}</span>
                    </div>
                  </div>

                  {/* Simulator Deployment Action */}
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-emerald-300 block">
                        仮想メンバー卓にセット
                      </span>
                      <span className="text-[11px] text-slate-400">
                        このエージェントを対局シミュレータのBotとして参加させ、他メンバーと対戦テストできます。
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {[1, 2, 3].map((seat) => (
                        <button
                          key={seat}
                          onClick={() => handleDeployToSimulator(seat)}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-emerald-600 text-xs text-slate-200 hover:text-white border border-slate-700 rounded-lg transition-colors cursor-pointer"
                        >
                          席 P{seat + 1} に配置
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Diagnostics Trigger on Target Match */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">
                          診断対象牌譜: {targetMatch ? targetMatch.id : '牌譜なし'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {targetMatch
                            ? `参加: ${targetMatch.players.map((p) => p.name.split(' ')[0]).join(', ')}`
                            : 'インポーターから牌譜を読み込んでください'}
                        </span>
                      </div>

                      <button
                        onClick={handleRunAgentDiagnostics}
                        disabled={!targetMatch || isRunningAgent}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {isRunningAgent ? (
                          <Sparkles className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>{isRunningAgent ? '診断実行中...' : 'このエージェントで診断'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Diagnostic Report Output */}
                  {diagnosticReport && (
                    <div className="p-5 rounded-xl bg-slate-950 border border-emerald-900/60 space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                        <Sparkles className="w-4 h-4" />
                        <span>【{activeAgent.name} による診断レポート】</span>
                      </div>
                      <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans pt-1">
                        {diagnosticReport}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* SubTab 2: Log Extractor (牌譜から自動ペルソナ抽出) */}
      {subTab === 'LOG_EXTRACTOR' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <BrainCircuit className="w-5 h-5 text-emerald-400" />
              <span>牌譜ログからのメンバー・ペルソナ自動抽出</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              天鳳や雀魂からインポートした実戦牌譜を選択し、特定のプレイヤーを指定するだけで、
              その人の実戦スタッツ（鳴き率、立直率、放銃ケアレベル、無謀押し傾向）からエージェントをワンクリック生成します。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Select Match */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">1. 解析対象の牌譜を選択</label>
              <select
                value={selectedMatchIdForExtract}
                onChange={(e) => {
                  setSelectedMatchIdForExtract(e.target.value);
                  const m = allMatches.find((match) => match.id === e.target.value);
                  if (m && m.players[0]) {
                    setSelectedPlayerIdForExtract(m.players[0].id);
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
              >
                {allMatches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} ({m.players.map((p) => p.name.split(' ')[0]).join('/')})
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Select Player */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">2. 抽出対象のメンバーを選択</label>
              <select
                value={selectedPlayerIdForExtract}
                onChange={(e) => setSelectedPlayerIdForExtract(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              >
                {targetMatchForExtract?.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (順位: {p.rank}位 / 点数: {p.finalScore.toLocaleString()}点)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats Preview Card */}
          {targetMatchForExtract && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <span className="text-xs font-bold text-emerald-400 block">
                抽出元プレイヤーの実戦戦績サマリー
              </span>
              {(() => {
                const targetP =
                  targetMatchForExtract.players.find((p) => p.id === selectedPlayerIdForExtract) ||
                  targetMatchForExtract.players[0];

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">最終スコア / 順位</span>
                      <span className="font-bold text-white">
                        {targetP.finalScore.toLocaleString()}点 (#{targetP.rank}位)
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">放銃回数</span>
                      <span className="font-bold text-emerald-400">{targetP.totalDealIns}回</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">無謀押し (2〜3向聴)</span>
                      <span className="font-bold text-rose-400">{targetP.unreasonablePushes}回</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Lv.4不用意放銃</span>
                      <span className="font-bold text-amber-400">
                        {targetP.careLevelCounts[4] || 0}回
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleExtractFromLog}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>このメンバーからエージェントを自動生成</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SubTab 3: What to Discard Bench (メンバー何切るベンチ) */}
      {subTab === 'WHAT_TO_DISCARD_BENCH' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <Compass className="w-5 h-5 text-emerald-400" />
              <span>メンバー何切るベンチマーク（局面別・エージェント打牌判断比較）</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              同一の局面に対して、メンバー各自のエージェントが「何を切るか」「どのような思考理由で選択するか」を並べて比較できます。
              エージェントの雀風やパラメータ（守備度・向聴押し基準）が正しく反映されているかを客観検証できます。
            </p>
          </div>

          {/* Scenario Selector */}
          <div className="flex flex-wrap gap-2">
            {TACTICAL_SCENARIOS.map((sc, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedScenarioIdx(idx)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  selectedScenarioIdx === idx
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {sc.title.split('（')[0]}
              </button>
            ))}
          </div>

          {/* Active Scenario Card */}
          {(() => {
            const sc = TACTICAL_SCENARIOS[selectedScenarioIdx];

            return (
              <div className="space-y-6">
                <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{sc.title}</h4>
                    <span className="text-[11px] text-slate-400">{sc.context}</span>
                  </div>

                  {/* Tile Visual Hand */}
                  <div className="pt-2">
                    <span className="text-[10px] text-slate-500 block mb-1">手牌（ツモ牌を含む）:</span>
                    <div className="flex flex-wrap items-center gap-1">
                      {sc.hand.map((tile, i) => (
                        <TileView key={i} tile={tile} size="md" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Agents Decisions Comparison Grid */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300">
                    メンバーエージェント別の打牌判断 ({agents.length}名)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {agents.map((ag) => {
                      const dec = sc.decisions(ag);

                      return (
                        <div
                          key={ag.id}
                          className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white">{ag.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                ({ag.author})
                              </span>
                            </div>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${dec.badgeColor}`}
                            >
                              {dec.badge}
                            </span>
                          </div>

                          <div className="flex items-baseline gap-2">
                            <span className="text-[11px] text-slate-400">選択:</span>
                            <span className="font-bold text-sm text-emerald-400 font-mono">
                              {dec.choice}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60 font-sans">
                            {dec.reason}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-mono">
                            <span>守備厳しさ: {ag.careLevelScrutiny}%</span>
                            <span>無謀押し: {ag.pushToleranceShanten}向聴</span>
                            <span>戦術: {ag.focusMetric}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
