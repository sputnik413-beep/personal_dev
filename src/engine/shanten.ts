import { Tile, Meld } from '../types/mahjong';
import { isTerminalOrHonor } from './tiles';

// Exact calculation of Mahjong Shanten (向聴数)
// Returns:
// -1 = Agari (Win)
//  0 = Tenpai (Waiting for winning tile)
//  1 = 1-Shanten (1 away from Tenpai)
//  2 = 2-Shanten, etc.

export function calculateShanten(concealedTiles: Tile[], melds: Meld[] = []): number {
  const stdShanten = calculateStandardShanten(concealedTiles, melds.length);

  // If player called any melds (open hand), Chiitoitsu and Kokushi are impossible
  if (melds.length > 0) {
    return stdShanten;
  }

  const chiiShanten = calculateChiitoitsuShanten(concealedTiles);
  const kokushiShanten = calculateKokushiShanten(concealedTiles);

  return Math.min(stdShanten, chiiShanten, kokushiShanten);
}

// Convert concealed tiles to 4 suit arrays (m: 10, p: 10, s: 10, z: 8)
function tilesToCountArray(tiles: Tile[]) {
  const counts = {
    m: new Array(10).fill(0),
    p: new Array(10).fill(0),
    s: new Array(10).fill(0),
    z: new Array(8).fill(0),
  };

  for (const t of tiles) {
    counts[t.suit][t.value]++;
  }

  return counts;
}

// Chiitoitsu Shanten: 7 pairs
// Shanten = 6 - (number of pairs) + max(0, number of distinct tiles - 7)
export function calculateChiitoitsuShanten(tiles: Tile[]): number {
  if (tiles.length < 13) return 8; // If called melds, not valid
  const counts = tilesToCountArray(tiles);
  let pairs = 0;
  let uniqueCount = 0;

  for (const suit of ['m', 'p', 's', 'z'] as const) {
    const maxVal = suit === 'z' ? 7 : 9;
    for (let v = 1; v <= maxVal; v++) {
      const c = counts[suit][v];
      if (c >= 2) pairs++;
      if (c >= 1) uniqueCount++;
    }
  }

  let shanten = 6 - pairs;
  if (uniqueCount < 7) {
    shanten += 7 - uniqueCount;
  }
  return shanten;
}

// Kokushi Musou Shanten: 13 distinct terminals/honors + 1 duplicate
export function calculateKokushiShanten(tiles: Tile[]): number {
  if (tiles.length < 13) return 13;
  const counts = tilesToCountArray(tiles);
  let uniqueTerminals = 0;
  let hasPair = false;

  const terminalKeys = [
    { suit: 'm', val: 1 }, { suit: 'm', val: 9 },
    { suit: 'p', val: 1 }, { suit: 'p', val: 9 },
    { suit: 's', val: 1 }, { suit: 's', val: 9 },
    { suit: 'z', val: 1 }, { suit: 'z', val: 2 },
    { suit: 'z', val: 3 }, { suit: 'z', val: 4 },
    { suit: 'z', val: 5 }, { suit: 'z', val: 6 },
    { suit: 'z', val: 7 },
  ] as const;

  for (const t of terminalKeys) {
    const c = counts[t.suit][t.val];
    if (c >= 1) {
      uniqueTerminals++;
      if (c >= 2) hasPair = true;
    }
  }

  return 13 - uniqueTerminals - (hasPair ? 1 : 0);
}

// Standard Hand Shanten (4 mentsu + 1 jantou formula)
// Formula: 8 - 2*mentsu - taatsu - jantou
export function calculateStandardShanten(tiles: Tile[], meldCount: number = 0): number {
  const counts = tilesToCountArray(tiles);
  let minShanten = 8 - 2 * meldCount;

  // We test two branches: with pair (jantou) and without pair
  // 1. With pair:
  for (const suit of ['m', 'p', 's', 'z'] as const) {
    const maxVal = suit === 'z' ? 7 : 9;
    for (let v = 1; v <= maxVal; v++) {
      if (counts[suit][v] >= 2) {
        counts[suit][v] -= 2;
        const res = evaluateMentsuAndTaatsu(counts, meldCount, true);
        if (res < minShanten) minShanten = res;
        counts[suit][v] += 2;
      }
    }
  }

  // 2. Without pair:
  const resNoPair = evaluateMentsuAndTaatsu(counts, meldCount, false);
  if (resNoPair < minShanten) minShanten = resNoPair;

  return minShanten;
}

