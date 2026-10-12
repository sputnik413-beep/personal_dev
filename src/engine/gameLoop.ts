import {
  Tile,
  PlayerState,
  RoundState,
  HouseRules,
  TelemetryAction,
  Wind,
  CareLevel,
  WaitShape,
  HandEvaluation,
  DealInAnalysis,
} from '../types/mahjong';
import {
  createFreshWall,
  sortTiles,
  isTerminalOrHonor,
  areTilesEqual,
  getTileKey,
  isWind,
} from './tiles';
import { calculateShanten, getWaitingTiles } from './shanten';
import { evaluateHand } from './yaku';
import { evaluateDealInCareLevel } from './telemetry';
import { PRESET_PERSONAS } from './botAi';

export const STANDARD_GENERAL_RULES: HouseRules = {
  startingScore: 25000,
  returnScore: 30000,
  uma: [20, 10, -10, -20],
  tenpaiRenchan: true,
  honbaValue: 300,
  ryanhanShibariHonba: 0,
  kyushukyuhai: true,
  sufonRenda: true,
  nagashiMangan: true,
  tripleRonDraw: false,
  sanrenko: false,
  suurenko: false,
  openRiichi: false,
  maneMangan: false,
  doubleYakuman: true,
  allowRedDora: true,
  turnTimerSeconds: 10,
};

export const DEFAULT_HOUSE_RULES: HouseRules = {
  startingScore: 25000,
  returnScore: 30000,
  uma: [20, 10, -10, -20],
  tenpaiRenchan: true,
  honbaValue: 300,
  ryanhanShibariHonba: 5,
  kyushukyuhai: true,
  sufonRenda: true,
  nagashiMangan: true,
  tripleRonDraw: true,
  sanrenko: true,
  suurenko: true,
  openRiichi: true,
  maneMangan: true,
  doubleYakuman: true,
  allowRedDora: true,
  turnTimerSeconds: 10,
};

export interface GameSnapshot {
  players: PlayerState[];
  round: RoundState;
  actionsHistory: TelemetryAction[];
  statusText: string;
}

export class MahjongGameEngine {
  public rules: HouseRules;
  public players: PlayerState[];
  public round: RoundState;
  public actionsHistory: TelemetryAction[];
  public statusText: string;
  public isPaused: boolean = false;
  public isRecorded: boolean = true;
  private snapshots: GameSnapshot[] = []; // Event snapshot buffer for Undo/Rollback

  constructor(
    customRules: Partial<HouseRules> = {},
    customPlayers?: { id: string; name: string; isBot: boolean; personaId?: string }[]
  ) {
    this.rules = { ...STANDARD_GENERAL_RULES, ...customRules };
    this.actionsHistory = [];
    this.statusText = 'ゲーム開始';

    // Initialize 4 players
    const winds: Wind[] = ['EAST', 'SOUTH', 'WEST', 'NORTH'];
    this.players = (customPlayers || [
      { id: 'player_you', name: 'あなた (Player 1)', isBot: false },
      { id: 'player_sato', name: '佐藤 健一 (Sato)', isBot: true, personaId: 'persona_sato' },
      { id: 'player_tanaka', name: '田中 亮 (Tanaka)', isBot: true, personaId: 'persona_tanaka' },
      { id: 'player_suzuki', name: '鈴木 雅之 (Suzuki)', isBot: true, personaId: 'persona_suzuki' },
    ]).map((p, idx) => {
      const preset =
        PRESET_PERSONAS.find((pr) => pr.id === p.personaId) ||
        PRESET_PERSONAS[idx % PRESET_PERSONAS.length];
      return {
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        persona: { ...preset, name: p.name, isAiBot: p.isBot },
        score: this.rules.startingScore,
        seatWind: winds[idx],
        hand: { tiles: [], melds: [] },
        discards: [],
        discardShantens: [],
        isRiichi: false,
        isOpenRiichi: false,
        isIppatsu: false,
        isTenpai: false,
        currentShanten: 8,
        maneManganStreak: 0,
        maneManganFailed: false,
        unreasonablePushCount: 0,
      };
    });

    // Smart Recording flag: True if 4 human players by default, false if >= 1 bot
    const hasBots = this.players.some((p) => p.isBot);
    this.isRecorded = !hasBots;

    // Initialize Round 1 (East 1)
    this.round = this.createInitialRound();
    this.dealInitialHands();
    this.saveSnapshot();
  }

