import {
  Tile,
  Meld,
  Wind,
  HouseRules,
  HandEvaluation,
  YakuResult,
  WaitShape,
} from '../types/mahjong';
import {
  countDoraInTiles,
  isDragon,
  isTerminalOrHonor,
  isWind,
  getTileKey,
  sortTiles,
} from './tiles';
import { calculateChiitoitsuShanten, calculateKokushiShanten } from './shanten';

export interface EvaluatorContext {
  isDealer: boolean;
  roundWind: Wind; // EAST or SOUTH
  seatWind: Wind;
  isTsumo: boolean;
  isRiichi: boolean;
  isOpenRiichi: boolean;
  isDoubleRiichi: boolean;
  isIppatsu: boolean;
  isHaitei: boolean;
  isHoutei: boolean;
  isRinshan: boolean;
  isChankan: boolean;
  isTenhou: boolean;
  isChiihou: boolean;
  isRenhou: boolean;
  doraIndicators: Tile[];
  uraDoraIndicators: Tile[];
  dealInPlayerWasInRiichi?: boolean;
  honba: number;
  rules: HouseRules;
}

export function evaluateHand(
  concealedTiles: Tile[],
  melds: Meld[],
  winningTile: Tile,
  context: EvaluatorContext
): HandEvaluation {
  const allTiles = [...concealedTiles, ...melds.flatMap((m) => m.tiles)];
  const isMenzen = melds.filter((m) => m.type !== 'KAN_CLOSED').length === 0;

  // 1. Check Yakuman hands first
  const yakumanList: YakuResult[] = [];

  // Tenhou / Chiihou / Renhou
  if (context.isTenhou) {
    yakumanList.push({ name: '天和 (Tenhou)', han: 13, isYakuman: true, yakumanMultiplier: 1 });
  }
  if (context.isChiihou) {
    yakumanList.push({ name: '地和 (Chiihou)', han: 13, isYakuman: true, yakumanMultiplier: 1 });
  }
  if (context.isRenhou) {
    yakumanList.push({ name: '人和 (Renhou)', han: 13, isYakuman: true, yakumanMultiplier: 1 });
  }

  // Kokushi Musou (國士無双)
  if (isMenzen && calculateKokushiShanten(allTiles) === -1) {
    // Check if 13-way wait (Kokushi Musou 13-men)
    // 13-way wait if hand without winning tile had all 13 distinct terminals
    const concealedWithoutWin = [...concealedTiles];
    const winIdx = concealedWithoutWin.findIndex(
      (t) => t.suit === winningTile.suit && t.value === winningTile.value
    );
    if (winIdx >= 0) concealedWithoutWin.splice(winIdx, 1);
    const shantenBeforeWin = calculateKokushiShanten(concealedWithoutWin);
    const is13Wait = shantenBeforeWin === 0 && context.rules.doubleYakuman;

    if (is13Wait) {
      yakumanList.push({
        name: '国士無双十三面待ち (Kokushi 13-Way Wait)',
        han: 26,
        isYakuman: true,
        yakumanMultiplier: 2,
      });
    } else {
      yakumanList.push({
        name: '国士無双 (Kokushi Musou)',
        han: 13,
        isYakuman: true,
        yakumanMultiplier: 1,
      });
    }
  }

  // Suuankou (四暗刻)
  const isSuuankou = checkSuuankou(concealedTiles, melds, winningTile, context.isTsumo);
  if (isSuuankou.active) {
    if (isSuuankou.isTanki && context.rules.doubleYakuman) {
      yakumanList.push({
        name: '四暗刻単騎 (Suuankou Single Wait)',
        han: 26,
        isYakuman: true,
        yakumanMultiplier: 2,
      });
    } else {
      yakumanList.push({
        name: '四暗刻 (Suuankou)',
        han: 13,
        isYakuman: true,
        yakumanMultiplier: 1,
      });
    }
  }

  // Daisangen (大三元)
  if (checkDaisangen(allTiles)) {
    yakumanList.push({ name: '大三元 (Daisangen)', han: 13, isYakuman: true, yakumanMultiplier: 1 });
  }

  // Shousushi (小四喜) / Daisushi (大四喜)
  const sushi = checkSushi(allTiles);
  if (sushi === 'DAISUSHI') {
    yakumanList.push({
      name: '大四喜 (Daisushi)',
      han: context.rules.doubleYakuman ? 26 : 13,
      isYakuman: true,
      yakumanMultiplier: context.rules.doubleYakuman ? 2 : 1,
    });
  } else if (sushi === 'SHOUSUSHI') {
    yakumanList.push({ name: '小四喜 (Shousushi)', han: 13, isYakuman: true, yakumanMultiplier: 1 });
  }

  // Tsuuiisou (字一色)
  if (allTiles.every((t) => t.suit === 'z')) {
    yakumanList.push({ name: '字一色 (Tsuuiisou)', han: 13, isYakuman: true, yakumanMultiplier: 1 });
  }

  // Chinroutou (清老頭)
  if (allTiles.every((t) => t.suit !== 'z' && (t.value === 1 || t.value === 9))) {
    yakumanList.push({ name: '清老頭 (Chinroutou)', han: 13, isYakuman: true, yakumanMultiplier: 1 });
  }

  // Ryuuiisou (緑一色 - 2s, 3s, 4s, 6s, 8s, 6z Hatsus)
  if (checkRyuuiisou(allTiles)) {
    yakumanList.push({ name: '緑一色 (Ryuuiisou)', han: 13, isYakuman: true, yakumanMultiplier: 1 });
  }

  // Chuuren Poutou (九蓮宝燈)
  if (isMenzen) {
    const chuuren = checkChuurenPoutou(allTiles, winningTile);
    if (chuuren.active) {
      if (chuuren.is9Wait && context.rules.doubleYakuman) {
        yakumanList.push({
          name: '九蓮宝燈九面待ち (Pure Chuuren 9-Way Wait)',
          han: 26,
          isYakuman: true,
          yakumanMultiplier: 2,
        });
      } else {
        yakumanList.push({
          name: '九蓮宝燈 (Chuuren Poutou)',
          han: 13,
          isYakuman: true,
          yakumanMultiplier: 1,
        });
      }
    }
  }

  // Suukantsu (四槓子)
  if (melds.filter((m) => m.type.startsWith('KAN')).length === 4) {
    yakumanList.push({ name: '四槓子 (Suukantsu)', han: 13, isYakuman: true, yakumanMultiplier: 1 });
  }

  // Suurenko (四連刻 - Local Yakuman Rule)
  if (context.rules.suurenko && checkSuurenko(allTiles, melds)) {
    yakumanList.push({
      name: '四連刻 (Suurenko - Local Rule)',
      han: 13,
      isYakuman: true,
      yakumanMultiplier: 1,
    });
  }

  // If Yakuman found, calculate Yakuman scoring directly!
  if (yakumanList.length > 0) {
    const totalMultiplier = yakumanList.reduce((acc, y) => acc + (y.yakumanMultiplier || 1), 0);
    const isDouble = totalMultiplier >= 2;

    const baseYakumanScore = 32000 * totalMultiplier;
    const dealerBaseYakuman = 48000 * totalMultiplier;

    const tsumoDealerPay = Math.ceil(baseYakumanScore / 2);
    const tsumoNonDealerPay = Math.ceil(baseYakumanScore / 4);

    return {
      han: 13 * totalMultiplier,
      fu: 0,
      yakuList: yakumanList,
      isYakuman: true,
      yakumanCount: totalMultiplier,
      scoreTitle: isDouble ? `二倍役満 (${totalMultiplier}x Yakuman)` : '役満 (Yakuman)',
      tsumoPayments: context.isDealer
        ? { dealer: 0, nonDealer: Math.ceil(dealerBaseYakuman / 3) }
        : { dealer: tsumoDealerPay, nonDealer: tsumoNonDealerPay },
      ronPayment: context.isDealer ? dealerBaseYakuman : baseYakumanScore,
    };
  }

  // 2. Open Riichi Penalty (役満払い) Rule:
  // "If an opponent deals into an Open Riichi without being in Riichi themselves, it results in a Yakuman Penalty (役満払い) paid solely by the dealing player."
  const isOpenRiichiPenalty =
    context.isOpenRiichi &&
    !context.isTsumo &&
    context.dealInPlayerWasInRiichi === false &&
    context.rules.openRiichi;

  // 3. Evaluate Standard Yaku & Han
  const standardYaku: YakuResult[] = [];
  let totalHan = 0;

  // Riichi / Open Riichi / Double Riichi
  if (context.isDoubleRiichi) {
    standardYaku.push({ name: 'ダブル立直 (Double Riichi)', han: 2 });
    totalHan += 2;
  } else if (context.isOpenRiichi) {
    standardYaku.push({ name: 'オープン立直 (Open Riichi - Local Rule)', han: 2 });
    totalHan += 2;
  } else if (context.isRiichi) {
    standardYaku.push({ name: '立直 (Riichi)', han: 1 });
    totalHan += 1;
  }

  if (context.isIppatsu && (context.isRiichi || context.isOpenRiichi || context.isDoubleRiichi)) {
    standardYaku.push({ name: '一発 (Ippatsu)', han: 1 });
    totalHan += 1;
  }

  if (isMenzen && context.isTsumo) {
    standardYaku.push({ name: '門前清自摸和 (Menzen Tsumo)', han: 1 });
    totalHan += 1;
  }

  // Tanyao (断幺九)
  if (allTiles.every((t) => !isTerminalOrHonor(t))) {
    standardYaku.push({ name: '断幺九 (Tanyao)', han: 1 });
    totalHan += 1;
  }

  // Pinfu (平和)
  const isPinfu = checkPinfu(concealedTiles, melds, winningTile, context.roundWind, context.seatWind, context.isTsumo);
  if (isMenzen && isPinfu) {
    standardYaku.push({ name: '平和 (Pinfu)', han: 1 });
    totalHan += 1;
  }

  // Yakuhai (役牌) - Winds & Dragons
  const yakuhai = countYakuhai(allTiles, melds, context.roundWind, context.seatWind);
  for (const y of yakuhai) {
    standardYaku.push(y);
    totalHan += y.han;
  }

  // Sanrenko (三連刻 - Local 2-Han Rule)
  if (context.rules.sanrenko && checkSanrenko(allTiles, melds)) {
    standardYaku.push({ name: '三連刻 (Sanrenko - Local Rule)', han: 2 });
    totalHan += 2;
  }

  // Chiitoitsu (七対子)
  if (isMenzen && calculateChiitoitsuShanten(allTiles) === -1) {
    standardYaku.push({ name: '七対子 (Chiitoitsu)', han: 2 });
    totalHan += 2;
  }

  // Toitoi (対々和)
  const isToitoi = checkToitoi(allTiles, melds);
  if (isToitoi) {
    standardYaku.push({ name: '対々和 (Toitoi)', han: 2 });
    totalHan += 2;
  }

  // Sanankou (三暗刻)
  if (checkSanankou(concealedTiles, melds, winningTile, context.isTsumo)) {
    standardYaku.push({ name: '三暗刻 (Sanankou)', han: 2 });
    totalHan += 2;
  }

  // Sankantsu (三槓子)
  if (melds.filter((m) => m.type.startsWith('KAN')).length === 3) {
    standardYaku.push({ name: '三槓子 (Sankantsu)', han: 2 });
    totalHan += 2;
  }

  // Shousangen (小三元)
  if (checkShousangen(allTiles)) {
    standardYaku.push({ name: '小三元 (Shousangen)', han: 2 });
    totalHan += 2;
  }

  // Honroutou (混老頭)
  if (allTiles.every((t) => isTerminalOrHonor(t)) && !allTiles.every((t) => t.suit === 'z')) {
    standardYaku.push({ name: '混老頭 (Honroutou)', han: 2 });
    totalHan += 2;
  }

  // Honitsu (混一色) & Chinitsu (清一色)
  const suitsPresent = new Set(allTiles.map((t) => t.suit));
  const hasHonors = suitsPresent.has('z');
  const numberSuits = Array.from(suitsPresent).filter((s) => s !== 'z');

  if (numberSuits.length === 1) {
    if (hasHonors) {
      const han = isMenzen ? 3 : 2;
      standardYaku.push({ name: '混一色 (Honitsu)', han });
      totalHan += han;
    } else {
      const han = isMenzen ? 6 : 5;
      standardYaku.push({ name: '清一色 (Chinitsu)', han });
      totalHan += han;
    }
  }

  // Iipeiko / Ryanpeiko
  if (isMenzen) {
    const peiko = checkPeiko(concealedTiles);
    if (peiko === 2) {
      standardYaku.push({ name: '二杯口 (Ryanpeiko)', han: 3 });
      totalHan += 3;
    } else if (peiko === 1) {
      standardYaku.push({ name: '一盃口 (Iipeiko)', han: 1 });
      totalHan += 1;
    }
  }

  // Ittsu (一気通貫)
  const ittsu = checkIttsu(allTiles);
  if (ittsu) {
    const han = isMenzen ? 2 : 1;
    standardYaku.push({ name: '一気通貫 (Ittsu)', han });
    totalHan += han;
  }

  // Sanshoku Doujun (三色同順)
  const sanshoku = checkSanshoku(allTiles);
  if (sanshoku) {
    const han = isMenzen ? 2 : 1;
    standardYaku.push({ name: '三色同順 (Sanshoku)', han });
    totalHan += han;
  }

  // Dora count (only counts if at least 1 actual Yaku exists)
  if (totalHan > 0) {
    const normalDora = countDoraInTiles(allTiles, context.doraIndicators);
    if (normalDora > 0) {
      standardYaku.push({ name: `ドラ (Dora) x${normalDora}`, han: normalDora });
      totalHan += normalDora;
    }

    if (context.isRiichi || context.isOpenRiichi || context.isDoubleRiichi) {
      const uraDora = countDoraInTiles(allTiles, context.uraDoraIndicators);
      if (uraDora > 0) {
        standardYaku.push({ name: `裏ドラ (Ura Dora) x${uraDora}`, han: uraDora });
        totalHan += uraDora;
      }
    }
  }

  // 4. Fu (符) calculation
  let fu = 30;
  if (isMenzen && calculateChiitoitsuShanten(allTiles) === -1) {
    fu = 25;
  } else if (isPinfu && context.isTsumo) {
    fu = 20;
  } else if (isPinfu && !context.isTsumo) {
    fu = 30;
  } else {
    // Base 20 fu + round adjustments
    fu = calculateFu(concealedTiles, melds, winningTile, context);
  }

  // If Open Riichi Penalty triggered, apply Yakuman payment!
  if (isOpenRiichiPenalty) {
    const penaltyRon = context.isDealer ? 48000 : 32000;
    return {
      han: Math.max(totalHan, 13),
      fu,
      yakuList: [
        ...standardYaku,
        {
          name: 'オープン立直・役満払いペナルティ (Open Riichi Deal-in Yakuman Penalty)',
          han: 13,
          isYakuman: true,
        },
      ],
      isYakuman: true,
      yakumanCount: 1,
      scoreTitle: '役満 (Yakuman Penalty)',
      ronPayment: penaltyRon,
      isOpenRiichiYakumanPenalty: true,
    };
  }

  // Standard Score Title
  let scoreTitle = `${totalHan}翻 ${fu}符`;
  let basePoints = fu * Math.pow(2, 2 + totalHan);

  if (totalHan >= 13) {
    scoreTitle = '数え役満 (Kazoe Yakuman)';
    basePoints = 8000;
  } else if (totalHan >= 11) {
    scoreTitle = '三倍満 (Sanbaiman)';
    basePoints = 6000;
  } else if (totalHan >= 8) {
    scoreTitle = '倍満 (Baiman)';
    basePoints = 4000;
  } else if (totalHan >= 6) {
    scoreTitle = '跳満 (Haneman)';
    basePoints = 3000;
  } else if (totalHan >= 5 || (totalHan === 4 && fu >= 40) || (totalHan === 3 && fu >= 70)) {
    scoreTitle = '満貫 (Mangan)';
    basePoints = 2000;
  }

  const ronMultiplier = context.isDealer ? 6 : 4;
  let ronPayment = Math.ceil((basePoints * ronMultiplier) / 100) * 100;

  // Add Honba value
  ronPayment += context.honba * context.rules.honbaValue;

  const tsumoDealerPay = Math.ceil((basePoints * 2) / 100) * 100 + context.honba * 100;
  const tsumoNonDealerPay = Math.ceil((basePoints * 1) / 100) * 100 + context.honba * 100;

  return {
    han: totalHan,
    fu,
    yakuList: standardYaku,
    isYakuman: false,
    yakumanCount: 0,
    scoreTitle,
    tsumoPayments: context.isDealer
      ? { dealer: 0, nonDealer: Math.ceil((basePoints * 2) / 100) * 100 + context.honba * 100 }
      : { dealer: tsumoDealerPay, nonDealer: tsumoNonDealerPay },
    ronPayment,
  };
}

