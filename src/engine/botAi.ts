import { Tile, PlayerState, RoundState, HouseRules, Meld } from '../types/mahjong';
import { calculateShanten, getWaitingTiles } from './shanten';
import { isHonor, isTerminalOrHonor, areTilesEqual, getTileKey } from './tiles';

export interface BotDecision {
  action: 'DISCARD' | 'RIICHI' | 'OPEN_RIICHI' | 'CHI' | 'PON' | 'KAN' | 'TSUMO' | 'RON' | 'PASS';
  discardTile?: Tile;
  meld?: Meld;
}

// Decide Bot Discard
export function decideBotDiscard(
  player: PlayerState,
  round: RoundState,
  rules: HouseRules,
  allPlayers: PlayerState[]
): Tile {
  const handTiles = player.hand.tiles;
  if (handTiles.length === 0) {
    throw new Error('Bot has no tiles to discard');
  }

  // 1. If in Riichi, must discard the newly drawn tile (last tile)
  if (player.isRiichi || player.isOpenRiichi) {
    return handTiles[handTiles.length - 1];
  }

  const persona = player.persona;
  const kamichaIndex = (round.turnPlayerIndex + 3) % 4;
  const kamicha = allPlayers[kamichaIndex];
  const lastKamichaDiscard = kamicha?.discards[kamicha?.discards.length - 1];

  // 2. Mane-Mangan Hunter Special Logic:
  // If persona has high maneManganHunter (> 60), turn <= 9, melds == 0, streak is unbroken,
  // and hand contains kamicha's exact tile, bot mimics it!
  if (
    rules.maneMangan &&
    persona.maneManganHunter >= 60 &&
    !player.maneManganFailed &&
    !round.firstRoundMeldsOccurred &&
    lastKamichaDiscard &&
    round.currentTurnNumber <= 9
  ) {
    const matchingTileInHand = handTiles.find(
      (t) => t.suit === lastKamichaDiscard.suit && t.value === lastKamichaDiscard.value
    );
    if (matchingTileInHand) {
      return matchingTileInHand;
    }
  }

  // 3. Defensive Beta-Ori (ベタオリ) Check:
  // Check if any opponent is in Riichi or Open Riichi
  const activeRiichiOpponents = allPlayers.filter(
    (p, idx) => idx !== round.turnPlayerIndex && (p.isRiichi || p.isOpenRiichi)
  );

  const currentShanten = calculateShanten(handTiles, player.hand.melds);

  // If opponent in Riichi and bot decides to fold based on defensePriority and shanten:
  const shouldFold =
    activeRiichiOpponents.length > 0 &&
    (currentShanten >= persona.pushShantenThreshold || Math.random() * 100 < persona.defensePriority);

  if (shouldFold) {
    // Collect all genbutsu (現物) for active riichi opponents
    const riichiDiscards = activeRiichiOpponents.flatMap((p) => p.discards);
    const genbutsuCandidate = handTiles.find((t) =>
      riichiDiscards.some((g) => areTilesEqual(t, g))
    );
    if (genbutsuCandidate) {
      return genbutsuCandidate;
    }

    // Secondary safe tiles: 2nd/3rd copy of honors
    const honorCandidate = handTiles.find((t) => isHonor(t));
    if (honorCandidate) {
      return honorCandidate;
    }

    // Terminals
    const terminalCandidate = handTiles.find((t) => isTerminalOrHonor(t));
    if (terminalCandidate) {
      return terminalCandidate;
    }
  }

  // 4. Standard Tile Efficiency (牌効率) Discard Selection
  // Find discard that minimizes shanten, then maximizes remaining waits
  let bestTile = handTiles[handTiles.length - 1];
  let minShanten = 99;
  let maxNextWaits = -1;

  for (let i = 0; i < handTiles.length; i++) {
    const candidate = handTiles[i];
    const remaining = handTiles.filter((_, idx) => idx !== i);
    const shantenAfterDiscard = calculateShanten(remaining, player.hand.melds);

    if (shantenAfterDiscard < minShanten) {
      minShanten = shantenAfterDiscard;
      bestTile = candidate;
      maxNextWaits = 1;
    } else if (shantenAfterDiscard === minShanten) {
      // Tie breaker: discard isolated honors or terminals first
      const isCandHonor = isHonor(candidate);
      const isBestHonor = isHonor(bestTile);
      if (isCandHonor && !isBestHonor) {
        bestTile = candidate;
      } else if (!isCandHonor && !isBestHonor) {
        // Discard 1s/9s before middle tiles
        const candDistToMiddle = Math.abs(candidate.value - 5);
        const bestDistToMiddle = Math.abs(bestTile.value - 5);
        if (candDistToMiddle > bestDistToMiddle) {
          bestTile = candidate;
        }
      }
    }
  }

  return bestTile;
}