  private createInitialRound(): RoundState {
    const freshWall = createFreshWall(this.rules.allowRedDora);
    const deadWall = freshWall.splice(-14, 14); // 14 tiles dead wall (wanpai)
    const doraIndicators = [deadWall[4]]; // 5th tile of dead wall
    const uraDoraIndicators = [deadWall[5]];

    return {
      roundWind: 'EAST',
      roundNumber: 1,
      honba: 0,
      riichiSticks: 0,
      dealerIndex: 0, // Player 0 starts as dealer
      turnPlayerIndex: 0,
      remainingTilesCount: freshWall.length,
      doraIndicators,
      uraDoraIndicators,
      wall: freshWall,
      deadWall,
      currentTurnNumber: 1,
      isRyanhanShibari: false,
      firstRoundMeldsOccurred: false,
      sufonRendaDiscards: [],
      isExhausted: false,
      isGameOver: false,
      winnerIndexes: [],
    };
  }

  // Deal 13 tiles to each player, then 14th tile to dealer
  public dealInitialHands() {
    for (let i = 0; i < 4; i++) {
      const playerTiles = this.round.wall.splice(0, 13);
      this.players[i].hand.tiles = sortTiles(playerTiles);
      this.players[i].hand.melds = [];
      this.players[i].discards = [];
      this.players[i].discardShantens = [];
      this.players[i].isRiichi = false;
      this.players[i].isOpenRiichi = false;
      this.players[i].isIppatsu = false;
      this.players[i].maneManganStreak = 0;
      this.players[i].maneManganFailed = false;
      this.players[i].currentShanten = calculateShanten(this.players[i].hand.tiles);
      this.players[i].isTenpai = this.players[i].currentShanten === 0;
    }

    // Dealer draws 14th tile
    const dealerTile = this.round.wall.shift();
    if (dealerTile) {
      this.players[this.round.dealerIndex].hand.tiles.push(dealerTile);
      this.players[this.round.dealerIndex].currentShanten = calculateShanten(
        this.players[this.round.dealerIndex].hand.tiles
      );
      this.players[this.round.dealerIndex].isTenpai =
        this.players[this.round.dealerIndex].currentShanten === 0;
    }

    this.round.turnPlayerIndex = this.round.dealerIndex;
    this.round.remainingTilesCount = this.round.wall.length;
    this.statusText = `${this.players[this.round.dealerIndex].name}の親番配牌完了 (東${this.round.roundNumber}局)`;
  }

  public saveSnapshot() {
    this.snapshots.push({
      players: JSON.parse(JSON.stringify(this.players)),
      round: JSON.parse(JSON.stringify(this.round)),
      actionsHistory: JSON.parse(JSON.stringify(this.actionsHistory)),
      statusText: this.statusText,
    });
    // Keep max 50 snapshots in memory
    if (this.snapshots.length > 50) {
      this.snapshots.shift();
    }
  }

  // Undo / Rollback N moves (State Rewind)
  public rollbackState(movesToRewind: number = 1): boolean {
    if (this.snapshots.length <= movesToRewind) {
      return false;
    }
    // Remove the current state and intermediate states
    for (let i = 0; i < movesToRewind; i++) {
      this.snapshots.pop();
    }
    const targetSnapshot = this.snapshots[this.snapshots.length - 1];
    if (!targetSnapshot) return false;

    this.players = JSON.parse(JSON.stringify(targetSnapshot.players));
    this.round = JSON.parse(JSON.stringify(targetSnapshot.round));
    this.actionsHistory = JSON.parse(JSON.stringify(targetSnapshot.actionsHistory));
    this.statusText = `状態を ${movesToRewind} 手巻き戻しました (Undo)`;
    return true;
  }

