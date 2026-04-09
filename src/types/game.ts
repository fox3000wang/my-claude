import type { Card } from './card'

export type ScreenType =
  | 'TITLE'
  | 'ANTE_SELECT'
  | 'BLIND_SELECT'
  | 'PLAYING'
  | 'SCORING'
  | 'SHOP'
  | 'GAME_OVER'
  | 'VICTORY'

export interface DeckState {
  deck: Card[]
  hand: Card[]
  discard: Card[]
}

/**
 * Pending selection for tarot effects that require player choice.
 * Used by effects like "choose_hand_type" (The High Priestess).
 */
export type PendingSelection =
  | { type: 'choose_hand_type'; handTypes?: string[] }
  | { type: 'upgrade_card'; cardIds?: string[] }
  | { type: 'reroll_suit'; cardIds?: string[] }
  | { type: 'add_value'; cardIds?: string[] }
  | { type: 'double_value'; cardIds?: string[] }

export interface TarotEffect {
  bonusFlat?: number
  multFlat?: number
  bonusDouble?: boolean
  multPerCard?: boolean
  freeHand?: boolean
  nextAnteDiscount?: number
  chooseHandType?: boolean
  pending?: PendingSelection | null
}

export interface TarotOrPlanet {
  id: string
  name: string
  type: 'tarot' | 'planet'
  price: number
  effect?: string
  desc?: string
  handType?: string
  bonus?: number
}