interface MentsuResult {
  mentsu: number;
  taatsu: number;
}

function evaluateMentsuAndTaatsu(
  counts: { m: number[]; p: number[]; s: number[]; z: number[] },
  meldCount: number,
  hasPair: boolean
): number {
  let totalMentsu = meldCount;
  let totalTaatsu = 0;

  // Process honors first (only koutsu/taatsu possible)
  for (let v = 1; v <= 7; v++) {
    const c = counts.z[v];
    if (c >= 3) {
      totalMentsu++;
    } else if (c === 2) {
      totalTaatsu++;
    }
  }

  // Recursive search for suits m, p, s
  const searchSuit = (suit: 'm' | 'p' | 's'): MentsuResult => {
    let bestM = 0;
    let bestT = 0;

    const findOptimal = (idx: number, curM: number, curT: number) => {
      while (idx <= 9 && counts[suit][idx] === 0) {
        idx++;
      }
      if (idx > 9) {
        if (curM * 2 + curT > bestM * 2 + bestT) {
          bestM = curM;
          bestT = curT;
        }
        return;
      }

      // Option 1: Triplet (Koutsu)
      if (counts[suit][idx] >= 3) {
        counts[suit][idx] -= 3;
        findOptimal(idx, curM + 1, curT);
        counts[suit][idx] += 3;
      }

      // Option 2: Sequence (Shuntsu)
      if (idx <= 7 && counts[suit][idx + 1] > 0 && counts[suit][idx + 2] > 0) {
        counts[suit][idx]--;
        counts[suit][idx + 1]--;
        counts[suit][idx + 2]--;
        findOptimal(idx, curM + 1, curT);
        counts[suit][idx]++;
        counts[suit][idx + 1]++;
        counts[suit][idx + 2]++;
      }

      // Option 3: Taatsu - Pair
      if (counts[suit][idx] >= 2) {
        counts[suit][idx] -= 2;
        findOptimal(idx, curM, curT + 1);
        counts[suit][idx] += 2;
      }

      // Option 4: Taatsu - Consecutive (Ryanmen / Penchan)
      if (idx <= 8 && counts[suit][idx + 1] > 0) {
        counts[suit][idx]--;
        counts[suit][idx + 1]--;
        findOptimal(idx, curM, curT + 1);
        counts[suit][idx]++;
        counts[suit][idx + 1]++;
      }

      // Option 5: Taatsu - Gap (Kanchan)
      if (idx <= 7 && counts[suit][idx + 2] > 0) {
        counts[suit][idx]--;
        counts[suit][idx + 2]--;
        findOptimal(idx, curM, curT + 1);
        counts[suit][idx]++;
        counts[suit][idx + 2]++;
      }

      // Option 6: Skip current tile as isolated
      const saveCount = counts[suit][idx];
      counts[suit][idx] = 0;
      findOptimal(idx + 1, curM, curT);
      counts[suit][idx] = saveCount;
    };

    findOptimal(1, 0, 0);
    return { mentsu: bestM, taatsu: bestT };
  };

  const resM = searchSuit('m');
  const resP = searchSuit('p');
  const resS = searchSuit('s');

  totalMentsu += resM.mentsu + resP.mentsu + resS.mentsu;
  totalTaatsu += resM.taatsu + resP.taatsu + resS.taatsu;

  // Total sets (mentsu + taatsu) cannot exceed 4
  const neededMentsu = 4 - totalMentsu;
  const effectiveTaatsu = Math.min(neededMentsu, totalTaatsu);

  let shanten = 8 - 2 * totalMentsu - effectiveTaatsu - (hasPair ? 1 : 0);
  return shanten;
}

// Find all waiting tiles for a Tenpai hand
export function getWaitingTiles(concealedTiles: Tile[], melds: Meld[] = []): Tile[] {
  const currentShanten = calculateShanten(concealedTiles, melds);
  if (currentShanten !== 0) return [];

  const waitingList: Tile[] = [];
  const testSuits = ['m', 'p', 's', 'z'] as const;

  for (const suit of testSuits) {
    const maxVal = suit === 'z' ? 7 : 9;
    for (let val = 1; val <= maxVal; val++) {
      const candidate: Tile = {
        id: `cand_${val}${suit}`,
        suit,
        value: val,
      };

      // If adding this tile results in Shanten -1 (Agari), it is a winning wait!
      const testHand = [...concealedTiles, candidate];
      if (calculateShanten(testHand, melds) === -1) {
        waitingList.push(candidate);
      }
    }
  }

  return waitingList;
}