  // Draw tile for current player
  public drawTile(): Tile | null {
    if (this.round.wall.length === 0) {
      this.handleExhaustiveDraw();
      return null;
    }

    const tile = this.round.wall.shift()!;
    this.round.remainingTilesCount = this.round.wall.length;

    const player = this.players[this.round.turnPlayerIndex];
    player.hand.tiles.push(tile);
    player.currentShanten = calculateShanten(player.hand.tiles, player.hand.melds);
    player.isTenpai = player.currentShanten === 0;

    this.logAction({
      actionType: 'DRAW',
      tile,
      shanten: player.currentShanten,
    });

    return tile;
  }

  // Discard tile by player
  public discardTile(tileId: string): { success: boolean; ronDeals?: DealInAnalysis[] } {
    const player = this.players[this.round.turnPlayerIndex];
    const tileIndex = player.hand.tiles.findIndex((t) => t.id === tileId);

    if (tileIndex === -1) {
      return { success: false };
    }

    this.saveSnapshot();

    const [discarded] = player.hand.tiles.splice(tileIndex, 1);
    player.hand.tiles = sortTiles(player.hand.tiles);
    player.discards.push(discarded);

    // Ippatsu ends on own discard
    player.isIppatsu = false;

    // Log exact shanten at discard
    const shantenAtDiscard = calculateShanten(player.hand.tiles, player.hand.melds);
    player.currentShanten = shantenAtDiscard;
    player.discardShantens.push(shantenAtDiscard);
    player.isTenpai = shantenAtDiscard === 0;

    // 1. Mane-Mangan (マネ満 / 真似満) State Machine Check
    this.updateManeManganTracking(this.round.turnPlayerIndex, discarded);

    // 2. Sufon Renda (四風連打) Check on turn 1
    if (this.rules.sufonRenda && this.round.currentTurnNumber === 1 && !this.round.firstRoundMeldsOccurred) {
      this.round.sufonRendaDiscards.push(discarded);
      if (this.round.sufonRendaDiscards.length === 4) {
        const first = this.round.sufonRendaDiscards[0];
        const allSameWind =
          isWind(first) &&
          this.round.sufonRendaDiscards.every((t) => t.suit === first.suit && t.value === first.value);
        if (allSameWind) {
          this.handleSufonRendaDraw();
          return { success: true };
        }
      }
    }

    // 3. Log Discard Action
    const anyOpponentInRiichi = this.players.some(
      (p, i) => i !== this.round.turnPlayerIndex && (p.isRiichi || p.isOpenRiichi)
    );

    this.logAction({
      actionType: 'DISCARD',
      tile: discarded,
      shanten: shantenAtDiscard,
      anyOpponentInRiichi,
    });

    // 4. Check Ron opportunities from other 3 players
    const ronResults = this.checkRonOpportunities(discarded, this.round.turnPlayerIndex);
    if (ronResults.length > 0) {
      // Triple Ron rule:
      if (ronResults.length === 3 && this.rules.tripleRonDraw) {
        this.handleTripleRonDraw();
        return { success: true };
      }

      this.executeRonWins(ronResults, discarded, this.round.turnPlayerIndex);
      return { success: true, ronDeals: ronResults.map((r) => r.dealInAnalysis) };
    }

    // 5. Check if Mane-Mangan achieved (5+ streaks reached without interrupt)
    if (this.rules.maneMangan && !player.maneManganFailed && player.maneManganStreak >= 5) {
      this.statusText = `${player.name}が「マネ満 (${player.maneManganStreak}巡一致)」の成立圏内です！`;
    }

    // 6. Advance to next player turn
    this.advanceTurn();
    return { success: true };
  }

