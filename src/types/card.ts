export type Suit = '♠' | '♥' | '♦' | '♣'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

export interface Card {
  suit: Suit
  rank: Rank
  value: number  // 2-10=面值, J=11, Q=12, K=13, A=14
  id: string     // 如 "A♠"
  isRed: boolean
}

export const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

export function createCard(suit: Suit, rank: Rank): Card {
  const valueMap: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  }
  return {
    suit,
    rank,
    value: valueMap[rank],
    id: `${rank}${suit}`,
    isRed: suit === '♥' || suit === '♦',
  }
}
