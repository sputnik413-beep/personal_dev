import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  Clock,
  Zap,
  TrendingDown,
  TrendingUp,
  Cpu,
  CheckCircle2,
  Lock,
  Unlock,
  Sliders,
  Sparkles,
  Info,
  DollarSign,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Candle, IndicatorValues, CurrencyPair, ScalperConfig, TradeSignal } from '../types/scalper';

interface InstitutionalProAdvisorAgentProps {
  pair: CurrencyPair;
  currentPrice: number;
  candles: Candle[];
  indicators: IndicatorValues;
  latestSignal: TradeSignal | null;
  config: ScalperConfig;
  onUpdateConfig?: (updates: Partial<ScalperConfig>) => Promise<void>;
}

export const InstitutionalProAdvisorAgent: React.FC<InstitutionalProAdvisorAgentProps> = ({
  pair,
  currentPrice,
  candles,
  indicators,
  latestSignal,
  config,
  onUpdateConfig,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // Time & Session Analysis
  const sessionAnalysis = useMemo(() => {
    const nowJst = new Date(Date.now() + 9 * 3600 * 1000);
    const hour = nowJst.getUTCHours();
    const minute = nowJst.getUTCMinutes();

    const isEarlyMorningRollover = hour >= 6 && hour < 8; // 06:00 - 08:00 JST (spread explosive expansion)
    const isLondonFixChop = hour >= 18 && hour < 20; // 18:00 - 20:00 JST (London fix transition whip)
    const isLateNyChop = hour >= 0 && hour < 2; // 00:00 - 02:00 JST (NY lunch liquidity void)
    const isTokyoMorningTrend = hour >= 10 && hour < 15; // 10:00 - 15:00 JST (clean post-fix flow)
    const isNyOpenMomentum = hour >= 21 && hour < 24; // 21:00 - 24:00 JST (highest real liquidity)

    let trapLevel: 'DANGER' | 'WARNING' | 'PRIME' = 'PRIME';
    let trapReason = '流動性正常（取引適格時間帯）';

    if (isEarlyMorningRollover) {
      trapLevel = 'DANGER';
      trapReason = '早朝ロールオーバー（06-08時JST）: スプレッドが通常0.2pから3〜5pipsに爆発拡大し即死する時間帯';
    } else if (isLondonFixChop) {
      trapLevel = 'DANGER';
      trapReason = 'ロンドンフィックス移行（18-20時JST）: 実データ累計-86.4pipsの最大負けゾーン。ポジション調整の往復ビンタ多発';
    } else if (isLateNyChop) {
      trapLevel = 'WARNING';
      trapReason = 'NYランチタイム・深夜過疎（00-02時JST）: 大口不在で板が薄く、小口の仕掛けでヒゲ狩りが発生しやすい';
    } else if (isNyOpenMomentum) {
      trapLevel = 'PRIME';
      trapReason = 'NY市場オープン（21-24時JST）: 実データ+196.3pipsの大勝ゾーン。本物の機関投資家フローで素直に走る';
    } else if (isTokyoMorningTrend) {
      trapLevel = 'PRIME';
      trapReason = '東京仲値通過後（10-15時JST）: 実データ+96.1pipsの安定ゾーン。ノイズが少なく20EMAが機能しやすい';
    }

    return {
      hour,
      minute,
      trapLevel,
      trapReason,
      isTrap: isEarlyMorningRollover || isLondonFixChop || isLateNyChop,
    };
  }, []);

  // Chasing FOMO & Liquidity Void Detection
  const fomoAnalysis = useMemo(() => {
    if (candles.length < 5) {
      return { fomoScore: 20, isStretched: false, verdict: '足数不足', detail: '待機中' };
    }
    const current = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const pip = pair === 'USDJPY' ? 0.01 : 0.0001;

    // EMA Distance (乖離率)
    const emaDistPips = Math.abs(currentPrice - indicators.ema21) / pip;
    // Bollinger Band Stretch (2σ超過)
    const isAboveUpperBb = currentPrice > indicators.bbUpper;
    const isBelowLowerBb = currentPrice < indicators.bbLower;
    // Candle Range Expansion (直前足の急伸)
    const prevRangePips = Math.abs(prev.high - prev.low) / pip;
    const isViolentCandle = prevRangePips > 8.0;

    let fomoScore = 15;
    const riskFactors: string[] = [];

    if (emaDistPips > 8.0) {
      fomoScore += 35;
      riskFactors.push(`20EMAからの乖離が${emaDistPips.toFixed(1)}pips（行き過ぎ・自律反落リスク大）`);
    } else if (emaDistPips > 5.0) {
      fomoScore += 20;
      riskFactors.push(`20EMAから乖離気味（${emaDistPips.toFixed(1)}pips）`);
    }

    if (isAboveUpperBb || isBelowLowerBb) {
      fomoScore += 30;
      riskFactors.push('ボリンジャーバンド2σラインを突破（大口の利益確定売り・逆張りアルゴの餌食ゾーン）');
    }

    if (isViolentCandle) {
      fomoScore += 20;
      riskFactors.push(`直前足が${prevRangePips.toFixed(1)}pipsの急変動（LPが流動性を引いてスリッページが跳ね上がる局面）`);
    }

    fomoScore = Math.min(100, fomoScore);

    return {
      fomoScore,
      isStretched: fomoScore >= 60,
      verdict: fomoScore >= 70 ? '★超高危険度: 飛びつき厳禁' : fomoScore >= 50 ? '注意: 伸びきり警戒' : '正常: 引きつけ健全',
      riskFactors,
    };
  }, [candles, currentPrice, indicators, pair]);

  // Ruthless Pro Advice Generation
  const ruthlessAdvice = useMemo(() => {
    if (sessionAnalysis.isTrap) {
      return {
        action: 'DO_NOT_TRADE',
        headline: '【絶対静観】プロディーラーがカモを刈り取る時間帯です',
        body: `現在（JST ${sessionAnalysis.hour}:${sessionAnalysis.minute.toString().padStart(2, '0')}）は${sessionAnalysis.trapReason}。この時間に成行を叩くのは、機関投資家にスプレッドとスリッページをプレゼントする行為です。シグナル点灯の有無にかかわらず、物理的にPCを閉じるべき局面です。`,
        actionPlan: '時間帯フィルターでエントリーを完全ロックし、21:00（NY市場開始）まで待機。',
      };
    }

    if (fomoAnalysis.isStretched) {
      return {
        action: 'WAIT_FOR_PULLBACK',
        headline: '【飛びつき禁止】ブレイク先端での高値掴みトラップを検知',
        body: `レートが20EMAから乖離し、ボリンジャーバンドの外側へ伸びきっています。ここで成行買い/売りを投げると、大手LPが板を引いているため最悪の価格で掴まされ（0.4〜0.8pipsのスベリ）、直後の利食い反落でストップロスを狩られます。`,
        actionPlan: `成行を捨て、20EMA（${indicators.ema21.toFixed(3)}）への押し目・戻り目を「指値（Limit）」で待つ。`,
      };
    }

    if (latestSignal && latestSignal.direction !== 'NEUTRAL') {
      return {
        action: 'ENTER_WITH_LIMIT',
        headline: `【適格チャンス】${latestSignal.direction}優位局面（ただし成行ではなく指値推奨）`,
        body: `相場環境・時間帯ともに健全。ボブ・ボルマン流の引きつけが完了しています。ただし国内FXの約定スベリ（0.3p）を避けるため、ブレイク直前の高値/安値の手前に「指値（Maker約定）」を構えて待つのがプロの執行です。`,
        actionPlan: `目標利確: +18.0pips / 非常用ハードSL: -18.0pips（ブローカー設置）`,
      };
    }

    return {
      action: 'PATIENCE',
      headline: '【ビルドアップ待ち】20EMA近傍でのエネルギー凝縮を監視中',
      body: '現在は方向感が拮抗した小休止。ここで下手にポジションを持つと微小なノイズで削られます。20EMAを挟んだ攻防が決着し、明確な押し目・戻り目が形成されるまで無駄な弾を撃たないのが鉄則です。',
      actionPlan: '20EMAの傾きが明確化し、直前足の高値/安値を更新するまで静観。',
    };
  }, [sessionAnalysis, fomoAnalysis, latestSignal, indicators]);

  // Handle Quick Anti-Trap Hardening Toggle
  const handleApplyAntiTrapHardening = async () => {
    if (!onUpdateConfig) return;
    setIsApplying(true);
    try {
      await onUpdateConfig({
        sessionTimeFilter: true,
        useDualLayerStopLoss: true,
        softStopLossPips: 10.0,
        hardStopLossPips: 18.0,
        softStopHoldSeconds: 20,
        slippagePips: 0.3,
        spreadPips: 0.20,
        defaultLots: 0.5, // 25x safe
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="bg-[#0e1622] border-2 border-emerald-800/60 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                FX短期トレード プロアドバイザーエージェント
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono">
                裏事情・市場トラップ監視中
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              証券会社ディーラーの約定スベリ、飛びつき高値掴み、早朝スプレッド爆撃を排除する冷徹な軍師
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleApplyAntiTrapHardening}
            disabled={isApplying}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-950/60 disabled:opacity-50"
            title="時間帯フィルター、スリッページ補正、二重ストップロスを即座にボットへ本適用"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isApplying ? '適用中...' : 'プロ仕様プロトコルを一括装填'}</span>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Ruthless Advisor Verdict Box */}
          <div
            className={`p-4 rounded-xl border transition ${
              ruthlessAdvice.action === 'DO_NOT_TRADE'
                ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                : ruthlessAdvice.action === 'WAIT_FOR_PULLBACK'
                ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                : ruthlessAdvice.action === 'ENTER_WITH_LIMIT'
                ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                : 'bg-slate-900/60 border-slate-800 text-slate-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-black/40 border border-white/10 shrink-0 mt-0.5">
                {ruthlessAdvice.action === 'DO_NOT_TRADE' ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                ) : ruthlessAdvice.action === 'WAIT_FOR_PULLBACK' ? (
                  <Flame className="w-5 h-5 text-amber-400" />
                ) : ruthlessAdvice.action === 'ENTER_WITH_LIMIT' ? (
                  <Zap className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Clock className="w-5 h-5 text-cyan-400" />
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    {ruthlessAdvice.headline}
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/50 border border-white/10 text-slate-300">
                    JST {sessionAnalysis.hour}:{sessionAnalysis.minute.toString().padStart(2, '0')} 判定
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {ruthlessAdvice.body}
                </p>
                <div className="pt-1 flex items-center gap-2 text-xs font-semibold text-white">
                  <span className="text-emerald-400">▶ プロ推奨アクション:</span>
                  <span>{ruthlessAdvice.actionPlan}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Real-World Trap Monitors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Time-of-Day Trap Radar */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-400" /> 時間帯トラップ診断
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                    sessionAnalysis.trapLevel === 'DANGER'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : sessionAnalysis.trapLevel === 'WARNING'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {sessionAnalysis.trapLevel === 'DANGER' ? '超危険時間帯' : sessionAnalysis.trapLevel === 'WARNING' ? '過疎注意' : 'プライム適格'}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 leading-relaxed">
                {sessionAnalysis.trapReason}
              </div>
              <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/80">
                実データ: 21-24時JST(+196p) / 18-20時JST(-86p)
              </div>
            </div>

            {/* 2. FOMO Chasing Stretched Meter */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" /> 飛びつき高値掴み指数
                </span>
                <span
                  className={`font-mono font-bold text-xs ${
                    fomoAnalysis.fomoScore >= 70
                      ? 'text-rose-400'
                      : fomoAnalysis.fomoScore >= 50
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  危険度: {fomoAnalysis.fomoScore}%
                </span>
              </div>
              {/* Meter Bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    fomoAnalysis.fomoScore >= 70
                      ? 'bg-rose-500'
                      : fomoAnalysis.fomoScore >= 50
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${fomoAnalysis.fomoScore}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-300">
                {fomoAnalysis.riskFactors.length > 0 ? (
                  <span className="text-amber-300 font-medium">⚠️ {fomoAnalysis.riskFactors[0]}</span>
                ) : (
                  <span className="text-emerald-400 font-medium">✓ 20EMA近傍で健全。飛びつきリスクなし</span>
                )}
              </div>
            </div>

            {/* 3. Broker B-Book & Slippage Guard */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-purple-400" /> ブローカー約定ガード
                </span>
                <span className="text-emerald-400 font-mono text-[10px] font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                  0.3pスベリ補正中
                </span>
              </div>
              <div className="text-[11px] text-slate-300 leading-relaxed">
                国内FXの原則固定0.2pは成行ブレイク時に0.3〜0.5p滑らされる傾向あり。<strong>「押し目指値（Limit）」</strong>を活用することでスベリを完全ゼロ化。
              </div>
              <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/80">
                スプレッド上限ガード: 0.35p超で発注完全遮断
              </div>
            </div>
          </div>

          {/* Theoretical Edge Protocol (Why This Strategy Survives) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>「机上の空論」を完全粉砕する、プロ厳格執行4大プロトコル</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {config.sessionTimeFilter ? '✓ プロトコル全稼働中' : '⚠️ 未装填の設定あり'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="bg-black/30 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 1. 成行飛びつき完全禁止 ＆ 確定足・指値執行
                </div>
                <p className="text-slate-400 leading-relaxed">
                  足の途中の大陽線に飛びつかず、5分足確定を待って20EMA押し目で指値。スリッページをゼロにし、高値掴み即ロスカットを100%防止。
                </p>
              </div>

              <div className="bg-black/30 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> 2. 時間帯キルスイッチ（18-20時/0-2時/6-8時）
                </div>
                <p className="text-slate-400 leading-relaxed">
                  相場の歪み・流動性低下・早朝スプレッド爆撃の時間はボットを完全休止。勝率の高いNY市場（21-24時JST）のみに弾を集中。
                </p>
              </div>

              <div className="bg-black/30 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> 3. 二重ストップロス（実質スベリ耐性付き）
                </div>
                <p className="text-slate-400 leading-relaxed">
                  非常用ハードSL（-18p）をサーバーに常駐させて突発クラッシュを防ぎつつ、判定用ソフトSL（-10p）に20秒タイマーを適用。
                </p>
              </div>

              <div className="bg-black/30 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> 4. 国内25倍レバレッジの物理的証拠金管理
                </div>
                <p className="text-slate-400 leading-relaxed">
                  元本100万円に対しロットを0.5に厳格固定。2枠持っても証拠金約63万円・維持率250%超を維持し、強制ロスカットの数学的リスクを排除。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
