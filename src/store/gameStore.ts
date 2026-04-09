/**
 * GameStore — Zustand 状态管理
 *
 * 将所有引擎类（DeckManager、HandEvaluator、ScoringEngine、
 * JokerSystem、BlindManager、ShopManager、TarotSystem）汇聚到
 * 单一 store，统一管理游戏状态流转。
 */

import { create } from 'zustand'
import type { Card } from '../types/card'
import type { HandResult } from '../types/hand'
import type { ScoreResult, JokerContext } from '../types/scoring'
import type { Joker } from '../types/joker'
import type { ScreenType, PendingSelection } from '../types/game'
import {
  DeckManager,
  HandEvaluator,
  ScoringEngine,
  JokerSystem,
  BlindManager,
  ShopManager,
  TarotSystem,
} from '../engine'

/** 每局初始出牌次数 */
const INITIAL_HANDS_REMAINING = 4

/** 初始金币 */
const INITIAL_MONEY = 4

// ─── Store 接口 ─────────────────────────────────────────────────────────────

export interface GameStore {
  // ─── Navigation ─────────────────────────────────────────────────────────
  screen: ScreenType

  // ─── Deck ───────────────────────────────────────────────────────────────
  deckManager: DeckManager
  hand: Card[]
  selectedCards: Card[]

  // ─── Scoring ────────────────────────────────────────────────────────────
  totalScore: number
  targetScore: number
  handsRemaining: number
  lastResult: HandResult | null
  lastScore: ScoreResult | null
  lastJokerContext: JokerContext | null

  // ─── Joker ───────────────────────────────────────────────────────────────
  jokerSystem: JokerSystem
  activeJokers: Joker[]

  // ─── Money ───────────────────────────────────────────────────────────────
  money: number

  // ─── Progression ─────────────────────────────────────────────────────────
  currentAnte: number
  currentBlindIndex: number
  blindManager: BlindManager
  shopManager: ShopManager
  tarotSystem: TarotSystem

  // ─── Tarot pending selection ─────────────────────────────────────────────
  pendingSelection: PendingSelection | null

  // ─── Actions ─────────────────────────────────────────────────────────────
  startGame: () => void
  selectCard: (cardId: string) => void
  playHand: () => void
  continueGame: () => void
  sortHand: (by: 'suit' | 'rank') => void
  selectBlind: (index: number) => void
  confirmAnte: () => void
  backToAnteSelect: () => void
  buyItem: (type: 'joker' | 'tarotPlanet', index: number) => void
  leaveShop: () => void
  backToTitle: () => void
  skipBoss: () => void
}

// ─── Engine 实例（共享单例） ────────────────────────────────────────────────

const sharedDeckManager = new DeckManager()
const handEvaluator = new HandEvaluator()
const scoringEngine = new ScoringEngine()
const sharedJokerSystem = new JokerSystem()
const sharedBlindManager = new BlindManager()
const sharedShopManager = new ShopManager()
const sharedTarotSystem = new TarotSystem()

