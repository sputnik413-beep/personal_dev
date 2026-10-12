import React from 'react';
import { HouseRules } from '../types/mahjong';
import { Sliders, X, Check, ShieldCheck, Zap, Copy, ExternalLink, Users } from 'lucide-react';

interface LobbyAndRulesModalProps {
  rules: HouseRules;
  isRecorded: boolean;
  onUpdateRules: (newRules: HouseRules, isRecorded: boolean) => void;
  onClose: () => void;
}

export const LobbyAndRulesModal: React.FC<LobbyAndRulesModalProps> = ({
  rules,
  isRecorded,
  onUpdateRules,
  onClose,
}) => {
  const [formRules, setFormRules] = React.useState<HouseRules>({ ...rules });
  const [recordedFlag, setRecordedFlag] = React.useState<boolean>(isRecorded);
  const [copied, setCopied] = React.useState<boolean>(false);

  const sharedAppUrl = 'https://ais-pre-fs325vkpne7iwqmdhwjmgk-968179531214.asia-east1.run.app';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sharedAppUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = (key: keyof HouseRules) => {
    setFormRules((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    onUpdateRules(formRules, recordedFlag);
    onClose();
  };

  const handleApplyPreset = (preset: 'STANDARD' | 'HOUSE') => {
    if (preset === 'STANDARD') {
      setFormRules({
        ...formRules,
        openRiichi: false,
        maneMangan: false,
        sanrenko: false,
        suurenko: false,
        ryanhanShibariHonba: 0,
        tripleRonDraw: false,
      });
    } else {
      setFormRules({
        ...formRules,
        openRiichi: true,
        maneMangan: true,
        sanrenko: true,
        suurenko: true,
        ryanhanShibariHonba: 5,
        tripleRonDraw: true,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-6 h-6 text-emerald-400" />
          <h2 className="text-lg font-bold">ルールプリセット &amp; メンバーテスト設定</h2>
        </div>

        <div className="space-y-6">
          {/* Quick Preset Selector */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <span className="text-xs font-bold text-white block">対局ルール・プリセット選択</span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleApplyPreset('STANDARD')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  !formRules.openRiichi && !formRules.maneMangan
                    ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500/40'
                    : 'bg-slate-900 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <div className="text-xs font-bold text-white mb-0.5">一般・標準ルール (天鳳/雀魂準拠)</div>
                <div className="text-[11px] text-slate-400">
                  喰いタンあり・赤ドラ3枚。ローカル役なし。一般的な段位戦・友人戦の分析に最適。
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('HOUSE')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  formRules.openRiichi || formRules.maneMangan
                    ? 'bg-purple-950/60 border-purple-500 ring-1 ring-purple-500/40'
                    : 'bg-slate-900 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <div className="text-xs font-bold text-white mb-0.5">プライベート・ハウスルール</div>
                <div className="text-[11px] text-slate-400">
                  オープン立直・真似満・三連刻・5本場二翻縛りなど特殊役を有効化。
                </div>
              </button>
            </div>
          </div>

          {/* Member Test Invitation Section */}
          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Users className="w-4 h-4" />
                <span>メンバーテスト参加用URL (Shared App URL)</span>
              </div>
              <button
                onClick={handleCopyLink}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'コピー完了!' : '共有URLをコピー'}</span>
              </button>
            </div>
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300 break-all select-all">
              {sharedAppUrl}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              上記URLをメンバーに共有すると、ブラウザ（PC/スマートフォン）からインストール不要で直接アクセスし、ハウスルールの挙動やペルソナBotのテストに参加できます。
            </p>
          </div>

          {/* Smart Recording Flag */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-white block">
                  スマート記録フラグ (is_recorded)
                </span>
                <span className="text-xs text-slate-400">
                  有効時は集計ダッシュボード・セット戦績に反映。Bot戦練習時はOFFにして戦績の汚染を防止。
                </span>
              </div>
              <button
                onClick={() => setRecordedFlag(!recordedFlag)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  recordedFlag ? 'bg-emerald-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                    recordedFlag ? 'left-6.5' : 'left-0.5'
                  }`}
                ></div>
              </button>
            </div>
          </div>

          {/* Turn Timer Configuration */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-bold text-sm text-white block">
              手番思考タイマー (Turn Action Timer)
            </span>
            <div className="flex items-center gap-2">
              {[
                { label: '5秒 (速打ち)', val: 5 },
                { label: '10秒 (標準)', val: 10 },
                { label: '15秒 (ゆったり)', val: 15 },
                { label: '無制限', val: null },
              ].map((opt) => (
                <button
                  key={String(opt.val)}
                  onClick={() => setFormRules({ ...formRules, turnTimerSeconds: opt.val })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                    formRules.turnTimerSeconds === opt.val
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Special Local Yaku Toggles */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              特殊ローカル役 &amp; 裁定ルール
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Open Riichi */}
              <div
                onClick={() => handleToggle('openRiichi')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  formRules.openRiichi
                    ? 'bg-purple-950/40 border-purple-800/80'
                    : 'bg-slate-950 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs text-white mb-1">
                  <span>オープン立直 (2翻)</span>
                  <Check className={`w-4 h-4 ${formRules.openRiichi ? 'text-purple-400' : 'text-slate-600'}`} />
                </div>
                <p className="text-[11px] text-slate-400">
                  全手牌を公開。非立直の相手が放銃した場合は【役満払いペナルティ】を適用。
                </p>
              </div>

              {/* Mane-Mangan */}
              <div
                onClick={() => handleToggle('maneMangan')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  formRules.maneMangan
                    ? 'bg-amber-950/40 border-amber-800/80'
                    : 'bg-slate-950 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs text-white mb-1">
                  <span>真似満 (マネ満)</span>
                  <Check className={`w-4 h-4 ${formRules.maneMangan ? 'text-amber-400' : 'text-slate-600'}`} />
                </div>
                <p className="text-[11px] text-slate-400">
                  1巡目から上家打牌を完全模写。5巡(満貫)〜9巡+(役満)。鳴きが入ると即終了。
                </p>
              </div>

              {/* Sanrenko */}
              <div
                onClick={() => handleToggle('sanrenko')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  formRules.sanrenko
                    ? 'bg-emerald-950/40 border-emerald-800/80'
                    : 'bg-slate-950 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs text-white mb-1">
                  <span>三連刻 (2翻)</span>
                  <Check className={`w-4 h-4 ${formRules.sanrenko ? 'text-emerald-400' : 'text-slate-600'}`} />
                </div>
                <p className="text-[11px] text-slate-400">
                  同色で3連続の刻子・槓子 (例: 333m 444m 555m)。
                </p>
              </div>

              {/* Suurenko */}
              <div
                onClick={() => handleToggle('suurenko')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  formRules.suurenko
                    ? 'bg-emerald-950/40 border-emerald-800/80'
                    : 'bg-slate-950 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs text-white mb-1">
                  <span>四連刻 (役満)</span>
                  <Check className={`w-4 h-4 ${formRules.suurenko ? 'text-emerald-400' : 'text-slate-600'}`} />
                </div>
                <p className="text-[11px] text-slate-400">
                  同色で4連続の刻子・槓子 (例: 222p 333p 444p 555p)。
                </p>
              </div>

              {/* Double Yakuman */}
              <div
                onClick={() => handleToggle('doubleYakuman')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  formRules.doubleYakuman
                    ? 'bg-emerald-950/40 border-emerald-800/80'
                    : 'bg-slate-950 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs text-white mb-1">
                  <span>ダブル役満 (Double Yakuman)</span>
                  <Check className={`w-4 h-4 ${formRules.doubleYakuman ? 'text-emerald-400' : 'text-slate-600'}`} />
                </div>
                <p className="text-[11px] text-slate-400">
                  国士13面待ち・四暗刻単騎・大四喜・純正九蓮宝燈9面待ちで二倍役満を適用。
                </p>
              </div>

              {/* Sufon Renda */}
              <div
                onClick={() => handleToggle('sufonRenda')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  formRules.sufonRenda
                    ? 'bg-emerald-950/40 border-emerald-800/80'
                    : 'bg-slate-950 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs text-white mb-1">
                  <span>四風連打流局 (親流れなし)</span>
                  <Check className={`w-4 h-4 ${formRules.sufonRenda ? 'text-emerald-400' : 'text-slate-600'}`} />
                </div>
                <p className="text-[11px] text-slate-400">
                  第1巡で全員が同一の風牌を捨てた場合、途中流局かつ親番継続（連荘）。
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-950 transition-colors cursor-pointer"
          >
            ルールを適用して保存
          </button>
        </div>
      </div>
    </div>
  );
};
