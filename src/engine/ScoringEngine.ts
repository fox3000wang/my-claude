import { HandResult } from '../types/hand'
import { JokerContext, ScoreResult } from '../types/scoring'

export class ScoringEngine {
  /**
   * 计算最终得分。
   *
   * 公式：total = (base + faceValue) × (1 + mult) × (1 + boostFactor) + bonus
   *
   * @param handResult - 手牌判定结果，包含牌型基础分和面值分
   * @param jokerCtx   - Joker 效果上下文，提供 mult / bonus / boostFactor
   * @returns 计分结果，包含各项分型和最终总分
   */
  calculate(handResult: HandResult, jokerCtx: JokerContext = { mult: 0, bonus: 0, boostFactor: 0, triggered: [] }): ScoreResult {
    const { type, faceValue } = handResult
    const base = type.base
    const subtotal = base + faceValue

    const mult = jokerCtx.mult ?? 0
    const bonus = jokerCtx.bonus ?? 0
    const boostFactor = jokerCtx.boostFactor ?? 0

    const total = Math.round(subtotal * (1 + mult) * (1 + boostFactor) + bonus)

    return {
      base,
      faceValue,
      subtotal,
      mult,
      bonus,
      boostFactor,
      total,
    }
  }
}
