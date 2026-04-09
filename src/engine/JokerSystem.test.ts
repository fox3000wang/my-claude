import { describe, it, expect, beforeEach } from 'vitest'
import { JokerSystem } from './JokerSystem'
import { HandEvaluator } from './HandEvaluator'
import { createCard, SUITS } from '../types/card'
import { Joker } from '../types/joker'

// 测试辅助函数：创建指定面值和花色的牌
// RANKS index: 2=0, 3=1, 4=2, 5=3, 6=4, 7=5, 8=6, 9=7, 10=8, J=9, Q=10, K=11, A=12
function makeCard(valueIndex: number, suitIndex: number = 0) {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
  return createCard(SUITS[suitIndex], ranks[valueIndex] as '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A')
}

// Joker 辅助函数
function makeFlatMultJoker(id: string, value: number): Joker {
  return {
    id,
    name: 'Test Mult',
    rarity: 'COMMON',
    price: 4,
    desc: '',
    effect: { type: 'flat_mult', value },
  }
}

function makeFlatBonusJoker(id: string, value: number): Joker {
  return {
    id,
    name: 'Test Bonus',
    rarity: 'COMMON',
    price: 3,
    desc: '',
    effect: { type: 'flat_bonus', value },
  }
}

// mult_boost Joker 必须有 hands 数组才生效（无 hands 的 Joker 不存在）
function makeBoostJoker(id: string, factor: number, hands: string[]): Joker {
  return {
    id,
    name: 'Test Boost',
    rarity: 'RARE',
    price: 8,
    desc: '',
    effect: { type: 'mult_boost', factor, hands },
  }
}

function makeHandMultJoker(id: string, mult: number, hands: string[]): Joker {
  return {
    id,
    name: 'Test Hand Mult',
    rarity: 'UNCOMMON',
    price: 6,
    desc: '',
    effect: { type: 'hand_mult', mult, hands },
  }
}

