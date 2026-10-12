import { PersonaProfile, HouseRules } from '../types/mahjong';
import { STANDARD_GENERAL_RULES } from './gameLoop';

export interface SimulationMember {
  id: string;
  name: string;
  color: string; // Hex or Tailwind color for line chart (e.g. #10b981, #38bdf8, #f59e0b, #ec4899)
  persona: PersonaProfile;
}

export interface SimulationMemberResult {
  id: string;
  name: string;
  color: string;
  persona: PersonaProfile;
  totalScore: number; // 累積点棒 / 収支
  averageScorePerHanchan: number; // 1半荘あたりの平均素点
  averageRank: number; // 平均着順 (1.00〜4.00)
  rankCounts: [number, number, number, number]; // 1位, 2位, 3位, 4位
  rankRates: [number, number, number, number]; // 1位率%, 2位率%, 3位率%, 4位率(ラス率)%
  winRate: number; // 和了率 %
  dealInRate: number; // 放銃率 %
  riichiRate: number; // 立直率 %
  callRate: number; // 副露率 %
  unreasonablePushCount: number; // 無謀押し回数
  skillRating: number; // レーティング (初期1500基準)
}

export interface SimulationCurveSample {
  handIndex: number;
  scores: number[]; // Scores for members 0..3
  ratings: number[]; // Skill ratings for members 0..3
}

export interface SimulationRunSummary {
  runId: string;
  runTitle: string;
  timestamp: number;
  dateStr: string;
  totalHands: number; // 総対局数 (局数, 例: 1000局 = 約125半荘)
  estimatedHanchans: number;
  rules: HouseRules;
  members: SimulationMemberResult[];
  curveSamples: SimulationCurveSample[]; // Sampled points for line chart
  keyInsights: string[];
}

export const MEMBER_CHART_COLORS = [
  '#10b981', // Emerald (You / P1)
  '#38bdf8', // Sky (Sato / P2)
  '#f59e0b', // Amber (Tanaka / P3)
  '#ec4899', // Pink (Suzuki / P4)
];

