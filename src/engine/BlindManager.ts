/**
 * BlindManager
 *
 * Manages Ante / Blind progression for the roguelike run.
 *
 * Blind order per Ante: Small Blind → Big Blind → Boss Blind
 * Completing a Blind advances blindIndex; completing all 3 advances the Ante.
 *
 * Target scores and rewards are defined per the Phase 3 MVP spec:
 *   Ante 1: targets [100, 150, 200]  |  rewards [$3, $4, $5]
 *   Ante 2: targets [150, 250, 350]  |  rewards [$3, $4, $5]
 *   Ante 3: targets [200, 350, 500]  |  rewards [$3, $4, $5]
 */

/** Reward ($) for completing each blind type. Index = blindIndex. */
export const BLIND_REWARDS = [3, 4, 5] as const

/**
 * Target scores per Ante × Blind.
 * ANTE_TARGETS[ante - 1][blindIndex] = target score.
 *
 * Ante 1: [100, 150, 200]
 * Ante 2: [150, 250, 350]
 * Ante 3: [200, 350, 500]
 */
export const ANTE_TARGETS: readonly (readonly number[])[] = [
  Object.freeze([100, 150, 200]),
  Object.freeze([150, 250, 350]),
  Object.freeze([200, 350, 500]),
] as const

export const TOTAL_ANTES = ANTE_TARGETS.length

export class BlindManager {
  /** Current Ante (1-based). */
  ante: number = 1

  /** Current Blind index within the Ante: 0=Small, 1=Big, 2=Boss. */
  blindIndex: number = 0

  constructor(ante = 1, blindIndex = 0) {
    this.ante = ante
    this.blindIndex = blindIndex
  }

  /**
   * Returns the target score for the current blind.
   * @throws Error if the current Ante/Blind is out of range.
   */
  getTargetScore(): number {
    const targets = ANTE_TARGETS[this.ante - 1]
    if (!targets) throw new Error(`[BlindManager] Invalid ante: ${this.ante}`)
    return targets[this.blindIndex] ?? 0
  }

  /**
   * Returns the reward ($) for the current blind.
   */
  getReward(): number {
    return BLIND_REWARDS[this.blindIndex] ?? 0
  }

  /** Returns true if the current blind is the Boss Blind. */
  isBoss(): boolean {
    return this.blindIndex === 2
  }

  /** Returns true if the current blind is the last blind of the current Ante. */
  isLastBlind(): boolean {
    return this.blindIndex === 2
  }

  /** Returns true if the current Ante is the last Ante. */
  isLastAnte(): boolean {
    return this.ante >= TOTAL_ANTES
  }

  /**
   * Advance to the next Blind.
   * If already on the Boss Blind, advances to the next Ante's Small Blind.
   * Returns true if a new Ante was started (game continues); false otherwise.
   */
  completeBlind(): boolean {
    if (this.blindIndex < 2) {
      // Advance to next blind within same Ante
      this.blindIndex++
      return true
    }
    // Completed Boss Blind — advance to next Ante
    if (this.ante < TOTAL_ANTES) {
      this.ante++
      this.blindIndex = 0
      return true
    }
    // All Antes completed
    return false
  }

  /**
   * Skip the Boss Blind (incurs a $2 penalty).
   * Advances to the next Ante.
   */
  skipBoss(): boolean {
    if (this.blindIndex !== 2) return false
    if (this.ante < TOTAL_ANTES) {
      this.ante++
      this.blindIndex = 0
      return true
    }
    return false
  }

  /**
   * Returns the Boss Blind penalty amount.
   */
  static getBossSkipPenalty(): number {
    return 2
  }

  /**
   * Reset to the initial state (Ante 1, Small Blind).
   */
  reset(): void {
    this.ante = 1
    this.blindIndex = 0
  }

  /**
   * Select a blind by index (0=Small, 1=Big, 2=Boss).
   * Validates the index is within range.
   */
  selectBlind(index: number): boolean {
    if (index < 0 || index > 2) return false
    this.blindIndex = index
    return true
  }

  /**
   * Get a serializable snapshot of the current state.
   */
  toJSON(): { ante: number; blindIndex: number } {
    return { ante: this.ante, blindIndex: this.blindIndex }
  }
}
