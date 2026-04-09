import { describe, it, expect } from 'vitest'
import { ScoringEngine } from './ScoringEngine'
import { HandEvaluator } from './HandEvaluator'
import { createCard, SUITS } from '../types/card'
import { JokerContext } from '../types/scoring'

function makeCard(valueIndex: number, suitIndex: number = 0) {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
  return createCard(SUITS[suitIndex], ranks[valueIndex] as '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A')
}

function emptyJokerCtx(): JokerContext {
  return { mult: 0, bonus: 0, boostFactor: 0, triggered: [] }
}

describe('ScoringEngine', () => {
  const engine = new ScoringEngine()
  const evaluator = new HandEvaluator()

  describe('基础计分', () => {
    it('1. base + faceValue（无 Joker）', () => {
      // 同花（非顺子）: base=30, faceValue=2+5+7+9+13=36, subtotal=66
      const hand = [
        makeCard(0, 0), // 2♠
        makeCard(3, 0), // 5♠
        makeCard(5, 0), // 7♠
        makeCard(7, 0), // 9♠
        makeCard(11, 0), // K♠
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('同花')
      expect(result.type.base).toBe(30)

      const score = engine.calculate(result, emptyJokerCtx())
      expect(score.base).toBe(30)
      expect(score.faceValue).toBe(36)
      expect(score.subtotal).toBe(66)
      expect(score.mult).toBe(0)
      expect(score.bonus).toBe(0)
      expect(score.boostFactor).toBe(0)
      // total = (30+36) × (1+0) × (1+0) + 0 = 66
      expect(score.total).toBe(66)
    })

    it('2. 无 Joker 时 mult=0，total = base + faceValue', () => {
      // 一对: base=10, faceValue=13+13+3+7+9=45, subtotal=55
      const hand = [
        makeCard(11, 0), // K♠
        makeCard(11, 1), // K♥
        makeCard(1, 2),  // 3♦
        makeCard(5, 3),  // 7♣
        makeCard(7, 0),  // 9♠
      ]
      const result = evaluator.evaluate(hand)
      const score = engine.calculate(result, emptyJokerCtx())

      expect(score.total).toBe(55)
      expect(score.mult).toBe(0)
      expect(score.bonus).toBe(0)
      expect(score.boostFactor).toBe(0)
    })
  })

  describe('Joker Mult', () => {
    it('3. 应用 Joker Mult — (base+faceValue)×(1+mult)', () => {
      // 同花: base=30, faceValue=36, subtotal=66, mult=2
      // total = 66 × (1+2) = 198
      const hand = [
        makeCard(0, 0), // 2♠
        makeCard(3, 0), // 5♠
        makeCard(5, 0), // 7♠
        makeCard(7, 0), // 9♠
        makeCard(11, 0), // K♠
      ]
      const result = evaluator.evaluate(hand)
      const ctx: JokerContext = { mult: 2, bonus: 0, boostFactor: 0, triggered: [] }
      const score = engine.calculate(result, ctx)

      expect(score.mult).toBe(2)
      expect(score.total).toBe(198)
    })
  })

  describe('Joker Bonus', () => {
    it('4. 应用 Joker Bonus — (base+faceValue)+bonus', () => {
      // 同花: base=30, faceValue=36, subtotal=66, bonus=50
      // total = 66 + 50 = 116
      const hand = [
        makeCard(0, 0), // 2♠
        makeCard(3, 0), // 5♠
        makeCard(5, 0), // 7♠
        makeCard(7, 0), // 9♠
        makeCard(11, 0), // K♠
      ]
      const result = evaluator.evaluate(hand)
      const ctx: JokerContext = { mult: 0, bonus: 50, boostFactor: 0, triggered: [] }
      const score = engine.calculate(result, ctx)

      expect(score.bonus).toBe(50)
      expect(score.total).toBe(116)
    })
  })

  describe('Mult + Bonus 同时生效', () => {
    it('5. Mult 和 Bonus 同时生效', () => {
      // 同花: base=30, faceValue=36, subtotal=66, mult=1, bonus=20
      // total = 66 × (1+1) + 20 = 132 + 20 = 152
      const hand = [
        makeCard(0, 0), // 2♠
        makeCard(3, 0), // 5♠
        makeCard(5, 0), // 7♠
        makeCard(7, 0), // 9♠
        makeCard(11, 0), // K♠
      ]
      const result = evaluator.evaluate(hand)
      const ctx: JokerContext = { mult: 1, bonus: 20, boostFactor: 0, triggered: [] }
      const score = engine.calculate(result, ctx)

      expect(score.total).toBe(152)
    })
  })

  describe('boostFactor', () => {
    it('6. 应用 boostFactor — (base+faceValue)×(1+mult)×(1+boostFactor)', () => {
      // 同花: base=30, faceValue=36, subtotal=66, mult=2, boostFactor=0.5
      // total = 66 × (1+2) × (1+0.5) = 66 × 3 × 1.5 = 297
      const hand = [
        makeCard(0, 0), // 2♠
        makeCard(3, 0), // 5♠
        makeCard(5, 0), // 7♠
        makeCard(7, 0), // 9♠
        makeCard(11, 0), // K♠
      ]
      const result = evaluator.evaluate(hand)
      const ctx: JokerContext = { mult: 2, bonus: 0, boostFactor: 0.5, triggered: [] }
      const score = engine.calculate(result, ctx)

      expect(score.boostFactor).toBe(0.5)
      expect(score.total).toBe(297)
    })

    it('7. boostFactor 与 mult 叠加', () => {
      // 同花: base=30, faceValue=36, subtotal=66, mult=3, boostFactor=0.25
      // total = 66 × (1+3) × (1+0.25) = 66 × 4 × 1.25 = 330
      const hand = [
        makeCard(0, 0), // 2♠
        makeCard(3, 0), // 5♠
        makeCard(5, 0), // 7♠
        makeCard(7, 0), // 9♠
        makeCard(11, 0), // K♠
      ]
      const result = evaluator.evaluate(hand)
      const ctx: JokerContext = { mult: 3, bonus: 0, boostFactor: 0.25, triggered: [] }
      const score = engine.calculate(result, ctx)

      expect(score.total).toBe(330)
    })
  })

  describe('单张计分（base=0）', () => {
    it('8. 单张(1张)计分 — base=0 时仍计算 faceValue', () => {
      // 单张: base=0, faceValue=14(A), subtotal=14
      // 无 Joker: total = 14
      const hand = [makeCard(12, 0)] // A♠
      const result = evaluator.evaluate(hand)
      const score = engine.calculate(result, emptyJokerCtx())

      expect(result.type.name).toBe('单张')
      expect(result.type.base).toBe(0)
      expect(score.base).toBe(0)
      expect(score.faceValue).toBe(14)
      expect(score.subtotal).toBe(14)
      expect(score.total).toBe(14)
    })

    it('9. 单张 + Joker Bonus', () => {
      // 单张: base=0, faceValue=14, subtotal=14, bonus=30
      // total = 14 + 30 = 44
      const hand = [makeCard(12, 0)] // A♠
      const result = evaluator.evaluate(hand)
      const ctx: JokerContext = { mult: 0, bonus: 30, boostFactor: 0, triggered: [] }
      const score = engine.calculate(result, ctx)

      expect(score.total).toBe(44)
    })
  })

  describe('综合场景', () => {
    it('10. Joker 组合计分（mult + bonus + boostFactor 全部生效）', () => {
      // 顺子: base=30, faceValue=6+7+8+9+10=40, subtotal=70
      // mult=2, bonus=50, boostFactor=0.5
      // total = 70 × (1+2) × (1+0.5) + 50 = 70×3×1.5+50 = 315+50 = 365
      const hand = [
        makeCard(4, 0), // 6♠
        makeCard(5, 1), // 7♥
        makeCard(6, 2), // 8♦
        makeCard(7, 3), // 9♣
        makeCard(8, 0), // 10♠
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('顺子')
      expect(result.type.base).toBe(30)

      const ctx: JokerContext = { mult: 2, bonus: 50, boostFactor: 0.5, triggered: [] }
      const score = engine.calculate(result, ctx)

      expect(score.base).toBe(30)
      expect(score.faceValue).toBe(40)
      expect(score.subtotal).toBe(70)
      expect(score.mult).toBe(2)
      expect(score.bonus).toBe(50)
      expect(score.boostFactor).toBe(0.5)
      expect(score.total).toBe(365)
    })

    it('11. JokerContext 空对象字段缺失时使用默认值 0', () => {
      // 同花: base=30, faceValue=36, subtotal=66
      // 传入空 JokerContext，应默认 mult=0, bonus=0, boostFactor=0
      const hand = [
        makeCard(0, 0), // 2♠
        makeCard(3, 0), // 5♠
        makeCard(5, 0), // 7♠
        makeCard(7, 0), // 9♠
        makeCard(11, 0), // K♠
      ]
      const result = evaluator.evaluate(hand)
      const score = engine.calculate(result, {})

      expect(score.mult).toBe(0)
      expect(score.bonus).toBe(0)
      expect(score.boostFactor).toBe(0)
      expect(score.total).toBe(66)
    })
  })
})
