import {
  Tile,
  CareLevel,
  CareLevelExplanation,
  DealInAnalysis,
  WaitShape,
  HeadToHeadStats,
  MatchRecord,
  SetSession,
} from '../types/mahjong';
import { isTerminalOrHonor, isHonor, getTileKey } from './tiles';

export const CARE_LEVEL_DEFINITIONS: Record<CareLevel, CareLevelExplanation> = {
  1: {
    level: 1,
    title: 'Lv.1 不可避・安牌/安全域放銃',
    description: '現物・完全安全牌・他家通過牌など、防御を尽くした上での不可避な放銃（事故放銃）。',
    badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
    severity: 'MINIMAL',
  },
  2: {
    level: 2,
    title: 'Lv.2 スジ・カベ押し込み放銃',
    description: 'スジ牌・カベ牌の安全度を頼りに攻め込んだが、裏目に出て刺さった放銃。合理的なリスクテイク。',
    badgeColor: 'text-sky-400 bg-sky-950/60 border-sky-800',
    severity: 'MODERATE',
  },
  3: {
    level: 3,
    title: 'Lv.3 愚形・変則待ち捕捉放銃',
    description: 'カンチャン・ペンチャン・シャボ・単騎など、読みにくい変則待ちや引っかけに刺さった放銃。',
    badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800',
    severity: 'SERIOUS',
  },
  4: {
    level: 4,
    title: 'Lv.4 無筋・不用意・無防備放銃',
    description: '無筋の危険牌・生牌役牌を無防備に切り飛ばしての放銃。典型的な押し引き判断ミス。',
    badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-800',
    severity: 'CRITICAL',
  },
};

// Evaluate Deal-in Care Level (放銃ケアレベル評価)
export function evaluateDealInCareLevel(params: {
  discardTile: Tile;
  winnerWaitShape: WaitShape;
  winnerIsRiichi: boolean;
  winnerIsOpenRiichi: boolean;
  dealerShanten: number; // Discarder's shanten count
  winnerDiscards: Tile[];
  allDiscardsOnTable: Tile[];
  isGenbutsu: boolean;
  pointsLost: number;
  winnerHan: number;
  winnerFu: number;
}): DealInAnalysis {
  const {
    discardTile,
    winnerWaitShape,
    winnerIsRiichi,
    winnerIsOpenRiichi,
    dealerShanten,
    winnerDiscards,
    allDiscardsOnTable,
    isGenbutsu,
    pointsLost,
    winnerHan,
    winnerFu,
  } = params;

  // 1. Unreasonable Push Score (無謀押しスコア):
  // Dealt in at 2-shanten or 3-shanten against active Riichi / Open Riichi
  const isAgainstActiveRiichi = winnerIsRiichi || winnerIsOpenRiichi;
  const unreasonablePush = isAgainstActiveRiichi && dealerShanten >= 2;

  // 2. Classify Care Level (Level 1..4)
  let careLevel: CareLevel = 4;
  let careDetails = '';

  // Level 1: Genbutsu (現物) or 100% safe tile dealt in
  if (isGenbutsu) {
    careLevel = 1;
    careDetails = 'ロン牌は相手の現物または絶対安全牌でした。他家フリテン等の不可避な放銃です。';
  }
  // Level 3: Trick / Unconventional waits (Kanchan, Penchan, Shanpon, Tanki)
  else if (['KANCHAN', 'PENCHAN', 'SHANPON', 'TANKI'].includes(winnerWaitShape)) {
    careLevel = 3;
    const shapeLabel =
      winnerWaitShape === 'KANCHAN'
        ? 'カンチャン'
        : winnerWaitShape === 'PENCHAN'
        ? 'ペンチャン'
        : winnerWaitShape === 'SHANPON'
        ? 'シャボ'
        : '単騎';
    careDetails = `相手の待ち形は ${shapeLabel}（愚形・変則待ち）でした。一般的な両面読みの盲点を突かれた放銃です。`;
  }
  // Level 2: Suji (スジ) or Kabe (カベ) dependency push
  else if (checkIsSujiOrKabe(discardTile, winnerDiscards, allDiscardsOnTable)) {
    careLevel = 2;
    careDetails = 'スジ・ノーチャンス等の安全牌理論に沿って打牌しましたが、跨ぎやスジ引っかけで刺さりました。';
  }
  // Level 4: Careless deal-in on unsuited live honors or unprotected raw tile
  else {
    careLevel = 4;
    careDetails = isHonor(discardTile)
      ? '生牌の字牌を立直に対して無防備に切り飛ばしての危険放銃です。'
      : '無筋の危険牌を十分な打点・向聴の根拠なく勝負しての致命的な放銃です。';
  }

  // Open Riichi Yakuman penalty check
  const isOpenRiichiYakumanPenalty = winnerIsOpenRiichi && pointsLost >= 32000;

  return {
    careLevel,
    careDetails,
    unreasonablePush,
    dealInShanten: dealerShanten,
    targetWaitShape: winnerWaitShape,
    winningHandHan: winnerHan,
    winningHandFu: winnerFu,
    pointsLost,
    isAgainstOpenRiichi: winnerIsOpenRiichi,
    isOpenRiichiYakumanPenalty,
  };
}