// Initial Historical Simulation Runs (to demonstrate the skill evolution line chart immediately)
export const INITIAL_SIMULATION_HISTORY: SimulationRunSummary[] = [
  {
    runId: 'sim_run_1_baseline',
    runTitle: 'Ver 1.0 初期ベンチマーク (1,000局)',
    timestamp: Date.now() - 86400000 * 14,
    dateStr: '10/01 12:00',
    totalHands: 1000,
    estimatedHanchans: 125,
    rules: STANDARD_GENERAL_RULES,
    members: [
      {
        id: 'player_you',
        name: 'あなた',
        color: MEMBER_CHART_COLORS[0],
        persona: {
          id: 'p_you_v1',
          name: 'あなた (初期)',
          avatarSeed: 'you',
          description: '攻撃偏重、放銃率高めの初期状態',
          styleTag: '猪突猛進',
          isAiBot: true,
          callTendency: 50,
          riichiTendency: 70,
          defensePriority: 35,
          badWaitTolerance: 55,
          damaPreference: 20,
          maneManganHunter: 10,
          pushShantenThreshold: 2,
        },
        totalScore: -38500,
        averageScorePerHanchan: -308,
        averageRank: 2.72,
        rankCounts: [24, 29, 31, 41],
        rankRates: [19.2, 23.2, 24.8, 32.8],
        winRate: 21.4,
        dealInRate: 16.8,
        riichiRate: 23.1,
        callRate: 34.0,
        unreasonablePushCount: 68,
        skillRating: 1442,
      },
      {
        id: 'player_sato',
        name: '佐藤 (Sato)',
        color: MEMBER_CHART_COLORS[1],
        persona: {
          id: 'persona_sato',
          name: '佐藤 (鉄壁守備)',
          avatarSeed: 'sato',
          description: '鉄壁のベタオリ重視型',
          styleTag: '鉄壁堅守',
          isAiBot: true,
          callTendency: 25,
          riichiTendency: 55,
          defensePriority: 90,
          badWaitTolerance: 15,
          damaPreference: 45,
          maneManganHunter: 5,
          pushShantenThreshold: 1,
        },
        totalScore: 54200,
        averageScorePerHanchan: 433,
        averageRank: 2.21,
        rankCounts: [38, 37, 35, 15],
        rankRates: [30.4, 29.6, 28.0, 12.0],
        winRate: 21.0,
        dealInRate: 8.9,
        riichiRate: 18.5,
        callRate: 20.4,
        unreasonablePushCount: 9,
        skillRating: 1585,
      },
      {
        id: 'player_tanaka',
        name: '田中 (Tanaka)',
        color: MEMBER_CHART_COLORS[2],
        persona: {
          id: 'persona_tanaka',
          name: '田中 (速攻鳴き)',
          avatarSeed: 'tanaka',
          description: '早アガリ速攻型',
          styleTag: '速攻仕掛け',
          isAiBot: true,
          callTendency: 75,
          riichiTendency: 40,
          defensePriority: 45,
          badWaitTolerance: 40,
          damaPreference: 30,
          maneManganHunter: 15,
          pushShantenThreshold: 2,
        },
        totalScore: 12800,
        averageScorePerHanchan: 102,
        averageRank: 2.45,
        rankCounts: [33, 31, 33, 28],
        rankRates: [26.4, 24.8, 26.4, 22.4],
        winRate: 24.5,
        dealInRate: 13.7,
        riichiRate: 15.2,
        callRate: 46.8,
        unreasonablePushCount: 42,
        skillRating: 1512,
      },
      {
        id: 'player_suzuki',
        name: '鈴木 (Suzuki)',
        color: MEMBER_CHART_COLORS[3],
        persona: {
          id: 'persona_suzuki',
          name: '鈴木 (バランス)',
          avatarSeed: 'suzuki',
          description: '手役志向バランス型',
          styleTag: '手役重視',
          isAiBot: true,
          callTendency: 35,
          riichiTendency: 60,
          defensePriority: 60,
          badWaitTolerance: 30,
          damaPreference: 50,
          maneManganHunter: 30,
          pushShantenThreshold: 1,
        },
        totalScore: -28500,
        averageScorePerHanchan: -228,
        averageRank: 2.62,
        rankCounts: [30, 28, 26, 41],
        rankRates: [24.0, 22.4, 20.8, 32.8],
        winRate: 20.8,
        dealInRate: 14.5,
        riichiRate: 21.0,
        callRate: 27.2,
        unreasonablePushCount: 38,
        skillRating: 1461,
      },
    ],
    curveSamples: generateSyntheticCurve([-38500, 54200, 12800, -28500], [1442, 1585, 1512, 1461], 1000, 40),
    keyInsights: [
      '佐藤のベタオリ守備力(90%)が抜群の安定感を発揮し、ラス率12.0%と突出してトップ。',
      'あなたの放銃率が16.8%と高く、無謀押し(68回)が主な失点要因となりラス率32.8%で苦戦。',
    ],
  },
  {
    runId: 'sim_run_2_after_paipu_import',
    runTitle: 'Ver 1.5 天鳳・雀魂牌譜反映後 (1,000局)',
    timestamp: Date.now() - 86400000 * 7,
    dateStr: '10/08 18:00',
    totalHands: 1000,
    estimatedHanchans: 125,
    rules: STANDARD_GENERAL_RULES,
    members: [
      {
        id: 'player_you',
        name: 'あなた',
        color: MEMBER_CHART_COLORS[0],
        persona: {
          id: 'p_you_v2',
          name: 'あなた (守備改善)',
          avatarSeed: 'you',
          description: '天鳳牌譜より守備パラメータを60%へ増強',
          styleTag: 'スジ壁意識',
          isAiBot: true,
          callTendency: 42,
          riichiTendency: 62,
          defensePriority: 68,
          badWaitTolerance: 35,
          damaPreference: 35,
          maneManganHunter: 5,
          pushShantenThreshold: 1,
        },
        totalScore: 18400,
        averageScorePerHanchan: 147,
        averageRank: 2.38,
        rankCounts: [34, 34, 33, 24],
        rankRates: [27.2, 27.2, 26.4, 19.2],
        winRate: 22.8,
        dealInRate: 11.4,
        riichiRate: 21.2,
        callRate: 29.5,
        unreasonablePushCount: 24,
        skillRating: 1528,
      },
      {
        id: 'player_sato',
        name: '佐藤 (Sato)',
        color: MEMBER_CHART_COLORS[1],
        persona: {
          id: 'persona_sato',
          name: '佐藤 (鉄壁守備)',
          avatarSeed: 'sato',
          description: '鉄壁のベタオリ重視型',
          styleTag: '鉄壁堅守',
          isAiBot: true,
          callTendency: 25,
          riichiTendency: 55,
          defensePriority: 90,
          badWaitTolerance: 15,
          damaPreference: 45,
          maneManganHunter: 5,
          pushShantenThreshold: 1,
        },
        totalScore: 36800,
        averageScorePerHanchan: 294,
        averageRank: 2.31,
        rankCounts: [36, 36, 31, 22],
        rankRates: [28.8, 28.8, 24.8, 17.6],
        winRate: 21.2,
        dealInRate: 9.2,
        riichiRate: 18.2,
        callRate: 20.8,
        unreasonablePushCount: 11,
        skillRating: 1555,
      },
      {
        id: 'player_tanaka',
        name: '田中 (Tanaka)',
        color: MEMBER_CHART_COLORS[2],
        persona: {
          id: 'persona_tanaka',
          name: '田中 (速攻鳴き)',
          avatarSeed: 'tanaka',
          description: '早アガリ速攻型',
          styleTag: '速攻仕掛け',
          isAiBot: true,
          callTendency: 75,
          riichiTendency: 40,
          defensePriority: 45,
          badWaitTolerance: 40,
          damaPreference: 30,
          maneManganHunter: 15,
          pushShantenThreshold: 2,
        },
        totalScore: -4200,
        averageScorePerHanchan: -33,
        averageRank: 2.58,
        rankCounts: [29, 30, 31, 35],
        rankRates: [23.2, 24.0, 24.8, 28.0],
        winRate: 23.9,
        dealInRate: 14.2,
        riichiRate: 14.8,
        callRate: 46.2,
        unreasonablePushCount: 45,
        skillRating: 1485,
      },
      {
        id: 'player_suzuki',
        name: '鈴木 (Suzuki)',
        color: MEMBER_CHART_COLORS[3],
        persona: {
          id: 'persona_suzuki',
          name: '鈴木 (バランス)',
          avatarSeed: 'suzuki',
          description: '手役志向バランス型',
          styleTag: '手役重視',
          isAiBot: true,
          callTendency: 35,
          riichiTendency: 60,
          defensePriority: 60,
          badWaitTolerance: 30,
          damaPreference: 50,
          maneManganHunter: 30,
          pushShantenThreshold: 1,
        },
        totalScore: -51000,
        averageScorePerHanchan: -408,
        averageRank: 2.73,
        rankCounts: [26, 25, 30, 44],
        rankRates: [20.8, 20.0, 24.0, 35.2],
        winRate: 20.2,
        dealInRate: 15.6,
        riichiRate: 20.5,
        callRate: 26.8,
        unreasonablePushCount: 46,
        skillRating: 1432,
      },
    ],
    curveSamples: generateSyntheticCurve([18400, 36800, -4200, -51000], [1528, 1555, 1485, 1432], 1000, 40),
    keyInsights: [
      'あなたの放銃率が16.8%→11.4%へ激減。平均着順が2.72→2.38へ大幅改善しプラス収支へ転換。',
      '無謀押しが68回→24回へ半減したことがレーティング急上昇（+86pt）の主因。',
    ],
  },
  {
    runId: 'sim_run_3_current',
    runTitle: 'Ver 2.0 最新カスタムエージェント最適化 (1,000局)',
    timestamp: Date.now() - 86400000 * 1,
    dateStr: '10/14 10:30',
    totalHands: 1000,
    estimatedHanchans: 125,
    rules: STANDARD_GENERAL_RULES,
    members: [
      {
        id: 'player_you',
        name: 'あなた',
        color: MEMBER_CHART_COLORS[0],
        persona: {
          id: 'p_you_v3',
          name: 'あなた (リード防衛型)',
          avatarSeed: 'you',
          description: 'クオンツ式リード防衛・高打点リーチ型エージェント',
          styleTag: '精密クオンツ',
          isAiBot: true,
          callTendency: 38,
          riichiTendency: 65,
          defensePriority: 82,
          badWaitTolerance: 20,
          damaPreference: 55,
          maneManganHunter: 0,
          pushShantenThreshold: 1,
        },
        totalScore: 61500,
        averageScorePerHanchan: 492,
        averageRank: 2.18,
        rankCounts: [42, 36, 30, 17],
        rankRates: [33.6, 28.8, 24.0, 13.6],
        winRate: 23.4,
        dealInRate: 9.0,
        riichiRate: 22.5,
        callRate: 26.0,
        unreasonablePushCount: 8,
        skillRating: 1604,
      },
      {
        id: 'player_sato',
        name: '佐藤 (Sato)',
        color: MEMBER_CHART_COLORS[1],
        persona: {
          id: 'persona_sato',
          name: '佐藤 (鉄壁守備)',
          avatarSeed: 'sato',
          description: '鉄壁のベタオリ重視型',
          styleTag: '鉄壁堅守',
          isAiBot: true,
          callTendency: 25,
          riichiTendency: 55,
          defensePriority: 90,
          badWaitTolerance: 15,
          damaPreference: 45,
          maneManganHunter: 5,
          pushShantenThreshold: 1,
        },
        totalScore: 28400,
        averageScorePerHanchan: 227,
        averageRank: 2.34,
        rankCounts: [34, 37, 32, 22],
        rankRates: [27.2, 29.6, 25.6, 17.6],
        winRate: 20.8,
        dealInRate: 9.3,
        riichiRate: 18.0,
        callRate: 21.0,
        unreasonablePushCount: 10,
        skillRating: 1561,
      },
      {
        id: 'player_tanaka',
        name: '田中 (Tanaka)',
        color: MEMBER_CHART_COLORS[2],
        persona: {
          id: 'persona_tanaka',
          name: '田中 (速攻鳴き)',
          avatarSeed: 'tanaka',
          description: '早アガリ速攻型',
          styleTag: '速攻仕掛け',
          isAiBot: true,
          callTendency: 75,
          riichiTendency: 40,
          defensePriority: 45,
          badWaitTolerance: 40,
          damaPreference: 30,
          maneManganHunter: 15,
          pushShantenThreshold: 2,
        },
        totalScore: -14200,
        averageScorePerHanchan: -113,
        averageRank: 2.65,
        rankCounts: [27, 28, 32, 38],
        rankRates: [21.6, 22.4, 25.6, 30.4],
        winRate: 23.1,
        dealInRate: 14.8,
        riichiRate: 14.5,
        callRate: 47.0,
        unreasonablePushCount: 48,
        skillRating: 1460,
      },
      {
        id: 'player_suzuki',
        name: '鈴木 (Suzuki)',
        color: MEMBER_CHART_COLORS[3],
        persona: {
          id: 'persona_suzuki',
          name: '鈴木 (バランス)',
          avatarSeed: 'suzuki',
          description: '手役志向バランス型',
          styleTag: '手役重視',
          isAiBot: true,
          callTendency: 35,
          riichiTendency: 60,
          defensePriority: 60,
          badWaitTolerance: 30,
          damaPreference: 50,
          maneManganHunter: 30,
          pushShantenThreshold: 1,
        },
        totalScore: -75700,
        averageScorePerHanchan: -605,
        averageRank: 2.83,
        rankCounts: [22, 24, 31, 48],
        rankRates: [17.6, 19.2, 24.8, 38.4],
        winRate: 19.5,
        dealInRate: 16.2,
        riichiRate: 19.8,
        callRate: 26.5,
        unreasonablePushCount: 52,
        skillRating: 1375,
      },
    ],
    curveSamples: generateSyntheticCurve([61500, 28400, -14200, -75700], [1604, 1561, 1460, 1375], 1000, 40),
    keyInsights: [
      'あなたが佐藤を逆転して総合1位へ（平均着順2.18、トップ率33.6%）。',
      'ダマテン多用(55%)とリード防衛の併用により、他者からの直撃アガリ率が向上。',
      '田中・鈴木の2向聴押し込みに対し、あなたの高い守備力(82%)が強烈なカウンターに。',
    ],
  },
];

