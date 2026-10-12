import {
  Candle,
  CurrencyPair,
  Timeframe,
  TradeSignal,
  ScalperConfig,
  IndicatorValues,
} from '../types/scalper';
import {
  computeLatestIndicators,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  calculateATR,
  getPipMultiplier,
  priceDiffToPips,
  pipsToPriceDiff,
} from './technicalIndicators';

export interface StrategyEvaluationResult {
  signal: TradeSignal | null;
  indicators: IndicatorValues;
  marketRegime: 'STRONG_BULL' | 'MILD_BULL' | 'RANGE' | 'MILD_BEAR' | 'STRONG_BEAR';
  regimeDescription: string;
}

/**
 * Evaluates current market candles according to 5-min & 1-min scalping methodology
 */
export function evaluateScalperStrategy(
  candles: Candle[],
  config: ScalperConfig
): StrategyEvaluationResult {
  if (candles.length < 30) {
    const indicators = computeLatestIndicators(candles);
    return {
      signal: null,
      indicators,
      marketRegime: 'RANGE',
      regimeDescription: '足数が不足しています (最低30本以上必要)',
    };
  }

  const indicators = computeLatestIndicators(candles);
  const currentCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const prevPrevCandle = candles[candles.length - 3];

  const currentPrice = currentCandle.close;
  const pip = getPipMultiplier(config.pair);

  // Calculate 21-EMA slope for trend-following discipline
  const ema21Series = calculateEMA(candles.map((c) => c.close), 21);
  const ema21Prev = ema21Series[ema21Series.length - 2] ?? indicators.ema21;
  const emaSlope = indicators.ema21 - ema21Prev;
  const isSlopeUp = emaSlope >= 0;
  const isSlopeDown = emaSlope <= 0;

  // Determine Market Regime (Strict 20/21EMA & 50EMA Trend Alignment)
  let marketRegime: 'STRONG_BULL' | 'MILD_BULL' | 'RANGE' | 'MILD_BEAR' | 'STRONG_BEAR' = 'RANGE';
  let regimeDescription = 'レンジ相場（方向感乏しい）';

  const isEmaBull = indicators.ema21 > indicators.ema50;
  const isEmaBear = indicators.ema21 < indicators.ema50;
  const isEma200Bull = currentPrice > indicators.ema200;
  const isEma200Bear = currentPrice < indicators.ema200;

  if (isEmaBull && isSlopeUp && currentPrice > indicators.ema21) {
    marketRegime = isEma200Bull && indicators.ema9 > indicators.ema21 ? 'STRONG_BULL' : 'MILD_BULL';
    regimeDescription = isEma200Bull
      ? 'パーフェクトオーダー上昇トレンド（20EMA上抜け・買い優位）'
      : '短期上昇トレンド（20EMA傾き上向き・押し目ブレイク狙い）';
  } else if (isEmaBear && isSlopeDown && currentPrice < indicators.ema21) {
    marketRegime = isEma200Bear && indicators.ema9 < indicators.ema21 ? 'STRONG_BEAR' : 'MILD_BEAR';
    regimeDescription = isEma200Bear
      ? 'パーフェクトオーダー下降トレンド（20EMA下抜け・売り優位）'
      : '短期下降トレンド（20EMA傾き下向き・戻り目ブレイク狙い）';
  } else {
    marketRegime = 'RANGE';
    regimeDescription = '20EMA収束・保ち合い局面（ビルドアップ形成待ち）';
  }

  let generatedSignal: TradeSignal | null = null;
  const pipsTP = config.takeProfitPips || 18.0;
  const pipsSL = config.stopLossPips || 10.0;

  // -------------------------------------------------------------------------
  // 1. Bob Volman 20/21-EMA Pullback Breakout (20EMAプルバック反発ブレイク)
  // トレンド大原則: トレンド方向への押し目/戻り目から直前足の高値/安値をブレイクした瞬間
  // -------------------------------------------------------------------------
  const isBobVolmanPullbackEligible =
    config.selectedStrategy === 'ALL' || config.selectedStrategy === 'BOB_VOLMAN_PULLBACK';

  if (isBobVolmanPullbackEligible && !generatedSignal) {
    // Bullish 20-EMA Pullback Breakout
    // 条件: 上昇トレンド中(EMA21>EMA50かつEMA傾き上向き)、直前足がEMA21近傍まで引き付け(テスト)、
    //       現在足が直前足の高値を上方にブレイクした瞬間
    const prevTestedEma = prevCandle.low <= indicators.ema21 + 2.0 * pip && prevCandle.close >= indicators.ema21 - 2.0 * pip;
    const breaksPrevHigh = currentCandle.close > prevCandle.high;
    const isAboveEma = currentPrice >= indicators.ema21;

    if (isEmaBull && isSlopeUp && prevTestedEma && breaksPrevHigh && isAboveEma) {
      generatedSignal = {
        id: `sig_${Date.now()}`,
        timestamp: Date.now(),
        pair: config.pair,
        timeframe: config.timeframe,
        direction: 'BUY',
        price: currentPrice,
        strategy: 'Bob Volman 20EMA Pullback Breakout (押し目ブレイク)',
        confidence: Math.min(95, Math.round(78 + (isEma200Bull ? 10 : 4) + (indicators.rsi14 >= 50 && indicators.rsi14 <= 65 ? 6 : 2))),
        rationale: `ボブ・ボルマン流5分足原則: 20EMA(${indicators.ema21.toFixed(3)})への健全なプルバック完了後、直前足高値を上抜けブレイクアウト。10pip許容ロスカットによりノイズ狩りを防ぎ、上位トレンド方向に20pip目標を狙います。`,
        suggestedSL: Number((currentPrice - pipsToPriceDiff(config.pair, pipsSL)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        suggestedTP: Number((currentPrice + pipsToPriceDiff(config.pair, pipsTP)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        pipsRisk: pipsSL,
        pipsReward: pipsTP,
      };
    }

    // Bearish 20-EMA Pullback Breakout
    const prevTestedEmaBear = prevCandle.high >= indicators.ema21 - 2.0 * pip && prevCandle.close <= indicators.ema21 + 2.0 * pip;
    const breaksPrevLow = currentCandle.close < prevCandle.low;
    const isBelowEma = currentPrice <= indicators.ema21;

    if (!generatedSignal && isEmaBear && isSlopeDown && prevTestedEmaBear && breaksPrevLow && isBelowEma) {
      generatedSignal = {
        id: `sig_${Date.now()}`,
        timestamp: Date.now(),
        pair: config.pair,
        timeframe: config.timeframe,
        direction: 'SELL',
        price: currentPrice,
        strategy: 'Bob Volman 20EMA Pullback Breakout (戻り目ブレイク)',
        confidence: Math.min(95, Math.round(78 + (isEma200Bear ? 10 : 4) + (indicators.rsi14 <= 50 && indicators.rsi14 >= 35 ? 6 : 2))),
        rationale: `ボブ・ボルマン流5分足原則: 20EMA(${indicators.ema21.toFixed(3)})への戻り目タッチから直前足安値を下抜けブレイクアウト。下降トレンド方向への順張りスキャルプ。`,
        suggestedSL: Number((currentPrice + pipsToPriceDiff(config.pair, pipsSL)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        suggestedTP: Number((currentPrice - pipsToPriceDiff(config.pair, pipsTP)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        pipsRisk: pipsSL,
        pipsReward: pipsTP,
      };
    }
  }

  // -------------------------------------------------------------------------
  // 2. Bob Volman Block / Buildup Breakout (保ち合いブロック・ブレイクアウト)
  // トレンド継続中の数本の狭小レンジ(ビルドアップ)から、トレンド方向に力強く抜け出すセットアップ
  // -------------------------------------------------------------------------
  const isVolmanBlockEligible =
    config.selectedStrategy === 'ALL' || config.selectedStrategy === 'VOLMAN_BLOCK_BREAK';

  if (isVolmanBlockEligible && !generatedSignal && candles.length >= 6) {
    const buildupCandles = candles.slice(-6, -1);
    const buildupHigh = Math.max(...buildupCandles.map((c) => c.high));
    const buildupLow = Math.min(...buildupCandles.map((c) => c.low));
    const buildupRangePips = priceDiffToPips(config.pair, buildupHigh - buildupLow);

    // ビルドアップは狭いレンジ (10 pips以内) であることが前提
    const isTightBuildup = buildupRangePips <= 12.0 && buildupRangePips >= 2.0;

    // 上昇トレンド中におけるブロック上抜けブレイク
    if (isEmaBull && isSlopeUp && isTightBuildup && currentCandle.close > buildupHigh && currentPrice > indicators.ema21) {
      generatedSignal = {
        id: `sig_${Date.now()}`,
        timestamp: Date.now(),
        pair: config.pair,
        timeframe: config.timeframe,
        direction: 'BUY',
        price: currentPrice,
        strategy: 'Volman Block Breakout (ビルドアップ上方ブレイク)',
        confidence: 88,
        rationale: `20EMA沿いでの緊密な保ち合いブロック(${buildupRangePips.toFixed(1)} pips)を上抜けブレイクアウト。売り手の諦めと追随買いによる急伸を捉える正統派トレンドフォロー。`,
        suggestedSL: Number((currentPrice - pipsToPriceDiff(config.pair, pipsSL)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        suggestedTP: Number((currentPrice + pipsToPriceDiff(config.pair, pipsTP)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        pipsRisk: pipsSL,
        pipsReward: pipsTP,
      };
    }

    // 下降トレンド中におけるブロック下抜けブレイク
    if (!generatedSignal && isEmaBear && isSlopeDown && isTightBuildup && currentCandle.close < buildupLow && currentPrice < indicators.ema21) {
      generatedSignal = {
        id: `sig_${Date.now()}`,
        timestamp: Date.now(),
        pair: config.pair,
        timeframe: config.timeframe,
        direction: 'SELL',
        price: currentPrice,
        strategy: 'Volman Block Breakout (ビルドアップ下方ブレイク)',
        confidence: 88,
        rationale: `20EMA下での保ち合いブロック(${buildupRangePips.toFixed(1)} pips)を下抜けブレイクアウト。買い手の損切りとショート追随による下落加速を捉えます。`,
        suggestedSL: Number((currentPrice + pipsToPriceDiff(config.pair, pipsSL)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        suggestedTP: Number((currentPrice - pipsToPriceDiff(config.pair, pipsTP)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        pipsRisk: pipsSL,
        pipsReward: pipsTP,
      };
    }
  }

  // -------------------------------------------------------------------------
  // 3. Bollinger Bands Squeeze & Trend Expansion (トレンド同調スクイーズブレイク)
  // ※逆張りは行わず、EMAトレンド方向に合致したブレイクのみを許可
  // -------------------------------------------------------------------------
  const isBbBreakoutEligible =
    config.selectedStrategy === 'ALL' || config.selectedStrategy === 'BB_BREAKOUT';

  if (isBbBreakoutEligible && !generatedSignal) {
    const isSqueeze = indicators.bbBandwidth < 0.8;
    const breaksUpperBB = currentCandle.close > indicators.bbUpper && prevCandle.close <= indicators.bbUpper;
    const breaksLowerBB = currentCandle.close < indicators.bbLower && prevCandle.close >= indicators.bbLower;

    // 上昇トレンド + 上限バンド突破
    if (isEmaBull && isSlopeUp && breaksUpperBB && indicators.rsi14 >= 55) {
      generatedSignal = {
        id: `sig_${Date.now()}`,
        timestamp: Date.now(),
        pair: config.pair,
        timeframe: config.timeframe,
        direction: 'BUY',
        price: currentPrice,
        strategy: 'BB Trend Expansion (トレンド同調バンドブレイク)',
        confidence: 84,
        rationale: `上昇トレンド継続下でボリンジャーバンド上限をモメンタムを伴い突破。エクスパンション初動のボラティリティ拡大に乗る順張りブレイク。`,
        suggestedSL: Number((currentPrice - pipsToPriceDiff(config.pair, pipsSL)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        suggestedTP: Number((currentPrice + pipsToPriceDiff(config.pair, pipsTP)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        pipsRisk: pipsSL,
        pipsReward: pipsTP,
      };
    } else if (isEmaBear && isSlopeDown && breaksLowerBB && indicators.rsi14 <= 45) {
      // 下降トレンド + 下限バンド突破
      generatedSignal = {
        id: `sig_${Date.now()}`,
        timestamp: Date.now(),
        pair: config.pair,
        timeframe: config.timeframe,
        direction: 'SELL',
        price: currentPrice,
        strategy: 'BB Trend Expansion (トレンド同調バンドブレイク)',
        confidence: 84,
        rationale: `下降トレンド継続下でボリンジャーバンド下限を出来高・モメンタムを伴い下方ブレイク。下降加速を捉える順張りショート。`,
        suggestedSL: Number((currentPrice + pipsToPriceDiff(config.pair, pipsSL)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        suggestedTP: Number((currentPrice - pipsToPriceDiff(config.pair, pipsTP)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        pipsRisk: pipsSL,
        pipsReward: pipsTP,
      };
    }
  }

  return {
    signal: generatedSignal,
    indicators,
    marketRegime,
    regimeDescription,
  };
}