describe('JokerSystem', () => {
  const evaluator = new HandEvaluator()

  describe('getActiveJokers', () => {
    it('1. 空 Joker 列表时返回空数组', () => {
      const system = new JokerSystem()
      expect(system.getActiveJokers()).toEqual([])
    })

    it('2. 返回 jokers 数组的副本而非原数组', () => {
      const joker = makeFlatMultJoker('J100', 1)
      const system = new JokerSystem([joker])
      const active = system.getActiveJokers()
      expect(active).toEqual([joker])
      // 验证是副本
      active.push(joker)
      expect(system.getActiveJokers().length).toBe(1)
    })
  })

  describe('addJoker', () => {
    it('3. addJoker 添加新 Joker 到列表', () => {
      const system = new JokerSystem()
      const joker = makeFlatMultJoker('J100', 1)
      system.addJoker(joker)
      expect(system.getActiveJokers()).toContain(joker)
      expect(system.getActiveJokers().length).toBe(1)
    })

    it('4. addJoker 可叠加多个 Joker', () => {
      const system = new JokerSystem()
      system.addJoker(makeFlatMultJoker('J100', 1))
      system.addJoker(makeFlatBonusJoker('J101', 10))
      expect(system.getActiveJokers().length).toBe(2)
    })
  })

  describe('removeJoker', () => {
    it('5. removeJoker 按 ID 移除 Joker', () => {
      const system = new JokerSystem()
      const joker = makeFlatMultJoker('J100', 1)
      system.addJoker(joker)
      system.removeJoker('J100')
      expect(system.getActiveJokers()).not.toContain(joker)
      expect(system.getActiveJokers().length).toBe(0)
    })

    it('6. removeJoker 不存在的 ID 无副作用', () => {
      const system = new JokerSystem()
      const joker = makeFlatMultJoker('J100', 1)
      system.addJoker(joker)
      system.removeJoker('NONEXISTENT')
      expect(system.getActiveJokers().length).toBe(1)
    })
  })

  describe('clearJokers', () => {
    it('7. clearJokers 移除所有 Joker', () => {
      const system = new JokerSystem()
      system.addJoker(makeFlatMultJoker('J100', 1))
      system.addJoker(makeFlatBonusJoker('J101', 10))
      system.clearJokers()
      expect(system.getActiveJokers().length).toBe(0)
    })
  })

  describe('computeContext — 空 Joker 列表', () => {
    it('8. 无 Joker 时 context = { mult: 0, bonus: 0, boostFactor: 0, triggered: [] }', () => {
      const system = new JokerSystem()
      const hand = [makeCard(0, 0), makeCard(3, 0)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(0)
      expect(ctx.bonus).toBe(0)
      expect(ctx.boostFactor).toBe(0)
      expect(ctx.triggered).toEqual([])
    })
  })

  describe('computeContext — flat_mult Joker', () => {
    it('9. flat_mult Joker (+1 mult) 添加到 context', () => {
      const joker = makeFlatMultJoker('J100', 1)
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(3, 0)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(1)
      expect(ctx.triggered.length).toBe(1)
      expect(ctx.triggered[0].jokerId).toBe('J100')
      expect(ctx.triggered[0].jokerMult).toBe(1)
    })

    it('10. flat_mult Joker (+4 mult) 添加到 context', () => {
      const joker = makeFlatMultJoker('J100', 4)
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(3, 0)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(4)
    })
  })

  describe('computeContext — flat_bonus Joker', () => {
    it('11. flat_bonus Joker (+20 bonus) 添加到 context', () => {
      const joker = makeFlatBonusJoker('J100', 20)
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(3, 0)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.bonus).toBe(20)
      expect(ctx.triggered.length).toBe(1)
      expect(ctx.triggered[0].jokerId).toBe('J100')
      expect(ctx.triggered[0].jokerBonus).toBe(20)
    })

    it('12. flat_bonus Joker (+15 bonus) 添加到 context', () => {
      const joker = makeFlatBonusJoker('J100', 15)
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(3, 0)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.bonus).toBe(15)
    })
  })

  describe('computeContext — Joker 叠加', () => {
    it('13. 两张 Joker 叠加：mult 和 bonus 分别累加', () => {
      const multJoker = makeFlatMultJoker('J100', 2)
      const bonusJoker = makeFlatBonusJoker('J101', 15)
      const system = new JokerSystem([multJoker, bonusJoker])
      const hand = [makeCard(0, 0), makeCard(3, 0)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(2)
      expect(ctx.bonus).toBe(15)
      expect(ctx.triggered.length).toBe(2)
    })

    it('14. 三张 Joker 叠加：mult 累加正确', () => {
      const j1 = makeFlatMultJoker('J100', 1)
      const j2 = makeFlatMultJoker('J101', 1)
      const j3 = makeFlatMultJoker('J102', 2)
      const system = new JokerSystem([j1, j2, j3])
      const hand = [makeCard(0, 0), makeCard(3, 0)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(4)
      expect(ctx.triggered.length).toBe(3)
    })
  })

  describe('computeContext — SCORE_BOOST / mult_boost Joker', () => {
    it('15. mult_boost Joker (+0.5 boost) 添加到 boostFactor', () => {
      const joker = makeBoostJoker('J100', 0.5, ['高牌', '一对', '两对', '三条', '顺子'])
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(3, 0)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.boostFactor).toBe(0.5)
      expect(ctx.triggered.length).toBe(1)
      expect(ctx.triggered[0].jokerId).toBe('J100')
    })
  })

  describe('computeContext — HAND_LEVEL_MULT / hand_mult Joker', () => {
    it('16. hand_mult Joker 匹配手牌类型时激活', () => {
      // J009 顺子狂热：打出顺子时 +4 Mult
      const joker = makeHandMultJoker('J009', 4, ['顺子', '同花顺', '皇家同花顺'])
      const system = new JokerSystem([joker])
      // 顺子: 6-7-8-9-10
      const hand = [
        makeCard(4, 0), // 6♠
        makeCard(5, 1), // 7♥
        makeCard(6, 2), // 8♦
        makeCard(7, 3), // 9♣
        makeCard(8, 0), // 10♠
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('顺子')
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(4)
      expect(ctx.triggered.length).toBe(1)
    })

    it('17. hand_mult Joker 不匹配手牌类型时不激活', () => {
      // J009 顺子狂热：打出顺子时 +4 Mult（但手牌是一对）
      const joker = makeHandMultJoker('J009', 4, ['顺子', '同花顺', '皇家同花顺'])
      const system = new JokerSystem([joker])
      const hand = [
        makeCard(11, 0), // K♠
        makeCard(11, 1), // K♥
        makeCard(1, 2),  // 3♦
        makeCard(5, 3),  // 7♣
        makeCard(7, 0),  // 9♠
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('一对')
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(0)
      expect(ctx.triggered.length).toBe(0)
    })

    it('18. mult_boost Joker 匹配手牌类型时添加 boostFactor', () => {
      // J022 双重惊喜：打出对子系手牌时 boostFactor +0.5
      const joker = makeBoostJoker('J022', 0.5, ['两对', '三条', '葫芦', '四条', '顺子', '同花', '同花顺', '皇家同花顺'])
      const system = new JokerSystem([joker])
      const hand = [
        makeCard(4, 0), // 6♠
        makeCard(5, 1), // 7♥
        makeCard(6, 2), // 8♦
        makeCard(7, 3), // 9♣
        makeCard(8, 0), // 10♠
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('顺子')
      const ctx = system.computeContext(result)
      expect(ctx.boostFactor).toBe(0.5)
    })

    it('19. mult_boost Joker 不匹配手牌类型时不添加 boostFactor', () => {
      // Joker 的 hands 不包含 '一对'，当手牌是一对时 boostFactor 不应添加
      const joker = makeBoostJoker('J022', 0.5, ['两对', '三条', '葫芦', '四条', '顺子', '同花', '同花顺', '皇家同花顺'])
      const system = new JokerSystem([joker])
      // 一对 K
      const hand = [
        makeCard(11, 0), // K♠
        makeCard(11, 1), // K♥
        makeCard(1, 2),  // 3♦
        makeCard(5, 3),  // 7♣
        makeCard(7, 0),  // 9♠
      ]
      const result = evaluator.evaluate(hand)
      expect(result.type.name).toBe('一对')
      const ctx = system.computeContext(result)
      expect(ctx.boostFactor).toBe(0)
    })
  })

  describe('triggerScoring', () => {
    it('20. triggerScoring 返回 context 和 triggered', () => {
      const joker = makeFlatMultJoker('J100', 2)
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(3, 0)]
      const result = evaluator.evaluate(hand)
      const { context, triggered } = system.triggerScoring(result)
      expect(context.mult).toBe(2)
      expect(triggered.length).toBe(1)
      expect(triggered[0].jokerId).toBe('J100')
    })

    it('21. triggerScoring 接受可选 context 参数', () => {
      const joker = makeFlatMultJoker('J100', 3)
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(3, 0)]
      const result = evaluator.evaluate(hand)
      const { context } = system.triggerScoring(result, { isLastHand: true })
      expect(context.mult).toBe(3)
    })
  })

  describe('triggerPostScoring — 尚未实现的效果类型', () => {
    it('22. DRAW Joker 未实现时返回 { extraDraw: 0, extraDiscard: 0 }', () => {
      const joker: Joker = {
        id: 'J_TEST',
        name: 'Test Draw',
        rarity: 'UNCOMMON',
        price: 5,
        desc: '',
        effect: { type: 'draw' as any, value: 2 },
      }
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(3, 0)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      const post = system.triggerPostScoring(result, ctx)
      expect(post.extraDraw).toBe(0)
      expect(post.extraDiscard).toBe(0)
    })
  })

  describe('triggerMoneyEarned — 尚未实现的效果类型', () => {
    it('23. MONEY Joker 未实现时返回 { bonus: 0, newTotal: currentMoney }', () => {
      const joker: Joker = {
        id: 'J_TEST',
        name: 'Test Money',
        rarity: 'UNCOMMON',
        price: 5,
        desc: '',
        effect: { type: 'money_mult' as any, value: 2 },
      }
      const system = new JokerSystem([joker])
      const result = system.triggerMoneyEarned(100)
      expect(result.bonus).toBe(0)
      expect(result.newTotal).toBe(100)
    })
  })
})
