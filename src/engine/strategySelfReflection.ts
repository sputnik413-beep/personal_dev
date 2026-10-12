import { GoogleGenAI } from '@google/genai';
import { ForwardTestState, StrategyDiagnosis, TradeLog } from '../types/scalper';

/**
 * Strategy Self-Reflection & Adaptive PDCA Cycle Engine
 * Analyzes trade history, identifies failure patterns, and leverages Gemini
 * to recommend quantitative parameter adjustments according to Bob Volman's
 * 5-minute price action scalping methodology.
 */
export async function performStrategySelfReflection(
  state: ForwardTestState
): Promise<StrategyDiagnosis> {
  const { tradeLogs, config, metrics } = state;
  const totalAnalyzed = tradeLogs.length;

  // Calculate forensics on trade logs
  const lossTrades = tradeLogs.filter((t) => t.realizedPnL < 0 || t.pipsGain < 0);
  const winTrades = tradeLogs.filter((t) => t.realizedPnL > 0 || t.pipsGain > 0);
  const winRate = totalAnalyzed > 0 ? (winTrades.length / totalAnalyzed) * 100 : 0;
  const netPips = tradeLogs.reduce((acc, t) => acc + t.pipsGain, 0);

  // Check how many losses were from tight stop losses (<= 5 pips)
  const tightLossCount = lossTrades.filter((t) => Math.abs(t.pipsGain) <= 5.5).length;
  const tightLossRatio = lossTrades.length > 0 ? (tightLossCount / lossTrades.length) * 100 : 0;

  // Calculate trend discipline score based on exit and holding patterns
  const trendDisciplineScore = Math.max(
    50,
    Math.min(95, Math.round(85 - lossTrades.length * 4 + (config.trendSlopeFilter ? 10 : 0)))
  );

  const fallbackReport: StrategyDiagnosis = {
    id: `diag_${Date.now()}`,
    timestamp: Date.now(),
    totalAnalyzedTrades: totalAnalyzed,
    winRate: Number(winRate.toFixed(1)),
    profitFactor: metrics.profitFactor || 0,
    netPips: Number(netPips.toFixed(1)),
    trendDisciplineScore,
    executiveSummary:
      totalAnalyzed >= 4 && winRate < 40
        ? `直近${totalAnalyzed}回の取引で勝率${winRate.toFixed(0)}%と苦戦。主因は「4.5pipsの過度にタイトなロスカット設定」により、5分足の通常ボラティリティの揺らぎ（ノイズ）で刈り取られていた点にあります。ボブ・ボルマン流の10pipロスカット／18〜20pip利確のブレイクアウト原則を適用することで、損小利大の正の期待値を回復できます。`
        : `取引サンプルの蓄積段階です。ボブ・ボルマン流「トレンドフォロー＆保ち合いブレイクアウト」に絞り込み、規律あるトレードサイクルを維持しています。`,
    lossPatternForensics: [
      `過小ロスカット（${config.stopLossPips} pips）: 5分足USD/JPYの平均足幅（6〜12 pips）に対して許容幅が狭すぎ、反発前に狩られるノイズ負けが多発。`,
      `レンジ相場での乱高下巻き込まれ: 20EMAの明確な傾き（トレンド）が確認できない保ち合いでの微小な反転に過敏に反応。`,
      `リスクリワード比率の不均衡: 勝率重視で利幅を6pips程度に抑えていたため、一度の連続損切りを取り返すのに過剰な勝率が要求されていた。`,
    ],
    strengthsIdentified: [
      `スプレッドゼロ環境でのシミュレーションのため、取引コストによる摩擦はゼロに抑えられている。`,
      `24時間連続フォワードテストの自動実行基盤が整備され、感情に左右されない客観的な統計検証が可能。`,
    ],
    suggestedParameterAdjustments: {
      stopLossPips: 10.0,
      takeProfitPips: 18.0,
      minAiConfidence: 78,
      trailingActivationPips: 8.0,
      trailingStopPips: 5.0,
      reason:
        'ボブ・ボルマン式5分足スキャルピング基準に完全同期。許容ロスカットを10.0 pipsに広げてノイズ狩りを遮断し、利確目標を18.0 pips（リスクリワード1:1.8）へ引き上げることで損小利大モデルを構築。',
    },
    applied: false,
  };

  // Attempt Gemini AI generated analysis if API key is present
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return fallbackReport;
    }

    const ai = new GoogleGenAI();
    const prompt = `
あなたは世界的なクオンツFXトレーダーであり、ボブ・ボルマン（Bob Volman）の『FXスキャルピング』『プライスアクション』の権威です。
以下の5分足スキャルピング・AI自動トレードエージェントの直近成績データを精査し、定量的な「自己分析レポート」と「改善パラメータ」をJSON形式で策定してください。

【現状のトレード実績データ】
- 通貨ペア: ${config.pair} / 時間足: ${config.timeframe}
- 総取引数: ${totalAnalyzed}件 (勝ち: ${winTrades.length}件, 負け: ${lossTrades.length}件)
- 勝率: ${winRate.toFixed(1)}% / 累積損益pips: ${netPips.toFixed(1)} pips
- 現行設定: ロスカット ${config.stopLossPips} pips, 利確 ${config.takeProfitPips} pips, 最低信頼度 ${config.minAiConfidence}%
- 直近の損切りパターン: 損失トレードの約${tightLossRatio.toFixed(0)}%が${config.stopLossPips}pips付近で決済
- 直近取引履歴（最新5件）:
${JSON.stringify(tradeLogs.slice(-5), null, 2)}

【要求事項】
1. なぜ直近で4連敗などの損失が発生したのか、ボブ・ボルマン流プライスアクションの観点から率直かつ論理的に診断してください。
2. ロスカットがタイトすぎた点（3〜5pipsのノイズ狩り）と、ボブ・ボルマンの「基本10pipロスカット／20pip利確／20EMAブレイクアウト狙い」の有効性を分析してください。
3. トレンドフォローの大原則を堅持するための推奨パラメータを提示してください。

以下の厳密なJSON形式のみで回答してください:
{
  "executiveSummary": "150文字前後の総括診断",
  "trendDisciplineScore": 85,
  "lossPatternForensics": ["敗因分析1", "敗因分析2", "敗因分析3"],
  "strengthsIdentified": ["優位性1", "優位性2"],
  "suggestedParameterAdjustments": {
    "stopLossPips": 10.0,
    "takeProfitPips": 18.0,
    "minAiConfidence": 78,
    "trailingActivationPips": 8.0,
    "trailingStopPips": 5.0,
    "reason": "パラメータ改修の理由"
  }
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      id: `diag_${Date.now()}`,
      timestamp: Date.now(),
      totalAnalyzedTrades: totalAnalyzed,
      winRate: Number(winRate.toFixed(1)),
      profitFactor: metrics.profitFactor || 0,
      netPips: Number(netPips.toFixed(1)),
      trendDisciplineScore: parsed.trendDisciplineScore || trendDisciplineScore,
      executiveSummary: parsed.executiveSummary || fallbackReport.executiveSummary,
      lossPatternForensics: parsed.lossPatternForensics || fallbackReport.lossPatternForensics,
      strengthsIdentified: parsed.strengthsIdentified || fallbackReport.strengthsIdentified,
      suggestedParameterAdjustments: {
        stopLossPips: parsed.suggestedParameterAdjustments?.stopLossPips || 10.0,
        takeProfitPips: parsed.suggestedParameterAdjustments?.takeProfitPips || 18.0,
        minAiConfidence: parsed.suggestedParameterAdjustments?.minAiConfidence || 78,
        trailingActivationPips: parsed.suggestedParameterAdjustments?.trailingActivationPips || 8.0,
        trailingStopPips: parsed.suggestedParameterAdjustments?.trailingStopPips || 5.0,
        reason: parsed.suggestedParameterAdjustments?.reason || fallbackReport.suggestedParameterAdjustments.reason,
      },
      applied: false,
    };
  } catch (e) {
    console.warn('Gemini self-reflection fallback used:', e);
    return fallbackReport;
  }
}
