import { TarotOrPlanet } from '../types/game'

export const TAROTS: Omit<TarotOrPlanet, 'type'>[] = [
  { id: 'T01', name: 'The Fool',         effect: 'draw',              desc: '抽 1 张牌',              price: 3 },
  { id: 'T02', name: 'The Magician',     effect: 'reroll_suit',       desc: '1 张手牌转同值异花',    price: 3 },
  { id: 'T03', name: 'The High Priestess', effect: 'choose_hand_type', desc: '下一手设定类型',        price: 4 },
  { id: 'T04', name: 'The Empress',       effect: 'bonus_double',      desc: '本回合 Bonus ×2',        price: 4 },
  { id: 'T05', name: 'The Emperor',       effect: 'mult_per_card',    desc: '本回合每张牌 +1 Mult',  price: 4 },
  { id: 'T06', name: 'The Hierophant',    effect: 'bonus_flat',       desc: '本回合 +20 Bonus',       price: 3 },
  { id: 'T07', name: 'The Lovers',        effect: 'mult_flat',        desc: '本回合 +3 Mult',         price: 3 },
  { id: 'T08', name: 'The Chariot',       effect: 'add_value',        desc: '2 张手牌面值 +4',        price: 3 },
  { id: 'T09', name: 'Justice',           effect: 'upgrade_card',     desc: '1 张手牌转 J/Q/K/A',    price: 3 },
  { id: 'T10', name: 'The Hermit',        effect: 'free_hand',        desc: '本回合不消耗次数',       price: 5 },
  { id: 'T11', name: 'Wheel of Fortune', effect: 'upgrade_joker',    desc: '30% Joker 升级',         price: 4 },
  { id: 'T12', name: 'Strength',         effect: 'double_value',     desc: '1 张手牌面值 ×2',        price: 4 },
  { id: 'T13', name: 'The Tower',         effect: 'set_value',        desc: '1 张手牌转为 2',        price: 3 },
  { id: 'T14', name: 'The Star',          effect: 'instant_money',    desc: '立即获得 $3',            price: 2 },
  { id: 'T15', name: 'The Moon',          effect: 'next_ante_discount', desc: '下 Ante 盲注 -1',      price: 3 },
]
