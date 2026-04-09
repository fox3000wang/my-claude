export interface ScoreResult {
  base: number
  faceValue: number
  subtotal: number
  mult: number
  bonus: number
  boostFactor: number
  total: number
}

export interface JokerTriggered {
  jokerId: string
  jokerMult: number
  jokerBonus: number
}

export interface JokerContext {
  mult: number
  bonus: number
  boostFactor: number
  triggered: JokerTriggered[]
}
