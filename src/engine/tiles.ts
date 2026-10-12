import { Tile, Suit } from '../types/mahjong';

export const SUITS: Suit[] = ['m', 'p', 's', 'z'];

export const TILE_NAMES_JA: Record<string, string> = {
  // Manzu
  '1m': '一萬', '2m': '二萬', '3m': '三萬', '4m': '四萬', '5m': '五萬',
  '6m': '六萬', '7m': '七萬', '8m': '八萬', '9m': '九萬',
  // Pinzu
  '1p': '一筒', '2p': '二筒', '3p': '三筒', '4p': '四筒', '5p': '五筒',
  '6p': '六筒', '7p': '七筒', '8p': '八筒', '9p': '九筒',
  // Souzu
  '1s': '一索', '2s': '二索', '3s': '三索', '4s': '四索', '5s': '五索',
  '6s': '六索', '7s': '七索', '8s': '八索', '9s': '九索',
  // Honors
  '1z': '東', '2z': '南', '3z': '西', '4z': '北',
  '5z': '白', '6z': '發', '7z': '中',
};

export function getTileKey(tile: Tile): string {
  return `${tile.value}${tile.suit}`;
}

export function getTileDisplayName(tile: Tile): string {
  const key = getTileKey(tile);
  const name = TILE_NAMES_JA[key] || key;
  return tile.isRed ? `赤${name}` : name;
}

export function isTerminalOrHonor(tile: Tile): boolean {
  if (tile.suit === 'z') return true;
  return tile.value === 1 || tile.value === 9;
}

export function isHonor(tile: Tile): boolean {
  return tile.suit === 'z';
}

export function isDragon(tile: Tile): boolean {
  return tile.suit === 'z' && tile.value >= 5; // 5:白, 6:發, 7:中
}

export function isWind(tile: Tile): boolean {
  return tile.suit === 'z' && tile.value <= 4; // 1:東, 2:南, 3:西, 4:北
}

export function getDoraTargetTile(indicator: Tile): { suit: Suit; value: number } {
  if (indicator.suit === 'z') {
    // Winds: 1->2->3->4->1 (東->南->西->北->東)
    if (indicator.value <= 4) {
      const nextVal = indicator.value === 4 ? 1 : indicator.value + 1;
      return { suit: 'z', value: nextVal };
    }
    // Dragons: 5->6->7->5 (白->發->中->白)
    const nextVal = indicator.value === 7 ? 5 : indicator.value + 1;
    return { suit: 'z', value: nextVal };
  }
  // Numbers: 1->2...->9->1
  const nextVal = indicator.value === 9 ? 1 : indicator.value + 1;
  return { suit: indicator.suit, value: nextVal };
}

export function isDora(tile: Tile, indicators: Tile[]): boolean {
  for (const ind of indicators) {
    const target = getDoraTargetTile(ind);
    if (tile.suit === target.suit && tile.value === target.value) {
      return true;
    }
  }
  return false;
}

export function countDoraInTiles(tiles: Tile[], indicators: Tile[]): number {
  let count = 0;
  for (const tile of tiles) {
    if (tile.isRed) count++;
    for (const ind of indicators) {
      const target = getDoraTargetTile(ind);
      if (tile.suit === target.suit && tile.value === target.value) {
        count++;
      }
    }
  }
  return count;
}

export function createFreshWall(allowRedDora: boolean = true): Tile[] {
  const wall: Tile[] = [];

  for (const suit of SUITS) {
    const maxVal = suit === 'z' ? 7 : 9;
    for (let val = 1; val <= maxVal; val++) {
      for (let copy = 0; copy < 4; copy++) {
        const isRed = allowRedDora && copy === 0 && val === 5 && suit !== 'z';
        wall.push({
          id: `${val}${suit}_${copy}${isRed ? '_red' : ''}`,
          suit,
          value: val,
          isRed,
        });
      }
    }
  }

  // Fisher-Yates Shuffle
  for (let i = wall.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wall[i], wall[j]] = [wall[j], wall[i]];
  }

  return wall;
}

export function sortTiles(tiles: Tile[]): Tile[] {
  const suitOrder: Record<Suit, number> = { m: 0, p: 1, s: 2, z: 3 };
  return [...tiles].sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    if (a.value !== b.value) {
      return a.value - b.value;
    }
    // Red dora comes first among identical tiles
    if (a.isRed && !b.isRed) return -1;
    if (!a.isRed && b.isRed) return 1;
    return a.id.localeCompare(b.id);
  });
}

export function areTilesEqual(a: Tile | undefined, b: Tile | undefined): boolean {
  if (!a || !b) return false;
  return a.suit === b.suit && a.value === b.value;
}