// Decide Riichi / Open Riichi declaration on Tenpai
export function decideBotRiichi(
  player: PlayerState,
  round: RoundState,
  rules: HouseRules
): 'RIICHI' | 'OPEN_RIICHI' | 'DAMA' {
  if (player.hand.melds.length > 0 || player.score < 1000) {
    return 'DAMA';
  }

  const waitingTiles = getWaitingTiles(player.hand.tiles, player.hand.melds);
  if (waitingTiles.length === 0) return 'DAMA';

  const persona = player.persona;
  const isBadWait = waitingTiles.length <= 1; // Kanchan / Penchan / Tanki

  // If bad wait and low tolerance, prefer Dama
  if (isBadWait && persona.badWaitTolerance < 40) {
    return 'DAMA';
  }

  // Check Dama preference
  if (Math.random() * 100 < persona.damaPreference) {
    return 'DAMA';
  }

  // Open Riichi consideration:
  // If house rules allow Open Riichi and persona has high aggressive push (> 70) and good wait (> 1)
  if (rules.openRiichi && persona.riichiTendency >= 75 && !isBadWait && Math.random() < 0.25) {
    return 'OPEN_RIICHI';
  }

  return 'RIICHI';
}

// Persona Preset Library
export const PRESET_PERSONAS = [
  {
    id: 'persona_sato',
    name: '佐藤 健一 (Kenichi Sato)',
    avatarSeed: 'sato',
    description: '牌効率重視・鉄壁のベタオリ守備型。安牌確保を最優先し、不用意な放銃を極限まで嫌う。',
    styleTag: '鉄壁守備型 (Iron Fortress)',
    isAiBot: true,
    callTendency: 22,
    riichiTendency: 45,
    defensePriority: 94,
    badWaitTolerance: 15,
    damaPreference: 78,
    maneManganHunter: 10,
    pushShantenThreshold: 1, // Only push if already Tenpai
  },
  {
    id: 'persona_tanaka',
    name: '田中 亮 (Ryo Tanaka)',
    avatarSeed: 'tanaka',
    description: '超攻撃型スピードスター。愚形でも即リーチを打ち、鳴き仕掛けで場を乱す超特攻スタイル。',
    styleTag: '超攻撃速攻型 (Hyper Rush)',
    isAiBot: true,
    callTendency: 82,
    riichiTendency: 88,
    defensePriority: 28,
    badWaitTolerance: 85,
    damaPreference: 18,
    maneManganHunter: 25,
    pushShantenThreshold: 3, // Pushes even at 2-Shanten!
  },
  {
    id: 'persona_suzuki',
    name: '鈴木 雅之 (Masayuki Suzuki)',
    avatarSeed: 'suzuki',
    description: 'ローカル役「真似満」を虎視眈々と狙う奇策派。序盤は上家の打牌を徹底模写する。',
    styleTag: 'マネ満ハンター (Mane-Mangan Specialist)',
    isAiBot: true,
    callTendency: 35,
    riichiTendency: 55,
    defensePriority: 62,
    badWaitTolerance: 50,
    damaPreference: 40,
    maneManganHunter: 95, // Prioritizes mimicry!
    pushShantenThreshold: 2,
  },
  {
    id: 'persona_takahashi',
    name: '高橋 涼介 (Ryosuke Takahashi)',
    avatarSeed: 'takahashi',
    description: '打点重視のダマテンスナイパー。リーチ棒を出さずに潜み、高打点の直撃を狙う。',
    styleTag: 'ダマテン狙撃手 (Dama Sniper)',
    isAiBot: true,
    callTendency: 40,
    riichiTendency: 25,
    defensePriority: 72,
    badWaitTolerance: 30,
    damaPreference: 92,
    maneManganHunter: 15,
    pushShantenThreshold: 1,
  },
];
