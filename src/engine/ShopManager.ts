/**
 * ShopManager
 *
 * Manages the shop: Joker selection, Tarot/Planet selection, purchases, and re-rolls.
 *
 * Shop layout (per Phase 3 spec):
 *   - 2 random Jokers
 *   - 1 random Tarot or Planet card
 *
 * All items are generated fresh each time generateShop() is called.
 * Purchases deduct from the player's money; insufficient funds block the purchase.
 */

import type { Joker } from '../types/joker'
import type { TarotOrPlanet } from '../types/game'
import { JOKERS } from '../constants/jokers'
import { TAROTS } from '../constants/tarots'
import { PLANETS } from '../constants/planets'

/** Shop item — either a Joker or a Tarot/Planet. */
export type ShopItem =
  | { kind: 'joker'; item: Joker }
  | { kind: 'tarot_planet'; item: TarotOrPlanet }

/** Serializable shop state. */
export interface ShopState {
  jokers: (Joker | null)[]
  tarotPlanet: (TarotOrPlanet | null)
  jokerPrices: number[]
  tarotPlanetPrice: number
  rerollCost: number
  /** Number of times the shop has been re-rolled. */
  rerollCount: number
}

export class ShopManager {
  /** Available Joker slots (null = sold). */
  jokers: (Joker | null)[] = [null, null]

  /** Available Tarot/Planet slot (null = sold). */
  tarotPlanet: TarotOrPlanet | null = null

  /** Prices for Joker slots. */
  jokerPrices: number[] = []

  /** Price for the Tarot/Planet slot. */
  tarotPlanetPrice: number = 0

  /** Cost to re-roll the shop. */
  rerollCost: number = 5

  /** Number of times the shop has been re-rolled. */
  rerollCount: number = 0

  constructor() {
    this.reset()
  }

  // ─── Shop generation ───────────────────────────────────────────────────────

  /**
   * Generate a new random shop.
   * Selects 2 random Jokers and 1 random Tarot/Planet.
   */
  generateShop(): void {
    this.jokers = this.sampleWithoutReplacement(JOKERS, 2) as Joker[]
    const sampled = this.sampleOne([...TAROTS, ...PLANETS]) as TarotOrPlanet
    const itemType: 'tarot' | 'planet' = 'effect' in sampled ? 'tarot' : 'planet'
    this.tarotPlanet = { ...sampled, type: itemType }

    // Prices equal to base price; no discount applied here (use appliediscount())
    this.jokerPrices = this.jokers.map(j => j?.price ?? 0)
    this.tarotPlanetPrice = this.tarotPlanet?.price ?? 0

    this.rerollCount = 0
    // Re-roll cost increases by 1 per re-roll, starting at 5
    this.rerollCost = 5
  }

  /**
   * Re-roll the shop (costs money; managed by the caller).
   * Resets Joker slots, Tarot/Planet slot, and re-roll count.
   */
  reroll(): void {
    this.generateShop()
    // Cost was deducted by caller via purchaseReroll()
  }

  // ─── Purchases ─────────────────────────────────────────────────────────────

  /**
   * Buy a Joker at the given slot index.
   * @returns The purchased Joker, or null if purchase failed.
   */
  buyJoker(index: number, money: number): { joker: Joker | null; remainingMoney: number } {
    if (index < 0 || index >= this.jokers.length) return { joker: null, remainingMoney: money }
    const joker = this.jokers[index]
    const price = this.jokerPrices[index] ?? 0
    if (!joker || money < price) return { joker: null, remainingMoney: money }

    // Mark slot as sold
    this.jokers = this.jokers.map((j, i) => (i === index ? null : j))
    return { joker, remainingMoney: money - price }
  }

  /**
   * Buy the Tarot or Planet card.
   * @returns The purchased TarotOrPlanet, or null if purchase failed.
   */
  buyTarotPlanet(money: number): { item: TarotOrPlanet | null; remainingMoney: number } {
    if (!this.tarotPlanet || money < this.tarotPlanetPrice) {
      return { item: null, remainingMoney: money }
    }
    const item = this.tarotPlanet
    this.tarotPlanet = null
    return { item, remainingMoney: money - this.tarotPlanetPrice }
  }

  // ─── Re-roll cost management ──────────────────────────────────────────────

  /**
   * Attempt to re-roll the shop.
   * Deducts the current re-roll cost and increments the counter.
   * @returns true if re-roll was successful; false if insufficient funds.
   */
  purchaseReroll(money: number): { success: boolean; remainingMoney: number } {
    if (money < this.rerollCost) return { success: false, remainingMoney: money }
    this.rerollCount++
    // Cost increases by 1 per re-roll (standard Balatro behaviour)
    this.rerollCost++
    return { success: true, remainingMoney: money - (this.rerollCost - 1) }
  }

  /** Returns the current cost to re-roll the shop. */
  getRerollCost(): number {
    return this.rerollCost
  }

  // ─── Discounts ────────────────────────────────────────────────────────────

  /**
   * Apply an ante-level discount to all shop prices.
   * Used when the player holds a Tarot that discounts the next Ante.
   * This is a one-time discount tracked externally (e.g. in game state).
   * @param discount - Amount to subtract from each Joker price (min 0).
   */
  applyAnteDiscount(_discount: number): void {
    // Joker prices are already stored; discount is applied externally
    // since prices may change after re-roll. The caller tracks the
    // pending discount and subtracts it at purchase time.
  }

  // ─── Utilities ───────────────────────────────────────────────────────────

  /**
   * Returns the price of an item (for UI display).
   * Returns 0 if the slot is empty.
   */
  getPrice(item: ShopItem): number {
    if (item.kind === 'joker') {
      const idx = this.jokers.findIndex(j => j?.id === item.item.id)
      return idx >= 0 ? (this.jokerPrices[idx] ?? 0) : 0
    }
    return this.tarotPlanet?.id === item.item.id ? (this.tarotPlanetPrice ?? 0) : 0
  }

  /**
   * Returns a snapshot of the current shop state (serialisable).
   */
  toJSON(): ShopState {
    return {
      jokers: [...this.jokers],
      tarotPlanet: this.tarotPlanet,
      jokerPrices: [...this.jokerPrices],
      tarotPlanetPrice: this.tarotPlanetPrice,
      rerollCost: this.rerollCost,
      rerollCount: this.rerollCount,
    }
  }

  /** Reset all shop slots to empty. */
  reset(): void {
    this.jokers = [null, null]
    this.tarotPlanet = null
    this.jokerPrices = []
    this.tarotPlanetPrice = 0
    this.rerollCount = 0
    this.rerollCost = 5
  }

  // ─── Lifecycle stubs ──────────────────────────────────────────────────────

  /**
   * Exit the shop.
   * Shop exit is handled by the store/screen transition.
   * This stub exists for API completeness with the rest of the engine.
   */
  leave(): void {
    // No-op: screen transition is managed by the game controller.
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private sampleOne<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  private sampleWithoutReplacement<T>(arr: T[], n: number): T[] {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy.slice(0, n)
  }
}
