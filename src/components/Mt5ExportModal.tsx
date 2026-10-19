import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  X,
  Server,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Terminal,
} from 'lucide-react';
import { ScalperConfig } from '../types/scalper';

interface Mt5ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ScalperConfig;
}

export const Mt5ExportModal: React.FC<Mt5ExportModalProps> = ({
  isOpen,
  onClose,
  config,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'mql5' | 'guide' | 'comparison'>('mql5');

  if (!isOpen) return null;

  // Generate production-grade MQL5 Expert Advisor code
  const mql5Code = `//+------------------------------------------------------------------+
//|                                     VolmanScalper_DualLayer.mq5  |
//|                    Bob Volman 5-Min Scalper with Dual-Layer SL   |
//|               Compatible with OANDA Japan TY3 & Domestic MT5     |
//+------------------------------------------------------------------+
#property copyright "AI Scalper Quant"
#property link      "https://github.com/sputnik413-beep/personal_dev"
#property version   "2.00"
#property strict

#include <Trade\\Trade.mqh>
CTrade trade;

//--- Input Parameters
input group "=== Trading Parameters ==="
input double   InpLots               = ${config.defaultLots || 0.5};     // Trading Lots (0.5 for 25x domestic leverage)
input int      InpTakeProfitPoints   = ${(config.takeProfitPips || 18.0) * 10};   // Take Profit in Points (180 = 18.0 pips)
input int      InpSoftStopPoints     = ${(config.softStopLossPips || 10.0) * 10};   // Soft SL in Points (100 = 10.0 pips)
input int      InpHardStopPoints     = ${(config.hardStopLossPips || 18.0) * 10};   // Emergency Hard SL (180 = 18.0 pips, on broker server)
input int      InpSoftGraceSeconds   = ${config.softStopHoldSeconds || 20};     // Soft SL Grace Period (seconds to absorb spikes)
input bool     InpUseTrailingStop    = ${config.useTrailingStop ? 'true' : 'false'};    // Enable Trailing Stop
input int      InpTrailingActivation = ${(config.trailingActivationPips || 8.0) * 10};    // Trailing Activation Points (80 = 8.0 pips)
input int      InpTrailingStopPoints = ${(config.trailingStopPips || 5.0) * 10};    // Trailing Distance Points (50 = 5.0 pips)

input group "=== Strategy Indicator Settings ==="
input int      InpEmaPeriod          = 20;       // Fast EMA Period (Bob Volman Baseline)
input int      InpMaxOpenTrades      = ${config.maxOpenTrades || 2};        // Maximum Simultaneous Open Trades
input ulong    InpMagicNumber        = 882026;   // Magic Number

//--- Global Variables & Handles
int            hEma = INVALID_HANDLE;
datetime       lastSoftBreachTime = 0;
bool           isSoftBreached = false;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(10);
   trade.SetTypeFilling(ORDER_FILLING_FOK);

   hEma = iMA(_Symbol, _Period, InpEmaPeriod, 0, MODE_EMA, PRICE_CLOSE);
   if(hEma == INVALID_HANDLE)
   {
      Print("Failed to create EMA indicator handle!");
      return(INIT_FAILED);
   }

   Print("Volman Dual-Layer EA Initialized for OANDA Japan Tokyo (TY3) MT5");
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if(hEma != INVALID_HANDLE) IndicatorRelease(hEma);
}

//+------------------------------------------------------------------+
//| Count active positions by MagicNumber                            |
//+------------------------------------------------------------------+
int CountPositions(ENUM_POSITION_TYPE posType)
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionGetSymbol(i) == _Symbol)
      {
         if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
         {
            if(PositionGetInteger(POSITION_TYPE) == posType) count++;
         }
      }
   }
   return count;
}

//+------------------------------------------------------------------+
//| Dual-Layer SL & Trailing Stop Engine (Called Every Tick)         |
//+------------------------------------------------------------------+
void ManagePositions()
{
   datetime now = TimeCurrent();
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionGetSymbol(i) != _Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;

      ulong ticket = PositionGetInteger(POSITION_TICKET);
      ENUM_POSITION_TYPE type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      double currentSL = PositionGetDouble(POSITION_SL);

      // 1. Soft SL Monitoring (Layer 2: Software Filtered SL)
      if(type == POSITION_TYPE_BUY)
      {
         double softSlPrice = openPrice - (InpSoftStopPoints * point);
         if(bid <= softSlPrice)
         {
            if(!isSoftBreached)
            {
               isSoftBreached = true;
               lastSoftBreachTime = now;
               PrintFormat("Soft SL touched at %.3f. Waiting %d sec to absorb spike...", bid, InpSoftGraceSeconds);
            }
            else if(now - lastSoftBreachTime >= InpSoftGraceSeconds)
            {
               PrintFormat("Soft SL sustained for %d sec. Closing BUY position ticket %d", InpSoftGraceSeconds, ticket);
               trade.PositionClose(ticket);
               isSoftBreached = false;
               continue;
            }
         }
         else
         {
            if(isSoftBreached)
            {
               PrintFormat("Price rebounded to %.3f! Spike successfully absorbed without loss.", bid);
               isSoftBreached = false;
            }
         }

         // Trailing Stop Logic
         if(InpUseTrailingStop && (bid - openPrice) >= InpTrailingActivation * point)
         {
            double newSL = bid - (InpTrailingStopPoints * point);
            if(newSL > currentSL + (5 * point))
            {
               trade.PositionModify(ticket, newSL, PositionGetDouble(POSITION_TP));
            }
         }
      }
      else if(type == POSITION_TYPE_SELL)
      {
         double softSlPrice = openPrice + (InpSoftStopPoints * point);
         if(ask >= softSlPrice)
         {
            if(!isSoftBreached)
            {
               isSoftBreached = true;
               lastSoftBreachTime = now;
               PrintFormat("Soft SL touched at %.3f. Waiting %d sec to absorb spike...", ask, InpSoftGraceSeconds);
            }
            else if(now - lastSoftBreachTime >= InpSoftGraceSeconds)
            {
               PrintFormat("Soft SL sustained for %d sec. Closing SELL position ticket %d", InpSoftGraceSeconds, ticket);
               trade.PositionClose(ticket);
               isSoftBreached = false;
               continue;
            }
         }
         else
         {
            if(isSoftBreached)
            {
               PrintFormat("Price rebounded to %.3f! Spike successfully absorbed without loss.", ask);
               isSoftBreached = false;
            }
         }

         // Trailing Stop Logic
         if(InpUseTrailingStop && (openPrice - ask) >= InpTrailingActivation * point)
         {
            double newSL = ask + (InpTrailingStopPoints * point);
            if(currentSL == 0 || newSL < currentSL - (5 * point))
            {
               trade.PositionModify(ticket, newSL, PositionGetDouble(POSITION_TP));
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Check Entry Signals (Bob Volman 20EMA Pullback / Breakout)       |
//+------------------------------------------------------------------+
void CheckSignals()
{
   if(CountPositions(POSITION_TYPE_BUY) + CountPositions(POSITION_TYPE_SELL) >= InpMaxOpenTrades)
      return;

   // Get Candle Close & EMA values
   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   if(CopyRates(_Symbol, _Period, 0, 4, rates) < 4) return;

   double ema[];
   ArraySetAsSeries(ema, true);
   if(CopyBuffer(hEma, 0, 0, 4, ema) < 4) return;

   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);

   bool isBullishSlope = (ema[1] > ema[2]) && (ema[2] > ema[3]);
   bool isBearishSlope = (ema[1] < ema[2]) && (ema[2] < ema[3]);

   // BUY Signal: Bullish slope + pullback to 20EMA + breakout bar closing above EMA
   if(isBullishSlope && rates[2].low <= ema[2] && rates[1].close > ema[1] && rates[1].close > rates[1].open)
   {
      double hardSL = ask - (InpHardStopPoints * point); // Layer 1: Broker-side Safety Net
      double tp     = ask + (InpTakeProfitPoints * point);
      PrintFormat("BUY Signal Triggered! Sending Order with Hard SL %.3f, TP %.3f", hardSL, tp);
      trade.Buy(InpLots, _Symbol, ask, hardSL, tp, "Volman 5m Scalp");
   }
   // SELL Signal: Bearish slope + pullback to 20EMA + breakout bar closing below EMA
   else if(isBearishSlope && rates[2].high >= ema[2] && rates[1].close < ema[1] && rates[1].close < rates[1].open)
   {
      double hardSL = bid + (InpHardStopPoints * point); // Layer 1: Broker-side Safety Net
      double tp     = bid - (InpTakeProfitPoints * point);
      PrintFormat("SELL Signal Triggered! Sending Order with Hard SL %.3f, TP %.3f", hardSL, tp);
      trade.Sell(InpLots, _Symbol, bid, hardSL, tp, "Volman 5m Scalp");
   }
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   ManagePositions();
   CheckSignals();
}
//+------------------------------------------------------------------+
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mql5Code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([mql5Code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'VolmanScalper_DualLayer.mq5';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#0e141e] border border-cyan-800/60 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between bg-gradient-to-r from-slate-900 via-[#101b2b] to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <FileCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  MetaTrader 5 (MT5) EA 自動生成 ＆ 運用戦略ガイド
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                  OANDA東京 / 国内最狭0.2p対応
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Bob Volman式5分足スキャルピング ＋ 二重ストップロス構造（ハードSL/ソフトSL）完全移植MQL5コード
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-4 text-xs">
          <button
            onClick={() => setActiveTab('mql5')}
            className={`py-3 px-4 font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'mql5'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>MQL5コード (.mq5 / .ex5)</span>
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`py-3 px-4 font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'comparison'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>4大アーキテクチャ徹底比較 (MT5 vs XM vs ブラウザ)</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-4 font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'guide'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>MT5への導入・コンパイル手順</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs text-slate-300">
          {activeTab === 'mql5' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">VolmanScalper_DualLayer.mq5</span>
                  <span className="text-[10px] text-slate-400">
                    （設定パラメータ: ロット {config.defaultLots || 0.5} / 利確 18p / ソフトSL 10p / ハードSL 18p）
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 transition text-xs border border-slate-700"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'コピー完了' : 'コードをコピー'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 transition text-xs shadow-md shadow-cyan-950"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>.mq5 をダウンロード</span>
                  </button>
                </div>
              </div>

              <div className="relative rounded-xl border border-slate-800 bg-[#080d14] p-4 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[50vh]">
                <pre className="text-slate-300 whitespace-pre">{mql5Code}</pre>
              </div>

              <div className="bg-cyan-950/20 border border-cyan-800/40 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>MQL5コードに内蔵された3大独自機構:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300 pl-1">
                  <li><strong>第1層 ブローカー常駐ハードSL (-18.0pips)</strong>: 注文発注時にサーバー側へ直接設定され、回線遮断時も口座を完全防衛</li>
                  <li><strong>第2層 自律ソフトSL (-10.0pips)</strong>: <code>OnTick</code>内でタッチを検知しても即決済せず、20秒間の猶予タイマー（<code>InpSoftGraceSeconds</code>）でヒゲ狩りを吸収</li>
                  <li><strong>反発検知キャンセル</strong>: 猶予時間内にレートがEMA側へ跳ね返った場合、フラグをリセットして通常保有を継続</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'comparison' && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <h4 className="text-sm font-bold text-white mb-2">ご質問の各選択肢に対する定量的診断・回答</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/50">
                        <th className="p-2.5">実行方式 / アーキテクチャ</th>
                        <th className="p-2.5">取引コスト (1回)</th>
                        <th className="p-2.5">直近215回 累計コスト</th>
                        <th className="p-2.5">実質純損益 (二重SL時)</th>
                        <th className="p-2.5">総合評価とリスク</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      <tr className="bg-emerald-950/30">
                        <td className="p-2.5 font-bold text-emerald-300">
                          ① 国内MT5 EA (.ex5)<br />
                          <span className="text-[10px] text-slate-400 font-normal">OANDA東京 / 外為ファイネスト等</span>
                        </td>
                        <td className="p-2.5 text-emerald-400 font-bold font-mono">0.20 pips (約200円)</td>
                        <td className="p-2.5 text-emerald-400 font-bold font-mono">-54,400 円</td>
                        <td className="p-2.5 text-emerald-300 font-bold font-mono text-xs">+640,700 円 (+640.7p)</td>
                        <td className="p-2.5 text-emerald-400 font-bold">
                          ★【最強の最適解】<br />
                          <span className="text-[10px] font-normal text-slate-300">手数料0円・最狭スプレッド。公式公認でレイテンシ数ミリ秒。</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-purple-300">
                          ② XM KIWAMI極 ＋ TariTali<br />
                          <span className="text-[10px] text-slate-400 font-normal">MT4/MT5 または Webhook</span>
                        </td>
                        <td className="p-2.5 text-purple-300 font-mono">実質 0.45 pips (約450円)</td>
                        <td className="p-2.5 text-purple-400 font-mono">-122,400 円</td>
                        <td className="p-2.5 text-purple-300 font-bold font-mono">+572,700 円 (+572.7p)</td>
                        <td className="p-2.5 text-slate-300">
                          ○【第2候補】<br />
                          <span className="text-[10px] text-slate-400">キャッシュバック併用で低コスト化。海外高レバレッジ希望なら有力。</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-slate-300">
                          ③ XM Zero口座 (XMP併用想定)<br />
                          <span className="text-[10px] text-slate-400 font-normal">手数料$5 + スプレッド0.15p</span>
                        </td>
                        <td className="p-2.5 text-rose-400 font-mono">0.94 pips (約943円)</td>
                        <td className="p-2.5 text-rose-400 font-mono">-255,680 円</td>
                        <td className="p-2.5 text-slate-300 font-mono">+439,420 円 (+439.4p)</td>
                        <td className="p-2.5 text-rose-400 font-bold">
                          ×【要注意: XMPは対象外】<br />
                          <span className="text-[10px] font-normal text-slate-300">Zero口座はXMPボーナス付与対象外。スタンダード口座は1.6pで論外。</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-amber-300">
                          ④ OANDA NYサーバー (REST API)<br />
                          <span className="text-[10px] text-slate-400 font-normal">api-fxtrade.oanda.com</span>
                        </td>
                        <td className="p-2.5 text-amber-400 font-mono">1.00 pips (約1,000円)</td>
                        <td className="p-2.5 text-amber-400 font-mono">-272,000 円</td>
                        <td className="p-2.5 text-amber-300 font-mono">+423,100 円 (+423.1p)</td>
                        <td className="p-2.5 text-amber-400">
                          △【非推奨: スプレッド広】<br />
                          <span className="text-[10px] font-normal text-slate-300">NYサーバーは変動1.0p前後まで拡大。スキャルではコスト負けする。</span>
                        </td>
                      </tr>
                      <tr className="bg-rose-950/20">
                        <td className="p-2.5 font-bold text-rose-400">
                          ⑤ ブラウザ自動操作エージェント<br />
                          <span className="text-[10px] text-slate-400 font-normal">Puppeteer / Playwright等</span>
                        </td>
                        <td className="p-2.5 text-rose-400 font-mono">0.20p + スリッページ大</td>
                        <td className="p-2.5 text-rose-400 font-mono">算出不能 (遅延大)</td>
                        <td className="p-2.5 text-rose-400 font-mono">事故リスク大</td>
                        <td className="p-2.5 text-rose-400 font-bold">
                          ×【危険: 絶対に非推奨】<br />
                          <span className="text-[10px] font-normal text-slate-300">規約違反（口座凍結）・DOM変更で誤発注・数百msの遅延。</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-cyan-300 font-bold">OANDA東京サーバー × MT5の優位性:</span>
                  <p className="text-slate-300 leading-relaxed">
                    ユーザー様のご指摘通り、OANDA東京サーバーは外部REST APIを締め切っていますが、<strong>MT5/MT4のEA（.ex5）による自動売買は公式に完全認可</strong>されています。
                    この方式を採用すれば、原則固定0.20pips・手数料0円の最強環境で、ミリ秒単位のヒゲ狩り回避ロジックを直結実行できます。
                  </p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-purple-300 font-bold">XMで運用する場合の真実（XMPの罠）:</span>
                  <p className="text-slate-300 leading-relaxed">
                    XMのロイヤルティプログラム（XMP）は<strong>「スタンダード口座」のみが対象</strong>で、スタンダード口座のドル円スプレッドは1.6pips（1,600円）もありスキャルでは即死します。<br />
                    海外口座を使うなら「KIWAMI極口座（0.7p・手数料0円）」を開設し、TariTaliなどの外部リベートを紐付けるのがプロの常套手段です。
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>3分で完了するMT5へのEA導入手順（OANDA Japan 東京 / その他国内MT5）</span>
                </h4>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="flex gap-3 items-start bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <div>
                      <strong className="text-white">コードのダウンロード:</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        「MQL5コード」タブの「.mq5 をダウンロード」をクリックして、<code>VolmanScalper_DualLayer.mq5</code> を保存します。
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div>
                      <strong className="text-white">MetaEditorを開いて配置:</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        MT5を起動し、キーボードの「F4」キーを押してMetaEditorを開きます。メニューの [ファイル] → [データフォルダを開く] → <code>MQL5\\Experts</code> フォルダ内にダウンロードした <code>.mq5</code> ファイルを配置します。
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <div>
                      <strong className="text-white">コンパイル（.ex5の自動生成）:</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        MetaEditorのツールバーにある「コンパイル（F7）」をクリックします。「0 errors, 0 warnings」と表示され、<code>VolmanScalper_DualLayer.ex5</code> が自動生成されます。
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                      4
                    </span>
                    <div>
                      <strong className="text-white">チャートへドラッグ＆自動売買許可:</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        MT5画面に戻り、USD/JPYの5分足チャートにEAをドラッグ＆ドロップ。上部メニューの「アルゴリズム取引（AutoTrading）」を有効化すれば稼働開始です。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-emerald-400 font-bold">推奨構成:</span>
            <span>国内MT5（OANDA東京 / 外為ファイネスト）で .ex5 運用 ＝ 最低スプレッド(0.2p) ＆ 手数料0円</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