// Helper: Check if a tile is Suji or Kabe (wall) relative to opponents
function checkIsSujiOrKabe(
  tile: Tile,
  winnerDiscards: Tile[],
  allDiscards: Tile[]
): boolean {
  if (tile.suit === 'z') return false;

  // Check Suji: e.g. if 1 and 7 are discarded, 4 is suji. If 4 discarded, 1 and 7 are suji.
  const val = tile.value;
  const suitDiscards = winnerDiscards.filter((t) => t.suit === tile.suit).map((t) => t.value);

  if (val === 1 && suitDiscards.includes(4)) return true;
  if (val === 4 && (suitDiscards.includes(1) || suitDiscards.includes(7))) return true;
  if (val === 7 && suitDiscards.includes(4)) return true;
  if (val === 2 && suitDiscards.includes(5)) return true;
  if (val === 5 && (suitDiscards.includes(2) || suitDiscards.includes(8))) return true;
  if (val === 8 && suitDiscards.includes(5)) return true;
  if (val === 3 && suitDiscards.includes(6)) return true;
  if (val === 6 && (suitDiscards.includes(3) || suitDiscards.includes(9))) return true;
  if (val === 9 && suitDiscards.includes(6)) return true;

  // Check Kabe (all 4 copies of an adjacent number seen in visible discards)
  const allSuitCounts = allDiscards.filter((t) => t.suit === tile.suit && t.value === val - 1).length;
  if (allSuitCounts >= 3) return true;

  return false;
}

// -------------------------------------------------------------
// Matchup & Multi-Game Set Analytics
// -------------------------------------------------------------

export interface SetAnalyticsResult {
  totalSets: number;
  totalGames: number;
  leadDefenseCapability: {
    // Leading at 1st half (Game 1-3) and maintaining lead to win the Set
    totalMidpointLeads: number;
    successfulDefenses: number;
    ratePercent: number;
  };
  behindRecoveryCapability: {
    // Trailing at 1st half and staging a 2nd half comeback (finishing top 2 or positive uma)
    totalMidpointDeficits: number;
    successfulComebacks: number;
    ratePercent: number;
  };
  careLevelDistribution: Record<CareLevel, { count: number; percentage: number }>;
  totalUnreasonablePushes: number;
  headToHeadMatrix: HeadToHeadStats[];
  waitShapeBreakdown: {
    ryanmenCount: number;
    badWaitCount: number;
    ryanmenRatePercent: number;
  };
  damaStats: {
    damaWins: number;
    totalWins: number;
    damaWinRatePercent: number;
  };
}

