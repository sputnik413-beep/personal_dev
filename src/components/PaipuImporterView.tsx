import React, { useState } from 'react';
import { MatchRecord, SetSession } from '../types/mahjong';
import { parsePaipuInput, SAMPLE_TENHOU_FIXTURE, SAMPLE_MAHJONG_SOUL_FIXTURE } from '../engine/paipuImporter';
import {
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Database,
  ExternalLink,
  Upload,
} from 'lucide-react';

interface PaipuImporterViewProps {
  onImportMatch: (record: MatchRecord) => void;
  onNavigateToTab: (tab: any) => void;
  sessions: SetSession[];
}

export const PaipuImporterView: React.FC<PaipuImporterViewProps> = ({
  onImportMatch,
  onNavigateToTab,
  sessions,
}) => {
  const [inputUrl, setInputUrl] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'SUCCESS' | 'ERROR' | 'INFO';
    text: string;
  } | null>(null);
  const [lastImported, setLastImported] = useState<MatchRecord | null>(null);

  const handleImport = (rawInput: string) => {
    setStatusMessage(null);
    const result = parsePaipuInput(rawInput);

    if (result.success && result.record) {
      onImportMatch(result.record);
      setLastImported(result.record);
      setStatusMessage({
        type: 'SUCCESS',
        text: `【${result.platform === 'TENHOU' ? '天鳳' : result.platform === 'MAHJONG_SOUL' ? '雀魂' : 'JSON'}】牌譜のインポートに成功しました！ 試合ID: ${result.record.id}`,
      });
      setInputUrl('');
    } else {
      setStatusMessage({
        type: 'ERROR',
        text: result.error || '牌譜の解析に失敗しました。',
      });
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <h2 className="text-xl font-bold text-white tracking-tight">
            天鳳 &amp; 雀魂 牌譜インポーター (Paipu Ingest Hub)
          </h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
          天鳳の個室や雀魂の友人戦で対局した後の「牌譜URL」または「牌譜JSON」を貼り付けるだけで、
          全巡目の向聴数・放銃ケアレベル・無謀押し・先行逃げ切り率を自動解析し、長期戦績ストレージへ蓄積します。
        </p>
      </div>

      {/* Main Import Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <label className="block text-xs font-bold text-slate-300">
          天鳳・雀魂の牌譜URL または 牌譜JSONを入力
        </label>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="例: https://tenhou.net/0/?log=... または https://game.mahjongsoul.com/?paipu=..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            />
          </div>
          <button
            onClick={() => handleImport(inputUrl)}
            disabled={!inputUrl.trim()}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950 transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>牌譜を解析・保存</span>
          </button>
        </div>

        {/* Quick Sample Paste Triggers */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 mr-1">ワンクリック検証用サンプル:</span>
          <button
            onClick={() => handleImport('https://tenhou.net/0/?log=2026101012gm-00a9-0000-sample1')}
            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <span>天鳳 四段戦サンプルを読込</span>
          </button>
          <button
            onClick={() => handleImport('https://game.mahjongsoul.com/?paipu=230815-majsoul-friendly-set1')}
            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>雀魂 友人戦サンプルを読込</span>
          </button>
        </div>

        {/* Status Feedback */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
              statusMessage.type === 'SUCCESS'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
          >
            {statusMessage.type === 'SUCCESS' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>{statusMessage.text}</div>
          </div>
        )}
      </div>

      {/* Last Imported Match Preview Card */}
      {lastImported && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-emerald-900/60 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 tracking-wider block uppercase">
                直近のインポート完了牌譜
              </span>
              <h3 className="text-base font-bold text-white font-mono">{lastImported.id}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateToTab('AGENTS')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>カスタムエージェントで診断</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigateToTab('REPLAY')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                リプレイ再生
              </button>
            </div>
          </div>

          {/* Scores Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {lastImported.players.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{p.name.split(' ')[0]}</span>
                  <span className="text-slate-500">#{p.rank}位</span>
                </div>
                <div className="text-base font-bold text-emerald-400">
                  {p.finalScore.toLocaleString()}点
                </div>
                <div className="text-[11px] text-slate-400">
                  ウマ: <span className={p.umaDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{p.umaDiff >= 0 ? `+${p.umaDiff}` : p.umaDiff}</span>
                </div>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                  放銃: {p.totalDealIns}回 / 無謀押し: {p.unreasonablePushes}回
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
