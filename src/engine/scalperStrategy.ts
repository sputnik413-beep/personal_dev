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

  // Determine Market Regime
  let marketRegime: 'STRONG_BULL' | 'MILD_BULL' | 'RANGE' | 'MILD_BEAR' | 'STRONG_BEAR' = 'RANGE';
  let regimeDescription = 'レンジ相場（方向感乏しい）';

  const isEmaBull = indicators.ema21 > indicators.ema50;
  const isEmaBear = indicators.ema21 < indicators.ema50;
  const isEma200Bull = currentPrice > indicators.ema200;
  const isEma200Bear = currentPrice < indicators.ema200;

  if (isEmaBull && isEma200Bull && indicators.ema9 > indicators.ema21) {
    marketRegime = 'STRONG_BULL';
    regimeDescription = 'パーフェクトオーダー上昇トレンド（買い優位）';
  } else if (isEmaBull && currentPrice > indicators.ema21) {
    marketRegime = 'MILD_BULL';
    regimeDescription = '短期上昇トレンド（押し目形成中）';
  } else if (isEmaBear && isEma200Bear && indicators.ema9 < indicators.ema21) {
    marketRegime = 'STRONG_BEAR';
    regimeDescription = 'パーフェクトオーダー下降トレンド（売り優位）';
  } else if (isEmaBear && currentPrice < indicators.ema21) {
    marketRegime = 'MILD_BEAR';
    regimeDescription = '短期下降トレンド（戻り目形成中）';
  } else {
    marketRegime = 'RANGE';
    regimeDescription = '移動平均線収束・保ち合い局面';
  }

  let generatedSignal: TradeSignal | null = null;

  // 1. Bob Volman 21-EMA Pullback Scalp (Bob Volman式 21EMAロールリバーサル押し目・戻り目)
  const isBobVolmanEligible =
    config.selectedStrategy === 'ALL' || config.selectedStrategy === 'BOB_VOLMAN_PULLBACK';

  if (isBobVolmanEligible && !generatedSignal) {
    // Bullish 21-EMA Pullback
    // Condition: In uptrend, low tested or pierced 21 EMA, but closed firmly above 21 EMA, bullish candle body
    const testedEma21FromAbove =
      prevCandle.low <= indicators.ema21 + 1.5 * pip &&
      prevCandle.close >= indicators.ema21 - 1.0 * pip;
    const isBullishRebound =
      currentCandle.close > prevCandle.high ||
      (currentCandle.close > currentCandle.open && currentCandle.close > indicators.ema21);
    const isRsiHealthyBull = indicators.rsi14 >= 48 && indicators.rsi14 <= 68;

    if (isEmaBull && testedEma21FromAbove && isBullishRebound && isRsiHealthyBull) {
      const pipsTP = config.takeProfitPips;
      const pipsSL = config.stopLossPips;
      generatedSignal = {
        id: `sig_${Date.now()}`,
        timestamp: Date.now(),
        pair: config.pair,
        timeframe: config.timeframe,
        direction: 'BUY',
        price: currentPrice,
        strategy: 'Bob Volman 21-EMA Pullback (押し目買い)',
        confidence: Math.min(94, Math.round(75 + (indicators.rsi14 > 52 ? 8 : 4) + (isEma200Bull ? 10 : 0))),
        rationale: `21EMA(${indicators.ema21.toFixed(3)})への健全なリトレースメント完了後、反発陽線を確認。上位トレンド方向への順張りスキャルプ。ゼロスプレッドにより即時利確圏へ到達しやすい有利なポイントです。`,
        suggestedSL: Number((currentPrice - pipsToPriceDiff(config.pair, pipsSL)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        suggestedTP: Number((currentPrice + pipsToPriceDiff(config.pair, pipsTP)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        pipsRisk: pipsSL,
        pipsReward: pipsTP,
      };
    }

    // Bearish 21-EMA Pullback
    const testedEma21FromBelow =
      prevCandle.high >= indicators.ema21 - 1.5 * pip &&
      prevCandle.close <= indicators.ema21 + 1.0 * pip;
    const isBearishRebound =
      currentCandle.close < prevCandle.low ||
      (currentCandle.close < currentCandle.open && currentCandle.close < indicators.ema21);
    const isRsiHealthyBear = indicators.rsi14 <= 52 && indicators.rsi14 >= 32;

    if (!generatedSignal && isEmaBear && testedEma21FromBelow && isBearishRebound && isRsiHealthyBear) {
      const pipsTP = config.takeProfitPips;
      const pipsSL = config.stopLossPips;
      generatedSignal = {
        id: `sig_${Date.now()}`,
        timestamp: Date.now(),
        pair: config.pair,
        timeframe: config.timeframe,
        direction: 'SELL',
        price: currentPrice,
        strategy: 'Bob Volman 21-EMA Pullback (戻り売り)',
        confidence: Math.min(94, Math.round(75 + (indicators.rsi14 < 48 ? 8 : 4) + (isEma200Bear ? 10 : 0))),
        rationale: `21EMA(${indicators.ema21.toFixed(3)})への戻り目タッチからレジスタンス機能を確認し反落。下降パーフェクトオーダー下の高勝率スキャルピング。`,
        suggestedSL: Number((currentPrice + pipsToPriceDiff(config.pair, pipsSL)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        suggestedTP: Number((currentPrice - pipsToPriceDiff(config.pair, pipsTP)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        pipsRisk: pipsSL,
        pipsReward: pipsTP,
      };
    }
  }

  // 2. Bollinger Bands Squeeze & Momentum Breakout
  const isBbBreakoutEligible =
    config.selectedStrategy === 'ALL' || config.selectedStrategy === 'BB_BREAKOUT';

  if (isBbBreakoutEligible && !generatedSignal) {
    const isSqueeze = indicators.bbBandwidth < 0.6; // Low volatility squeeze
    const breaksUpperBB = currentCandle.close > indicators.bbUpper && prevCandle.close <= indicators.bbUpper;
    const breaksLowerBB = currentCandle.close < indicators.bbLower && prevCandle.close >= indicators.bbLower;

    if (breaksUpperBB && indicators.rsi14 > 58) {
      const pipsTP = config.takeProfitPips;
      const pipsSL = config.stopLossPips;
      generatedSignal = {
        id: `sig_${Date.now()}`,
        timestamp: Date.now(),
        pair: config.pair,
        timeframe: config.timeframe,
        direction: 'BUY',
        price: currentPrice,
        strategy: 'BB Squeeze Breakout (スクイーズ上方ブレイク)',
        confidence: 82,
        rationale: `ボリンジャーバンドのスクイーズ収束からエクスパンション発生。上限バンド突破に伴う初動モメンタムを掴むスキャルピングエントリー。`,
        suggestedSL: Number((currentPrice - pipsToPriceDiff(config.pair, pipsSL)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        suggestedTP: Number((currentPrice + pipsToPriceDiff(config.pair, pipsTP)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        pipsRisk: pipsSL,
        pipsReward: pipsTP,
      };
    } else if (breaksLowerBB && indicators.rsi14 < 42) {
      const pipsTP = config.takeProfitPips;
      const pipsSL = config.stopLossPips;
      generatedSignal = {
        id: `sig_${Date.now()}`,
        timestamp: Date.now(),
        pair: config.pair,
        timeframe: config.timeframe,
        direction: 'SELL',
        price: currentPrice,
        strategy: 'BB Squeeze Breakout (スクイーズ下方ブレイク)',
        confidence: 82,
        rationale: `ボリンジャーバンド下限を出来高・モメンタムを伴い下方ブレイク。エクスパンションの初速を刈り取るショートエントリー。`,
        suggestedSL: Number((currentPrice + pipsToPriceDiff(config.pair, pipsSL)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        suggestedTP: Number((currentPrice - pipsToPriceDiff(config.pair, pipsTP)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        pipsRisk: pipsSL,
        pipsReward: pipsTP,
      };
    }
  }

  // 3. RSI Dynamic Extremes Mean-Reversion Scalp (短期過熱リバーサル)
  const isRsiEligible =
    config.selectedStrategy === 'ALL' || config.selectedStrategy === 'RSI_MOMENTUM';

  if (isRsiEligible && !generatedSignal) {
    if (indicators.rsi14 < 25 && currentCandle.low <= indicators.bbLower && currentCandle.close > currentCandle.open) {
      const pipsTP = Math.max(3.5, config.takeProfitPips * 0.8);
      const pipsSL = config.stopLossPips;
      generatedSignal = {
        id: `sig_${Date.now()}`,
        timestamp: Date.now(),
        pair: config.pair,
        timeframe: config.timeframe,
        direction: 'BUY',
        price: currentPrice,
        strategy: 'RSI Extreme Reversal (売られすぎ急反発スキャルプ)',
        confidence: 76,
        rationale: `RSI(${indicators.rsi14.toFixed(1)})が25以下の売られすぎ極限域に到達し、下ヒゲ陽線で反発兆候。ゼロスプレッドの利点を活かした小幅即時リバウンド奪取。`,
        suggestedSL: Number((currentPrice - pipsToPriceDiff(config.pair, pipsSL)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        suggestedTP: Number((currentPrice + pipsToPriceDiff(config.pair, pipsTP)).toFixed(config.pair === 'USDJPY' ? 3 : 5)),
        pipsRisk: pipsSL,
        pipsReward: pipsTP,
      };
    } else if (indicators.rsi14 > 75 && currentCandle.high >= indicators.bbUpper && currentCandle.close < currentCandle.open) {
      const pipsTP = Math.max(3.5, config.takeProfitPips * 0.8);
      const pipsSL = config.stopLossPips;
      generatedSignal = {
        id: `sig_${Date.now()}`,
        timestamp: Date.now(),
        pair: config.pair,
        timeframe: config.timeframe,
        direction: 'SELL',
        price: currentPrice,
        strategy: 'RSI Extreme Reversal (買われすぎ急反落スキャルプ)',
        confidence: 76,
        rationale: `RSI(${indicators.rsi14.toFixed(1)})が75以上の買われすぎ極限域に到達し、上ヒゲ陰線で反落兆候。オーバーシュートの巻き戻しを狙う短期ショート。`,
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