export function aggregateSetAnalytics(sessions: SetSession[]): SetAnalyticsResult {
  let totalSets = sessions.length;
  let totalGames = 0;
  let totalMidpointLeads = 0;
  let successfulDefenses = 0;
  let totalMidpointDeficits = 0;
  let successfulComebacks = 0;

  const careLevelCounts: Record<CareLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let totalDealIns = 0;
  let totalUnreasonablePushes = 0;

  let ryanmenCount = 0;
  let badWaitCount = 0;
  let damaWins = 0;
  let totalWins = 0;

  // Head-to-Head Aggregation Map: "playerAId->playerBId" => HeadToHeadStats
  const h2hMap: Record<string, HeadToHeadStats> = {};

  for (const session of sessions) {
    const validGames = session.gameRecords.filter((g) => g.isRecorded !== false);
    totalGames += validGames.length;

    // Check Set-level Lead Defense & Behind Recovery for sets with >= 4 games
    if (validGames.length >= 4) {
      const midpointIndex = Math.floor(validGames.length / 2) - 1;
      const midpointScores: Record<string, number> = {};
      const finalScores: Record<string, number> = {};

      session.players.forEach((p) => {
        midpointScores[p.id] = 0;
        finalScores[p.id] = 0;
      });

      // Sum points up to midpoint
      for (let i = 0; i <= midpointIndex; i++) {
        const g = validGames[i];
        g.players.forEach((p) => {
          midpointScores[p.id] = (midpointScores[p.id] || 0) + p.umaDiff;
        });
      }

      // Sum points for full set
      validGames.forEach((g) => {
        g.players.forEach((p) => {
          finalScores[p.id] = (finalScores[p.id] || 0) + p.umaDiff;
        });
      });

      // Determine midpoint leader and trailers
      const sortedMidpoint = Object.entries(midpointScores).sort((a, b) => b[1] - a[1]);
      const sortedFinal = Object.entries(finalScores).sort((a, b) => b[1] - a[1]);

      if (sortedMidpoint.length > 0 && sortedFinal.length > 0) {
        const midpointLeaderId = sortedMidpoint[0][0];
        const finalLeaderId = sortedFinal[0][0];

        totalMidpointLeads++;
        if (midpointLeaderId === finalLeaderId) {
          successfulDefenses++;
        }

        // Trailing player (bottom 2 at midpoint)
        const trailers = sortedMidpoint.slice(2).map((x) => x[0]);
        for (const trailerId of trailers) {
          totalMidpointDeficits++;
          const finalRank = sortedFinal.findIndex((x) => x[0] === trailerId);
          // If came back into top 2
          if (finalRank === 0 || finalRank === 1) {
            successfulComebacks++;
          }
        }
      }
    }

    // Process actions and deal-ins across all games
    for (const game of validGames) {
      for (const p of game.players) {
        totalUnreasonablePushes += p.unreasonablePushes || 0;
        for (const lvl of [1, 2, 3, 4] as CareLevel[]) {
          const c = p.careLevelCounts?.[lvl] || 0;
          careLevelCounts[lvl] += c;
          totalDealIns += c;
        }
      }

      for (const act of game.telemetryActions) {
        if (act.actionType === 'RON' || act.actionType === 'TSUMO') {
          totalWins++;
          if (act.isDamaTenpai) damaWins++;

          if (act.dealInAnalysis) {
            const shape = act.dealInAnalysis.targetWaitShape;
            if (shape === 'RYANMEN') ryanmenCount++;
            else badWaitCount++;
          }
        }
      }
    }
  }

  // Pre-fill head to head matrix for first session players
  if (sessions.length > 0) {
    const players = sessions[0].players;
    for (let i = 0; i < players.length; i++) {
      for (let j = 0; j < players.length; j++) {
        if (i !== j) {
          const key = `${players[i].id}->${players[j].id}`;
          if (!h2hMap[key]) {
            h2hMap[key] = {
              playerAId: players[i].id,
              playerAName: players[i].name,
              playerBId: players[j].id,
              playerBName: players[j].name,
              dealInsAtoB: 0,
              pointsPaidAtoB: 0,
              dealInsBtoA: 0,
              pointsPaidBtoA: 0,
              netPointsForA: 0,
            };
          }
        }
      }
    }
  }

  const careLevelDistribution: Record<CareLevel, { count: number; percentage: number }> = {
    1: {
      count: careLevelCounts[1],
      percentage: totalDealIns > 0 ? Math.round((careLevelCounts[1] / totalDealIns) * 100) : 0,
    },
    2: {
      count: careLevelCounts[2],
      percentage: totalDealIns > 0 ? Math.round((careLevelCounts[2] / totalDealIns) * 100) : 0,
    },
    3: {
      count: careLevelCounts[3],
      percentage: totalDealIns > 0 ? Math.round((careLevelCounts[3] / totalDealIns) * 100) : 0,
    },
    4: {
      count: careLevelCounts[4],
      percentage: totalDealIns > 0 ? Math.round((careLevelCounts[4] / totalDealIns) * 100) : 0,
    },
  };

  const totalWaits = ryanmenCount + badWaitCount;

  return {
    totalSets,
    totalGames,
    leadDefenseCapability: {
      totalMidpointLeads,
      successfulDefenses,
      ratePercent:
        totalMidpointLeads > 0
          ? Math.round((successfulDefenses / totalMidpointLeads) * 100)
          : 0,
    },
    behindRecoveryCapability: {
      totalMidpointDeficits,
      successfulComebacks,
      ratePercent:
        totalMidpointDeficits > 0
          ? Math.round((successfulComebacks / totalMidpointDeficits) * 100)
          : 0,
    },
    careLevelDistribution,
    totalUnreasonablePushes,
    headToHeadMatrix: Object.values(h2hMap),
    waitShapeBreakdown: {
      ryanmenCount,
      badWaitCount,
      ryanmenRatePercent: totalWaits > 0 ? Math.round((ryanmenCount / totalWaits) * 100) : 60,
    },
    damaStats: {
      damaWins,
      totalWins,
      damaWinRatePercent: totalWins > 0 ? Math.round((damaWins / totalWins) * 100) : 0,
    },
  };
}
