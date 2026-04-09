export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE'

export type JokerEffectType =
  | 'passive'
  | 'flat_mult'
  | 'flat_bonus'
  | 'count_mult'
  | 'count_bonus'
  | 'value_mult'
  | 'even_mult'
  | 'odd_bonus'
  | 'hand_mult'
  | 'hand_mult_bonus'
  | 'score_mult'
  | 'suit_diverse_mult'
  | 'last_hand_mult'
  | 'mult_boost'
  | 'money'        // 每回合摸钱
  | 'draw'         // 发牌阶段额外发牌
  | 'money_mult'   // 摸钱时金钱 × N
  | 'money_bonus'  // 摸钱时金钱 + N
  | 'shop_bonus'   // 商店购买后额外 +$N

export interface JokerEffect {
  type: JokerEffectType
  money?: number
  value?: number
  suit?: string
  per?: number
  mult_per?: number
  bonus_per?: number
  values?: number[]
  mult?: number
  bonus?: number
  hands?: string[]
  threshold?: number
  count?: number
  factor?: number
}

export interface Joker {
  id: string
  name: string
  rarity: Rarity
  price: number
  desc: string
  effect: JokerEffect
}

export interface RarityConfig {
  label: string
  border: string
  bg: string
  prob: number
}

export const JOKER_RARITY: Record<Rarity, RarityConfig> = {
  COMMON:   { label: '普通', border: '#B0BEC5', bg: '#1A2633', prob: 0.60 },
  UNCOMMON: { label: '稀有', border: '#2ECC71', bg: '#1A2E1A', prob: 0.30 },
  RARE:     { label: '传说', border: '#9B59B6', bg: '#2E1A2E', prob: 0.10 },
}
