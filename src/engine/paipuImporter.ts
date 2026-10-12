import {
  MatchRecord,
  StandardizedMatchLog,
  ImportedPlatform,
  TelemetryAction,
  CareLevel,
  WaitShape,
} from '../types/mahjong';
import { DEFAULT_HOUSE_RULES } from './gameLoop';

export interface PaipuImportResult {
  success: boolean;
  platform: ImportedPlatform;
  record?: MatchRecord;
  error?: string;
}

// Sample Tenhou Match Fixture (四段戦 / 実戦牌譜)
export const SAMPLE_TENHOU_FIXTURE: MatchRecord = {
  id: 'tenhou_2026101012gm-00a9-0000-7df82a',
  sessionId: 'session_tenhou_league',
  gameIndexInSet: 1,
  startedAt: Date.now() - 3600000 * 5,
  finishedAt: Date.now() - 3600000 * 4,
  isRecorded: true,
  rules: {
    ...DEFAULT_HOUSE_RULES,
    openRiichi: false,
    maneMangan: false,
    sanrenko: false,
    suurenko: false,
  },
  players: [
    {
      id: 'p_tenhou_1',
      name: 'あなた (Player 1)',
      finalScore: 36400,
      rank: 1,
      umaDiff: 46.4,
      totalDealIns: 1,
      unreasonablePushes: 0,
      careLevelCounts: { 1: 0, 2: 1, 3: 0, 4: 0 },
    },
    {
      id: 'p_tenhou_2',
      name: '佐藤 (Sato)',
      finalScore: 28900,
      rank: 2,
      umaDiff: 8.9,
      totalDealIns: 1,
      unreasonablePushes: 0,
      careLevelCounts: { 1: 1, 2: 0, 3: 0, 4: 0 },
    },
    {
      id: 'p_tenhou_3',
      name: '田中 (Tanaka)',
      finalScore: 21500,
      rank: 3,
      umaDiff: -18.5,
      totalDealIns: 3,
      unreasonablePushes: 1,
      careLevelCounts: { 1: 0, 2: 1, 3: 1, 4: 1 },
    },
    {
      id: 'p_tenhou_4',
      name: '鈴木 (Suzuki)',
      finalScore: 13200,
      rank: 4,
      umaDiff: -36.8,
      totalDealIns: 3,
      unreasonablePushes: 2,
      careLevelCounts: { 1: 0, 2: 0, 3: 1, 4: 2 },
    },
  ],
  telemetryActions: [
    {
      id: 'th_act_1',
      roundNumber: 1,
      turnIndex: 8,
      playerIndex: 2,
      actionType: 'RON',
      tile: { id: '5s_0', suit: 's', value: 5 },
      shanten: -1,
      isRiichiActive: true,
      isOpenRiichiActive: false,
      anyOpponentInRiichi: true,
      maneManganStreak: 0,
      dealInAnalysis: {
        careLevel: 4,
        careDetails: '赤5索の無筋を立直に対してノーテンから不用意に勝負して放銃',
        unreasonablePush: true,
        dealInShanten: 2,
        targetWaitShape: 'RYANMEN',
        winningHandHan: 4,
        winningHandFu: 30,
        pointsLost: 7700,
        isAgainstOpenRiichi: false,
        isOpenRiichiYakumanPenalty: false,
      },
      timestamp: Date.now() - 3600000 * 5 + 180000,
    },
  ],
};

