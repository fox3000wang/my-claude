import { Joker } from '../types/joker'
import { HandResult } from '../types/hand'
import { JokerContext, JokerTriggered } from '../types/scoring'

export interface JokerScoringContext {
  isLastHand?: boolean
  baseScore?: number
}

export class JokerSystem {
  private jokers: Joker[]

  constructor(jokers: Joker[] = []) {
    this.jokers = [...jokers]
  }

  /**
   * 返回所有活跃 Joker 的副本
   */
  getActiveJokers(): Joker[] {
    return [...this.jokers]
  }

  /**
   * 添加一个 Joker 到活跃列表
   */
  addJoker(joker: Joker): void {
    this.jokers.push(joker)
  }

  /**
   * 从活跃列表中移除指定 ID 的 Joker
   */
  removeJoker(jokerId: string): void {
    this.jokers = this.jokers.filter(j => j.id !== jokerId)
  }

  /**
   * 清空所有活跃 Joker
   */
  clearJokers(): void {
    this.jokers = []
  }

  /**
   * 根据手牌结果计算 JokerContext（聚合 mult / bonus / boostFactor）
   *
   * 公式对应 ScoringEngine：
   *   total = (base + faceValue) × (1 + mult) × (1 + boostFactor) + bonus
   *
   * Joker 效果分类：
   *   - mult 贡献：flat_mult / count_mult / value_mult / even_mult / hand_mult
   *   - bonus 贡献：flat_bonus / count_bonus / odd_bonus / hand_mult_bonus
   *   - boostFactor 贡献：mult_boost
   *
   * context 参数可选，用于支持 last_hand_mult 等需要额外状态的效果
   */
  computeContext(
    result: HandResult,
    context: JokerScoringContext = {},
  ): JokerContext {
    const { cards, type } = result
    const { isLastHand = false, baseScore = 0 } = context

    let totalMult = 0
    let totalBonus = 0
    let boostFactor = 0
    const triggered: JokerTriggered[] = []

    for (const joker of this.jokers) {
      const { effect } = joker
      let jokerMult = 0
      let jokerBonus = 0
      let isTriggered = false

      switch (effect.type) {
        // flat_mult：固定 +N Mult
        case 'flat_mult':
          jokerMult += effect.value ?? 0
          isTriggered = true
          break

        // flat_bonus：固定 +N Bonus
        case 'flat_bonus':
          jokerBonus += effect.value ?? 0
          isTriggered = true
          break

        // count_mult：每 N 张指定花色 +M Mult（per=每 N 张，mult_per=加 M）
        case 'count_mult': {
          const suitCount = cards.filter(c => c.suit === effect.suit).length
          const multPer = effect.mult_per ?? 1
          if (suitCount > 0) {
            jokerMult += Math.floor(suitCount / (effect.per ?? 1)) * multPer
            isTriggered = suitCount >= (effect.per ?? 1)
          }
          break
        }

        // count_bonus：每 N 张指定花色 +M Bonus
        case 'count_bonus': {
          const suitCount = cards.filter(c => c.suit === effect.suit).length
          if (suitCount > 0) {
            jokerBonus += Math.floor(suitCount / (effect.per ?? 1)) * (effect.bonus_per ?? 0)
            isTriggered = suitCount >= (effect.per ?? 1)
          }
          break
        }

        // value_mult：手牌含有指定面值时 +N Mult
        case 'value_mult':
          if (effect.values && cards.some(c => effect.values!.includes(c.value))) {
            jokerMult += effect.mult ?? 0
            isTriggered = true
          }
          break

        // even_mult：全部为偶数牌时 +N Mult
        case 'even_mult':
          if (cards.length > 0 && cards.every(c => c.value % 2 === 0)) {
            jokerMult += effect.mult ?? 0
            isTriggered = true
          }
          break

        // odd_bonus：全部为奇数牌时 +N Bonus
        case 'odd_bonus':
          if (cards.length > 0 && cards.every(c => c.value % 2 === 1)) {
            jokerBonus += effect.bonus ?? 0
            isTriggered = true
          }
          break

        // hand_mult：指定手牌类型时 +N Mult
        case 'hand_mult':
          if (effect.hands && effect.hands.includes(type.name)) {
            jokerMult += effect.mult ?? 0
            isTriggered = true
          }
          break

        // hand_mult_bonus：指定手牌类型时 +N Mult 和 +N Bonus
        case 'hand_mult_bonus':
          if (effect.hands && effect.hands.includes(type.name)) {
            jokerMult += effect.mult ?? 0
            jokerBonus += effect.bonus ?? 0
            isTriggered = true
          }
          break

        // score_mult：基础分数超过阈值时 +N Mult
        case 'score_mult':
          if (effect.threshold !== undefined && baseScore > effect.threshold) {
            jokerMult += effect.mult ?? 0
            isTriggered = true
          }
          break

        // suit_diverse_mult：手牌花色种类 >= N 时 +N Mult
        case 'suit_diverse_mult': {
          const suits = new Set(cards.map(c => c.suit))
          if (effect.count !== undefined && suits.size >= effect.count) {
            jokerMult += effect.mult ?? 0
            isTriggered = true
          }
          break
        }

        // last_hand_mult：最后一手时 +N Mult
        case 'last_hand_mult':
          if (isLastHand) {
            jokerMult += effect.mult ?? 0
            isTriggered = true
          }
          break

        // mult_boost：指定手牌类型时 boostFactor += N
        case 'mult_boost':
          if (effect.hands && effect.hands.includes(type.name)) {
            boostFactor += effect.factor ?? 0
            isTriggered = true
          }
          break

        // 尚未实现的效果类型：passive / money / draw / money_mult / money_bonus
        case 'money':
        case 'draw':
        case 'money_mult':
        case 'money_bonus':
        default:
          break
      }

      if (isTriggered) {
        triggered.push({ jokerId: joker.id, jokerMult, jokerBonus })
        totalMult += jokerMult
        totalBonus += jokerBonus
      }
    }

    return { mult: totalMult, bonus: totalBonus, boostFactor, triggered }
  }

  /**
   * 触发出牌时的 Joker 效果。
   * 返回 JokerContext（已聚合的 mult/bonus/boostFactor）和各 Joker 触发详情。
   */
  triggerScoring(
    result: HandResult,
    context: JokerScoringContext = {},
  ): { context: JokerContext; triggered: JokerTriggered[] } {
    const jokerCtx = this.computeContext(result, context)
    return { context: jokerCtx, triggered: jokerCtx.triggered }
  }

  /**
   * 触发出牌后（计分完成后）的 Joker 效果。
   * DRAW Joker 和 DISCARD Joker 等在此处理。
   *
   * 目前 DRAW / DISCARD 效果尚未实现，返回 { extraDraw: 0, extraDiscard: 0 }
   */
  triggerPostScoring(
    _result: HandResult,
    _context: JokerContext,
  ): { extraDraw: number; extraDiscard: number } {
    // TODO: 实现 DRAW / DISCARD Joker 效果
    return { extraDraw: 0, extraDiscard: 0 }
  }

  /**
   * 触发赢得 Blind 后获得金钱时的 Joker 效果。
   * MONEY_MULT Joker 和 MONEY_BONUS Joker 等在此处理。
   *
   * 目前 MONEY Joker 效果尚未实现，返回 { bonus: 0, newTotal: currentMoney }
   */
  triggerMoneyEarned(currentMoney: number): { bonus: number; newTotal: number } {
    // TODO: 实现 MONEY_MULT / MONEY_BONUS Joker 效果
    return { bonus: 0, newTotal: currentMoney }
  }
}
