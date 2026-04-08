import { Joker } from '../types/joker'

export const JOKERS: Joker[] = [
  {
    id: 'J001', name: '幸运星',    rarity: 'COMMON',   price: 4,
    desc: '每回合开始时，有 30% 概率获得 $1',
    effect: { type: 'passive',       money: 0.3 },
  },
  {
    id: 'J002', name: '基础倍率',  rarity: 'COMMON',   price: 4,
    desc: '本回合分数 +2 Mult',
    effect: { type: 'flat_mult',     value: 2 },
  },
  {
    id: 'J003', name: '基础加成',  rarity: 'COMMON',   price: 4,
    desc: '本回合分数 +15 Bonus',
    effect: { type: 'flat_bonus',    value: 15 },
  },
  {
    id: 'J004', name: '红桃狂热',  rarity: 'COMMON',   price: 4,
    desc: '每有 1 张红桃，+1 Mult',
    effect: { type: 'count_mult',    suit: '♥', per: 1 },
  },
  {
    id: 'J005', name: '数字猎手',  rarity: 'COMMON',   price: 4,
    desc: '手牌中有 5 或 10 时，+4 Mult',
    effect: { type: 'value_mult',   values: [5, 10], mult: 4 },
  },
  {
    id: 'J006', name: '偶数专家',  rarity: 'COMMON',   price: 4,
    desc: '全部为偶数牌时，+4 Mult',
    effect: { type: 'even_mult',    mult: 4 },
  },
  {
    id: 'J007', name: '奇数大师',  rarity: 'COMMON',   price: 4,
    desc: '全部为奇数牌时，+30 Bonus',
    effect: { type: 'odd_bonus',    bonus: 30 },
  },
  {
    id: 'J008', name: '低价扫货',  rarity: 'COMMON',   price: 4,
    desc: '商店购买后额外 +$1',
    effect: { type: 'shop_bonus',   value: 1 },
  },
  {
    id: 'J009', name: '顺子狂热',  rarity: 'UNCOMMON', price: 5,
    desc: '打出顺子/同花顺/皇家同花顺时，+4 Mult',
    effect: { type: 'hand_mult',    hands: ['顺子', '同花顺', '皇家同花顺'], mult: 4 },
  },
  {
    id: 'J010', name: '对子追踪',  rarity: 'UNCOMMON', price: 5,
    desc: '打出对子系手牌时，+3 Mult',
    effect: { type: 'hand_mult',    hands: ['一对', '两对', '三条', '葫芦', '四条', '顺子', '同花', '同花顺', '皇家同花顺'], mult: 3 },
  },
  {
    id: 'J011', name: '高牌猎手',  rarity: 'UNCOMMON', price: 5,
    desc: '打出高牌时，+8 Mult',
    effect: { type: 'hand_mult',    hands: ['高牌'], mult: 8 },
  },
  {
    id: 'J012', name: '三条狂热',  rarity: 'UNCOMMON', price: 5,
    desc: '打出三条系手牌时，+3 Mult 和 +10 Bonus',
    effect: { type: 'hand_mult_bonus', hands: ['三条', '葫芦', '四条', '顺子', '同花', '同花顺', '皇家同花顺'], mult: 3, bonus: 10 },
  },
  {
    id: 'J013', name: '方块收藏家', rarity: 'UNCOMMON', price: 5,
    desc: '每 3 张方块，+2 Mult',
    effect: { type: 'count_mult',   suit: '♦', per: 3, mult_per: 2 },
  },
  {
    id: 'J014', name: '黑桃战士',  rarity: 'UNCOMMON', price: 5,
    desc: '每有 1 张黑桃，+1 Mult',
    effect: { type: 'count_mult',   suit: '♠', per: 1 },
  },
  {
    id: 'J015', name: '梅花银行',  rarity: 'UNCOMMON', price: 5,
    desc: '每有 1 张梅花，+10 Bonus',
    effect: { type: 'count_bonus',  suit: '♣', per: 1, bonus_per: 10 },
  },
  {
    id: 'J016', name: '皇家狂热',  rarity: 'RARE',     price: 6,
    desc: '打出皇家同花顺时，+10 Mult',
    effect: { type: 'hand_mult',    hands: ['皇家同花顺'], mult: 10 },
  },
  {
    id: 'J017', name: '四条大师',  rarity: 'RARE',     price: 6,
    desc: '打出四条时，+6 Mult',
    effect: { type: 'hand_mult',    hands: ['四条'], mult: 6 },
  },
  {
    id: 'J018', name: '通配小丑',  rarity: 'RARE',     price: 6,
    desc: '本回合分数 +1 Mult',
    effect: { type: 'flat_mult',    value: 1 },
  },
  {
    id: 'J019', name: '分数爆炸',  rarity: 'RARE',     price: 6,
    desc: '基础分数 >300 时，+5 Mult',
    effect: { type: 'score_mult',   threshold: 300, mult: 5 },
  },
  {
    id: 'J020', name: '超级Combo', rarity: 'RARE',     price: 6,
    desc: '手牌有 3 种以上花色时，+5 Mult',
    effect: { type: 'suit_diverse_mult', count: 3, mult: 5 },
  },
  {
    id: 'J021', name: '最终手段',  rarity: 'RARE',     price: 6,
    desc: '最后一手时，+6 Mult',
    effect: { type: 'last_hand_mult', mult: 6 },
  },
  {
    id: 'J022', name: '双重惊喜',  rarity: 'RARE',     price: 6,
    desc: '打出对子系手牌时，Mult ×1.5',
    effect: { type: 'mult_boost',   hands: ['两对', '三条', '葫芦', '四条', '顺子', '同花', '同花顺', '皇家同花顺'], factor: 0.5 },
  },
]