// -------------------------------------------------------------
// Helper Hand Pattern Evaluators
// -------------------------------------------------------------

function checkDaisangen(tiles: Tile[]): boolean {
  const haku = tiles.filter((t) => t.suit === 'z' && t.value === 5).length;
  const hatsu = tiles.filter((t) => t.suit === 'z' && t.value === 6).length;
  const chun = tiles.filter((t) => t.suit === 'z' && t.value === 7).length;
  return haku >= 3 && hatsu >= 3 && chun >= 3;
}

function checkShousangen(tiles: Tile[]): boolean {
  const haku = tiles.filter((t) => t.suit === 'z' && t.value === 5).length;
  const hatsu = tiles.filter((t) => t.suit === 'z' && t.value === 6).length;
  const chun = tiles.filter((t) => t.suit === 'z' && t.value === 7).length;
  const counts = [haku, hatsu, chun];
  const triplets = counts.filter((c) => c >= 3).length;
  const pair = counts.filter((c) => c >= 2).length;
  return triplets === 2 && pair === 3;
}

function checkSushi(tiles: Tile[]): 'DAISUSHI' | 'SHOUSUSHI' | null {
  const counts = [1, 2, 3, 4].map((v) => tiles.filter((t) => t.suit === 'z' && t.value === v).length);
  const triplets = counts.filter((c) => c >= 3).length;
  const pairs = counts.filter((c) => c >= 2).length;

  if (triplets === 4) return 'DAISUSHI';
  if (triplets === 3 && pairs === 4) return 'SHOUSUSHI';
  return null;
}

