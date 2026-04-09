/**
 * TarotSystem
 *
 * Manages Tarot and Planet card effects.
 *
 * - Planet effects: permanent upgrades to hand type base scores.
 * - Tarot effects: temporary round modifiers (bonus doubling, flat bonuses, etc.)
 *   and pending selections that require player input.
 *
 * All state updates are immutable — applyTarot/applyPlanet return new
 * state objects rather than mutating the input.
 */

import { TarotEffect, TarotOrPlanet } from '../types/game'

/**
 * Pending selection that requires player input.
 * Stored in the game state while awaiting a choice.
 */
export type PendingSelection =
  | { type: 'choose_hand_type' }
  | { type: 'upgrade_card' }
  | { type: 'reroll_suit' }
  | { type: 'add_value' }
  | { type: 'double_value' }

/**
 * Temporary round modifiers applied by Tarot cards.
 * All fields default to false/0 and are cleared at the start of each round.
 */
export interface RoundModifiers {
  /** Whether Bonus score is doubled this round. */
  bonusDouble: boolean
  /** Whether each played card adds +1 Mult. */
  multPerCard: boolean
  /** Whether this hand does not consume a hand limit. */
  freeHand: boolean
  /** Discount to apply to the next Ante's shop prices. */
  nextAnteDiscount: number
  /** Pending selection awaiting player input. */
  pending: PendingSelection | null
}

/** Serializable TarotSystem state. */
export interface TarotState {
  /** Permanent hand type upgrades from Planet cards: handTypeKey → bonus added. */
  handTypeUpgrades: Record<string, number>
  /** Temporary round modifiers from Tarot cards. */
  roundModifiers: RoundModifiers
}

// ─── Default values ─────────────────────────────────────────────────────────

export const DEFAULT_ROUND_MODIFIERS: RoundModifiers = Object.freeze({
  bonusDouble: false,
  multPerCard: false,
  freeHand: false,
  nextAnteDiscount: 0,
  pending: null,
})

// ─── TarotSystem class ─────────────────────────────────────────────────────

export class TarotSystem {
  /** Permanent hand type upgrades from Planet cards. handType → extra bonus. */
  private handTypeUpgrades: Record<string, number> = {}

  /** Temporary round modifiers from Tarot cards. */
  roundModifiers: RoundModifiers = { ...DEFAULT_ROUND_MODIFIERS }

  constructor(state?: Partial<TarotState>) {
    if (state?.handTypeUpgrades) {
      this.handTypeUpgrades = { ...state.handTypeUpgrades }
    }
    if (state?.roundModifiers) {
      this.roundModifiers = { ...state.roundModifiers }
    }
  }

  // ─── Planet effects (permanent) ───────────────────────────────────────────

  /**
   * Apply a Planet card effect — permanently upgrade a hand type.
   *
   * Planets add their bonus to the base score of the specified hand type.
   * This bonus is permanent and persists across rounds.
   *
   * @returns A new TarotState with the upgrade applied (immutable).
   */
  applyPlanet(planet: TarotOrPlanet): TarotState {
    if (planet.type !== 'planet') return this.toState()
    const key = planet.handType ?? ''
    const bonus = planet.bonus ?? 0

    const upgrades = { ...this.handTypeUpgrades }
    upgrades[key] = (upgrades[key] ?? 0) + bonus

    return {
      handTypeUpgrades: upgrades,
      roundModifiers: { ...this.roundModifiers },
    }
  }

  /**
   * Returns the total bonus for a given hand type (sum of all Planet upgrades).
   */
  getHandTypeBonus(handType: string): number {
    return this.handTypeUpgrades[handType] ?? 0
  }

  /**
   * Get all active hand type upgrades.
   * Returns a copy to preserve immutability.
   */
  getUpgrades(): Record<string, number> {
    return { ...this.handTypeUpgrades }
  }

  // ─── Tarot effects (temporary) ───────────────────────────────────────────

