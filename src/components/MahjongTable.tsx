import React, { useState, useEffect, useCallback } from 'react';
import {
  MahjongGameEngine,
} from '../engine/gameLoop';
import { Tile, DealInAnalysis, WaitShape } from '../types/mahjong';
import { TileView } from './TileView';
import { decideBotDiscard, decideBotRiichi } from '../engine/botAi';
import { getWaitingTiles } from '../engine/shanten';
import { getTileKey } from '../engine/tiles';
import {
  RotateCcw,
  Play,
  Pause,
  FastForward,
  Eye,
  EyeOff,
  Flame,
  ShieldAlert,
  Sliders,
  ChevronRight,
  Volume2,
  VolumeX,
  Keyboard,
} from 'lucide-react';

interface MahjongTableProps {
  engine: MahjongGameEngine;
  onStateChange: () => void;
  onRonDealInReview: (deals: DealInAnalysis[]) => void;
}

export const MahjongTable: React.FC<MahjongTableProps> = ({
  engine,
  onStateChange,
  onRonDealInReview,
}) => {
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [showAllHands, setShowAllHands] = useState<boolean>(true); // Spectator / analysis mode toggle
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [autoPlaySpeedMs, setAutoPlaySpeedMs] = useState<number>(800);
  const [turnTimerRemaining, setTurnTimerRemaining] = useState<number | null>(
    engine.rules.turnTimerSeconds
  );

  const [controlledSeatIndex, setControlledSeatIndex] = useState<number>(0);
  const [hoveredTileKey, setHoveredTileKey] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState<boolean>(false);

  // Web Audio API Synthesizer for tactile game feedback
  const playSoundEffect = useCallback((type: 'click' | 'discard' | 'riichi' | 'agari') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'discard') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } else if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.04);
      } else if (type === 'riichi') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'agari') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch (e) {
      // AudioContext policy gracefully handled
    }
  }, [soundEnabled]);

  const round = engine.round;
  const players = engine.players;
  const turnPlayerIndex = round.turnPlayerIndex;
  const youIndex = controlledSeatIndex;
  const you = players[youIndex];
  const isYourTurn = turnPlayerIndex === youIndex;

  // Auto-play / Bot tick runner
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (round.isExhausted || engine.isPaused) {
      return;
    }

    const currentTurnPlayer = players[turnPlayerIndex];

    // If it's a Bot turn OR AutoPlay is active for everyone
    if (currentTurnPlayer.isBot || (isAutoPlaying && isYourTurn)) {
      timer = setTimeout(() => {
        handleBotMove();
      }, isAutoPlaying ? autoPlaySpeedMs : 1000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [turnPlayerIndex, round.isExhausted, isAutoPlaying, autoPlaySpeedMs, engine.isPaused]);

  // Turn Timer countdown
  useEffect(() => {
    if (!engine.rules.turnTimerSeconds || round.isExhausted || engine.isPaused) {
      setTurnTimerRemaining(null);
      return;
    }

    setTurnTimerRemaining(engine.rules.turnTimerSeconds);
    const interval = setInterval(() => {
      setTurnTimerRemaining((prev) => {
        if (prev === null || prev <= 1) {
          // Timeout: auto-discard drawn or rightmost tile
          if (isYourTurn && !round.isExhausted) {
            handleAutoDiscard();
          }
          return engine.rules.turnTimerSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [turnPlayerIndex, round.isExhausted, engine.isPaused]);

  // Check if player has Riichi / Open Riichi action available
  const canDeclareRiichi =
    isYourTurn &&
    !you.isRiichi &&
    !you.isOpenRiichi &&
    you.isTenpai &&
    you.score >= 1000 &&
    you.hand.melds.length === 0;

  // Waiting tiles for Tenpai player
  const youWaitingTiles = you.isTenpai ? getWaitingTiles(you.hand.tiles, you.hand.melds) : [];

  // Keyboard Shortcuts Listener for fast play
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key >= '1' && e.key <= '9') {
        const idx = Number(e.key) - 1;
        if (you.hand.tiles[idx]) {
          setSelectedTileId(you.hand.tiles[idx].id);
          playSoundEffect('click');
        }
      } else if (e.key === '0' && you.hand.tiles[9]) {
        setSelectedTileId(you.hand.tiles[9].id);
        playSoundEffect('click');
      } else if (e.key === 'Enter') {
        if (selectedTileId && isYourTurn) {
          handlePlayerDiscard(selectedTileId);
        }
      } else if (e.key.toLowerCase() === 'r') {
        if (canDeclareRiichi) {
          handleDeclareRiichi(false);
        }
      } else if (e.key.toLowerCase() === 'o') {
        if (canDeclareRiichi && engine.rules.openRiichi) {
          handleDeclareRiichi(true);
        }
      } else if (e.key.toLowerCase() === 'k') {
        handleDeclareKyushu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTileId, isYourTurn, you.hand.tiles, canDeclareRiichi, engine.rules.openRiichi, playSoundEffect]);

  const handleBotMove = () => {
    if (round.isExhausted) return;
    const bot = players[turnPlayerIndex];

    // Check Bot Riichi if Tenpai and eligible
    if (bot.isTenpai && !bot.isRiichi && !bot.isOpenRiichi) {
      const riichiChoice = decideBotRiichi(bot, round, engine.rules);
      if (riichiChoice === 'OPEN_RIICHI') {
        engine.declareRiichi(true);
        playSoundEffect('riichi');
      } else if (riichiChoice === 'RIICHI') {
        engine.declareRiichi(false);
        playSoundEffect('riichi');
      }
    }

    // Select discard
    const discard = decideBotDiscard(bot, round, engine.rules, players);
    const res = engine.discardTile(discard.id);
    playSoundEffect('discard');

    if (res.ronDeals && res.ronDeals.length > 0) {
      playSoundEffect('agari');
      onRonDealInReview(res.ronDeals);
    }

    setSelectedTileId(null);
    onStateChange();
  };

  const handleAutoDiscard = () => {
    if (you.hand.tiles.length === 0) return;
    const targetTile = you.hand.tiles[you.hand.tiles.length - 1];
    const res = engine.discardTile(targetTile.id);
    playSoundEffect('discard');
    if (res.ronDeals && res.ronDeals.length > 0) {
      playSoundEffect('agari');
      onRonDealInReview(res.ronDeals);
    }
    setSelectedTileId(null);
    onStateChange();
  };

  const handlePlayerDiscard = (tileId: string) => {
    if (!isYourTurn || round.isExhausted) return;

    // If player is in Riichi, must discard drawn tile (last tile)
    if (you.isRiichi || you.isOpenRiichi) {
      const drawnTile = you.hand.tiles[you.hand.tiles.length - 1];
      if (drawnTile.id !== tileId) {
        return;
      }
    }

    const res = engine.discardTile(tileId);
    playSoundEffect('discard');
    if (res.ronDeals && res.ronDeals.length > 0) {
      playSoundEffect('agari');
      onRonDealInReview(res.ronDeals);
    }
    setSelectedTileId(null);
    onStateChange();
  };

  const handleDeclareRiichi = (isOpen: boolean = false) => {
    if (!isYourTurn || round.isExhausted) return;
    const ok = engine.declareRiichi(isOpen);
    if (ok) {
      playSoundEffect('riichi');
      onStateChange();
    }
  };

  const handleDeclareKyushu = () => {
    if (!isYourTurn || round.isExhausted) return;
    const ok = engine.declareKyushukyuhai();
    if (ok) {
      onStateChange();
    }
  };

  const handleUndoMove = () => {
    const success = engine.rollbackState(1);
    if (success) {
      setSelectedTileId(null);
      onStateChange();
    }
  };

  const handleNextRound = () => {
    engine.nextRound();
    setSelectedTileId(null);
    onStateChange();
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col">
      {/* Table Felt Surface */}
      <div
        className="relative w-full aspect-16/10 min-h-[580px] bg-cover bg-center flex flex-col justify-between p-3 sm:p-5"
        style={{
          backgroundImage: `radial-gradient(ellipse at center, rgba(16, 52, 36, 0.90) 0%, rgba(6, 26, 17, 0.98) 100%), url('/src/assets/images/mahjong_felt_table_1791646255584.jpg')`,
        }}
      >
        {/* Top Floating Controls Bar */}
        <div className="flex items-center justify-between z-20 gap-3">
          {/* Status Message */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-xs text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium truncate max-w-[280px] sm:max-w-md">
              {engine.statusText}
            </span>
          </div>

          {/* Table Actions Toolbar */}
          <div className="flex items-center gap-2">
            {/* Controlled Seat Perspective Selector for Testers */}
            <div className="flex items-center gap-1 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300">
              <span className="text-[10px] text-slate-400 hidden lg:inline">操作席:</span>
              <select
                value={controlledSeatIndex}
                onChange={(e) => setControlledSeatIndex(Number(e.target.value))}
                className="bg-transparent text-emerald-400 font-semibold focus:outline-none cursor-pointer text-xs"
                title="テストするプレイヤー席を切り替え"
              >
                {players.map((p, idx) => (
                  <option key={p.id} value={idx} className="bg-slate-900 text-white">
                    {p.seatWind === 'EAST' ? '東' : p.seatWind === 'SOUTH' ? '南' : p.seatWind === 'WEST' ? '西' : '北'}家: {p.name.split(' ')[0]}
                  </option>
                ))}
              </select>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 border border-white/10 text-slate-300 transition-colors cursor-pointer"
              title={soundEnabled ? '効果音ON (Mute)' : '消音中 (Unmute)'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            {/* Keyboard Help Toggle */}
            <button
              onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                showKeyboardHelp ? 'bg-emerald-950 text-emerald-400 border-emerald-600' : 'bg-black/50 hover:bg-black/70 border-white/10 text-slate-300'
              }`}
              title="キーボードショートカット一覧"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>

            {/* Fog-of-war Hand Peek Toggle */}
            <button
              onClick={() => setShowAllHands(!showAllHands)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-black/50 hover:bg-black/70 border border-white/10 text-slate-300 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              title="他家の手牌透視（戦術分析・観戦モード）"
            >
              {showAllHands ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{showAllHands ? '透視ON' : '手牌秘匿'}</span>
            </button>

            {/* Undo / Rollback State */}
            <button
              onClick={handleUndoMove}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-black/50 hover:bg-black/70 border border-white/10 text-slate-300 transition-colors flex items-center gap-1.5 whitespace-nowrap"
              title="1手巻き戻し (State Rewind)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">巻き戻し</span>
            </button>

            {/* Auto-Play Bot Simulation */}
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                isAutoPlaying
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-black/50 hover:bg-black/70 text-slate-300 border-white/10'
              }`}
            >
              {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isAutoPlaying ? '自動停止' : '自動進行'}</span>
            </button>
          </div>
        </div>

        {/* ----------------- TOP SEAT: Toimen (対面 - Player 2) ----------------- */}
        <div className="w-full flex flex-col items-center z-10">
          <div className="flex items-center gap-2 mb-1 text-xs text-slate-300 bg-black/40 px-3 py-1 rounded-full border border-white/5">
            <span className="font-bold text-amber-400">{players[2].seatWind === 'EAST' ? '東' : players[2].seatWind === 'SOUTH' ? '南' : players[2].seatWind === 'WEST' ? '西' : '北'}</span>
            <span className="font-semibold text-white">{players[2].name}</span>
            <span className="font-mono tabular-nums text-emerald-300">{players[2].score.toLocaleString()}点</span>
            {players[2].isRiichi && <span className="text-rose-400 font-bold">立直</span>}
            {players[2].isOpenRiichi && <span className="text-purple-400 font-bold">OPEN立直</span>}
            {players[2].maneManganStreak >= 3 && !players[2].maneManganFailed && (
              <span className="text-amber-300 font-bold">マネ満{players[2].maneManganStreak}巡</span>
            )}
            {showAllHands && (
              <span className="text-slate-400 font-mono">
                {players[2].currentShanten === 0 ? '聴牌' : `${players[2].currentShanten}向聴`}
              </span>
            )}
          </div>
          {/* Hand Tiles */}
          <div className="flex items-center gap-0.5 justify-center">
            {players[2].hand.tiles.map((t, idx) => (
              <TileView
                key={t.id}
                tile={t}
                size="sm"
                isCovered={!showAllHands}
                className={idx === players[2].hand.tiles.length - 1 && turnPlayerIndex === 2 ? 'ml-1.5' : ''}
              />
            ))}
          </div>
        </div>

        {/* ----------------- MIDDLE SECTION: Left (Kamicha), Center HUD, Right (Shimocha) ----------------- */}
        <div className="flex items-center justify-between w-full my-auto z-10 px-1 sm:px-4">
          {/* LEFT SEAT: Kamicha (上家 - Player 3) */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-300 bg-black/40 px-2.5 py-1 rounded-full border border-white/5">
              <span className="font-bold text-amber-400">{players[3].seatWind === 'EAST' ? '東' : players[3].seatWind === 'SOUTH' ? '南' : players[3].seatWind === 'WEST' ? '西' : '北'}</span>
              <span className="font-semibold text-white truncate max-w-[80px]">{players[3].name}</span>
              <span className="font-mono tabular-nums text-emerald-300">{players[3].score.toLocaleString()}</span>
              {showAllHands && (
                <span className="text-slate-400 font-mono text-[10px]">
                  {players[3].currentShanten === 0 ? '聴牌' : `${players[3].currentShanten}向`}
                </span>
              )}
            </div>
            {/* Hand Tiles Vertical */}
            <div className="grid grid-cols-2 gap-0.5 max-h-[140px] overflow-hidden">
              {players[3].hand.tiles.map((t) => (
                <TileView key={t.id} tile={t} size="sm" isCovered={!showAllHands} />
              ))}
            </div>
          </div>

          {/* CENTER HUD: The Central Table Box */}
          <div className="relative flex flex-col items-center justify-center w-64 sm:w-72 h-44 sm:h-48 rounded-xl bg-slate-900/90 border border-emerald-950/80 shadow-2xl p-3 backdrop-blur-md">
            {/* Round Name & Wind */}
            <div className="flex items-center justify-between w-full border-b border-slate-800 pb-1.5 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 text-xs font-bold">
                  {round.roundWind === 'EAST' ? '東' : '南'}{round.roundNumber}局
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {round.honba}本場
                </span>
                {round.honba >= engine.rules.ryanhanShibariHonba && (
                  <span className="text-[10px] px-1 bg-rose-950 text-rose-300 border border-rose-800 rounded font-bold">
                    二翻縛り
                  </span>
                )}
              </div>

              {/* Riichi Sticks Pool */}
              <div className="flex items-center gap-1 text-xs text-amber-300 font-mono">
                <span className="w-4 h-1.5 rounded-full bg-white border border-amber-400 inline-block"></span>
                <span>{round.riichiSticks * 1000}</span>
              </div>
            </div>

            {/* Dora Indicator Area */}
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-semibold mb-0.5">ドラ表示牌</span>
                <div className="flex items-center gap-1">
                  {round.doraIndicators.map((t) => (
                    <TileView
                      key={t.id}
                      tile={t}
                      size="sm"
                      isDora
                      isHighlighted={hoveredTileKey !== null && getTileKey(t) === hoveredTileKey}
                    />
                  ))}
                  {Array.from({ length: 5 - round.doraIndicators.length }).map((_, i) => (
                    <div
                      key={i}
                      className="w-5 h-7 rounded-xs bg-slate-800/60 border border-slate-700/40"
                    ></div>
                  ))}
                </div>
              </div>

              {/* Remaining Wall Count */}
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-semibold block">牌山残り</span>
                <span className="text-lg font-mono font-bold text-white tabular-nums">
                  {round.remainingTilesCount}
                </span>
              </div>
            </div>

            {/* Turn Player Compass Indicator */}
            <div className="w-full flex items-center justify-around py-1 px-2 rounded bg-slate-950/60 border border-slate-800/80 text-[11px]">
              {players.map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex flex-col items-center px-1.5 py-0.5 rounded transition-all ${
                    turnPlayerIndex === idx
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold scale-105 border border-emerald-500/30'
                      : 'text-slate-400'
                  }`}
                >
                  <span>{p.seatWind === 'EAST' ? '東' : p.seatWind === 'SOUTH' ? '南' : p.seatWind === 'WEST' ? '西' : '北'}</span>
                  <span className="text-[9px] truncate max-w-[42px]">{p.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>

            {/* Turn Timer Bar */}
            {turnTimerRemaining !== null && (
              <div className="w-full mt-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>思考時間</span>
                  <span className="font-mono text-emerald-400">{turnTimerRemaining}s</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-1000"
                    style={{
                      width: `${(turnTimerRemaining / (engine.rules.turnTimerSeconds || 10)) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SEAT: Shimocha (下家 - Player 1) */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-300 bg-black/40 px-2.5 py-1 rounded-full border border-white/5">
              <span className="font-bold text-amber-400">{players[1].seatWind === 'EAST' ? '東' : players[1].seatWind === 'SOUTH' ? '南' : players[1].seatWind === 'WEST' ? '西' : '北'}</span>
              <span className="font-semibold text-white truncate max-w-[80px]">{players[1].name}</span>
              <span className="font-mono tabular-nums text-emerald-300">{players[1].score.toLocaleString()}</span>
              {showAllHands && (
                <span className="text-slate-400 font-mono text-[10px]">
                  {players[1].currentShanten === 0 ? '聴牌' : `${players[1].currentShanten}向`}
                </span>
              )}
            </div>
            {/* Hand Tiles Vertical */}
            <div className="grid grid-cols-2 gap-0.5 max-h-[140px] overflow-hidden">
              {players[1].hand.tiles.map((t) => (
                <TileView key={t.id} tile={t} size="sm" isCovered={!showAllHands} />
              ))}
            </div>
          </div>
        </div>

        {/* ----------------- DISCARD PONDS (河 / 川) DISPLAY IN CENTER TABLE ----------------- */}
        <div className="w-full flex justify-center z-10 my-1 pointer-events-none">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-2xl bg-black/30 p-2 rounded-xl border border-white/5 backdrop-blur-xs">
            {players.map((p, idx) => (
              <div key={p.id} className="flex flex-col">
                <span className="text-[10px] text-slate-400 mb-0.5 font-medium truncate">
                  {p.name} 捨牌 ({p.discards.length})
                </span>
                <div className="flex flex-wrap gap-0.5 min-h-[32px] max-h-[64px] overflow-y-auto">
                  {p.discards.map((t, dIdx) => (
                    <TileView
                      key={`${t.id}_${dIdx}`}
                      tile={t}
                      size="sm"
                      isHorizontal={p.riichiTurn === dIdx + 1}
                      isHighlighted={hoveredTileKey !== null && getTileKey(t) === hoveredTileKey}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ----------------- BOTTOM SEAT: Your Hand (あなた - Player 0) ----------------- */}
        <div className="w-full flex flex-col items-center z-20 mt-1">
          {/* Player Info & Live Tenpai/Wait Notification */}
          <div className="flex items-center justify-between w-full max-w-3xl mb-1.5 px-2">
            <div className="flex items-center gap-2 text-xs text-slate-200 bg-black/60 px-3 py-1 rounded-lg border border-white/10">
              <span className="font-bold text-amber-400">{you.seatWind === 'EAST' ? '東' : you.seatWind === 'SOUTH' ? '南' : you.seatWind === 'WEST' ? '西' : '北'}</span>
              <span className="font-semibold text-white">{you.name}</span>
              <span className="font-mono tabular-nums text-emerald-400 font-bold">{you.score.toLocaleString()}点</span>
              {you.isRiichi && <span className="text-rose-400 font-bold">立直中</span>}
              {you.isOpenRiichi && <span className="text-purple-400 font-bold">OPEN立直中</span>}
              {you.maneManganStreak >= 3 && !you.maneManganFailed && (
                <span className="text-amber-300 font-bold">マネ満{you.maneManganStreak}巡目継続</span>
              )}
            </div>

            {/* Shanten & Waiting Notification */}
            <div className="flex items-center gap-2">
              <div className="text-xs font-mono px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 text-slate-300">
                向聴数:{' '}
                <span className={`font-bold ${you.currentShanten === 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {you.currentShanten === -1 ? '和了 (Agari)' : you.currentShanten === 0 ? 'テンパイ (Tenpai)' : `${you.currentShanten}向聴`}
                </span>
              </div>
              {youWaitingTiles.length > 0 && (
                <div className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-lg border border-amber-500/30 text-xs">
                  <span className="text-[10px] text-amber-400 font-bold">待ち牌:</span>
                  <div className="flex items-center gap-0.5">
                    {youWaitingTiles.map((t) => (
                      <TileView key={t.id} tile={t} size="sm" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Decision Banners (Riichi, Open Riichi, Kyushukyuhai, Discard) */}
          <div className="flex items-center gap-2 mb-2">
            {canDeclareRiichi && (
              <>
                <button
                  onClick={() => handleDeclareRiichi(false)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-rose-900/40 border border-rose-400 transition-all cursor-pointer"
                >
                  立直 (Riichi)
                </button>
                {engine.rules.openRiichi && (
                  <button
                    onClick={() => handleDeclareRiichi(true)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-purple-900/40 border border-purple-400 transition-all cursor-pointer"
                    title="オープン立直 (2翻・他家ノーリーチ放銃で役満払い)"
                  >
                    オープン立直 (Open Riichi)
                  </button>
                )}
              </>
            )}

            {/* Kyushukyuhai */}
            {round.currentTurnNumber === 1 && !round.firstRoundMeldsOccurred && isYourTurn && (
              <button
                onClick={handleDeclareKyushu}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg shadow-md border border-amber-400 transition-all cursor-pointer"
              >
                九種九牌流局
              </button>
            )}

            {/* Selected Tile Discard Trigger Button */}
            {selectedTileId && isYourTurn && (
              <button
                onClick={() => handlePlayerDiscard(selectedTileId)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-900/40 border border-emerald-400 transition-all cursor-pointer"
              >
                選択した牌を打牌
              </button>
            )}
          </div>

          {/* Hand Tiles Bar */}
          <div className="flex items-center gap-1 sm:gap-1.5 justify-center max-w-full overflow-x-auto pb-1">
            {you.hand.tiles.map((t, idx) => {
              const isNewlyDrawn = idx === you.hand.tiles.length - 1 && isYourTurn;
              return (
                <div
                  key={t.id}
                  className={isNewlyDrawn ? 'ml-2 sm:ml-4' : ''}
                >
                  <div className="relative">
                    {idx < 9 && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-slate-500 font-bold select-none pointer-events-none">
                        [{idx + 1}]
                      </span>
                    )}
                    <TileView
                      tile={t}
                      size="hand"
                      isSelected={selectedTileId === t.id}
                      isHighlighted={hoveredTileKey !== null && getTileKey(t) === hoveredTileKey}
                      isHoverable={isYourTurn}
                      onMouseEnter={() => setHoveredTileKey(getTileKey(t))}
                      onMouseLeave={() => setHoveredTileKey(null)}
                      onClick={() => {
                        if (!isYourTurn) return;
                        if (selectedTileId === t.id) {
                          handlePlayerDiscard(t.id);
                        } else {
                          setSelectedTileId(t.id);
                          playSoundEffect('click');
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Round Finished Overlay / Next Round Control */}
      {round.isExhausted && (
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">局終了</span>
            <span className="text-xs text-slate-400">{engine.statusText}</span>
          </div>
          <button
            onClick={handleNextRound}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950"
          >
            <span>次の局へ進む</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Quick Guide Banner */}
      {showKeyboardHelp && (
        <div className="p-3 bg-slate-900/95 border-t border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white">キーボード操作ショートカット:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400">1〜9</kbd> 手牌選択</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400">Enter</kbd> 選択牌を打牌</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-rose-400">R</kbd> 立直</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-purple-400">O</kbd> オープン立直</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400">K</kbd> 九種九牌</span>
          </div>
          <button
            onClick={() => setShowKeyboardHelp(false)}
            className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer underline"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
};