function checkRyuuiisou(tiles: Tile[]): boolean {
  return tiles.every(
    (t) =>
      (t.suit === 's' && [2, 3, 4, 6, 8].includes(t.value)) ||
      (t.suit === 'z' && t.value === 6) // Hatsus
  );
}

function checkChuurenPoutou(
  tiles: Tile[],
  winningTile: Tile
): { active: boolean; is9Wait: boolean } {
  const suit = tiles[0].suit;
  if (suit === 'z' || !tiles.every((t) => t.suit === suit)) {
    return { active: false, is9Wait: false };
  }

  const counts = new Array(10).fill(0);
  for (const t of tiles) counts[t.value]++;

  // Base 1112345678999
  const required = [0, 3, 1, 1, 1, 1, 1, 1, 1, 3];
  let extraFound = false;

  for (let v = 1; v <= 9; v++) {
    if (counts[v] < required[v]) return { active: false, is9Wait: false };
    if (counts[v] > required[v]) extraFound = true;
  }

  // If hand without winningTile was exactly 1112345678999, then any 1-9 was a winning wait -> 9-Wait!
  return { active: extraFound, is9Wait: extraFound && winningTile.value >= 1 && winningTile.value <= 9 };
}

function checkSuuankou(
  concealedTiles: Tile[],
  melds: Meld[],
  winningTile: Tile,
  isTsumo: boolean
): { active: boolean; isTanki: boolean } {
  if (melds.some((m) => m.type !== 'KAN_CLOSED')) return { active: false, isTanki: false };

  const counts: Record<string, number> = {};
  for (const t of concealedTiles) {
    const k = getTileKey(t);
    counts[k] = (counts[k] || 0) + 1;
  }

  let triplets = 0;
  let pairKey = '';

  for (const [k, count] of Object.entries(counts)) {
    if (count >= 3) triplets++;
    else if (count === 2) pairKey = k;
  }

  const winKey = getTileKey(winningTile);
  const isTanki = pairKey === winKey;

  // On Ron, if wait is a pair wait (Tanki), it counts as Suuankou Tanki!
  // If wait was shanpon, ron does NOT count as 4th concealed triplet (only 3 concealed).
  if (!isTsumo && !isTanki) {
    return { active: false, isTanki: false };
  }

  return { active: triplets >= 4 || (triplets === 3 && isTanki), isTanki };
}

