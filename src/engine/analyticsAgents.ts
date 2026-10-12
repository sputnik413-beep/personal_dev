import {
  StandardizedMatchLog,
  AnalyticalAgentMetadata,
  CareLevel,
  MatchRecord,
  PersonaProfile,
  HeadToHeadStats,
} from '../types/mahjong';
import { aggregateSetAnalytics, CARE_LEVEL_DEFINITIONS } from './telemetry';

export const PLUGGED_ANALYTICAL_AGENTS: AnalyticalAgentMetadata[] = [
  {
    id: 'agent_care_auditor',
    name: '放銃ケアレベル監査エージェント',
    tag: 'CARE_AUDITOR',
    category: 'CARE_AUDIT',
    description: '牌譜内の全放銃をLv.1〜4に自動分類し、相手立直に対する2〜3向聴の「無謀押し」を検出・警告。',
    author: 'Platform Core',
    badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-800',
  },
  {
    id: 'agent_set_quant',
    name: '半荘セット先行逃げ切り＆逆転挽回エージェント',
    tag: 'SET_RESILIENCE_QUANT',
    category: 'SET_QUANT',
    description: '6半荘セット等の前半リード保持率（逃げ切り率）と、劣勢時からの後半まくり率（逆転挽回率）をクオンツ算出。',
    author: 'Quant Team',
    badgeColor: 'text-sky-400 bg-sky-950/60 border-sky-800',
  },
  {
    id: 'agent_matchup_matrix',
    name: '対戦相手別相性・点数移動マトリクスエージェント',
    tag: 'MATCHUP_PREDATOR',
    category: 'MATCHUP',
    description: 'ペア間の直撃・被直撃の点数移動を追跡し、誰が誰から搾取しているかの力関係を算出。',
    author: 'Matchup Lab',
    badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-800',
  },
  {
    id: 'agent_persona_synthesizer',
    name: '実戦牌譜ペルソナBot合成エージェント',
    tag: 'PERSONA_SYNTHESIZER',
    category: 'PERSONA',
    description: '打牌ログ・鳴き率・立直判断からプレイヤーの思考癖を抽出し、対戦Botとして再現。',
    author: 'AI Persona Engine',
    badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
  },
  {
    id: 'agent_custom_ai_consultant',
    name: 'カスタムAIクエリ・牌譜分析エージェント',
    tag: 'CUSTOM_AI_AGENT',
    category: 'CUSTOM_AI',
    description: '標準牌譜JSONを入力として受け取り、自然言語プロンプトで独自の戦術レビューや仮説検証を実行。',
    author: 'Member Custom',
    badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800',
  },
];

// Helper: Convert MatchRecord to StandardizedMatchLog
export function matchRecordToStandardizedLog(game: MatchRecord): StandardizedMatchLog {
  const players = game.players.map((p, idx) => {
    const winds = ['EAST', 'SOUTH', 'WEST', 'NORTH'] as const;
    return {
      id: p.id,
      name: p.name,
      seatWind: winds[idx % 4],
      finalScore: p.finalScore,
      rank: p.rank,
      umaDiff: p.umaDiff,
      totalDealIns: p.totalDealIns,
      unreasonablePushes: p.unreasonablePushes,
      careLevelCounts: p.careLevelCounts,
      totalWins: game.telemetryActions.filter(
        (a) => (a.actionType === 'RON' || a.actionType === 'TSUMO') && a.playerIndex === idx
      ).length,
      damaWins: game.telemetryActions.filter(
        (a) => (a.actionType === 'RON' || a.actionType === 'TSUMO') && a.playerIndex === idx && a.isDamaTenpai
      ).length,
    };
  });

  return {
    version: '2.0.0-telemetry-standard',
    matchId: game.id,
    sessionId: game.sessionId,
    timestamp: game.startedAt,
    rules: game.rules,
    players,
    events: game.telemetryActions,
  };
}

// Agent 1 Execution: Care-Level Audit
export function runCareAuditorAgent(log: StandardizedMatchLog) {
  const totalDealIns = log.players.reduce((acc, p) => acc + p.totalDealIns, 0);
  const totalUnreasonable = log.players.reduce((acc, p) => acc + p.unreasonablePushes, 0);

  const levelSummary: Record<CareLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  log.players.forEach((p) => {
    ([1, 2, 3, 4] as CareLevel[]).forEach((lvl) => {
      levelSummary[lvl] += p.careLevelCounts[lvl] || 0;
    });
  });

  const blunderRatio = totalDealIns > 0 ? Math.round((levelSummary[4] / totalDealIns) * 100) : 0;

  return {
    totalDealIns,
    totalUnreasonable,
    levelSummary,
    blunderRatio,
    diagnosis:
      blunderRatio > 35
        ? '要注意: Lv.4（無筋・不用意放銃）の比率が35%を超過。相手立直時のベタオリ精度に改善余地あり。'
        : '良好: 不用意放銃は抑制されており、スジ・カベ押し込みまたは不可避放銃が中心。',
  };
}

// Agent 4 Execution: Synthesize Persona Bot from log
export function runPersonaExtractorAgent(log: StandardizedMatchLog, targetPlayerId: string): PersonaProfile {
  const pIndex = log.players.findIndex((p) => p.id === targetPlayerId);
  const player = log.players[pIndex] || log.players[0];

  const playerEvents = log.events.filter((e) => e.playerIndex === pIndex);
  const discardsCount = playerEvents.filter((e) => e.actionType === 'DISCARD').length;
  const riichiCount = playerEvents.filter((e) => e.actionType === 'RIICHI' || e.actionType === 'OPEN_RIICHI').length;
  const callsCount = playerEvents.filter((e) => ['CHI', 'PON', 'KAN'].includes(e.actionType)).length;

  const callTendency = Math.min(100, Math.round((callsCount / Math.max(1, discardsCount)) * 300));
  const riichiTendency = Math.min(100, Math.round((riichiCount / Math.max(1, log.players.length)) * 80));
  const defensePriority = Math.max(20, Math.min(95, 100 - (player.unreasonablePushes * 20)));

  return {
    id: `persona_extracted_${Date.now()}`,
    name: `${player.name.split(' ')[0]}・抽出ペルソナ`,
    avatarSeed: player.id,
    description: `牌譜ログ [${log.matchId.slice(0, 8)}] の実績値（鳴き率 ${callTendency}%, 守備志向 ${defensePriority}%）から生成。`,
    styleTag: defensePriority > 70 ? '堅守門前型' : '速攻攻撃型',
    isAiBot: true,
    callTendency,
    riichiTendency: Math.max(30, riichiTendency),
    defensePriority,
    badWaitTolerance: 40,
    damaPreference: 50,
    maneManganHunter: 20,
    pushShantenThreshold: player.unreasonablePushes > 0 ? 2 : 1,
  };
}