// Generates smooth sampled cumulative curves for visualization
function generateSyntheticCurve(
  finalScores: number[],
  finalRatings: number[],
  totalHands: number,
  samplesCount: number
): SimulationCurveSample[] {
  const samples: SimulationCurveSample[] = [];
  const initialRatings = [1500, 1500, 1500, 1500];

  for (let i = 0; i <= samplesCount; i++) {
    const fraction = i / samplesCount;
    const handIndex = Math.round(fraction * totalHands);

    // Natural Brownian variance superimposed on trend
    const noiseFactor = Math.sin(fraction * Math.PI * 4) * 0.15;
    const scores = finalScores.map((score, mIdx) => {
      const base = score * fraction;
      const noise = (Math.sin((fraction + mIdx * 0.25) * Math.PI * 6) * Math.abs(score) * 0.25);
      return Math.round(base + (fraction < 1 ? noise : 0));
    });

    const ratings = finalRatings.map((rating, mIdx) => {
      const init = initialRatings[mIdx];
      const diff = rating - init;
      return Math.round(init + diff * fraction);
    });

    samples.push({
      handIndex,
      scores,
      ratings,
    });
  }

  return samples;
}

// ----------------------------------------------------------------------
// High-Speed Monte-Carlo / Tactical Engine for 1,000 Hands
// ----------------------------------------------------------------------
export function executeBatchSimulation(
  members: SimulationMember[],
  totalHands: number = 1000,
  rules: HouseRules = STANDARD_GENERAL_RULES,
  runTitle?: string
): SimulationRunSummary {
  const estimatedHanchans = Math.max(1, Math.round(totalHands / 8));
  const cumulativeScores = [0, 0, 0, 0];
  const ratings = [1500, 1500, 1500, 1500];
  const winCounts = [0, 0, 0, 0];
  const dealInCounts = [0, 0, 0, 0];
  const riichiCounts = [0, 0, 0, 0];
  const callCounts = [0, 0, 0, 0];
  const unreasonablePushes = [0, 0, 0, 0];
  const rankAccumulators = [0, 0, 0, 0];
  const rankCounts: [number, number, number, number][] = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];

  const sampleInterval = Math.max(10, Math.floor(totalHands / 40));
  const curveSamples: SimulationCurveSample[] = [
    {
      handIndex: 0,
      scores: [0, 0, 0, 0],
      ratings: [1500, 1500, 1500, 1500],
    },
  ];

  // Track Hanchan ongoing scores
  let currentHanchanScores = [rules.startingScore, rules.startingScore, rules.startingScore, rules.startingScore];
  let handInHanchan = 0;

  for (let hand = 1; hand <= totalHands; hand++) {
    handInHanchan++;

    // Calculate dynamic power ratings for this hand
    // 1. Agari probability based on Speed, Call Tendency, and Bad Wait tolerance
    const speeds = members.map((m) => {
      const speedScore =
        (m.persona.callTendency * 0.4) +
        (m.persona.riichiTendency * 0.3) +
        (m.persona.badWaitTolerance * 0.2) +
        (100 - m.persona.defensePriority) * 0.1;
      return speedScore;
    });

    // 2. Defense factor against opponents (Beta-ori capability)
    const defenses = members.map((m) => {
      return (m.persona.defensePriority * 0.7) + (100 - m.persona.pushShantenThreshold * 30);
    });

    // Determine hand winner or Ryuukyoku (approx 13% draw rate)
    const isExhausted = Math.random() < 0.13;

    if (!isExhausted) {
      // Pick Winner based on relative speed
      const totalSpeed = speeds.reduce((a, b) => a + b, 0);
      let rand = Math.random() * totalSpeed;
      let winnerIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (rand < speeds[i]) {
          winnerIdx = i;
          break;
        }
        rand -= speeds[i];
      }

      winCounts[winnerIdx]++;

      // Winner Riichi / Call flag
      if (Math.random() * 100 < members[winnerIdx].persona.riichiTendency) {
        riichiCounts[winnerIdx]++;
      }
      if (Math.random() * 100 < members[winnerIdx].persona.callTendency) {
        callCounts[winnerIdx]++;
      }

      // Tsumo vs Ron (Tsumo rate ~ 40%)
      const isTsumo = Math.random() < 0.40;

      // Base hand value calculation (Han & Fu based on persona style)
      // Dama preference & Menzen increases han
      let handHan = 1;
      const hanRoll = Math.random();
      if (hanRoll < 0.35) handHan = 2;
      else if (hanRoll < 0.70) handHan = 3;
      else if (hanRoll < 0.90) handHan = 4; // Mangan
      else if (hanRoll < 0.98) handHan = 6; // Haneman
      else handHan = 8; // Baiman / Yakuman

      let baseScore = handHan === 1 ? 1300 : handHan === 2 ? 2600 : handHan === 3 ? 5200 : handHan >= 4 && handHan < 6 ? 8000 : 12000;

      if (isTsumo) {
        // Tsumo payment from all 3 opponents
        const paymentEach = Math.round(baseScore / 3 / 100) * 100;
        for (let i = 0; i < 4; i++) {
          if (i === winnerIdx) {
            cumulativeScores[i] += paymentEach * 3;
            currentHanchanScores[i] += paymentEach * 3;
          } else {
            cumulativeScores[i] -= paymentEach;
            currentHanchanScores[i] -= paymentEach;
          }
        }
      } else {
        // Ron: Determine loser based on inverse of defense
        const opponentDefenses = [0, 1, 2, 3].map((idx) => {
          if (idx === winnerIdx) return 0;
          // Lower defense = higher chance of dealing in
          const def = defenses[idx];
          const pushPenalty = members[idx].persona.pushShantenThreshold >= 2 ? 1.6 : 1.0;
          return Math.max(5, (100 - def) * pushPenalty);
        });

        const totalOppDef = opponentDefenses.reduce((a, b) => a + b, 0);
        let defRand = Math.random() * totalOppDef;
        let loserIdx = (winnerIdx + 1) % 4;

        for (let i = 0; i < 4; i++) {
          if (i === winnerIdx) continue;
          if (defRand < opponentDefenses[i]) {
            loserIdx = i;
            break;
          }
          defRand -= opponentDefenses[i];
        }

        dealInCounts[loserIdx]++;
        if (members[loserIdx].persona.pushShantenThreshold >= 2 && Math.random() < 0.35) {
          unreasonablePushes[loserIdx]++;
        }

        cumulativeScores[winnerIdx] += baseScore;
        currentHanchanScores[winnerIdx] += baseScore;
        cumulativeScores[loserIdx] -= baseScore;
        currentHanchanScores[loserIdx] -= baseScore;

        // Elo Rating Delta
        ratings[winnerIdx] += 2;
        ratings[loserIdx] = Math.max(1200, ratings[loserIdx] - 2);
      }
    } else {
      // Ryuukyoku Tenpai distribution (3000 pts total)
      const tenpaiStatuses = members.map((m) => Math.random() * 100 < m.persona.callTendency + 30);
      const tenpaiCount = tenpaiStatuses.filter(Boolean).length;
      if (tenpaiCount > 0 && tenpaiCount < 4) {
        const gain = 3000 / tenpaiCount;
        const loss = 3000 / (4 - tenpaiCount);
        for (let i = 0; i < 4; i++) {
          if (tenpaiStatuses[i]) {
            cumulativeScores[i] += gain;
            currentHanchanScores[i] += gain;
          } else {
            cumulativeScores[i] -= loss;
            currentHanchanScores[i] -= loss;
          }
        }
      }
    }

    // Every 8 hands, complete a Hanchan and record placement ranks
    if (handInHanchan >= 8 || hand === totalHands) {
      // Determine 1st, 2nd, 3rd, 4th
      const sorted = [0, 1, 2, 3].sort((a, b) => currentHanchanScores[b] - currentHanchanScores[a]);
      sorted.forEach((playerIdx, rankZero) => {
        rankCounts[playerIdx][rankZero]++;
        rankAccumulators[playerIdx] += (rankZero + 1);

        // Apply Uma bonus
        const umaBonus = rules.uma[rankZero] * 1000;
        cumulativeScores[playerIdx] += umaBonus;

        // Rating shift on placement
        if (rankZero === 0) ratings[playerIdx] += 5;
        else if (rankZero === 1) ratings[playerIdx] += 1;
        else if (rankZero === 2) ratings[playerIdx] -= 1;
        else ratings[playerIdx] = Math.max(1200, ratings[playerIdx] - 5);
      });

      // Reset Hanchan scores
      currentHanchanScores = [rules.startingScore, rules.startingScore, rules.startingScore, rules.startingScore];
      handInHanchan = 0;
    }

    // Record sample point for line chart
    if (hand % sampleInterval === 0 || hand === totalHands) {
      curveSamples.push({
        handIndex: hand,
        scores: [...cumulativeScores],
        ratings: [...ratings],
      });
    }
  }

  // Calculate Member Summaries
  const memberResults: SimulationMemberResult[] = members.map((m, idx) => {
    const totalScore = cumulativeScores[idx];
    const avgScore = Math.round(totalScore / estimatedHanchans);
    const avgRank = Number((rankAccumulators[idx] / Math.max(1, estimatedHanchans)).toFixed(2));

    const ranks = rankCounts[idx];
    const totalRecorded = Math.max(1, ranks[0] + ranks[1] + ranks[2] + ranks[3]);
    const rankRates: [number, number, number, number] = [
      Number(((ranks[0] / totalRecorded) * 100).toFixed(1)),
      Number(((ranks[1] / totalRecorded) * 100).toFixed(1)),
      Number(((ranks[2] / totalRecorded) * 100).toFixed(1)),
      Number(((ranks[3] / totalRecorded) * 100).toFixed(1)),
    ];

    return {
      id: m.id,
      name: m.name,
      color: m.color || MEMBER_CHART_COLORS[idx % MEMBER_CHART_COLORS.length],
      persona: m.persona,
      totalScore,
      averageScorePerHanchan: avgScore,
      averageRank: avgRank,
      rankCounts: ranks,
      rankRates,
      winRate: Number(((winCounts[idx] / totalHands) * 100).toFixed(1)),
      dealInRate: Number(((dealInCounts[idx] / totalHands) * 100).toFixed(1)),
      riichiRate: Number(((riichiCounts[idx] / totalHands) * 100).toFixed(1)),
      callRate: Number(((callCounts[idx] / totalHands) * 100).toFixed(1)),
      unreasonablePushCount: unreasonablePushes[idx],
      skillRating: Math.round(ratings[idx]),
    };
  });

  // Generate automated Key Insights
  const topMember = [...memberResults].sort((a, b) => b.totalScore - a.totalScore)[0];
  const lowestDealIn = [...memberResults].sort((a, b) => a.dealInRate - b.dealInRate)[0];
  const highestWin = [...memberResults].sort((a, b) => b.winRate - a.winRate)[0];

  const keyInsights = [
    `総合トップは『${topMember.name}』(収支: ${topMember.totalScore > 0 ? '+' : ''}${topMember.totalScore.toLocaleString()}点、平均着順: ${topMember.averageRank}位)。`,
    `守備力首位は『${lowestDealIn.name}』(放銃率: ${lowestDealIn.dealInRate}%、ラス率: ${lowestDealIn.rankRates[3]}%)。失点抑制が着順維持に直結。`,
    `攻撃速度首位は『${highestWin.name}』(和了率: ${highestWin.winRate}%、副露率: ${highestWin.callRate}%)。`,
  ];

  const now = new Date();
  const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return {
    runId: `sim_run_${Date.now()}`,
    runTitle: runTitle || `シミュレーション #${Math.floor(Date.now() / 1000).toString().slice(-4)} (${totalHands.toLocaleString()}局)`,
    timestamp: Date.now(),
    dateStr,
    totalHands,
    estimatedHanchans,
    rules,
    members: memberResults,
    curveSamples,
    keyInsights,
  };
}