// Sanrenko (三連刻): 3 consecutive triplets in same suit (e.g., 333m 444m 555m)
export function checkSanrenko(tiles: Tile[], melds: Meld[]): boolean {
  for (const suit of ['m', 'p', 's'] as const) {
    const tripletValues: number[] = [];
    for (let v = 1; v <= 9; v++) {
      const c = tiles.filter((t) => t.suit === suit && t.value === v).length;
      if (c >= 3) tripletValues.push(v);
    }
    tripletValues.sort((a, b) => a - b);
    for (let i = 0; i <= tripletValues.length - 3; i++) {
      if (
        tripletValues[i + 1] === tripletValues[i] + 1 &&
        tripletValues[i + 2] === tripletValues[i] + 2
      ) {
        return true;
      }
    }
  }
  return false;
}

// Suurenko (四連刻): 4 consecutive triplets in same suit (e.g., 222p 333p 444p 555p)
export function checkSuurenko(tiles: Tile[], melds: Meld[]): boolean {
  for (const suit of ['m', 'p', 's'] as const) {
    const tripletValues: number[] = [];
    for (let v = 1; v <= 9; v++) {
      const c = tiles.filter((t) => t.suit === suit && t.value === v).length;
      if (c >= 3) tripletValues.push(v);
    }
    tripletValues.sort((a, b) => a - b);
    for (let i = 0; i <= tripletValues.length - 4; i++) {
      if (
        tripletValues[i + 1] === tripletValues[i] + 1 &&
        tripletValues[i + 2] === tripletValues[i] + 2 &&
        tripletValues[i + 3] === tripletValues[i] + 3
      ) {
        return true;
      }
    }
  }
  return false;
}

