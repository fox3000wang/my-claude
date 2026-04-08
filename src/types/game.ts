import { Card } from './card'
import { Joker } from './joker'

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

export interface TarotEffect {
  bonusFlat?: number
  multFlat?: number
  bonusDouble?: boolean
  multPerCard?: boolean
  freeHand?: boolean
  nextAnteDiscount?: number
  chooseHandType?: boolean
  pending?: unknown
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
