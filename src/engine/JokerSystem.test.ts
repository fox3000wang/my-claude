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
        effect: { type: 'draw', value: 2 },
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
        effect: { type: 'money_mult', value: 2 },
      }
      const system = new JokerSystem([joker])
      const result = system.triggerMoneyEarned(100)
      expect(result.bonus).toBe(0)
      expect(result.newTotal).toBe(100)
    })
  })

  describe('computeContext — count_mult Joker (每 N 张指定花色 +M Mult)', () => {
    it('24. count_mult Joker: 3 张指定花色牌时获得 1 组奖励', () => {
      // per=3, mult_per=4: 3张→1组→4 mult
      const joker: Joker = {
        id: 'J_CNT_MULT',
        name: 'Test Count Mult',
        rarity: 'UNCOMMON',
        price: 5,
        desc: '',
        effect: { type: 'count_mult', suit: '♠', per: 3, mult_per: 4 },
      }
      const system = new JokerSystem([joker])
      // 3 张黑桃
      const hand = [makeCard(0, 0), makeCard(3, 0), makeCard(6, 0)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(4)
      expect(ctx.triggered.length).toBe(1)
    })

    it('25. count_mult Joker: 4 张指定花色牌时仍只有 1 组奖励', () => {
      // per=3, mult_per=4: floor(4/3)=1→4 mult（第4张不成组）
      const joker: Joker = {
        id: 'J_CNT_MULT',
        name: 'Test Count Mult',
        rarity: 'UNCOMMON',
        price: 5,
        desc: '',
        effect: { type: 'count_mult', suit: '♠', per: 3, mult_per: 4 },
      }
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(3, 0), makeCard(6, 0), makeCard(9, 0)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(4)
    })

    it('26. count_mult Joker: 6 张指定花色牌时获得 2 组奖励', () => {
      // per=3, mult_per=4: floor(6/3)=2→8 mult
      const joker: Joker = {
        id: 'J_CNT_MULT',
        name: 'Test Count Mult',
        rarity: 'UNCOMMON',
        price: 5,
        desc: '',
        effect: { type: 'count_mult', suit: '♠', per: 3, mult_per: 4 },
      }
      const system = new JokerSystem([joker])
      const hand = [
        makeCard(0, 0), makeCard(3, 0), makeCard(6, 0),
        makeCard(9, 0), makeCard(12, 0), makeCard(1, 0),
      ]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(8)
    })

    it('27. count_mult Joker: 花色牌不足时不触发', () => {
      // 只有 2 张黑桃，per=3，不触发
      const joker: Joker = {
        id: 'J_CNT_MULT',
        name: 'Test Count Mult',
        rarity: 'UNCOMMON',
        price: 5,
        desc: '',
        effect: { type: 'count_mult', suit: '♠', per: 3, mult_per: 4 },
      }
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(3, 0)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(0)
      expect(ctx.triggered.length).toBe(0)
    })
  })

  describe('computeContext — count_bonus Joker (每 N 张指定花色 +M Bonus)', () => {
    it('28. count_bonus Joker: 3 张指定花色牌时获得 1 组奖励', () => {
      // per=3, bonus_per=20: 3张→1组→20 bonus
      const joker: Joker = {
        id: 'J_CNT_BONUS',
        name: 'Test Count Bonus',
        rarity: 'COMMON',
        price: 4,
        desc: '',
        effect: { type: 'count_bonus', suit: '♥', per: 3, bonus_per: 20 },
      }
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 1), makeCard(3, 1), makeCard(6, 1)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.bonus).toBe(20)
      expect(ctx.triggered.length).toBe(1)
    })

    it('29. count_bonus Joker: 6 张指定花色牌时获得 2 组奖励', () => {
      // per=3, bonus_per=20: floor(6/3)=2→40 bonus
      const joker: Joker = {
        id: 'J_CNT_BONUS',
        name: 'Test Count Bonus',
        rarity: 'COMMON',
        price: 4,
        desc: '',
        effect: { type: 'count_bonus', suit: '♥', per: 3, bonus_per: 20 },
      }
      const system = new JokerSystem([joker])
      const hand = [
        makeCard(0, 1), makeCard(3, 1), makeCard(6, 1),
        makeCard(9, 1), makeCard(12, 1), makeCard(1, 1),
      ]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.bonus).toBe(40)
    })
  })

  describe('computeContext — value_mult Joker (手牌含有指定面值时 +N Mult)', () => {
    it('30. value_mult Joker: 手牌包含指定面值时触发', () => {
      // Joker 寻找 A(14)，手牌有 3 张 A
      const joker: Joker = {
        id: 'J_VAL_MULT',
        name: 'Test Value Mult',
        rarity: 'UNCOMMON',
        price: 5,
        desc: '',
        effect: { type: 'value_mult', values: [14], mult: 2 },
      }
      const system = new JokerSystem([joker])
      const hand = [
        makeCard(12, 0), // A♠
        makeCard(12, 1), // A♥
        makeCard(12, 2), // A♦
      ]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(2)
      expect(ctx.triggered.length).toBe(1)
    })

    it('31. value_mult Joker: 手牌不包含指定面值时不触发', () => {
      const joker: Joker = {
        id: 'J_VAL_MULT',
        name: 'Test Value Mult',
        rarity: 'UNCOMMON',
        price: 5,
        desc: '',
        effect: { type: 'value_mult', values: [14], mult: 2 },
      }
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(1, 1), makeCard(2, 2)] // 2,3,4 无 A
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(0)
      expect(ctx.triggered.length).toBe(0)
    })
  })

  describe('computeContext — even_mult Joker (全部为偶数牌时 +N Mult)', () => {
    it('32. even_mult Joker: 手牌全部为偶数面值时触发', () => {
      // 面值: 2=2, 4=4, 6=6, 8=8, 10=10, Q=12 — 全部偶数
      const joker: Joker = {
        id: 'J_EVEN_MULT',
        name: 'Test Even Mult',
        rarity: 'COMMON',
        price: 4,
        desc: '',
        effect: { type: 'even_mult', mult: 3 },
      }
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(2, 1), makeCard(4, 2), makeCard(6, 3)]
      const result = evaluator.evaluate(hand)
      // 偶数面值: 2,4,6,8 (非连续，故高牌，但 Joker 仍触发)
      expect(result.type.name).toBe('高牌')
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(3)
      expect(ctx.triggered.length).toBe(1)
    })

    it('33. even_mult Joker: 手牌包含奇数面值时不触发', () => {
      const joker: Joker = {
        id: 'J_EVEN_MULT',
        name: 'Test Even Mult',
        rarity: 'COMMON',
        price: 4,
        desc: '',
        effect: { type: 'even_mult', mult: 3 },
      }
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(2, 1), makeCard(4, 2), makeCard(5, 3)] // 含 7(奇数)
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(0)
      expect(ctx.triggered.length).toBe(0)
    })
  })

  describe('computeContext — odd_bonus Joker (全部为奇数牌时 +N Bonus)', () => {
    it('34. odd_bonus Joker: 手牌全部为奇数面值时触发', () => {
      // 面值: 3=3, 5=5, 7=7, 9=9, J=11, K=13 — 全部奇数
      const joker: Joker = {
        id: 'J_ODD_BONUS',
        name: 'Test Odd Bonus',
        rarity: 'COMMON',
        price: 4,
        desc: '',
        effect: { type: 'odd_bonus', bonus: 15 },
      }
      const system = new JokerSystem([joker])
      const hand = [makeCard(1, 0), makeCard(3, 1), makeCard(5, 2), makeCard(7, 3)]
      const result = evaluator.evaluate(hand)
      // 奇数面值: 3,5,7,9 (非连续，故高牌，但 Joker 仍触发)
      expect(result.type.name).toBe('高牌')
      const ctx = system.computeContext(result)
      expect(ctx.bonus).toBe(15)
      expect(ctx.triggered.length).toBe(1)
    })

    it('35. odd_bonus Joker: 手牌包含偶数面值时不触发', () => {
      const joker: Joker = {
        id: 'J_ODD_BONUS',
        name: 'Test Odd Bonus',
        rarity: 'COMMON',
        price: 4,
        desc: '',
        effect: { type: 'odd_bonus', bonus: 15 },
      }
      const system = new JokerSystem([joker])
      const hand = [makeCard(1, 0), makeCard(3, 1), makeCard(4, 2), makeCard(7, 3)] // 含 6(偶数)
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.bonus).toBe(0)
      expect(ctx.triggered.length).toBe(0)
    })
  })

  describe('computeContext — suit_diverse_mult Joker (花色种类 >= N 时 +N Mult)', () => {
    it('36. suit_diverse_mult Joker: 3 种不同花色时 mult = 3 × mult_per', () => {
      // count=2, mult_per=1: 3种花色→3×1=3 mult
      const joker: Joker = {
        id: 'J_SUIT_DIV',
        name: 'Test Suit Diverse',
        rarity: 'UNCOMMON',
        price: 5,
        desc: '',
        effect: { type: 'suit_diverse_mult', count: 2, mult: 3 },
      }
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(1, 1), makeCard(2, 2)] // 3种花色
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(3)
      expect(ctx.triggered.length).toBe(1)
    })

    it('37. suit_diverse_mult Joker: 4 种不同花色时 mult = mult_per（触发时加一次）', () => {
      // count=2, mult=3: 满足条件后加一次 mult，非 suitCount × mult
      const joker: Joker = {
        id: 'J_SUIT_DIV',
        name: 'Test Suit Diverse',
        rarity: 'UNCOMMON',
        price: 5,
        desc: '',
        effect: { type: 'suit_diverse_mult', count: 2, mult: 3 },
      }
      const system = new JokerSystem([joker])
      const hand = [
        makeCard(0, 0), makeCard(1, 1), makeCard(2, 2), makeCard(3, 3),
      ] // 4种花色
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(3)
    })

    it('38. suit_diverse_mult Joker: 花色种类不足时不触发', () => {
      // 只有 2 种花色，count=3，不触发
      const joker: Joker = {
        id: 'J_SUIT_DIV',
        name: 'Test Suit Diverse',
        rarity: 'UNCOMMON',
        price: 5,
        desc: '',
        effect: { type: 'suit_diverse_mult', count: 3, mult: 3 },
      }
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(1, 0), makeCard(2, 1)] // 只有 2 种花色
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result)
      expect(ctx.mult).toBe(0)
      expect(ctx.triggered.length).toBe(0)
    })
  })

  describe('computeContext — last_hand_mult Joker (最后一手时 +N Mult)', () => {
    it('39. last_hand_mult Joker: isLastHand=true 时触发', () => {
      const joker: Joker = {
        id: 'J_LAST_HAND',
        name: 'Test Last Hand',
        rarity: 'RARE',
        price: 8,
        desc: '',
        effect: { type: 'last_hand_mult', mult: 5 },
      }
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(3, 1)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result, { isLastHand: true })
      expect(ctx.mult).toBe(5)
      expect(ctx.triggered.length).toBe(1)
    })

    it('40. last_hand_mult Joker: isLastHand=false 时不触发', () => {
      const joker: Joker = {
        id: 'J_LAST_HAND',
        name: 'Test Last Hand',
        rarity: 'RARE',
        price: 8,
        desc: '',
        effect: { type: 'last_hand_mult', mult: 5 },
      }
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(3, 1)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result, { isLastHand: false })
      expect(ctx.mult).toBe(0)
      expect(ctx.triggered.length).toBe(0)
    })
  })

  describe('computeContext — score_mult Joker (基础分数超过阈值时 +N Mult)', () => {
    it('41. score_mult Joker: 基础分数超过阈值时触发', () => {
      const joker: Joker = {
        id: 'J_SCORE_MULT',
        name: 'Test Score Mult',
        rarity: 'UNCOMMON',
        price: 6,
        desc: '',
        effect: { type: 'score_mult', threshold: 100, mult: 4 },
      }
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(3, 1)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result, { baseScore: 150 })
      expect(ctx.mult).toBe(4)
      expect(ctx.triggered.length).toBe(1)
    })

    it('42. score_mult Joker: 基础分数未超过阈值时不触发', () => {
      const joker: Joker = {
        id: 'J_SCORE_MULT',
        name: 'Test Score Mult',
        rarity: 'UNCOMMON',
        price: 6,
        desc: '',
        effect: { type: 'score_mult', threshold: 100, mult: 4 },
      }
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(3, 1)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result, { baseScore: 80 })
      expect(ctx.mult).toBe(0)
      expect(ctx.triggered.length).toBe(0)
    })

    it('43. score_mult Joker: 基础分数等于阈值时不触发（需 > 阈值）', () => {
      const joker: Joker = {
        id: 'J_SCORE_MULT',
        name: 'Test Score Mult',
        rarity: 'UNCOMMON',
        price: 6,
        desc: '',
        effect: { type: 'score_mult', threshold: 100, mult: 4 },
      }
      const system = new JokerSystem([joker])
      const hand = [makeCard(0, 0), makeCard(3, 1)]
      const result = evaluator.evaluate(hand)
      const ctx = system.computeContext(result, { baseScore: 100 })
      expect(ctx.mult).toBe(0)
    })
  })

  describe('addJoker — 不可变模式验证', () => {
    it('44. addJoker 不修改原 Joker 数组', () => {
      const system = new JokerSystem()
      const jokersBefore = system.getActiveJokers()
      system.addJoker(makeFlatMultJoker('J100', 1))
      const jokersAfter = system.getActiveJokers()
      expect(jokersBefore.length).toBe(0)
      expect(jokersAfter.length).toBe(1)
    })
  })
})
