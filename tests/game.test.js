/**
 * 小丑牌 — 核心逻辑单元测试
 *
 * 运行方式:
 *   node tests/game.test.js
 *
 * 测试覆盖:
 *   - Card 类
 *   - DeckManager 洗牌/发牌
 *   - HandEvaluator 手牌判定（德州扑克风格，1-5张）
 *   - ScoringEngine 计分
 *   - JokerSystem 效果触发
 */

'use strict';

/* ============================================
   测试工具
============================================ */
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ ${message}`);
    failCount++;
  }
}

function assertEqual(actual, expected, message) {
  const ok = actual === expected;
  if (ok) {
    console.log(`  ✅ ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ ${message}`);
    console.error(`     Expected: ${expected}`);
    console.error(`     Actual:   ${actual}`);
    failCount++;
  }
}

function assertDeepEqual(actual, expected, message) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✅ ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ ${message}`);
    console.error(`     Expected: ${JSON.stringify(expected)}`);
    console.error(`     Actual:   ${JSON.stringify(actual)}`);
    failCount++;
  }
}

function section(name) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${name}`);
  console.log('='.repeat(50));
}

/* ============================================
   扑克牌数据层（从 index.html 提取）
============================================ */
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const HAND_TYPES = {
  ROYAL_FLUSH:    { name: '皇家同花顺', base: 100, level: 1 },
  STRAIGHT_FLUSH: { name: '同花顺',     base: 80,  level: 2 },
  FOUR_OF_A_KIND: { name: '四条',       base: 60,  level: 3 },
  FULL_HOUSE:     { name: '葫芦',       base: 40,  level: 4 },
  FLUSH:          { name: '同花',       base: 30,  level: 5 },
  STRAIGHT:       { name: '顺子',       base: 30,  level: 6 },
  THREE_OF_A_KIND: { name: '三条',       base: 20,  level: 7 },
  TWO_PAIR:       { name: '两对',       base: 15,  level: 8 },
  ONE_PAIR:       { name: '一对',       base: 10,  level: 9 },
  HIGH_CARD:      { name: '高牌',       base: 5,   level: 10 }
};

class Card {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
    this.value = this.calcValue();
    this.id = `${rank}${suit}`;
    this.isRed = ['♥', '♦'].includes(suit);
  }

  calcValue() {
    if (this.rank === 'A') return 14;
    if (this.rank === 'K') return 13;
    if (this.rank === 'Q') return 12;
    if (this.rank === 'J') return 11;
    return parseInt(this.rank);
  }
}

class DeckManager {
  constructor() {
    this.deck = [];
    this.hand = [];
    this.discard = [];
  }

  createDeck() {
    this.deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.deck.push(new Card(suit, rank));
      }
    }
  }

  shuffle() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  draw(n) {
    const drawn = this.deck.splice(0, n);
    this.hand.push(...drawn);
    return drawn;
  }

  discardCards(cards) {
    this.hand = this.hand.filter(c => !cards.includes(c));
    this.discard.push(...cards);
  }

  reset() {
    this.deck.push(...this.discard);
    this.discard = [];
    this.hand = [];
    this.shuffle();
  }

  reshuffleDiscardToDeck() {
    this.deck.push(...this.discard);
    this.discard = [];
    this.shuffle();
  }
}

/* ============================================
   手牌判定引擎
============================================ */
class HandEvaluator {
  evaluate(hand) {
    const n = hand.length;
    const faceValue = this.calcFaceValue(hand);
    if (n === 5) return this.evaluateFive(hand, faceValue);
    if (n === 4) return this.evaluateFour(hand, faceValue);
    if (n === 3) return this.evaluateThree(hand, faceValue);
    if (n === 2) return this.evaluateTwo(hand, faceValue);
    if (n === 1) return { type: { name: '单张', base: 0 }, cards: hand, faceValue };
    return { type: HAND_TYPES.HIGH_CARD, cards: hand, faceValue: 0 };
  }

  evaluateFive(hand, faceValue) {
    const flush = this.checkFlush(hand);
    const straight = this.checkStraight(hand);
    const groups = this.groupByRank(hand);
    if (flush && straight && straight.highest === 14 && straight.type === 'normal') {
      return { type: HAND_TYPES.ROYAL_FLUSH, cards: hand, faceValue };
    }
    if (flush && straight) {
      return { type: HAND_TYPES.STRAIGHT_FLUSH, cards: hand, faceValue, kicker: straight.highest };
    }
    if (groups[4]) return { type: HAND_TYPES.FOUR_OF_A_KIND, cards: hand, faceValue };
    if (groups[3] && groups[2]) return { type: HAND_TYPES.FULL_HOUSE, cards: hand, faceValue };
    if (flush) return { type: HAND_TYPES.FLUSH, cards: hand, faceValue };
    if (straight) return { type: HAND_TYPES.STRAIGHT, cards: hand, faceValue, kicker: straight.highest };
    if (groups[3]) return { type: HAND_TYPES.THREE_OF_A_KIND, cards: hand, faceValue };
    if (this.countGroups(groups, 2) === 2) return { type: HAND_TYPES.TWO_PAIR, cards: hand, faceValue };
    if (groups[2]) return { type: HAND_TYPES.ONE_PAIR, cards: hand, faceValue };
    return { type: HAND_TYPES.HIGH_CARD, cards: hand, faceValue };
  }

  evaluateFour(hand, faceValue) {
    const groups = this.groupByRank(hand);
    if (groups[4]) return { type: HAND_TYPES.FOUR_OF_A_KIND, cards: hand, faceValue };
    if (groups[3]) return { type: HAND_TYPES.THREE_OF_A_KIND, cards: hand, faceValue };
    if (this.countGroups(groups, 2) === 2) return { type: HAND_TYPES.TWO_PAIR, cards: hand, faceValue };
    if (groups[2]) return { type: HAND_TYPES.ONE_PAIR, cards: hand, faceValue };
    return { type: HAND_TYPES.HIGH_CARD, cards: hand, faceValue };
  }

  evaluateThree(hand, faceValue) {
    const groups = this.groupByRank(hand);
    if (groups[3]) return { type: HAND_TYPES.THREE_OF_A_KIND, cards: hand, faceValue };
    if (groups[2]) return { type: HAND_TYPES.ONE_PAIR, cards: hand, faceValue };
    return { type: HAND_TYPES.HIGH_CARD, cards: hand, faceValue };
  }

  evaluateTwo(hand, faceValue) {
    const groups = this.groupByRank(hand);
    if (groups[2]) return { type: HAND_TYPES.ONE_PAIR, cards: hand, faceValue };
    return { type: HAND_TYPES.HIGH_CARD, cards: hand, faceValue };
  }

  checkFlush(hand) {
    return hand.every(c => c.suit === hand[0].suit);
  }

  checkStraight(hand) {
    const values = [...new Set(hand.map(c => c.value))].sort((a, b) => a - b);
    if (values.length !== 5) return null;
    if (values[4] - values[0] === 4) return { highest: values[4], type: 'normal' };
    if (values[0] === 2 && values[1] === 3 && values[2] === 4 && values[3] === 5 && values[4] === 14) {
      return { highest: 5, type: 'wheel' };
    }
    return null;
  }

  groupByRank(hand) {
    const groups = {};
    for (const card of hand) {
      if (!groups[card.value]) groups[card.value] = [];
      groups[card.value].push(card);
    }
    const result = {};
    for (const [value, cards] of Object.entries(groups)) {
      const count = cards.length;
      if (!result[count]) result[count] = [];
      result[count].push(...cards);
    }
    return result;
  }

  countGroups(groups, count) {
    return groups[count] ? groups[count].length / count : 0;
  }

  calcFaceValue(hand) {
    return hand.reduce((sum, c) => sum + c.value, 0);
  }
}

/* ============================================
   Joker 数据
============================================ */
const JOKERS = [
  { id: 'J001', name: '幸运星',    rarity: 'COMMON',   effect: { type: 'passive',       money: 0.3 } },
  { id: 'J002', name: '基础倍率',  rarity: 'COMMON',   effect: { type: 'flat_mult',     value: 2 } },
  { id: 'J003', name: '基础加成',  rarity: 'COMMON',   effect: { type: 'flat_bonus',    value: 15 } },
  { id: 'J004', name: '红桃狂热',  rarity: 'COMMON',   effect: { type: 'count_mult',    suit: '♥', per: 1 } },
  { id: 'J005', name: '数字猎手',  rarity: 'COMMON',   effect: { type: 'value_mult',   values: [5, 10], mult: 4 } },
  { id: 'J006', name: '偶数专家',  rarity: 'COMMON',   effect: { type: 'even_mult',    mult: 4 } },
  { id: 'J007', name: '奇数大师',  rarity: 'COMMON',   effect: { type: 'odd_bonus',    bonus: 30 } },
  { id: 'J008', name: '低价扫货',  rarity: 'COMMON',   effect: { type: 'shop_bonus',   value: 1 } },
  // 注意: effect.hands 中的值必须与 HAND_TYPES 中 type.name 中文名一致
  { id: 'J009', name: '顺子狂热',  rarity: 'UNCOMMON', effect: { type: 'hand_mult',    hands: ['顺子', '同花顺', '皇家同花顺'], mult: 4 } },
  { id: 'J010', name: '对子追踪',  rarity: 'UNCOMMON', effect: { type: 'hand_mult',    hands: ['一对', '两对', '三条', '葫芦', '四条', '顺子', '同花', '同花顺', '皇家同花顺'], mult: 3 } },
  { id: 'J011', name: '高牌猎手',  rarity: 'UNCOMMON', effect: { type: 'hand_mult',    hands: ['高牌'], mult: 8 } },
  { id: 'J012', name: '三条狂热',  rarity: 'UNCOMMON', effect: { type: 'hand_mult_bonus', hands: ['三条', '葫芦', '四条', '顺子', '同花', '同花顺', '皇家同花顺'], mult: 3, bonus: 10 } },
  { id: 'J013', name: '方块收藏家', rarity: 'UNCOMMON', effect: { type: 'count_mult',   suit: '♦', per: 3, mult_per: 2 } },
  { id: 'J014', name: '黑桃战士',  rarity: 'UNCOMMON', effect: { type: 'count_mult',   suit: '♠', per: 1 } },
  { id: 'J015', name: '梅花银行',  rarity: 'UNCOMMON', effect: { type: 'count_bonus',  suit: '♣', per: 1, bonus_per: 10 } },
  { id: 'J016', name: '皇家狂热',  rarity: 'RARE',     effect: { type: 'hand_mult',    hands: ['皇家同花顺'], mult: 10 } },
  { id: 'J017', name: '四条大师',  rarity: 'RARE',     effect: { type: 'hand_mult',    hands: ['四条'], mult: 6 } },
  { id: 'J018', name: '通配小丑',  rarity: 'RARE',     effect: { type: 'flat_mult',     value: 1 } },
  { id: 'J019', name: '分数爆炸',  rarity: 'RARE',     effect: { type: 'score_mult',   threshold: 300, mult: 5 } },
  { id: 'J020', name: '超级Combo', rarity: 'RARE',     effect: { type: 'suit_diverse_mult', count: 3, mult: 5 } },
  { id: 'J021', name: '最终手段',  rarity: 'RARE',     effect: { type: 'last_hand_mult', mult: 6 } },
  { id: 'J022', name: '双重惊喜',  rarity: 'RARE',     effect: { type: 'mult_boost',   hands: ['两对', '三条', '葫芦', '四条', '顺子', '同花', '同花顺', '皇家同花顺'], factor: 0.5 } }
];

/* ============================================
   JokerSystem
============================================ */
class JokerSystem {
  constructor(activeJokers = []) {
    this.activeJokers = activeJokers;
  }

  evaluate(result, context = {}) {
    const { cards, type } = result;
    const { isLastHand = false, baseScore = 0 } = context;
    let totalMult = 0;
    let totalBonus = 0;
    let boostFactor = 0;
    const triggered = [];

    for (const joker of this.activeJokers) {
      const { effect } = joker;
      let jokerMult = 0;
      let jokerBonus = 0;
      let isTriggered = false;

      switch (effect.type) {
        case 'flat_mult':
          jokerMult += effect.value;
          isTriggered = true;
          break;

        case 'flat_bonus':
          jokerBonus += effect.value;
          isTriggered = true;
          break;

        case 'count_mult': {
          const suitCount = cards.filter(c => c.suit === effect.suit).length;
          const multPer = effect.mult_per || 1;
          if (suitCount > 0) {
            jokerMult += Math.floor(suitCount / effect.per) * multPer;
            isTriggered = suitCount >= effect.per;
          }
          break;
        }

        case 'count_bonus': {
          const suitCount = cards.filter(c => c.suit === effect.suit).length;
          if (suitCount > 0) {
            jokerBonus += Math.floor(suitCount / effect.per) * effect.bonus_per;
            isTriggered = suitCount >= effect.per;
          }
          break;
        }

        case 'value_mult':
          if (cards.some(c => effect.values.includes(c.value))) {
            jokerMult += effect.mult;
            isTriggered = true;
          }
          break;

        case 'even_mult':
          if (cards.length > 0 && cards.every(c => c.value % 2 === 0)) {
            jokerMult += effect.mult;
            isTriggered = true;
          }
          break;

        case 'odd_bonus':
          if (cards.length > 0 && cards.every(c => c.value % 2 === 1)) {
            jokerBonus += effect.bonus;
            isTriggered = true;
          }
          break;

        case 'hand_mult':
          if (effect.hands.includes(type.name)) {
            jokerMult += effect.mult;
            isTriggered = true;
          }
          break;

        case 'hand_mult_bonus':
          if (effect.hands.includes(type.name)) {
            jokerMult += effect.mult;
            jokerBonus += effect.bonus;
            isTriggered = true;
          }
          break;

        case 'score_mult':
          if (baseScore > effect.threshold) {
            jokerMult += effect.mult;
            isTriggered = true;
          }
          break;

        case 'suit_diverse_mult': {
          const suits = new Set(cards.map(c => c.suit));
          if (suits.size >= effect.count) {
            jokerMult += effect.mult;
            isTriggered = true;
          }
          break;
        }

        case 'last_hand_mult':
          if (isLastHand) {
            jokerMult += effect.mult;
            isTriggered = true;
          }
          break;

        case 'mult_boost':
          if (effect.hands.includes(type.name)) {
            boostFactor += effect.factor;
            isTriggered = true;
          }
          break;
      }

      if (isTriggered) {
        triggered.push({ joker, jokerMult, jokerBonus });
        totalMult += jokerMult;
        totalBonus += jokerBonus;
      }
    }

    return { mult: totalMult, bonus: totalBonus, boostFactor, triggered };
  }
}

/* ============================================
   ScoringEngine
============================================ */
class ScoringEngine {
  calculate(result, jokerContext = {}) {
    const { type, faceValue } = result;
    const base = type.base;
    const subtotal = base + faceValue;
    let { mult = 0, bonus = 0, boostFactor = 0 } = jokerContext;
    const total = Math.round(subtotal * (1 + mult) * (1 + boostFactor) + bonus);
    return { base, faceValue, subtotal, mult, bonus, boostFactor, total };
  }
}

/* ============================================
   辅助函数
============================================ */
function c(suit, rank) {
  return new Card(suit, rank);
}

/* ============================================
   测试用例
============================================ */

// ========== Card 类 ==========
section('Card 类');

(function() {
  const card = new Card('♥', 'A');
  assert(card.suit === '♥', '花色正确');
  assert(card.rank === 'A', '等级正确');
  assert(card.value === 14, 'A 的面值为 14');
  assert(card.id === 'A♥', 'ID 格式正确');
  assert(card.isRed === true, '红桃为红色');

  const black = new Card('♠', 'K');
  assert(black.isRed === false, '黑桃为黑色');

  const num = new Card('♦', '10');
  assert(num.value === 10, '数字牌面值为数字本身');

  const jack = new Card('♣', 'J');
  assert(jack.value === 11, 'J 的面值为 11');
})();

// ========== DeckManager ==========
section('DeckManager');

(function() {
  const deck = new DeckManager();
  deck.createDeck();
  assert(deck.deck.length === 52, '52 张牌');

  const values = new Set(deck.deck.map(c => c.id));
  assert(values.size === 52, '52 张不重复的牌');

  deck.shuffle();
  assert(deck.deck.length === 52, '洗牌后仍是 52 张');

  const drawn = deck.draw(5);
  assert(deck.hand.length === 5, '发牌后手牌为 5 张');
  assert(deck.deck.length === 47, '牌堆剩余 47 张');

  deck.discardCards([deck.hand[0]]);
  assert(deck.hand.length === 4, '弃牌后手牌为 4 张');
  assert(deck.discard.length === 1, '弃牌堆有 1 张');

  deck.reset();
  assert(deck.deck.length === 48, '重置后牌堆 = 弃牌堆 (48)');
  assert(deck.hand.length === 0, '重置后手牌为空');
  assert(deck.discard.length === 0, '重置后弃牌堆为空');
})();

// ========== HandEvaluator — 5 张手牌 ==========
section('HandEvaluator — 5 张手牌');

(function() {
  const eval_ = new HandEvaluator();

  // 皇家同花顺
  const royalFlush = [
    c('♠', '10'), c('♠', 'J'), c('♠', 'Q'), c('♠', 'K'), c('♠', 'A')
  ];
  const r = eval_.evaluate(royalFlush);
  assertEqual(r.type.name, '皇家同花顺', '皇家同花顺判定正确');

  // 同花顺（A-2-3-4-5 小顺子）
  const wheelFlush = [
    c('♥', 'A'), c('♥', '2'), c('♥', '3'), c('♥', '4'), c('♥', '5')
  ];
  const wf = eval_.evaluate(wheelFlush);
  assertEqual(wf.type.name, '同花顺', 'A-2-3-4-5 同花顺判定正确');

  // 四条
  const fourKind = [
    c('♠', '7'), c('♥', '7'), c('♦', '7'), c('♣', '7'), c('♠', 'K')
  ];
  const fk = eval_.evaluate(fourKind);
  assertEqual(fk.type.name, '四条', '四条判定正确');

  // 葫芦
  const fullHouse = [
    c('♠', '9'), c('♥', '9'), c('♦', '9'), c('♣', 'K'), c('♠', 'K')
  ];
  const fh = eval_.evaluate(fullHouse);
  assertEqual(fh.type.name, '葫芦', '葫芦判定正确');

  // 同花（不成顺）
  const flush = [
    c('♠', '2'), c('♠', '5'), c('♠', '9'), c('♠', 'J'), c('♠', 'K')
  ];
  const fl = eval_.evaluate(flush);
  assertEqual(fl.type.name, '同花', '同花判定正确');

  // 顺子（普通）
  const straight = [
    c('♠', '6'), c('♥', '7'), c('♦', '8'), c('♣', '9'), c('♠', '10')
  ];
  const st = eval_.evaluate(straight);
  assertEqual(st.type.name, '顺子', '普通顺子判定正确');

  // A-2-3-4-5 小顺子
  const wheel = [
    c('♠', 'A'), c('♥', '2'), c('♦', '3'), c('♣', '4'), c('♠', '5')
  ];
  const wh = eval_.evaluate(wheel);
  assertEqual(wh.type.name, '顺子', 'A-2-3-4-5 小顺子判定正确');
  assertEqual(wh.kicker, 5, '小顺子 kicker = 5');

  // 三条
  const threeKind = [
    c('♠', 'J'), c('♥', 'J'), c('♦', 'J'), c('♣', '4'), c('♠', '9')
  ];
  const tk = eval_.evaluate(threeKind);
  assertEqual(tk.type.name, '三条', '三条判定正确');

  // 两对
  const twoPair = [
    c('♠', '5'), c('♥', '5'), c('♦', 'K'), c('♣', 'K'), c('♠', '2')
  ];
  const tp = eval_.evaluate(twoPair);
  assertEqual(tp.type.name, '两对', '两对判定正确');

  // 一对
  const onePair = [
    c('♠', 'Q'), c('♥', 'Q'), c('♦', '3'), c('♣', '7'), c('♠', 'K')
  ];
  const op = eval_.evaluate(onePair);
  assertEqual(op.type.name, '一对', '一对判定正确');

  // 高牌
  const highCard = [
    c('♠', '2'), c('♥', '5'), c('♦', '9'), c('♣', 'J'), c('♠', 'K')
  ];
  const hc = eval_.evaluate(highCard);
  assertEqual(hc.type.name, '高牌', '高牌判定正确');
})();

// ========== HandEvaluator — 1-4 张手牌 ==========
section('HandEvaluator — 1-4 张手牌');

(function() {
  const eval_ = new HandEvaluator();

  // 1 张
  const one = [c('♥', 'A')];
  const r1 = eval_.evaluate(one);
  assertEqual(r1.type.name, '单张', '1张 → 单张');
  assertEqual(r1.faceValue, 14, '1张 A 面值 = 14');

  // 2 张 — 一对
  const twoPair2 = [c('♠', 'K'), c('♥', 'K')];
  const r2 = eval_.evaluate(twoPair2);
  assertEqual(r2.type.name, '一对', '2张对子 → 一对');

  // 2 张 — 高牌
  const twoHigh = [c('♠', '3'), c('♥', '7')];
  const r2h = eval_.evaluate(twoHigh);
  assertEqual(r2h.type.name, '高牌', '2张不同 → 高牌');

  // 3 张 — 三条
  const threeK = [c('♠', '7'), c('♥', '7'), c('♦', '7')];
  const r3k = eval_.evaluate(threeK);
  assertEqual(r3k.type.name, '三条', '3张同面值 → 三条');

  // 3 张 — 一对
  const threePair = [c('♠', '7'), c('♥', '7'), c('♦', '3')];
  const r3p = eval_.evaluate(threePair);
  assertEqual(r3p.type.name, '一对', '3张有一对 → 一对');

  // 3 张 — 高牌
  const threeHigh = [c('♠', '2'), c('♥', '5'), c('♦', '9')];
  const r3h = eval_.evaluate(threeHigh);
  assertEqual(r3h.type.name, '高牌', '3张不同 → 高牌');

  // 4 张 — 四条
  const fourK = [c('♠', '5'), c('♥', '5'), c('♦', '5'), c('♣', '5')];
  const r4k = eval_.evaluate(fourK);
  assertEqual(r4k.type.name, '四条', '4张同面值 → 四条');

  // 4 张 — 三条
  const four3 = [c('♠', '5'), c('♥', '5'), c('♦', '5'), c('♣', 'K')];
  const r4_3 = eval_.evaluate(four3);
  assertEqual(r4_3.type.name, '三条', '4张有三张相同 → 三条');

  // 4 张 — 两对
  const four2p = [c('♠', '5'), c('♥', '5'), c('♦', 'K'), c('♣', 'K')];
  const r4_2p = eval_.evaluate(four2p);
  assertEqual(r4_2p.type.name, '两对', '4张有两对 → 两对');

  // 4 张 — 一对
  const four1p = [c('♠', '5'), c('♥', '5'), c('♦', '3'), c('♣', '7')];
  const r4_1p = eval_.evaluate(four1p);
  assertEqual(r4_1p.type.name, '一对', '4张有一对 → 一对');

  // 4 张 — 高牌
  const fourHigh = [c('♠', '2'), c('♥', '4'), c('♦', '6'), c('♣', '8')];
  const r4h = eval_.evaluate(fourHigh);
  assertEqual(r4h.type.name, '高牌', '4张无对 → 高牌');
})();

// ========== HandEvaluator — 面值计算 ==========
section('HandEvaluator — 面值计算');

(function() {
  const eval_ = new HandEvaluator();

  const fiveCards = [c('♠', '2'), c('♥', '3'), c('♦', '4'), c('♣', '5'), c('♠', '6')];
  const r = eval_.evaluate(fiveCards);
  assertEqual(r.faceValue, 2+3+4+5+6, '面值求和正确 = 20');

  const faceCards = [c('♠', 'A'), c('♥', 'K'), c('♦', 'Q'), c('♣', 'J'), c('♠', '10')];
  const rf = eval_.evaluate(faceCards);
  // A=14, K=13, Q=12, J=11, 10=10
  assertEqual(rf.faceValue, 14+13+12+11+10, '人头牌面值求和正确 = 60');
})();

// ========== ScoringEngine ==========
section('ScoringEngine — 计分公式');

(function() {
  const engine = new ScoringEngine();

  // 无 Joker：高牌 5 张
  const highCards = [c('♠', '2'), c('♥', '5'), c('♦', '9'), c('♣', 'J'), c('♠', 'K')];
  const eval_ = new HandEvaluator();
  const result = eval_.evaluate(highCards);

  const score = engine.calculate(result, {});
  // base=5, faceValue=2+5+9+11(K=13)+13(K)=40, subtotal=45, total=45
  assertEqual(score.base, 5, '基础分 = 5');
  assertEqual(score.faceValue, 40, '面值分 = 40');
  assertEqual(score.subtotal, 45, '小计 = 45');
  assertEqual(score.mult, 0, 'Mult = 0');
  assertEqual(score.bonus, 0, 'Bonus = 0');
  assertEqual(score.total, 45, '最终分 = 45');

  // 同花顺：base=80
  const flush = [c('♠', '6'), c('♠', '7'), c('♠', '8'), c('♠', '9'), c('♠', '10')];
  const flushResult = eval_.evaluate(flush);
  const flushScore = engine.calculate(flushResult, { mult: 2, bonus: 15 });
  // base=80, faceValue=6+7+8+9+10=40, subtotal=120
  // total = 120 * (1+2) + 15 = 375
  assertEqual(flushScore.base, 80, '同花顺 base = 80');
  assertEqual(flushScore.total, 375, '(80+40)*(1+2)+15 = 375');

  // J022 boostFactor 乘法
  const pairCards = [c('♠', 'K'), c('♥', 'K'), c('♦', '3'), c('♣', '7'), c('♠', '9')];
  const pairResult = eval_.evaluate(pairCards);
  // base=10, faceValue=13+13+3+7+9=45, subtotal=55
  const boostedScore = engine.calculate(pairResult, { mult: 2, bonus: 15, boostFactor: 0.5 });
  // total = 55 * (1+2) * (1+0.5) + 15 = 55 * 3 * 1.5 + 15 = 247.5 + 15 = 262.5 → 263
  assertEqual(boostedScore.total, 263, '(55)*(1+2)*(1+0.5)+15 = 263 (四舍五入)');
})();

// ========== JokerSystem — flat_mult / flat_bonus ==========
section('JokerSystem — flat_mult / flat_bonus');

(function() {
  const eval_ = new HandEvaluator();
  const system = new JokerSystem();

  const cards = [c('♠', '2'), c('♥', '5')];
  const result = eval_.evaluate(cards); // 高牌

  // 无 Joker
  let r = system.evaluate(result);
  assertEqual(r.mult, 0, '无 Joker: mult = 0');
  assertEqual(r.bonus, 0, '无 Joker: bonus = 0');

  // J002 flat_mult +2
  system.activeJokers = [JOKERS[1]]; // J002
  r = system.evaluate(result);
  assertEqual(r.mult, 2, 'J002: mult = 2');
  assertEqual(r.triggered.length, 1, 'J002 触发');

  // J003 flat_bonus +15
  system.activeJokers = [JOKERS[2]]; // J003
  r = system.evaluate(result);
  assertEqual(r.bonus, 15, 'J003: bonus = 15');

  // J002 + J003 组合
  system.activeJokers = [JOKERS[1], JOKERS[2]];
  r = system.evaluate(result);
  assertEqual(r.mult, 2, 'J002+J003: mult = 2');
  assertEqual(r.bonus, 15, 'J002+J003: bonus = 15');
})();

// ========== JokerSystem — count_mult / count_bonus ==========
section('JokerSystem — count_mult / count_bonus');

(function() {
  const eval_ = new HandEvaluator();
  const system = new JokerSystem();

  // J004 红桃狂热：每红桃 +1 Mult
  system.activeJokers = [JOKERS[3]]; // J004
  const hearts3 = [c('♥', '3'), c('♥', '7'), c('♥', 'K'), c('♠', '5')];
  let result = eval_.evaluate(hearts3);
  let r = system.evaluate(result);
  assertEqual(r.mult, 3, '3张红桃 → J004 mult = 3');

  const hearts1 = [c('♥', '3'), c('♠', '5'), c('♣', '7')];
  result = eval_.evaluate(hearts1);
  r = system.evaluate(result);
  assertEqual(r.mult, 1, '1张红桃 → J004 mult = 1');

  // J013 方块收藏家：每 3 张方块 +2 Mult
  system.activeJokers = [JOKERS[12]]; // J013
  const diamonds6 = [c('♦', '2'), c('♦', '4'), c('♦', '6'), c('♦', '8'), c('♦', '10'), c('♦', 'A')];
  result = eval_.evaluate(diamonds6);
  r = system.evaluate(result);
  assertEqual(r.mult, 4, '6张方块 → J013 mult = floor(6/3)*2 = 4');

  // J015 梅花银行：每梅花 +10 Bonus
  system.activeJokers = [JOKERS[14]]; // J015
  const clubs4 = [c('♣', '2'), c('♣', '5'), c('♣', '9'), c('♣', 'K'), c('♥', '7')];
  result = eval_.evaluate(clubs4);
  r = system.evaluate(result);
  assertEqual(r.bonus, 40, '4张梅花 → J015 bonus = floor(4/1)*10 = 40');
})();

// ========== JokerSystem — value_mult ==========
section('JokerSystem — value_mult (J005 数字猎手)');

(function() {
  const eval_ = new HandEvaluator();
  const system = new JokerSystem([JOKERS[4]]); // J005: 有 5 或 10 → +4 Mult

  const with5 = [c('♠', '5'), c('♥', '7'), c('♦', '9')];
  let result = eval_.evaluate(with5);
  let r = system.evaluate(result);
  assertEqual(r.mult, 4, '有 5 → J005 mult = 4');

  const with10 = [c('♠', '10'), c('♥', 'K'), c('♦', 'A')];
  result = eval_.evaluate(with10);
  r = system.evaluate(result);
  assertEqual(r.mult, 4, '有 10 → J005 mult = 4');

  const withBoth = [c('♠', '5'), c('♥', '10'), c('♦', '7')];
  result = eval_.evaluate(withBoth);
  r = system.evaluate(result);
  assertEqual(r.mult, 4, '有 5 和 10 → J005 mult = 4 (不叠加)');

  const withNone = [c('♠', '3'), c('♥', '7'), c('♦', 'J')];
  result = eval_.evaluate(withNone);
  r = system.evaluate(result);
  assertEqual(r.mult, 0, '无 5/10 → J005 mult = 0');
  assertEqual(r.triggered.length, 0, 'J005 未触发');
})();

// ========== JokerSystem — even_mult / odd_bonus ==========
section('JokerSystem — even_mult / odd_bonus');

(function() {
  const eval_ = new HandEvaluator();

  // J006 偶数专家：全部为偶数时 +4 Mult
  const system6 = new JokerSystem([JOKERS[5]]); // J006
  const evens = [c('♠', '2'), c('♥', '4'), c('♦', '6'), c('♣', '8')];
  let result = eval_.evaluate(evens);
  let r = system6.evaluate(result);
  assertEqual(r.mult, 4, '4张偶数 → J006 mult = 4');

  const mixed = [c('♠', '2'), c('♥', '5'), c('♦', '7')];
  result = eval_.evaluate(mixed);
  r = system6.evaluate(result);
  assertEqual(r.mult, 0, '有奇数 → J006 mult = 0');

  // J007 奇数大师：全部为奇数时 +30 Bonus
  const system7 = new JokerSystem([JOKERS[6]]); // J007
  const odds = [c('♠', '3'), c('♥', '5'), c('♦', '7'), c('♣', '9'), c('♠', 'J')];
  result = eval_.evaluate(odds);
  r = system7.evaluate(result);
  assertEqual(r.bonus, 30, '5张奇数 → J007 bonus = 30');

  const withEven = [c('♠', '2'), c('♥', '5'), c('♦', '7')];
  result = eval_.evaluate(withEven);
  r = system7.evaluate(result);
  assertEqual(r.bonus, 0, '有偶数 → J007 bonus = 0');
})();

// ========== JokerSystem — hand_mult ==========
section('JokerSystem — hand_mult');

(function() {
  const eval_ = new HandEvaluator();

  // J009 顺子狂热：打出顺子+时 +4 Mult
  const system9 = new JokerSystem([JOKERS[8]]); // J009
  const straight = [c('♠', '6'), c('♥', '7'), c('♦', '8'), c('♣', '9'), c('♠', '10')];
  let result = eval_.evaluate(straight);
  let r = system9.evaluate(result);
  assertEqual(r.mult, 4, '顺子 → J009 mult = 4');

  const pair = [c('♠', 'K'), c('♥', 'K'), c('♦', '3'), c('♣', '7'), c('♠', '9')];
  result = eval_.evaluate(pair);
  r = system9.evaluate(result);
  assertEqual(r.mult, 0, '一对 → J009 mult = 0');

  // J016 皇家狂热：打出皇家同花顺时 +10 Mult
  const system16 = new JokerSystem([JOKERS[15]]); // J016
  const royalFlush = [c('♠', '10'), c('♠', 'J'), c('♠', 'Q'), c('♠', 'K'), c('♠', 'A')];
  result = eval_.evaluate(royalFlush);
  r = system16.evaluate(result);
  assertEqual(r.mult, 10, '皇家同花顺 → J016 mult = 10');
})();

// ========== JokerSystem — hand_mult_bonus ==========
section('JokerSystem — hand_mult_bonus (J012 三条狂热)');

(function() {
  const eval_ = new HandEvaluator();
  const system = new JokerSystem([JOKERS[11]]); // J012: +3 Mult +10 Bonus

  const threeKind = [c('♠', '7'), c('♥', '7'), c('♦', '7'), c('♣', 'K'), c('♠', 'A')];
  let result = eval_.evaluate(threeKind);
  let r = system.evaluate(result);
  assertEqual(r.mult, 3, '三条 → J012 mult = 3');
  assertEqual(r.bonus, 10, '三条 → J012 bonus = 10');

  const fullHouse = [c('♠', '9'), c('♥', '9'), c('♦', '9'), c('♣', 'K'), c('♠', 'K')];
  result = eval_.evaluate(fullHouse);
  r = system.evaluate(result);
  assertEqual(r.mult, 3, '葫芦 → J012 mult = 3');
  assertEqual(r.bonus, 10, '葫芦 → J012 bonus = 10');

  const pair = [c('♠', 'K'), c('♥', 'K'), c('♦', '3'), c('♣', '7'), c('♠', '9')];
  result = eval_.evaluate(pair);
  r = system.evaluate(result);
  assertEqual(r.mult, 0, '一对 → J012 mult = 0');
  assertEqual(r.bonus, 0, '一对 → J012 bonus = 0');
})();

// ========== JokerSystem — mult_boost ==========
section('JokerSystem — mult_boost (J022 双重惊喜)');

(function() {
  const eval_ = new HandEvaluator();
  const system = new JokerSystem([JOKERS[21]]); // J022: +0.5 boostFactor

  const twoPair = [c('♠', '5'), c('♥', '5'), c('♦', 'K'), c('♣', 'K'), c('♠', '2')];
  let result = eval_.evaluate(twoPair);
  let r = system.evaluate(result);
  assertEqual(r.boostFactor, 0.5, '两对 → J022 boostFactor = 0.5');
  assertEqual(r.mult, 0, 'J022 只增加 boostFactor，不增加 mult');

  const highCard = [c('♠', '2'), c('♥', '5'), c('♦', '9'), c('♣', 'J'), c('♠', 'K')];
  result = eval_.evaluate(highCard);
  r = system.evaluate(result);
  assertEqual(r.boostFactor, 0, '高牌 → J022 boostFactor = 0 (未触发)');
})();

// ========== JokerSystem — suit_diverse_mult ==========
section('JokerSystem — suit_diverse_mult (J020 超级Combo)');

(function() {
  const eval_ = new HandEvaluator();
  const system = new JokerSystem([JOKERS[19]]); // J020: 3种+花色 +5 Mult

  const threeSuits = [c('♠', '2'), c('♥', '5'), c('♦', '9'), c('♣', 'K'), c('♠', 'A')];
  let result = eval_.evaluate(threeSuits);
  let r = system.evaluate(result);
  assertEqual(r.mult, 5, '4种花色 → J020 mult = 5');

  const twoSuitsOnly = [c('♠', '2'), c('♠', '5'), c('♠', '9'), c('♥', 'K'), c('♥', 'A')];
  result = eval_.evaluate(twoSuitsOnly);
  r = system.evaluate(result);
  assertEqual(r.mult, 0, '2种花色 → J020 mult = 0');
})();

// ========== JokerSystem — last_hand_mult ==========
section('JokerSystem — last_hand_mult (J021 最终手段)');

(function() {
  const eval_ = new HandEvaluator();
  const system = new JokerSystem([JOKERS[20]]); // J021: 最后一手 +6 Mult

  const cards = [c('♠', '2'), c('♥', '5'), c('♦', '9'), c('♣', 'J'), c('♠', 'K')];
  const result = eval_.evaluate(cards);

  let r = system.evaluate(result, { isLastHand: true });
  assertEqual(r.mult, 6, 'isLastHand=true → J021 mult = 6');

  r = system.evaluate(result, { isLastHand: false });
  assertEqual(r.mult, 0, 'isLastHand=false → J021 mult = 0');
})();

// ========== JokerSystem — score_mult ==========
section('JokerSystem — score_mult (J019 分数爆炸)');

(function() {
  const eval_ = new HandEvaluator();
  const system = new JokerSystem([JOKERS[18]]); // J019: 分数>300 → +5 Mult

  const cards = [c('♠', 'A'), c('♥', 'K'), c('♦', 'Q'), c('♣', 'J'), c('♠', '10')];
  const result = eval_.evaluate(cards);
  // base=100 (皇家同花顺), faceValue=14+13+12+11+10=60
  // baseScore = 160

  let r = system.evaluate(result, { baseScore: 160 });
  assertEqual(r.mult, 0, 'baseScore=160 (< 300) → J019 mult = 0');

  r = system.evaluate(result, { baseScore: 301 });
  assertEqual(r.mult, 5, 'baseScore=301 (> 300) → J019 mult = 5');
})();

// ========== JokerSystem — 综合场景 ==========
section('JokerSystem — 综合场景');

(function() {
  const eval_ = new HandEvaluator();
  const engine = new ScoringEngine();

  // 场景：打出葫芦，手里有 J002(+2 Mult), J012(+3 Mult +10 Bonus), J022(+0.5 boostFactor)
  const system = new JokerSystem([JOKERS[1], JOKERS[11], JOKERS[21]]);
  const fullHouse = [c('♠', '9'), c('♥', '9'), c('♦', '9'), c('♣', 'K'), c('♠', 'K')];
  const result = eval_.evaluate(fullHouse);
  const r = system.evaluate(result);
  // J002: flat_mult=2, J012: hand_mult=3+bonus=10, J022: boost=0.5
  assertEqual(r.mult, 5, 'J002+J012 total mult = 5');
  assertEqual(r.bonus, 10, 'J012 bonus = 10');
  assertEqual(r.boostFactor, 0.5, 'J022 boostFactor = 0.5');
  assertEqual(r.triggered.length, 3, '3 个 Joker 都触发');

  const score = engine.calculate(result, r);
  // base=40, faceValue=9*3+13*2=53, subtotal=93
  // total = 93 * (1+5) * (1+0.5) + 10 = 93*6*1.5+10 = 847
  assertEqual(score.total, 847, '葫芦+J002+J012+J022 综合得分 = 847');
})();

// ========== 0 张手牌边界 ==========
section('边界条件 — 0 张手牌');

(function() {
  const eval_ = new HandEvaluator();
  const r = eval_.evaluate([]);
  assertEqual(r.type.name, '高牌', '0张 → 高牌');
  assertEqual(r.faceValue, 0, '0张 → faceValue = 0');
})();

// ========== 计分引擎边界 ==========
section('边界条件 — ScoringEngine JokerContext 缺失字段');

(function() {
  const eval_ = new HandEvaluator();
  const engine = new ScoringEngine();

  const cards = [c('♠', 'K'), c('♥', 'K'), c('♦', '3'), c('♣', '7'), c('♠', '9')];
  const result = eval_.evaluate(cards);

  const s1 = engine.calculate(result, {});
  assertEqual(s1.mult, 0, '空 JokerContext → mult = 0');
  assertEqual(s1.bonus, 0, '空 JokerContext → bonus = 0');
  assertEqual(s1.boostFactor, 0, '空 JokerContext → boostFactor = 0');

  const s2 = engine.calculate(result, { mult: 1 });
  assertEqual(s2.mult, 1, '仅有 mult 时正确');
  assertEqual(s2.bonus, 0, '仅有 mult 时 bonus = 0');
})();

/* ============================================
   测试汇总
============================================ */
console.log(`\n${'='.repeat(50)}`);
console.log(`  测试汇总`);
console.log('='.repeat(50));
console.log(`  通过: ${passCount}`);
console.log(`  失败: ${failCount}`);
console.log(`  总计: ${passCount + failCount}`);
console.log('='.repeat(50));

if (failCount > 0) {
  console.error(`\n❌ ${failCount} 个测试失败！`);
  process.exit(1);
} else {
  console.log('\n✅ 全部测试通过！');
  process.exit(0);
}