  // Declare Riichi or Open Riichi
  public declareRiichi(isOpen: boolean = false): boolean {
    const player = this.players[this.round.turnPlayerIndex];
    if (player.score < 1000 || player.isRiichi || player.isOpenRiichi || player.hand.melds.length > 0) {
      return false;
    }

    if (player.currentShanten !== 0) {
      return false; // Must be Tenpai
    }

    player.score -= 1000;
    this.round.riichiSticks += 1;
    player.isRiichi = !isOpen;
    player.isOpenRiichi = isOpen;
    player.isIppatsu = true;
    player.riichiTurn = this.round.currentTurnNumber;

    this.logAction({
      actionType: isOpen ? 'OPEN_RIICHI' : 'RIICHI',
      shanten: 0,
      isOpenRiichiActive: isOpen,
    });

    this.statusText = `${player.name}が${isOpen ? '【オープン立直】' : '【立直】'}を宣言しました！ (供託+1000)`;
    return true;
  }

  // Declare Kyushukyuhai (九種九牌) on Turn 1
  public declareKyushukyuhai(): boolean {
    if (!this.rules.kyushukyuhai || this.round.firstRoundMeldsOccurred || this.round.currentTurnNumber !== 1) {
      return false;
    }

    const player = this.players[this.round.turnPlayerIndex];
    const terminals = player.hand.tiles.filter((t) => isTerminalOrHonor(t));
    const uniqueTerminals = new Set(terminals.map((t) => getTileKey(t)));

    if (uniqueTerminals.size < 9) {
      return false;
    }

    this.round.isExhausted = true;
    this.statusText = `${player.name}が九種九牌（9種${uniqueTerminals.size}枚）により流局を選択しました。`;
    this.handleTenpaiRenchanDraw();
    return true;
  }

  // Update Mane-Mangan tracking logic
  private updateManeManganTracking(playerIndex: number, discarded: Tile) {
    if (!this.rules.maneMangan) return;
    const player = this.players[playerIndex];

    if (player.maneManganFailed || this.round.firstRoundMeldsOccurred) {
      return;
    }

    const kamichaIndex = (playerIndex + 3) % 4;
    const kamicha = this.players[kamichaIndex];
    const kamichaDiscards = kamicha.discards;

    // Check if kamicha has discarded in this turn
    if (kamichaDiscards.length < player.discards.length) {
      player.maneManganFailed = true;
      return;
    }

    const targetKamichaTile = kamichaDiscards[player.discards.length - 1];
    if (areTilesEqual(discarded, targetKamichaTile)) {
      player.maneManganStreak += 1;
      this.statusText = `${player.name}が上家(${kamicha.name})の打牌を追従中 (マネ満 ${player.maneManganStreak}巡目)`;
    } else {
      player.maneManganFailed = true;
    }
  }

  // Advance turn to next player
  private advanceTurn() {
    this.round.turnPlayerIndex = (this.round.turnPlayerIndex + 1) % 4;
    if (this.round.turnPlayerIndex === this.round.dealerIndex) {
      this.round.currentTurnNumber += 1;
    }

    // Automatically draw tile for the new turn player
    this.drawTile();
  }

