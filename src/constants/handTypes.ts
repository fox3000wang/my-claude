import { HandType } from '../types/hand'

export const HAND_TYPES: Record<string, HandType> = {
  ROYAL_FLUSH:    { name: '皇家同花顺', base: 100, level: 1 },
  STRAIGHT_FLUSH: { name: '同花顺',     base: 80,  level: 2 },
  FOUR_OF_A_KIND: { name: '四条',       base: 60,  level: 3 },
  FULL_HOUSE:     { name: '葫芦',       base: 40,  level: 4 },
  FLUSH:          { name: '同花',       base: 30,  level: 5 },
  STRAIGHT:       { name: '顺子',       base: 30,  level: 6 },
  THREE_OF_A_KIND: { name: '三条',       base: 20,  level: 7 },
  TWO_PAIR:       { name: '两对',       base: 15,  level: 8 },
  ONE_PAIR:       { name: '一对',       base: 10,  level: 9 },
  HIGH_CARD:      { name: '高牌',       base: 5,   level: 10 },
}
