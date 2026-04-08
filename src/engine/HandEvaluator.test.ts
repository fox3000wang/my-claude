import { describe, it, expect } from 'vitest'
import { HandEvaluator } from './HandEvaluator'
import { createCard, SUITS } from '../types/card'

// 测试辅助函数：创建指定面值和花色的牌
// RANKS index: 2=0, 3=1, 4=2, 5=3, 6=4, 7=5, 8=6, 9=7, 10=8, J=9, Q=10, K=11, A=12
function makeCard(valueIndex: number, suitIndex: number = 0) {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
  return createCard(SUITS[suitIndex], ranks[valueIndex] as '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A')
}

describe('HandEvaluator', () => {
  const evaluator = new HandEvaluator()

  describe('5张手牌判定', () => {
    it('1. 皇家同花顺 — 10-J-Q-K-A 同花色', () => {
      const hand = [
        makeCard(8, 0),  // 10♠
        makeCard(9, 0),  // J♠
        makeCard(10, 0), // Q♠
        makeCard(11, 0), // K♠
        makeCard(12, 0), // A♠
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('皇家同花顺')
      expect(result.type.base).toBe(100)
      // 10=10, J=11, Q=12, K=13, A=14
      expect(result.faceValue).toBe(10 + 11 + 12 + 13 + 14)
    })

    it('2. 同花顺（非皇家）— 顺子且同花，但不含 A-K-Q-J-10', () => {
      const hand = [
        makeCard(3, 1),  // 5♥
        makeCard(4, 1),  // 6♥
        makeCard(5, 1),  // 7♥
        makeCard(6, 1),  // 8♥
        makeCard(7, 1),  // 9♥
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('同花顺')
      expect(result.type.base).toBe(80)
      expect(result.kicker).toBe(9) // 最高张是 9
    })

    it('3. 四条 — 4张同面值', () => {
      const hand = [
        makeCard(5, 0),  // 7♠
        makeCard(5, 1),  // 7♥
        makeCard(5, 2),  // 7♦
        makeCard(5, 3),  // 7♣
        makeCard(11, 0), // K♠
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('四条')
      expect(result.type.base).toBe(60)
    })

    it('4. 葫芦 — 3张 + 2张', () => {
      const hand = [
        makeCard(7, 0),  // 9♠
        makeCard(7, 1),  // 9♥
        makeCard(7, 2),  // 9♦
        makeCard(11, 0), // K♠
        makeCard(11, 1), // K♥
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('葫芦')
      expect(result.type.base).toBe(40)
    })

    it('5. 同花（非顺子）— 同花但非顺子', () => {
      const hand = [
        makeCard(0, 0),  // 2♠
        makeCard(3, 0),  // 5♠
        makeCard(7, 0),  // 9♠
        makeCard(9, 0),  // J♠
        makeCard(11, 0), // K♠
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('同花')
      expect(result.type.base).toBe(30)
    })

    it('6. 普通顺子 — 5张连续面值，不同花色', () => {
      const hand = [
        makeCard(4, 0),  // 6♠
        makeCard(5, 1),  // 7♥
        makeCard(6, 2),  // 8♦
        makeCard(7, 3),  // 9♣
        makeCard(8, 0),  // 10♠
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('顺子')
      expect(result.type.base).toBe(30)
      expect(result.kicker).toBe(10) // highest card is 10 (value 10)
    })

    it('7. A-2-3-4-5 小顺子 — kicker 应为 5', () => {
      const hand = [
        makeCard(12, 0), // A♠
        makeCard(0, 1),  // 2♥
        makeCard(1, 2),  // 3♦
        makeCard(2, 3),  // 4♣
        makeCard(3, 0),  // 5♠
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('顺子')
      expect(result.kicker).toBe(5) // wheel kicker is 5
    })

    it('8. 三条（5张牌中）', () => {
      const hand = [
        makeCard(9, 0),  // J♠
        makeCard(9, 1),  // J♥
        makeCard(9, 2),  // J♦
        makeCard(3, 0),  // 5♠
        makeCard(7, 0),  // 9♠
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('三条')
      expect(result.type.base).toBe(20)
    })

    it('9. 两对', () => {
      const hand = [
        makeCard(3, 0),  // 5♠
        makeCard(3, 1),  // 5♥
        makeCard(11, 2), // K♦
        makeCard(11, 3), // K♣
        makeCard(0, 0),  // 2♠
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('两对')
      expect(result.type.base).toBe(15)
    })

    it('10. 一对', () => {
      const hand = [
        makeCard(10, 0), // Q♠
        makeCard(10, 1), // Q♥
        makeCard(1, 2),  // 3♦
        makeCard(5, 3),  // 7♣
        makeCard(11, 0), // K♠
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('一对')
      expect(result.type.base).toBe(10)
    })

    it('11. 高牌', () => {
      const hand = [
        makeCard(0, 0),  // 2♠
        makeCard(3, 1),  // 5♥
        makeCard(7, 2),  // 9♦
        makeCard(9, 3),  // J♣
        makeCard(11, 0), // K♠
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('高牌')
      expect(result.type.base).toBe(5)
    })

    it('19. 面值分计算 — 5张 2-3-4-5-6 面值分 = 20', () => {
      const hand = [
        makeCard(0, 0),  // 2
        makeCard(1, 1),  // 3
        makeCard(2, 2),  // 4
        makeCard(3, 3),  // 5
        makeCard(4, 0),  // 6
      ]
      const result = evaluator.evaluate(hand)
      expect(result.faceValue).toBe(2 + 3 + 4 + 5 + 6)
    })
  })

  describe('1-4张手牌判定', () => {
    it('12. 1张牌 — type.name = "单张"', () => {
      const hand = [makeCard(12, 0)] // A♠
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('单张')
      expect(result.type.base).toBe(0)
      expect(result.faceValue).toBe(14) // A = 14
    })

    it('13. 3张牌判定三条', () => {
      const hand = [
        makeCard(5, 0),  // 7♠
        makeCard(5, 1),  // 7♥
        makeCard(5, 2),  // 7♦
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('三条')
      expect(result.faceValue).toBe(7 + 7 + 7)
    })

    it('14. 3张牌判定一对', () => {
      const hand = [
        makeCard(5, 0),  // 7♠
        makeCard(5, 1),  // 7♥
        makeCard(1, 2),  // 3♦
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('一对')
      expect(result.faceValue).toBe(7 + 7 + 3)
    })

    it('15. 3张牌判定高牌', () => {
      const hand = [
        makeCard(0, 0),  // 2♠
        makeCard(3, 1),  // 5♥
        makeCard(7, 2),  // 9♦
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('高牌')
      expect(result.faceValue).toBe(2 + 5 + 9)
    })

    it('16. 4张牌判定四条', () => {
      const hand = [
        makeCard(3, 0),  // 5♠
        makeCard(3, 1),  // 5♥
        makeCard(3, 2),  // 5♦
        makeCard(3, 3),  // 5♣
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('四条')
      expect(result.type.base).toBe(60)
    })

    it('17. 4张牌判定三条', () => {
      const hand = [
        makeCard(3, 0),  // 5♠
        makeCard(3, 1),  // 5♥
        makeCard(3, 2),  // 5♦
        makeCard(11, 0), // K♠
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('三条')
      expect(result.type.base).toBe(20)
    })

    it('18. 4张牌判定两对', () => {
      const hand = [
        makeCard(3, 0),  // 5♠
        makeCard(3, 1),  // 5♥
        makeCard(11, 2), // K♦
        makeCard(11, 3), // K♣
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('两对')
      expect(result.type.base).toBe(15)
    })
  })
})