  // Check Ron for opponents on discarded tile
  private checkRonOpportunities(discarded: Tile, discarderIndex: number) {
    const winners: {
      winnerIndex: number;
      evaluation: HandEvaluation;
      dealInAnalysis: DealInAnalysis;
    }[] = [];

    const discarder = this.players[discarderIndex];

    for (let i = 0; i < 4; i++) {
      if (i === discarderIndex) continue;
      const opponent = this.players[i];

      // Check if candidate tile completes opponent's hand (shanten == -1)
      const testHand = [...opponent.hand.tiles, discarded];
      const shanten = calculateShanten(testHand, opponent.hand.melds);

      if (shanten === -1) {
        // Evaluate hand
        const evalContext = {
          isDealer: i === this.round.dealerIndex,
          roundWind: this.round.roundWind,
          seatWind: opponent.seatWind,
          isTsumo: false,
          isRiichi: opponent.isRiichi,
          isOpenRiichi: opponent.isOpenRiichi,
          isDoubleRiichi: opponent.riichiTurn === 1,
          isIppatsu: opponent.isIppatsu,
          isHaitei: false,
          isHoutei: this.round.wall.length === 0,
          isRinshan: false,
          isChankan: false,
          isTenhou: false,
          isChiihou: false,
          isRenhou: this.round.currentTurnNumber === 1 && !this.round.firstRoundMeldsOccurred,
          doraIndicators: this.round.doraIndicators,
          uraDoraIndicators: this.round.uraDoraIndicators,
          dealInPlayerWasInRiichi: discarder.isRiichi || discarder.isOpenRiichi,
          honba: this.round.honba,
          rules: this.rules,
        };

        const evaluation = evaluateHand(opponent.hand.tiles, opponent.hand.melds, discarded, evalContext);

        // Check 2-Han Minimum Rule (Ryanhan-Shibari: active if honba >= 5)
        if (this.round.honba >= this.rules.ryanhanShibariHonba && evaluation.han < 2 && !evaluation.isYakuman) {
          continue; // Ryanhan-shibari not met
        }

        // Must have at least 1 valid han or yakuman
        if (evaluation.han >= 1 || evaluation.isYakuman) {
          const waitShape: WaitShape = opponent.hand.tiles.length <= 2 ? 'TANKI' : 'RYANMEN';
          const pointsLost = evaluation.ronPayment || 8000;

          // Check Genbutsu
          const isGenbutsu = opponent.discards.some((d) => areTilesEqual(d, discarded));

          const dealInAnalysis = evaluateDealInCareLevel({
            discardTile: discarded,
            winnerWaitShape: waitShape,
            winnerIsRiichi: opponent.isRiichi,
            winnerIsOpenRiichi: opponent.isOpenRiichi,
            dealerShanten: discarder.currentShanten,
            winnerDiscards: opponent.discards,
            allDiscardsOnTable: this.players.flatMap((p) => p.discards),
            isGenbutsu,
            pointsLost,
            winnerHan: evaluation.han,
            winnerFu: evaluation.fu,
          });

          if (dealInAnalysis.unreasonablePush) {
            discarder.unreasonablePushCount += 1;
          }

          winners.push({
            winnerIndex: i,
            evaluation,
            dealInAnalysis,
          });
        }
      }
    }

    return winners;
  }

  // Execute Ron wins and transfer points
  private executeRonWins(
    winners: {
      winnerIndex: number;
      evaluation: HandEvaluation;
      dealInAnalysis: DealInAnalysis;
    }[],
    winningTile: Tile,
    discarderIndex: number
  ) {
    const discarder = this.players[discarderIndex];
    this.round.winnerIndexes = winners.map((w) => w.winnerIndex);
    this.round.ronDealerIndex = discarderIndex;

    for (const win of winners) {
      const winner = this.players[win.winnerIndex];
      const payout = win.evaluation.ronPayment || 8000;

      discarder.score -= payout;
      winner.score += payout + this.round.riichiSticks * 1000;
      this.round.riichiSticks = 0;

      this.logAction({
        actionType: 'RON',
        playerIndex: win.winnerIndex,
        tile: winningTile,
        shanten: -1,
        dealInAnalysis: win.dealInAnalysis,
        isDamaTenpai: !winner.isRiichi && !winner.isOpenRiichi,
      });

      this.statusText = `${winner.name}が${discarder.name}からロン和了！【${win.evaluation.scoreTitle} (${payout}点)】放銃ケアレベル: ${win.dealInAnalysis.careLevel}`;
    }

    // Check if dealer won -> Renchan, else dealer shifts
    const dealerWon = winners.some((w) => w.winnerIndex === this.round.dealerIndex);
    if (dealerWon) {
      this.round.honba += 1;
    } else {
      this.round.honba = 0;
      this.round.dealerIndex = (this.round.dealerIndex + 1) % 4;
      if (this.round.dealerIndex === 0) {
        this.round.roundNumber += 1;
        if (this.round.roundNumber > 4) {
          this.round.roundWind = 'SOUTH';
          this.round.roundNumber = 1;
        }
      }
    }

    this.round.isExhausted = true;
  }

