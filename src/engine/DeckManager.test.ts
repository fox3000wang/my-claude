import '@testing-library/jest-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { DeckManager } from './DeckManager'
import { SUITS, RANKS } from '../types/card'

describe('DeckManager', () => {
  let dm: DeckManager

  beforeEach(() => {
    dm = new DeckManager()
  })

  describe('createDeck()', () => {
    it('生成52张牌', () => {
      dm.createDeck()
      expect(dm.deck.length).toBe(52)
    })

    it('52张牌不重复（id唯一）', () => {
      dm.createDeck()
      const ids = dm.deck.map(c => c.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(52)
    })

    it('包含所有4种花色 × 13种面值', () => {
      dm.createDeck()
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          const card = dm.deck.find(c => c.suit === suit && c.rank === rank)
          expect(card).toBeDefined()
          expect(card!.id).toBe(`${rank}${suit}`)
        }
      }
    })

    it('手牌和弃牌堆初始为空', () => {
      dm.createDeck()
      expect(dm.hand.length).toBe(0)
      expect(dm.discardPile.length).toBe(0)
    })
  })

  describe('shuffle()', () => {
    it('洗牌后牌堆长度不变', () => {
      dm.createDeck()
      const before = dm.deck.length
      dm.shuffle()
      expect(dm.deck.length).toBe(before)
    })

    it('洗牌后仍是52张不同的牌', () => {
      dm.createDeck()
      dm.shuffle()
      const ids = dm.deck.map(c => c.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(52)
    })

    it('洗牌后deck引用不变（不是返回新数组）', () => {
      dm.createDeck()
      const before = dm.deck
      dm.shuffle()
      expect(dm.deck).toBe(before)
    })
  })

  describe('draw(n)', () => {
    it('发牌从牌堆移到手牌', () => {
      dm.createDeck()
      dm.shuffle()
      dm.draw(5)
      expect(dm.hand.length).toBe(5)
      expect(dm.deck.length).toBe(47)
    })

    it('draw 返回所发的牌', () => {
      dm.createDeck()
      dm.shuffle()
      const drawn = dm.draw(3)
      expect(drawn.length).toBe(3)
      expect(dm.hand.length).toBe(3)
    })

    it('连续发牌累积到手牌', () => {
      dm.createDeck()
      dm.draw(5)
      expect(dm.hand.length).toBe(5)
      dm.draw(3)
      expect(dm.hand.length).toBe(8)
      expect(dm.deck.length).toBe(44)
    })

    it('牌堆不足时发完全部剩余牌', () => {
      dm.createDeck()
      dm.draw(50) // 剩2张
      expect(dm.hand.length).toBe(50)
      expect(dm.deck.length).toBe(2)
      const remaining = dm.draw(5) // 试图发5张，但只剩2张
      expect(remaining.length).toBe(2)
      expect(dm.hand.length).toBe(52)
      expect(dm.deck.length).toBe(0)
    })

    it('牌堆为空时发牌返回空', () => {
      dm.createDeck()
      dm.draw(52)
      expect(dm.hand.length).toBe(52)
      expect(dm.deck.length).toBe(0)
      const more = dm.draw(1)
      expect(more.length).toBe(0)
      expect(dm.hand.length).toBe(52)
    })

    it('发牌数为0时无变化', () => {
      dm.createDeck()
      dm.draw(0)
      expect(dm.hand.length).toBe(0)
      expect(dm.deck.length).toBe(52)
    })
  })

  describe('discardCards(cards)', () => {
    it('弃牌从手牌移到弃牌堆', () => {
      dm.createDeck()
      dm.draw(5)
      const cardToDiscard = dm.hand[0]
      const cardToDiscard2 = dm.hand[1]
      dm.discardCards([cardToDiscard])
      expect(dm.hand.length).toBe(4)
      expect(dm.discardPile.length).toBe(1)
      expect(dm.discardPile).toContain(cardToDiscard)
      expect(dm.hand).not.toContain(cardToDiscard)
    })

    it('弃多张牌', () => {
      dm.createDeck()
      dm.draw(5)
      const [a, b, c] = dm.hand
      dm.discardCards([a, b, c])
      expect(dm.hand.length).toBe(2)
      expect(dm.discardPile.length).toBe(3)
    })

    it('弃牌只影响指定牌，不影响其他手牌', () => {
      dm.createDeck()
      dm.draw(5)
      const [a, b, c, d, e] = dm.hand
      dm.discardCards([b, d])
      expect(dm.hand).toContain(a)
      expect(dm.hand).toContain(c)
      expect(dm.hand).toContain(e)
      expect(dm.hand).not.toContain(b)
      expect(dm.hand).not.toContain(d)
    })

    it('弃牌列表中有不在手牌的牌时忽略', () => {
      dm.createDeck()
      dm.draw(5)
      const outside = dm.deck[0]
      dm.discardCards([outside])
      expect(dm.hand.length).toBe(5)
      expect(dm.discardPile.length).toBe(0)
    })

    it('弃空列表无变化', () => {
      dm.createDeck()
      dm.draw(5)
      dm.discardCards([])
      expect(dm.hand.length).toBe(5)
      expect(dm.discardPile.length).toBe(0)
    })
  })

  describe('reshuffle()', () => {
    it('重洗将弃牌堆移回牌堆', () => {
      dm.createDeck()
      dm.draw(5)
      dm.discardCards(dm.hand.slice(0, 2))
      expect(dm.deck.length).toBe(47)
      expect(dm.discardPile.length).toBe(2)
      dm.reshuffle()
      expect(dm.discardPile.length).toBe(0)
      expect(dm.deck.length).toBe(49)
    })

    it('重洗后手牌清空', () => {
      dm.createDeck()
      dm.draw(5)
      dm.reshuffle()
      expect(dm.hand.length).toBe(0)
    })

    it('重洗后弃牌堆清空', () => {
      dm.createDeck()
      dm.draw(5)
      dm.discardCards(dm.hand)
      dm.reshuffle()
      expect(dm.discardPile.length).toBe(0)
    })

    it('弃牌堆为空时重洗仅清空手牌', () => {
      dm.createDeck()
      dm.draw(5)
      expect(dm.discardPile.length).toBe(0)
      dm.reshuffle()
      expect(dm.deck.length).toBe(47) // 弃牌堆为空，手牌不归位
      expect(dm.hand.length).toBe(0)
      expect(dm.discardPile.length).toBe(0)
    })
  })

  describe('reset() — 完整重置', () => {
    it('重置将手牌和弃牌堆全部移回牌堆，deck恢复52张', () => {
      dm.createDeck()
      dm.draw(5)
      dm.discardCards(dm.hand.slice(0, 3))
      expect(dm.hand.length).toBe(2)
      expect(dm.discardPile.length).toBe(3)
      expect(dm.deck.length).toBe(47)
      dm.reset()
      expect(dm.deck.length).toBe(52)
      expect(dm.hand.length).toBe(0)
      expect(dm.discardPile.length).toBe(0)
    })

    it('弃牌堆为空时reset恢复52张，手牌清空', () => {
      dm.createDeck()
      dm.draw(5)
      expect(dm.discardPile.length).toBe(0)
      dm.reset()
      expect(dm.deck.length).toBe(52)
      expect(dm.hand.length).toBe(0)
      expect(dm.discardPile.length).toBe(0)
    })
  })

  describe('完整流程', () => {
    it('createDeck → shuffle → draw → discard → reshuffle → draw', () => {
      dm.createDeck()
      expect(dm.deck.length).toBe(52)
      expect(dm.hand.length).toBe(0)
      expect(dm.discardPile.length).toBe(0)

      dm.shuffle()
      expect(dm.deck.length).toBe(52)

      dm.draw(5)
      expect(dm.hand.length).toBe(5)
      expect(dm.deck.length).toBe(47)

      dm.discardCards(dm.hand.slice(0, 2))
      expect(dm.hand.length).toBe(3)
      expect(dm.discardPile.length).toBe(2)

      dm.reset()
      expect(dm.hand.length).toBe(0)
      expect(dm.discardPile.length).toBe(0)
      expect(dm.deck.length).toBe(52)

      dm.draw(5)
      expect(dm.hand.length).toBe(5)
      expect(dm.deck.length).toBe(47)
    })
  })
})
