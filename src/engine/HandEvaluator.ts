import { Card } from '../types/card'
import { HandResult, HandType } from '../types/hand'
import { HAND_TYPES } from '../constants/handTypes'

/**
 * 手牌判定引擎（德州扑克风格，1-5张）
 *
 * 迁移自 tests/game.test.js 的 class HandEvaluator，保持逻辑完全一致。
 */
export class HandEvaluator {

  /**
   * 判定手牌类型
   * @param hand 1-5 张牌
   * @returns HandResult { type, cards, faceValue, kicker? }
   */
  evaluate(hand: Card[]): HandResult {
    const n = hand.length
    const faceValue = this.calcFaceValue(hand)
    if (n === 5) return this.evaluateFive(hand, faceValue)
    if (n === 4) return this.evaluateFour(hand, faceValue)
    if (n === 3) return this.evaluateThree(hand, faceValue)
    if (n === 2) return this.evaluateTwo(hand, faceValue)
    if (n === 1) return { type: { name: '单张', base: 0, level: 99 }, cards: hand, faceValue }
    return { type: HAND_TYPES.HIGH_CARD, cards: hand, faceValue: 0 }
  }

  /**
   * 5张手牌判定
   * 优先级：皇家同花顺 > 同花顺 > 四条 > 葫芦 > 同花 > 顺子 > 三条 > 两对 > 一对 > 高牌
   */
  private evaluateFive(hand: Card[], faceValue: number): HandResult {
    const flush = this.checkFlush(hand)
    const straight = this.checkStraight(hand)
    const groups = this.groupByRank(hand)

    if (flush && straight && straight.highest === 14 && straight.type === 'normal') {
      return { type: HAND_TYPES.ROYAL_FLUSH, cards: hand, faceValue }
    }
    if (flush && straight) {
      return { type: HAND_TYPES.STRAIGHT_FLUSH, cards: hand, faceValue, kicker: straight.highest }
    }
    if (groups[4]) return { type: HAND_TYPES.FOUR_OF_A_KIND, cards: hand, faceValue }
    if (groups[3] && groups[2]) return { type: HAND_TYPES.FULL_HOUSE, cards: hand, faceValue }
    if (flush) return { type: HAND_TYPES.FLUSH, cards: hand, faceValue }
    if (straight) return { type: HAND_TYPES.STRAIGHT, cards: hand, faceValue, kicker: straight.highest }
    if (groups[3]) return { type: HAND_TYPES.THREE_OF_A_KIND, cards: hand, faceValue }
    if (this.countGroups(groups, 2) === 2) return { type: HAND_TYPES.TWO_PAIR, cards: hand, faceValue }
    if (groups[2]) return { type: HAND_TYPES.ONE_PAIR, cards: hand, faceValue }
    return { type: HAND_TYPES.HIGH_CARD, cards: hand, faceValue }
  }

  /**
   * 4张手牌判定
   * 优先级：四条 > 三条 > 两对 > 一对 > 高牌
   */
  private evaluateFour(hand: Card[], faceValue: number): HandResult {
    const groups = this.groupByRank(hand)
    if (groups[4]) return { type: HAND_TYPES.FOUR_OF_A_KIND, cards: hand, faceValue }
    if (groups[3]) return { type: HAND_TYPES.THREE_OF_A_KIND, cards: hand, faceValue }
    if (this.countGroups(groups, 2) === 2) return { type: HAND_TYPES.TWO_PAIR, cards: hand, faceValue }
    if (groups[2]) return { type: HAND_TYPES.ONE_PAIR, cards: hand, faceValue }
    return { type: HAND_TYPES.HIGH_CARD, cards: hand, faceValue }
  }

  /**
   * 3张手牌判定
   * 优先级：三条 > 一对 > 高牌
   */
  private evaluateThree(hand: Card[], faceValue: number): HandResult {
    const groups = this.groupByRank(hand)
    if (groups[3]) return { type: HAND_TYPES.THREE_OF_A_KIND, cards: hand, faceValue }
    if (groups[2]) return { type: HAND_TYPES.ONE_PAIR, cards: hand, faceValue }
    return { type: HAND_TYPES.HIGH_CARD, cards: hand, faceValue }
  }

  /**
   * 2张手牌判定
   * 优先级：一对 > 高牌
   */
  private evaluateTwo(hand: Card[], faceValue: number): HandResult {
    const groups = this.groupByRank(hand)
    if (groups[2]) return { type: HAND_TYPES.ONE_PAIR, cards: hand, faceValue }
    return { type: HAND_TYPES.HIGH_CARD, cards: hand, faceValue }
  }

  /**
   * 检查是否同花
   */
  checkFlush(hand: Card[]): boolean {
    return hand.every(c => c.suit === hand[0].suit)
  }

  /**
   * 检查是否顺子
   * - 普通顺子：5个连续面值，最高为 kicker
   * - A-2-3-4-5 小顺子（wheel）：highest=5, type='wheel'
   */
  checkStraight(hand: Card[]): { highest: number; type: 'normal' | 'wheel' } | null {
    const values = [...new Set(hand.map(c => c.value))].sort((a, b) => a - b)
    if (values.length !== 5) return null
    if (values[4] - values[0] === 4) return { highest: values[4], type: 'normal' }
    // A-2-3-4-5 wheel: values = [2, 3, 4, 5, 14]
    if (values[0] === 2 && values[1] === 3 && values[2] === 4 && values[3] === 5 && values[4] === 14) {
      return { highest: 5, type: 'wheel' }
    }
    return null
  }

  /**
   * 按面值分组
   * 返回结构：{ [count]: cards[] }，如 groups[4] 为所有4张同面值的牌的数组
   */
  groupByRank(hand: Card[]): Record<number, Card[]> {
    const groups: Record<number, Card[]> = {}
    for (const card of hand) {
      if (!groups[card.value]) groups[card.value] = []
      groups[card.value].push(card)
    }
    const result: Record<number, Card[]> = {}
    for (const [value, cards] of Object.entries(groups)) {
      void value // 避免 unused 警告
      const count = cards.length
      if (!result[count]) result[count] = []
      result[count].push(...cards)
    }
    return result
  }

  /**
   * 统计指定数量的组有几组（如 groups[2]=4 表示有2组对子）
   */
  countGroups(groups: Record<number, Card[]>, count: number): number {
    return groups[count] ? groups[count].length / count : 0
  }

  /**
   * 计算面值分（牌面值之和）
   * 2-10=面值数字，J=11, Q=12, K=13, A=14
   */
  calcFaceValue(hand: Card[]): number {
    return hand.reduce((sum, c) => sum + c.value, 0)
  }
}
