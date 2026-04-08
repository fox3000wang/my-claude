import { Card } from './card'

export interface HandType {
  name: string
  base: number
  level: number
}

export interface HandResult {
  type: HandType
  cards: Card[]
  faceValue: number
  kicker?: number
}