  // Handle Sufon Renda Draw (Dealer does NOT pass)
  private handleSufonRendaDraw() {
    this.round.isExhausted = true;
    this.round.honba += 1;
    this.statusText = '四風連打が成立しました！ 途中流局（親流れなし・連荘）';
    this.logAction({
      actionType: 'DRAW_CALL',
      shanten: 0,
    });
  }

  // Handle Triple Ron Draw
  private handleTripleRonDraw() {
    this.round.isExhausted = true;
    this.round.honba += 1;
    this.statusText = 'トリプルロン（3人和了）が発生したため、ハウスルールにより流局となりました。';
    this.logAction({
      actionType: 'DRAW_CALL',
      shanten: 0,
    });
  }

  // Handle Exhaustive Draw (荒廃流局)
  private handleExhaustiveDraw() {
    this.round.isExhausted = true;
    this.statusText = '流局（牌山終了）';

    // 1. Check Nagashi Mangan (流し満貫)
    if (this.rules.nagashiMangan) {
      for (let i = 0; i < 4; i++) {
        const p = this.players[i];
        const allTerminals = p.discards.every((d) => isTerminalOrHonor(d));
        if (allTerminals && p.discards.length >= 15) {
          this.statusText = `${p.name}の流し満貫が成立しました！ (満貫スコア加算)`;
          p.score += 8000;
          return;
        }
      }
    }

    this.handleTenpaiRenchanDraw();
  }

  // Tenpai Renchan logic on draw
  private handleTenpaiRenchanDraw() {
    const tenpaiCount = this.players.filter((p) => p.isTenpai).length;

    // Tenpai point transfers (3000 pts pool)
    if (tenpaiCount > 0 && tenpaiCount < 4) {
      const receiveEach = 3000 / tenpaiCount;
      const payEach = 3000 / (4 - tenpaiCount);
      this.players.forEach((p) => {
        if (p.isTenpai) p.score += receiveEach;
        else p.score -= payEach;
      });
    }

    const dealerIsTenpai = this.players[this.round.dealerIndex].isTenpai;
    if (dealerIsTenpai && this.rules.tenpaiRenchan) {
      this.round.honba += 1;
      this.statusText += '【親テンパイ連荘】親番が継続します。';
    } else {
      this.round.honba += 1;
      this.round.dealerIndex = (this.round.dealerIndex + 1) % 4;
      if (this.round.dealerIndex === 0) {
        this.round.roundNumber += 1;
        if (this.round.roundNumber > 4) {
          this.round.roundWind = 'SOUTH';
          this.round.roundNumber = 1;
        }
      }
      this.statusText += '【親ノーテン親流れ】親番が下家に移動します。';
    }
  }

  private logAction(data: Partial<TelemetryAction>) {
    const action: TelemetryAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roundNumber: this.round.roundNumber,
      turnIndex: this.round.currentTurnNumber,
      playerIndex: data.playerIndex ?? this.round.turnPlayerIndex,
      actionType: data.actionType || 'DISCARD',
      tile: data.tile,
      shanten: data.shanten ?? 0,
      isRiichiActive: this.players[this.round.turnPlayerIndex]?.isRiichi || false,
      isOpenRiichiActive: this.players[this.round.turnPlayerIndex]?.isOpenRiichi || false,
      anyOpponentInRiichi: data.anyOpponentInRiichi ?? false,
      maneManganStreak: this.players[this.round.turnPlayerIndex]?.maneManganStreak || 0,
      isDamaTenpai: data.isDamaTenpai,
      dealInAnalysis: data.dealInAnalysis,
      timestamp: Date.now(),
    };

    this.actionsHistory.push(action);
  }

  // Start Next Round
  public nextRound() {
    this.round = {
      ...this.createInitialRound(),
      roundWind: this.round.roundWind,
      roundNumber: this.round.roundNumber,
      honba: this.round.honba,
      riichiSticks: this.round.riichiSticks,
      dealerIndex: this.round.dealerIndex,
    };
    this.dealInitialHands();
    this.saveSnapshot();
  }
}
