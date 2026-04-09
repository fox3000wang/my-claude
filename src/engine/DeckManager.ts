import { Card, createCard, SUITS, RANKS } from '../types/card'

/**
 * 牌堆管理器
 *
 * 迁移自 tests/game.test.js 的 class DeckManager。
 * 属性名统一为：deck / hand / discardPile
 */
export class DeckManager {
  deck: Card[] = []
  hand: Card[] = []
  discardPile: Card[] = []

  constructor() {
    this.deck = []
    this.hand = []
    this.discardPile = []
  }

  /**
   * 生成52张牌（4种花色 × 13种面值）
   */
  createDeck(): void {
    this.deck = []
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.deck.push(createCard(suit, rank))
      }
    }
  }

  /**
   * Fisher-Yates 洗牌（原地洗牌）
   */
  shuffle(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]
    }
  }

  /**
   * 发 n 张牌（从牌堆移到手牌）
   * 如果牌堆不足，返回全部剩余牌
   */
  draw(n: number): Card[] {
    const drawn = this.deck.splice(0, n)
    this.hand.push(...drawn)
    return drawn
  }

  /**
   * 弃置指定手牌（从手牌移到弃牌堆）
   * 只弃置实际在手牌中的牌
   */
  discardCards(cards: Card[]): void {
    const toDiscard = cards.filter(c => this.hand.includes(c))
    this.hand = this.hand.filter(c => !toDiscard.includes(c))
    this.discardPile.push(...toDiscard)
  }

  /**
   * 重洗：将弃牌堆移回牌堆并洗牌，同时清空手牌
   */
  reshuffle(): void {
    this.deck.push(...this.discardPile)
    this.discardPile = []
    this.hand = []
    this.shuffle()
  }

  /**
   * 完整重置：将弃牌堆和手牌全部移回牌堆，洗牌，清空所有状态
   *
   * 调用此方法后 deck 恢复至 52 张，hand 和 discardPile 均为空。
   * 这是游戏流程中"重新洗牌"的标准操作（弃牌堆+手牌全部归位）。
   */
  reset(): void {
    this.deck.push(...this.discardPile, ...this.hand)
    this.discardPile = []
    this.hand = []
    this.shuffle()
  }
}