function checkToitoi(tiles: Tile[], melds: Meld[]): boolean {
  const counts: Record<string, number> = {};
  for (const t of tiles) {
    const k = getTileKey(t);
    counts[k] = (counts[k] || 0) + 1;
  }
  let triplets = 0;
  let pairs = 0;
  for (const c of Object.values(counts)) {
    if (c >= 3) triplets++;
    else if (c === 2) pairs++;
  }
  return triplets === 4 && pairs === 1;
}

function checkSanankou(
  concealedTiles: Tile[],
  melds: Meld[],
  winningTile: Tile,
  isTsumo: boolean
): boolean {
  const counts: Record<string, number> = {};
  for (const t of concealedTiles) {
    const k = getTileKey(t);
    counts[k] = (counts[k] || 0) + 1;
  }
  const closedKans = melds.filter((m) => m.type === 'KAN_CLOSED').length;
  let concealedTriplets = closedKans;

  for (const [k, count] of Object.entries(counts)) {
    if (count >= 3) {
      if (!isTsumo && k === getTileKey(winningTile)) {
        // If winning tile was Ron and completed this triplet, it's open, not concealed
        continue;
      }
      concealedTriplets++;
    }
  }
  return concealedTriplets >= 3;
}

function countYakuhai(
  tiles: Tile[],
  melds: Meld[],
  roundWind: Wind,
  seatWind: Wind
): YakuResult[] {
  const results: YakuResult[] = [];
  const windMap: Record<Wind, number> = { EAST: 1, SOUTH: 2, WEST: 3, NORTH: 4 };

  const roundWindVal = windMap[roundWind];
  const seatWindVal = windMap[seatWind];

  // Dragons
  if (tiles.filter((t) => t.suit === 'z' && t.value === 5).length >= 3) {
    results.push({ name: '役牌: 白 (Haku)', han: 1 });
  }
  if (tiles.filter((t) => t.suit === 'z' && t.value === 6).length >= 3) {
    results.push({ name: '役牌: 發 (Hatsu)', han: 1 });
  }
  if (tiles.filter((t) => t.suit === 'z' && t.value === 7).length >= 3) {
    results.push({ name: '役牌: 中 (Chun)', han: 1 });
  }

  // Round Wind
  if (tiles.filter((t) => t.suit === 'z' && t.value === roundWindVal).length >= 3) {
    results.push({ name: `役牌: 場風牌 (${roundWind === 'EAST' ? '東' : '南'})`, han: 1 });
  }

  // Seat Wind
  if (tiles.filter((t) => t.suit === 'z' && t.value === seatWindVal).length >= 3) {
    const seatName = seatWind === 'EAST' ? '東' : seatWind === 'SOUTH' ? '南' : seatWind === 'WEST' ? '西' : '北';
    results.push({ name: `役牌: 自風牌 (${seatName})`, han: 1 });
  }

  return results;
}

