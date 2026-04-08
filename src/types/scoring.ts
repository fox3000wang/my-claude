export interface ScoreResult {
  base: number
  faceValue: number
  planetBonus: number
  subtotal: number
  mult: number
  bonus: number
  boostFactor: number
  total: number
}

export interface JokerTriggered {
  joker: import('./joker').Joker
  jokerMult: number
  jokerBonus: number
}

export interface JokerContext {
  mult: number
  bonus: number
  boostFactor: number
  triggered: JokerTriggered[]
}
