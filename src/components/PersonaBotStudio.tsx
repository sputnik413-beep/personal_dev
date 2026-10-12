import React, { useState } from 'react';
import { PersonaProfile, SetSession } from '../types/mahjong';
import { PRESET_PERSONAS } from '../engine/botAi';
import { Bot, Sliders, Sparkles, Plus, Check, Shield, Flame, Crosshair } from 'lucide-react';

interface PersonaBotStudioProps {
  onSelectPersonaForBot: (botSeatIndex: number, persona: PersonaProfile) => void;
  sessions: SetSession[];
}

export const PersonaBotStudio: React.FC<PersonaBotStudioProps> = ({
  onSelectPersonaForBot,
  sessions,
}) => {
  const [personas, setPersonas] = useState<PersonaProfile[]>([
    ...PRESET_PERSONAS,
    {
      id: 'persona_custom_1',
      name: 'カスタムAIクローン (Player 1 Replica)',
      avatarSeed: 'custom1',
      description: '実戦牌譜ログの打牌・鳴き傾向を抽出して生成されたプレイヤーの写し身。',
      styleTag: '実戦模倣型 (Telemetry Clone)',
      isAiBot: true,
      callTendency: 45,
      riichiTendency: 60,
      defensePriority: 70,
      badWaitTolerance: 35,
      damaPreference: 50,
      maneManganHunter: 20,
      pushShantenThreshold: 2,
    },
  ]);

  const [activePersonaId, setActivePersonaId] = useState<string>(personas[0].id);
  const activePersona = personas.find((p) => p.id === activePersonaId) || personas[0];

  const handleSliderChange = (key: keyof PersonaProfile, val: number) => {
    setPersonas((prev) =>
      prev.map((p) => (p.id === activePersonaId ? { ...p, [key]: val } : p))
    );
  };

  const handleSynthesizeFromTelemetry = () => {
    // Generate a persona based on aggregated telemetry
    const newPersona: PersonaProfile = {
      id: `persona_synth_${Date.now()}`,
      name: `直近6半荘・最適化Bot v${personas.length + 1}`,
      avatarSeed: `bot_${Date.now()}`,
      description: '対戦相手の放銃癖（Lv.4不用意放銃）を逆手に取るよう調整されたカウンターAI。',
      styleTag: '適応型カウンター (Adaptive Counter)',
      isAiBot: true,
      callTendency: Math.floor(30 + Math.random() * 40),
      riichiTendency: Math.floor(40 + Math.random() * 40),
      defensePriority: Math.floor(65 + Math.random() * 30),
      badWaitTolerance: Math.floor(20 + Math.random() * 30),
      damaPreference: Math.floor(50 + Math.random() * 40),
      maneManganHunter: Math.floor(10 + Math.random() * 40),
      pushShantenThreshold: 1,
    };

    setPersonas([newPersona, ...personas]);
    setActivePersonaId(newPersona.id);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-emerald-400" />
            ペルソナBot スタジオ &amp; AIパラメータ調律
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            過去の蓄積牌譜ログ（鳴き率、立直閾値、愚形許容度、ダマ選好度、マネ満狙い等）を学習・模倣したAIエージェント
          </p>
        </div>

        <button
          onClick={handleSynthesizeFromTelemetry}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>牌譜ログから新AIペルソナを合成</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Persona List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-bold text-slate-300 px-1">登録ペルソナ一覧</h3>
          <div className="space-y-2">
            {personas.map((p) => {
              const isSelected = p.id === activePersonaId;

              return (
                <div
                  key={p.id}
                  onClick={() => setActivePersonaId(p.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30'
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-white">{p.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 text-emerald-300 border border-slate-800 font-medium">
                      {p.styleTag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>

                  {/* Micro Specs */}
                  <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2.5 border-t border-slate-800/60 text-[10px] font-mono text-slate-400">
                    <div>守備: {p.defensePriority}%</div>
                    <div>立直: {p.riichiTendency}%</div>
                    <div>ダマ: {p.damaPreference}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Persona Detail & Tuning Sliders */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{activePersona.name}</h3>
                <span className="text-xs text-emerald-400 font-semibold px-2.5 py-0.5 bg-emerald-950/60 border border-emerald-800/80 rounded-full">
                  {activePersona.styleTag}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{activePersona.description}</p>
            </div>

            {/* Apply Bot Seat Trigger */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">卓に対面配置:</span>
              <button
                onClick={() => onSelectPersonaForBot(1, activePersona)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 transition-colors cursor-pointer"
              >
                下家 (Seat 2)
              </button>
              <button
                onClick={() => onSelectPersonaForBot(2, activePersona)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 transition-colors cursor-pointer"
              >
                対面 (Seat 3)
              </button>
            </div>
          </div>

          {/* Behavior Tuning Sliders */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              戦術パラメータ微調整 (Tactical Sliders)
            </h4>

            {/* 1. Defense Priority */}
            <div className="space-y-1.5 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  ベタオリ守備志向 (Defense Priority)
                </span>
                <span className="font-mono text-emerald-400 font-bold tabular-nums">
                  {activePersona.defensePriority}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={activePersona.defensePriority}
                onChange={(e) => handleSliderChange('defensePriority', Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                相手立直に対する現物・スジ牌優先度。高いほど安全牌がない場合は役を崩して徹底的にベタオリします。
              </span>
            </div>

            {/* 2. Riichi Tendency */}
            <div className="space-y-1.5 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-400" />
                  即リーチ志向 (Riichi Aggression)
                </span>
                <span className="font-mono text-rose-400 font-bold tabular-nums">
                  {activePersona.riichiTendency}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={activePersona.riichiTendency}
                onChange={(e) => handleSliderChange('riichiTendency', Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                テンパイ時の即リーチ宣言率。高ければオープン立直も含めて攻勢を強めます。
              </span>
            </div>

            {/* 3. Dama Preference */}
            <div className="space-y-1.5 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-purple-400" />
                  ダマテン潜伏選好 (Dama Preference)
                </span>
                <span className="font-mono text-purple-400 font-bold tabular-nums">
                  {activePersona.damaPreference}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={activePersona.damaPreference}
                onChange={(e) => handleSliderChange('damaPreference', Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                高打点の手牌でもリーチを打たず、相手の不用意な放銃を狙うステルス暗殺傾向。
              </span>
            </div>

            {/* 4. Mane-Mangan Hunter Propensity */}
            <div className="space-y-1.5 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  真似満狙い率 (Mane-Mangan Hunter)
                </span>
                <span className="font-mono text-amber-400 font-bold tabular-nums">
                  {activePersona.maneManganHunter}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={activePersona.maneManganHunter}
                onChange={(e) => handleSliderChange('maneManganHunter', Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                序盤に上家の打牌を意図的に模倣し、5〜9巡のマネ満ボーナス役を狙う特殊戦術の実行率。
              </span>
            </div>

            {/* 5. Push Shanten Threshold */}
            <div className="space-y-1.5 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  押し引き許容向聴数 (Push Threshold)
                </span>
                <span className="font-mono text-sky-400 font-bold tabular-nums">
                  {activePersona.pushShantenThreshold === 1
                    ? 'テンパイ時のみ勝負'
                    : `${activePersona.pushShantenThreshold - 1}向聴まで強行押し`}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                value={activePersona.pushShantenThreshold}
                onChange={(e) =>
                  handleSliderChange('pushShantenThreshold', Number(e.target.value))
                }
                className="w-full accent-sky-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                3に設定すると2向聴の愚形からでも相手立直に突っ込み、「無謀押しスコア」が頻発します。
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