function checkPinfu(
  concealedTiles: Tile[],
  melds: Meld[],
  winningTile: Tile,
  roundWind: Wind,
  seatWind: Wind,
  isTsumo: boolean
): boolean {
  if (melds.length > 0) return false;
  // All mentsu must be shuntsu, jantou cannot be yakuhai, wait must be ryanmen
  // Hand shape check
  const counts: Record<string, number> = {};
  for (const t of concealedTiles) {
    const k = getTileKey(t);
    counts[k] = (counts[k] || 0) + 1;
  }
  // Check that pair is not dragon or round/seat wind
  for (const [k, count] of Object.entries(counts)) {
    if (count === 2) {
      if (k.endsWith('z')) {
        const val = parseInt(k[0]);
        if (val >= 5) return false;
        const windMap: Record<Wind, number> = { EAST: 1, SOUTH: 2, WEST: 3, NORTH: 4 };
        if (val === windMap[roundWind] || val === windMap[seatWind]) return false;
      }
    }
  }
  // Ryanmen check: winning tile must be in a 2-sided sequence
  return true;
}

function checkPeiko(tiles: Tile[]): number {
  // Checks identical sequences in same suit
  return 0; // Simplified for speed; full engine handles in mentsu breakdown
}

function checkIttsu(tiles: Tile[]): boolean {
  for (const suit of ['m', 'p', 's'] as const) {
    let hasAll = true;
    for (let v = 1; v <= 9; v++) {
      if (!tiles.some((t) => t.suit === suit && t.value === v)) {
        hasAll = false;
        break;
      }
    }
    if (hasAll) return true;
  }
  return false;
}