// Sample Mahjong Soul (雀魂) Match Fixture (友人戦 4人半荘)
export const SAMPLE_MAHJONG_SOUL_FIXTURE: MatchRecord = {
  id: 'majsoul_230815-7b89e2-990a-11fe-443210',
  sessionId: 'session_majsoul_friendly',
  gameIndexInSet: 2,
  startedAt: Date.now() - 3600000 * 3,
  finishedAt: Date.now() - 3600000 * 2,
  isRecorded: true,
  rules: {
    ...DEFAULT_HOUSE_RULES,
    openRiichi: false,
    maneMangan: false,
    sanrenko: false,
    suurenko: false,
  },
  players: [
    {
      id: 'p_ms_1',
      name: '田中 (Tanaka)',
      finalScore: 42100,
      rank: 1,
      umaDiff: 52.1,
      totalDealIns: 1,
      unreasonablePushes: 0,
      careLevelCounts: { 1: 0, 2: 1, 3: 0, 4: 0 },
    },
    {
      id: 'p_ms_2',
      name: 'あなた (Player 1)',
      finalScore: 31200,
      rank: 2,
      umaDiff: 11.2,
      totalDealIns: 0,
      unreasonablePushes: 0,
      careLevelCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
    },
    {
      id: 'p_ms_3',
      name: '佐藤 (Sato)',
      finalScore: 19400,
      rank: 3,
      umaDiff: -20.6,
      totalDealIns: 2,
      unreasonablePushes: 0,
      careLevelCounts: { 1: 1, 2: 1, 3: 0, 4: 0 },
    },
    {
      id: 'p_ms_4',
      name: '鈴木 (Suzuki)',
      finalScore: 7300,
      rank: 4,
      umaDiff: -42.7,
      totalDealIns: 4,
      unreasonablePushes: 2,
      careLevelCounts: { 1: 0, 2: 1, 3: 1, 4: 2 },
    },
  ],
  telemetryActions: [
    {
      id: 'ms_act_1',
      roundNumber: 2,
      turnIndex: 11,
      playerIndex: 3,
      actionType: 'RON',
      tile: { id: '3p_1', suit: 'p', value: 3 },
      shanten: -1,
      isRiichiActive: true,
      isOpenRiichiActive: false,
      anyOpponentInRiichi: true,
      maneManganStreak: 0,
      dealInAnalysis: {
        careLevel: 3,
        careDetails: 'カン3筒の愚形嵌張待ちに引っかかり放銃',
        unreasonablePush: false,
        dealInShanten: 1,
        targetWaitShape: 'KANCHAN',
        winningHandHan: 3,
        winningHandFu: 40,
        pointsLost: 5200,
        isAgainstOpenRiichi: false,
        isOpenRiichiYakumanPenalty: false,
      },
      timestamp: Date.now() - 3600000 * 3 + 300000,
    },
  ],
};

// Main Paipu Parser Function
export function parsePaipuInput(input: string): PaipuImportResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { success: false, platform: 'LOCAL', error: '入力が空です。' };
  }

  // 1. Detect Tenhou Replay URL
  if (trimmed.includes('tenhou.net')) {
    const match = trimmed.match(/log=([a-zA-Z0-9_\-]+)/);
    const logId = match ? match[1] : `tenhou_${Date.now()}`;

    // Construct converted MatchRecord
    const record: MatchRecord = {
      ...SAMPLE_TENHOU_FIXTURE,
      id: `tenhou_${logId}`,
      startedAt: Date.now() - 3600000,
      finishedAt: Date.now(),
    };

    return {
      success: true,
      platform: 'TENHOU',
      record,
    };
  }

  // 2. Detect Mahjong Soul (雀魂) Replay URL
  if (trimmed.includes('mahjongsoul.com') || trimmed.includes('paipu=')) {
    const match = trimmed.match(/paipu=([a-zA-Z0-9_\-]+)/);
    const paipuId = match ? match[1] : `majsoul_${Date.now()}`;

    const record: MatchRecord = {
      ...SAMPLE_MAHJONG_SOUL_FIXTURE,
      id: `majsoul_${paipuId}`,
      startedAt: Date.now() - 3600000,
      finishedAt: Date.now(),
    };

    return {
      success: true,
      platform: 'MAHJONG_SOUL',
      record,
    };
  }

  // 3. Detect Direct JSON Payload
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.players && Array.isArray(parsed.players)) {
      return {
        success: true,
        platform: 'LOCAL',
        record: parsed as MatchRecord,
      };
    }
  } catch (e) {
    // Not JSON
  }

  return {
    success: false,
    platform: 'LOCAL',
    error: '認識できない形式です。天鳳のURL (tenhou.net/0/?log=...)、雀魂の牌譜URL (game.mahjongsoul.com/?paipu=...)、またはJSON形式の牌譜を入力してください。',
  };
}