// ─── Store 创建 ─────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  // ─── 初始状态 ─────────────────────────────────────────────────────────
  screen: 'TITLE',

  deckManager: sharedDeckManager,
  hand: [],
  selectedCards: [],

  totalScore: 0,
  targetScore: 0,
  handsRemaining: INITIAL_HANDS_REMAINING,
  lastResult: null,
  lastScore: null,
  lastJokerContext: null,

  jokerSystem: sharedJokerSystem,
  activeJokers: [],

  money: INITIAL_MONEY,

  currentAnte: 1,
  currentBlindIndex: 0,
  blindManager: sharedBlindManager,
  shopManager: sharedShopManager,
  tarotSystem: sharedTarotSystem,

  pendingSelection: null,

  // ─── startGame ─────────────────────────────────────────────────────────
  startGame() {
    const { deckManager, blindManager, jokerSystem, shopManager, tarotSystem } = get()

    // 重置所有引擎状态
    deckManager.createDeck()
    deckManager.shuffle()

    blindManager.reset()
    jokerSystem.clearJokers()
    shopManager.reset()
    tarotSystem.startRound()

    // 发 8 张手牌
    deckManager.draw(8)

    set({
      screen: 'ANTE_SELECT',
      hand: [...deckManager.hand],
      selectedCards: [],
      totalScore: 0,
      handsRemaining: INITIAL_HANDS_REMAINING,
      lastResult: null,
      lastScore: null,
      lastJokerContext: null,
      activeJokers: [],
      money: INITIAL_MONEY,
      currentAnte: 1,
      currentBlindIndex: 0,
      pendingSelection: null,
    })
  },

  // ─── selectCard ─────────────────────────────────────────────────────────
  selectCard(cardId: string) {
    const { hand, selectedCards } = get()
    const isSelected = selectedCards.some(c => c.id === cardId)

    if (isSelected) {
      // 取消选中
      set({ selectedCards: selectedCards.filter(c => c.id !== cardId) })
    } else {
      // 选中（最多 5 张）
      if (selectedCards.length >= 5) return
      const card = hand.find(c => c.id === cardId)
      if (!card) return
      set({ selectedCards: [...selectedCards, card] })
    }
  },

  // ─── playHand ──────────────────────────────────────────────────────────
  playHand() {
    const { selectedCards, jokerSystem,
      tarotSystem, totalScore, handsRemaining, blindManager, money, shopManager } = get()

    if (selectedCards.length === 0) return

    // 1. 判定手牌
    const result = handEvaluator.evaluate(selectedCards)

    // 2. 判断是否最后一手
    const isLastHand = handsRemaining === 1

    // 3. Joker context
    const jokerCtx = jokerSystem.computeContext(result, { isLastHand })

    // 4. 计分
    const score = scoringEngine.calculate(result, jokerCtx)

    // 5. 累加得分
    const newTotalScore = totalScore + score.total

    // 6. 消耗出牌次数（除非 freeHand）
    const freeHand = tarotSystem.roundModifiers.freeHand
    const newHandsRemaining = freeHand ? handsRemaining : handsRemaining - 1

    // 7. Tarot freeHand 只生效一次，清除
    if (freeHand) {
      tarotSystem.clearFreeHand()
    }

    // 8. 判断游戏走向
    const targetScore = blindManager.getTargetScore()

    let nextScreen: ScreenType = 'SCORING'
    let nextTotalScore = newTotalScore
    let nextHandsRemaining = newHandsRemaining

    if (newTotalScore >= targetScore) {
      // 达成目标 → 奖励并进入商店（或胜利）
      const reward = blindManager.getReward()
      const newMoney = money + reward
      blindManager.completeBlind()

      if (blindManager.isLastAnte()) {
        // 所有 Ante 完成 → 胜利
        nextScreen = 'VICTORY'
      } else {
        // 进入商店
        shopManager.generateShop()
        nextScreen = 'SHOP'
      }
      set({
        screen: nextScreen,
        totalScore: nextTotalScore,
        handsRemaining: nextHandsRemaining,
        lastResult: result,
        lastScore: score,
        lastJokerContext: jokerCtx,
        money: newMoney,
        currentAnte: blindManager.ante,
        currentBlindIndex: blindManager.blindIndex,
      })
    } else if (newHandsRemaining <= 0) {
      // 未达成且无出牌机会 → 游戏结束
      nextScreen = 'GAME_OVER'
      set({
        screen: nextScreen,
        totalScore: nextTotalScore,
        handsRemaining: nextHandsRemaining,
        lastResult: result,
        lastScore: score,
        lastJokerContext: jokerCtx,
      })
    } else {
      // 否则保持 SCORING（显示结果后自动 continueGame）
      set({
        screen: nextScreen,
        totalScore: nextTotalScore,
        handsRemaining: nextHandsRemaining,
        lastResult: result,
        lastScore: score,
        lastJokerContext: jokerCtx,
      })
    }
  },

  // ─── continueGame ──────────────────────────────────────────────────────
  continueGame() {
    const { deckManager, selectedCards, screen } = get()

    // 如果已经进入商店/BLIND_SELECT/结束，不重置牌堆
    if (screen === 'SHOP' || screen === 'VICTORY' || screen === 'GAME_OVER' || screen === 'BLIND_SELECT') {
      return
    }

    // 1. 弃置已选中的牌
    deckManager.discardCards(selectedCards)

    // 2. 牌堆不足则重洗
    if (deckManager.deck.length < 5) {
      deckManager.reshuffle()
    }

    // 3. 发牌至 8 张
    deckManager.draw(8)

    // 4. Tarot 系统开始新回合
    const { tarotSystem } = get()
    tarotSystem.startRound()

    set({
      hand: [...deckManager.hand],
      selectedCards: [],
      // 来自 SCORING 界面则切回 PLAYING
      screen: screen === 'SCORING' ? 'PLAYING' : screen,
    })

    // 5. 自动按面值理牌
    get().sortHand('rank')
  },

  // ─── sortHand ──────────────────────────────────────────────────────────
  sortHand(by: 'suit' | 'rank') {
    const { hand, deckManager } = get()
    const sorted = [...hand].sort((a, b) => {
      if (by === 'suit') {
        return a.suit.localeCompare(b.suit)
      }
      return b.value - a.value
    })
    deckManager.setHand(sorted)
    set({ hand: sorted })
  },

  // ─── selectBlind ───────────────────────────────────────────────────────
  selectBlind(index: number) {
    const { blindManager } = get()
    if (!blindManager.selectBlind(index)) return
    set({
      screen: 'BLIND_SELECT',
      currentAnte: blindManager.ante,
      currentBlindIndex: index,
      targetScore: blindManager.getTargetScore(),
    })
  },

  // ─── confirmAnte ───────────────────────────────────────────────────────
  confirmAnte() {
    const { deckManager, blindManager } = get()

    // 重置当轮得分和出牌次数
    blindManager.getTargetScore() // 确保已设置
    deckManager.reset()
    deckManager.draw(8)

    set({
      screen: 'PLAYING',
      totalScore: 0,
      handsRemaining: INITIAL_HANDS_REMAINING,
      lastResult: null,
      lastScore: null,
      lastJokerContext: null,
      hand: [...deckManager.hand],
      selectedCards: [],
    })

    // 自动按面值理牌
    get().sortHand('rank')
  },

  // ─── backToAnteSelect ─────────────────────────────────────────────────
  backToAnteSelect() {
    set({ screen: 'ANTE_SELECT' })
  },

  // ─── buyItem ───────────────────────────────────────────────────────────
  buyItem(type: 'joker' | 'tarotPlanet', index: number) {
    const { shopManager, money, jokerSystem, tarotSystem } = get()

    if (type === 'joker') {
      const { joker, remainingMoney } = shopManager.buyJoker(index, money)
      if (!joker) return
      jokerSystem.addJoker(joker)
      set({
        money: remainingMoney,
        activeJokers: jokerSystem.getActiveJokers(),
      })
    } else {
      const { item, remainingMoney } = shopManager.buyTarotPlanet(money)
      if (!item) return
      // Planet：永久升级手牌类型基础分
      if (item.type === 'planet') {
        const newState = tarotSystem.applyPlanet(item)
        tarotSystem.setHandTypeUpgrades(newState.handTypeUpgrades)
      }
      // Tarot：临时效果
      if (item.type === 'tarot') {
        const newState = tarotSystem.applyTarot(item)
        tarotSystem.roundModifiers = newState.roundModifiers
      }
      set({ money: remainingMoney })
    }
  },

  // ─── leaveShop ─────────────────────────────────────────────────────────
  leaveShop() {
    const { shopManager } = get()

    // 关闭商店，清空商品，进入下一个 Ante 的选择界面
    shopManager.reset()
    set({ screen: 'ANTE_SELECT' })
  },

  // ─── backToTitle ───────────────────────────────────────────────────────
  backToTitle() {
    const { deckManager, blindManager, jokerSystem, shopManager, tarotSystem } = get()

    deckManager.createDeck()
    deckManager.shuffle()
    blindManager.reset()
    jokerSystem.clearJokers()
    shopManager.reset()
    tarotSystem.startRound()

    set({
      screen: 'TITLE',
      hand: [],
      selectedCards: [],
      totalScore: 0,
      targetScore: 0,
      handsRemaining: INITIAL_HANDS_REMAINING,
      lastResult: null,
      lastScore: null,
      lastJokerContext: null,
      activeJokers: [],
      money: INITIAL_MONEY,
      currentAnte: 1,
      currentBlindIndex: 0,
      pendingSelection: null,
    })
  },

  // ─── skipBoss ─────────────────────────────────────────────────────────
  skipBoss() {
    const { blindManager, money, deckManager, shopManager } = get()

    // 扣 $2
    const penalty = BlindManager.getBossSkipPenalty()
    const newMoney = money - penalty

    // 跳过 Boss，进入下一 Ante 或胜利
    const advanced = blindManager.skipBoss()

    if (!advanced) {
      // 无法跳过（不应该发生）
      return
    }

    // 重置牌堆，开始新 Ante
    deckManager.reset()
    deckManager.draw(8)

    // 检查是否全部完成
    if (blindManager.isLastAnte() && blindManager.blindIndex === 0) {
      // 刚跳过最后一个 Ante 的 Boss Blind
      set({
        screen: 'VICTORY',
        money: newMoney,
        currentAnte: blindManager.ante,
        currentBlindIndex: blindManager.blindIndex,
      })
      return
    }

    // 进入商店（Boss 跳过仍进入商店拿奖励）
    shopManager.generateShop()

    set({
      screen: 'SHOP',
      money: newMoney,
      currentAnte: blindManager.ante,
      currentBlindIndex: blindManager.blindIndex,
      hand: [...deckManager.hand],
      selectedCards: [],
    })
  },
}))