  /**
   * Apply a Tarot card effect and return a new TarotState.
   *
   * Most effects are immediately applied to roundModifiers.
   * Effects that require player input (choose_hand_type, upgrade_card,
   * reroll_suit, add_value, double_value) set the pending field instead.
   *
   * @returns A new TarotState with the effect applied (immutable).
   */
  applyTarot(tarot: TarotOrPlanet): TarotState {
    if (tarot.type !== 'tarot') return this.toState()

    const effect = tarot.effect ?? ''
    const mods = { ...this.roundModifiers }

    switch (effect) {
      case 'bonus_double':
        // Bonus scores × 2 for this round
        mods.bonusDouble = true
        break

      case 'mult_per_card':
        // Each played card adds +1 Mult
        mods.multPerCard = true
        break

      case 'bonus_flat':
        // +20 Bonus (handled in ScoringEngine via TarotEffect.bonusFlat)
        mods.pending = null // no player input needed
        break

      case 'mult_flat':
        // +3 Mult (handled in ScoringEngine via TarotEffect.multFlat)
        mods.pending = null
        break

      case 'free_hand':
        // This hand does not consume a hand limit
        mods.freeHand = true
        break

      case 'next_ante_discount':
        // Shop prices -1 for next Ante
        mods.nextAnteDiscount = (mods.nextAnteDiscount ?? 0) + 1
        break

      case 'choose_hand_type':
        // Player selects a hand type for the next played hand
        mods.pending = { type: 'choose_hand_type' }
        break

      case 'upgrade_card':
        // Player selects a card to upgrade to J/Q/K/A
        mods.pending = { type: 'upgrade_card' }
        break

      case 'reroll_suit':
        // Player selects a card to change to a random different suit of the same value
        mods.pending = { type: 'reroll_suit' }
        break

      case 'add_value':
        // Player selects 2 cards to add +4 to their value
        mods.pending = { type: 'add_value' }
        break

      case 'double_value':
        // Player selects 1 card to double its value
        mods.pending = { type: 'double_value' }
        break

      case 'instant_money':
        // Handled externally (add $3 to player money)
        mods.pending = null
        break

      case 'upgrade_joker':
        // 30% chance to upgrade a random Joker (handled externally with RNG)
        mods.pending = null
        break

      case 'draw':
        // Draw 1 card (handled by DeckManager — no state change here)
        mods.pending = null
        break

      default:
        // Unknown effect — ignore
        break
    }

    return {
      handTypeUpgrades: { ...this.handTypeUpgrades },
      roundModifiers: mods,
    }
  }

  /**
   * Resolve a pending choose_hand_type selection.
   *
   * This is a no-op stub — the selected hand type is stored externally
   * (e.g. in the game's pendingSelection state) so ScoringEngine can use it.
   * This method exists for API completeness with the rest of the engine.
   *
   * @param _handType - The handType key chosen (e.g. 'FLUSH', 'STRAIGHT'); ignored.
   */
  setChosenHandType(_handType: string): void {
    // No-op: the chosen hand type is stored externally.
    // Callers must manage the pending selection state directly.
  }

  // ─── Round lifecycle ──────────────────────────────────────────────────────

  /**
   * Reset all temporary round modifiers at the start of a new round.
   * Planet upgrades (handTypeUpgrades) are preserved.
   */
  startRound(): void {
    this.roundModifiers = { ...DEFAULT_ROUND_MODIFIERS }
  }

  /**
   * Get the current TarotEffect for use by ScoringEngine.
   * Converts roundModifiers into the flat TarotEffect shape.
   */
  getTarotEffect(): TarotEffect {
    return {
      bonusDouble: this.roundModifiers.bonusDouble,
      multPerCard: this.roundModifiers.multPerCard,
      freeHand: this.roundModifiers.freeHand,
      nextAnteDiscount: this.roundModifiers.nextAnteDiscount,
      chooseHandType: (this.roundModifiers.pending?.type === 'choose_hand_type') as boolean,
      pending: this.roundModifiers.pending,
    }
  }

  /**
   * Whether the current round has a pending selection awaiting player input.
   */
  hasPending(): boolean {
    return this.roundModifiers.pending !== null
  }

  /**
   * Get the current pending selection, if any.
   */
  getPending(): PendingSelection | null {
    return this.roundModifiers.pending
  }

  // ─── Serialisation ────────────────────────────────────────────────────────

  /**
   * Returns a serialisable snapshot of the TarotSystem state.
   */
  toState(): TarotState {
    return {
      handTypeUpgrades: { ...this.handTypeUpgrades },
      roundModifiers: { ...this.roundModifiers },
    }
  }

  /**
   * Restore state from a snapshot (e.g. loaded from LocalStorage).
   */
  static fromState(state: TarotState): TarotSystem {
    return new TarotSystem(state)
  }
}