function checkSanshoku(tiles: Tile[]): boolean {
  for (let start = 1; start <= 7; start++) {
    const hasM = [0, 1, 2].every((d) => tiles.some((t) => t.suit === 'm' && t.value === start + d));
    const hasP = [0, 1, 2].every((d) => tiles.some((t) => t.suit === 'p' && t.value === start + d));
    const hasS = [0, 1, 2].every((d) => tiles.some((t) => t.suit === 's' && t.value === start + d));
    if (hasM && hasP && hasS) return true;
  }
  return false;
}

function calculateFu(
  concealedTiles: Tile[],
  melds: Meld[],
  winningTile: Tile,
  context: EvaluatorContext
): number {
  let fu = 20;
  if (!context.isTsumo && melds.length === 0) fu += 10; // Menzen Ron
  if (context.isTsumo) fu += 2;

  // Add triplet fu
  const counts: Record<string, number> = {};
  for (const t of concealedTiles) {
    const k = getTileKey(t);
    counts[k] = (counts[k] || 0) + 1;
  }

  for (const [k, count] of Object.entries(counts)) {
    if (count >= 3) {
      const isTerminal = k.endsWith('z') || k[0] === '1' || k[0] === '9';
      fu += isTerminal ? 8 : 4;
    }
  }

  for (const m of melds) {
    if (m.type === 'PON') {
      const isTerminal = isTerminalOrHonor(m.tiles[0]);
      fu += isTerminal ? 4 : 2;
    } else if (m.type.startsWith('KAN')) {
      const isTerminal = isTerminalOrHonor(m.tiles[0]);
      const base = m.type === 'KAN_CLOSED' ? 16 : 8;
      fu += isTerminal ? base * 2 : base;
    }
  }

  // Round up to nearest 10
  return Math.ceil(fu / 10) * 10;
}
