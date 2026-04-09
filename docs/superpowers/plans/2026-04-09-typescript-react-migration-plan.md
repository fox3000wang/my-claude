# TypeScript + React 架构改造实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将小丑牌游戏从 HTML/CSS/JS 单文件重构为 TypeScript + React + Vite 架构，代码按领域拆分，为 Phase 4 快速迭代铺路。

**Architecture:** Vite + React 18 + TypeScript 严格模式 + Zustand。纯逻辑层(engine)与 UI 层完全分离，engine 层无 React 依赖便于单元测试。

**Tech Stack:** Vite, React 18, TypeScript 5(strict), Zustand, Vitest, @testing-library/react

---

## 前置准备

### Task 0: 创建 Vite 项目并安装依赖

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`

- [ ] **Step 1: 创建 Vite React TypeScript 项目**

在项目根目录执行：
```bash
cd "/Users/fox/Library/Mobile Documents/com~apple~CloudDocs/workspace/my-claude"
npm create vite@latest balatro-ts -- --template react-ts
```

预期：在 `balatro-ts/` 目录创建标准 Vite 项目

- [ ] **Step 2: 移动文件到根目录**

```bash
cd balatro-ts && mv package.json package.json.bak
cd .. && mv balatro-ts/* . && mv balatro-ts/.* . 2>/dev/null; rmdir balatro-ts
```

- [ ] **Step 3: 安装项目依赖**

```bash
cd "/Users/fox/Library/Mobile Documents/com~apple~CloudDocs/workspace/my-claude"
npm install zustand
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 4: 更新 vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
```

- [ ] **Step 5: 创建 src/setupTests.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "chore: 初始化 Vite + React + TypeScript 项目"
```

---

### Task 1: 迁移样式文件

**Files:**
- Create: `src/index.css`
- Modify: `index.html`
- Delete: `style.css`, `main.js`

- [ ] **Step 1: 复制 style.css 到 src/index.css**

从 `style.css` 复制全部内容到 `src/index.css`

- [ ] **Step 2: 更新 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🃏 小丑牌</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;700&display=swap" rel="stylesheet">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 3: 创建 src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 4: 创建临时 src/App.tsx**

```tsx
function App() {
  return <div id="app">游戏加载中...</div>
}
export default App
```

- [ ] **Step 5: 验证构建**

```bash
npm run dev
```

访问 http://localhost:5173，应显示"游戏加载中..."

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "chore: 迁移样式文件和基础 React 入口"
```

---

## Phase A：类型定义

### Task 2: 创建基础类型定义

**Files:**
- Create: `src/types/card.ts`, `src/types/hand.ts`, `src/types/joker.ts`, `src/types/game.ts`, `src/types/tarot.ts`

- [ ] **Step 1: 创建 src/types/card.ts**

```typescript
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
```

- [ ] **Step 2: 创建 src/types/hand.ts**

```typescript
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
  kicker?: number  // 用于顺子大小比较
}
```

- [ ] **Step 3: 创建 src/types/joker.ts**

```typescript
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

export interface JokerEffect {
  type: JokerEffectType
  // 根据 type 不同，字段不同
  money?: number           // passive
  value?: number           // flat_mult, flat_bonus
  suit?: string            // count_mult, count_bonus
  per?: number             // count_mult, count_bonus
  mult_per?: number        // count_mult
  bonus_per?: number       // count_bonus
  values?: number[]        // value_mult
  mult?: number            // value_mult, even_mult, hand_mult...
  bonus?: number          // odd_bonus
  hands?: string[]        // hand_mult, hand_mult_bonus, mult_boost
  threshold?: number       // score_mult
  count?: number          // suit_diverse_mult
  factor?: number         // mult_boost
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
```

- [ ] **Step 4: 创建 src/types/game.ts**

```typescript
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

export interface GameState {
  // 牌堆
  deck: DeckState
  // 选择
  selectedCards: Card[]
  // 分数
  roundScore: number
  totalScore: number
  targetScore: number
  handsRemaining: number
  // Joker 系统
  activeJokers: Joker[]
  money: number
  maxJokerSlots: number
  // 进度
  currentAnte: number
  currentBlindIndex: number
  // 商店
  shopItems: {
    jokers: Joker[]
    tarotPlanet: TarotOrPlanet | null
  }
  // 升级
  handLevelBonus: Record<string, number>
  tarotEffects: TarotEffect
  nextHandTypeOverride: string | null
  // 最后结果
  lastResult: import('./hand').HandResult | null
  lastScore: import('./scoring').ScoreResult | null
}

export interface TarotOrPlanet {
  id: string
  name: string
  type: 'tarot' | 'planet'
  price: number
  // Tarot 特有
  effect?: string
  desc?: string
  // Planet 特有
  handType?: string
  bonus?: number
}
```

- [ ] **Step 5: 创建 src/types/scoring.ts**

```typescript
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

export interface JokerContext {
  mult: number
  bonus: number
  boostFactor: number
  triggered: JokerTriggered[]
}

export interface JokerTriggered {
  joker: import('./joker').Joker
  jokerMult: number
  jokerBonus: number
}
```

- [ ] **Step 6: 提交**

```bash
git add src/types/ && git commit -m "feat: 创建 TypeScript 类型定义"
```

---

## Phase B：常量数据

### Task 3: 迁移常量数据

**Files:**
- Create: `src/constants/handTypes.ts`, `src/constants/jokers.ts`, `src/constants/tarots.ts`, `src/constants/planets.ts`

- [ ] **Step 1: 创建 src/constants/handTypes.ts**

```typescript
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
```

- [ ] **Step 2: 创建 src/constants/jokers.ts**

迁移 main.js 中的 22 张 Joker 数据，保持完全一致。

- [ ] **Step 3: 创建 src/constants/tarots.ts**

迁移 15 张 Tarot 数据。

- [ ] **Step 4: 创建 src/constants/planets.ts**

迁移 10 张 Planet 数据。

- [ ] **Step 5: 提交**

```bash
git add src/constants/ && git commit -m "feat: 迁移常量数据"
```

---

## Phase C：纯逻辑引擎

### Task 4: 手牌判定引擎

**Files:**
- Create: `src/engine/HandEvaluator.test.ts`, `src/engine/HandEvaluator.ts`

- [ ] **Step 1: 创建测试 src/engine/HandEvaluator.test.ts**

```typescript
import { describe, it, expect } from 'vitest'
import { createCard, SUITS, RANKS } from '../types/card'
import { HandEvaluator } from './HandEvaluator'
import { HAND_TYPES } from '../constants/handTypes'

function makeCard(rankIdx: number, suitIdx: number = 0) {
  return createCard(SUITS[suitIdx], RANKS[rankIdx])
}

describe('HandEvaluator', () => {
  const evaluator = new HandEvaluator()

  it('判定皇家同花顺', () => {
    const hand = [
      makeCard(8, 0),  // 10
      makeCard(9, 0),  // J
      makeCard(10, 0), // Q
      makeCard(11, 0), // K
      makeCard(12, 0), // A
    ]
    const result = evaluator.evaluate(hand)
    expect(result.type).toEqual(HAND_TYPES.ROYAL_FLUSH)
  })

  it('判定同花顺', () => {
    const hand = [
      makeCard(0, 0),  // 2
      makeCard(1, 0),  // 3
      makeCard(2, 0),  // 4
      makeCard(3, 0),  // 5
      makeCard(4, 0),  // 6 (不是皇家同花顺)
    ]
    const result = evaluator.evaluate(hand)
    expect(result.type.name).toBe('同花顺')
    expect(result.type.name).not.toBe('皇家同花顺')
  })

  it('判定四条', () => {
    const hand = [
      makeCard(0, 0), makeCard(0, 1), makeCard(0, 2), makeCard(0, 3), makeCard(1, 0),
    ]
    const result = evaluator.evaluate(hand)
    expect(result.type).toEqual(HAND_TYPES.FOUR_OF_A_KIND)
  })

  it('判定葫芦', () => {
    const hand = [
      makeCard(0, 0), makeCard(0, 1), makeCard(0, 2), // 三条 2
      makeCard(1, 0), makeCard(1, 1), // 一对 3
    ]
    const result = evaluator.evaluate(hand)
    expect(result.type).toEqual(HAND_TYPES.FULL_HOUSE)
  })

  it('判定同花（非顺子）', () => {
    const hand = [
      makeCard(0, 0), makeCard(2, 0), makeCard(5, 0), makeCard(8, 0), makeCard(11, 0),
    ]
    const result = evaluator.evaluate(hand)
    expect(result.type).toEqual(HAND_TYPES.FLUSH)
    expect(result.type.name).not.toBe('同花顺')
  })

  it('判定顺子（普通）', () => {
    const hand = [
      makeCard(0, 0), makeCard(1, 1), makeCard(2, 2), makeCard(3, 3), makeCard(4, 0),
    ]
    const result = evaluator.evaluate(hand)
    expect(result.type).toEqual(HAND_TYPES.STRAIGHT)
  })

  it('判定 A-2-3-4-5 小顺子', () => {
    const hand = [
      makeCard(12, 0), // A
      makeCard(0, 0),  // 2
      makeCard(1, 0),  // 3
      makeCard(2, 0),  // 4
      makeCard(3, 0),  // 5
    ]
    const result = evaluator.evaluate(hand)
    expect(result.type).toEqual(HAND_TYPES.STRAIGHT)
    expect(result.kicker).toBe(5) // 小顺子最高是 5
  })

  it('判定三条', () => {
    const hand = [
      makeCard(0, 0), makeCard(0, 1), makeCard(0, 2), makeCard(1, 0), makeCard(2, 0),
    ]
    const result = evaluator.evaluate(hand)
    expect(result.type).toEqual(HAND_TYPES.THREE_OF_A_KIND)
  })

  it('判定两对', () => {
    const hand = [
      makeCard(0, 0), makeCard(0, 1), makeCard(1, 0), makeCard(1, 1), makeCard(2, 0),
    ]
    const result = evaluator.evaluate(hand)
    expect(result.type).toEqual(HAND_TYPES.TWO_PAIR)
  })

  it('判定一对', () => {
    const hand = [
      makeCard(0, 0), makeCard(0, 1), makeCard(1, 0), makeCard(2, 0), makeCard(3, 0),
    ]
    const result = evaluator.evaluate(hand)
    expect(result.type).toEqual(HAND_TYPES.ONE_PAIR)
  })

  it('判定高牌', () => {
    const hand = [
      makeCard(12, 0), makeCard(0, 1), makeCard(2, 2), makeCard(5, 0), makeCard(8, 1),
    ]
    const result = evaluator.evaluate(hand)
    expect(result.type).toEqual(HAND_TYPES.HIGH_CARD)
  })

  it('1张牌只算面值', () => {
    const hand = [makeCard(12, 0)]
    const result = evaluator.evaluate(hand)
    expect(result.type.name).toBe('单张')
    expect(result.faceValue).toBe(14)
  })

  it('3张牌判定三条', () => {
    const hand = [makeCard(0, 0), makeCard(0, 1), makeCard(0, 2)]
    const result = evaluator.evaluate(hand)
    expect(result.type).toEqual(HAND_TYPES.THREE_OF_A_KIND)
  })

  it('4张牌判定四条', () => {
    const hand = [makeCard(0, 0), makeCard(0, 1), makeCard(0, 2), makeCard(0, 3)]
    const result = evaluator.evaluate(hand)
    expect(result.type).toEqual(HAND_TYPES.FOUR_OF_A_KIND)
  })

  it('计算面值分', () => {
    const hand = [
      makeCard(0, 0),  // 2
      makeCard(1, 0),  // 3
      makeCard(2, 0),  // 4
      makeCard(3, 0),  // 5
      makeCard(4, 0),  // 6
    ]
    const result = evaluator.evaluate(hand)
    expect(result.faceValue).toBe(2 + 3 + 4 + 5 + 6)
  })
})
```

- [ ] **Step 2: 创建 src/engine/HandEvaluator.ts**

从 main.js 迁移 `HandEvaluator` 类，保持逻辑完全一致。

关键方法：
- `evaluate(hand: Card[]): HandResult`
- `checkFlush(hand: Card[]): boolean`
- `checkStraight(hand: Card[]): { highest: number, type: string } | null`
- `groupByRank(hand: Card[]): Record<number, Card[]>`

- [ ] **Step 3: 运行测试**

```bash
npm test -- src/engine/HandEvaluator.test.ts
```

应全部通过（15 个测试）

- [ ] **Step 4: 提交**

```bash
git add src/engine/ && git commit -m "feat: 实现手牌判定引擎及单元测试"
```

---

### Task 5: 牌堆管理引擎

**Files:**
- Create: `src/engine/DeckManager.test.ts`, `src/engine/DeckManager.ts`

- [ ] **Step 1: 创建测试 src/engine/DeckManager.test.ts**

```typescript
import { describe, it, expect } from 'vitest'
import { DeckManager } from './DeckManager'

describe('DeckManager', () => {
  it('生成52张牌', () => {
    const dm = new DeckManager()
    dm.createDeck()
    expect(dm.deck.length).toBe(52)
  })

  it('洗牌后牌堆长度不变', () => {
    const dm = new DeckManager()
    dm.createDeck()
    const len = dm.deck.length
    dm.shuffle()
    expect(dm.deck.length).toBe(len)
  })

  it('发牌从牌堆移到手牌', () => {
    const dm = new DeckManager()
    dm.createDeck()
    dm.shuffle()
    dm.draw(5)
    expect(dm.hand.length).toBe(5)
    expect(dm.deck.length).toBe(47)
  })

  it('弃牌从手牌移到弃牌堆', () => {
    const dm = new DeckManager()
    dm.createDeck()
    dm.draw(5)
    const card = dm.hand[0]
    dm.discardCards([card])
    expect(dm.hand.length).toBe(4)
    expect(dm.discard.length).toBe(1)
  })

  it('重洗将弃牌堆移回牌堆', () => {
    const dm = new DeckManager()
    dm.createDeck()
    dm.draw(10)
    dm.discardCards(dm.hand.slice(0, 5))
    dm.reset()
    expect(dm.deck.length).toBe(52)
    expect(dm.discard.length).toBe(0)
  })
})
```

- [ ] **Step 2: 创建 src/engine/DeckManager.ts**

从 main.js 迁移 `DeckManager` 类。

- [ ] **Step 3: 运行测试**

```bash
npm test -- src/engine/DeckManager.test.ts
```

- [ ] **Step 4: 提交**

```bash
git add src/engine/ && git commit -m "feat: 实现牌堆管理引擎及单元测试"
```

---

### Task 6: 计分引擎

**Files:**
- Create: `src/engine/ScoringEngine.test.ts`, `src/engine/ScoringEngine.ts`

- [ ] **Step 1: 创建测试 src/engine/ScoringEngine.test.ts**

```typescript
import { describe, it, expect } from 'vitest'
import { ScoringEngine } from './ScoringEngine'
import { HAND_TYPES } from '../constants/handTypes'

describe('ScoringEngine', () => {
  const engine = new ScoringEngine()

  it('基础计分：base + faceValue', () => {
    const result = {
      type: HAND_TYPES.FLUSH,
      cards: [],
      faceValue: 30,
    }
    const score = engine.calculate(result, {}, null)
    expect(score.total).toBe(30 + 30) // base(30) + faceValue(30)
  })

  it('应用 Joker Mult', () => {
    const result = {
      type: HAND_TYPES.FLUSH,
      cards: [],
      faceValue: 30,
    }
    const jokerCtx = { mult: 2, bonus: 0, boostFactor: 0, triggered: [] }
    const score = engine.calculate(result, jokerCtx, null)
    // (30 + 30) * (1 + 2) = 180
    expect(score.total).toBe(180)
  })

  it('应用 Joker Bonus', () => {
    const result = {
      type: HAND_TYPES.FLUSH,
      cards: [],
      faceValue: 30,
    }
    const jokerCtx = { mult: 0, bonus: 50, boostFactor: 0, triggered: [] }
    const score = engine.calculate(result, jokerCtx, null)
    // (30 + 30) * (1 + 0) + 50 = 110
    expect(score.total).toBe(110)
  })

  it('Mult 和 Bonus 同时生效', () => {
    const result = {
      type: HAND_TYPES.FLUSH,
      cards: [],
      faceValue: 30,
    }
    const jokerCtx = { mult: 1, bonus: 20, boostFactor: 0, triggered: [] }
    const score = engine.calculate(result, jokerCtx, null)
    // (30 + 30) * (1 + 1) + 20 = 140
    expect(score.total).toBe(140)
  })

  it('应用 boostFactor', () => {
    const result = {
      type: HAND_TYPES.FLUSH,
      cards: [],
      faceValue: 30,
    }
    const jokerCtx = { mult: 2, bonus: 0, boostFactor: 0.5, triggered: [] }
    const score = engine.calculate(result, jokerCtx, null)
    // (30 + 30) * (1 + 2) * (1 + 0.5) = 270
    expect(score.total).toBe(270)
  })
})
```

- [ ] **Step 2: 创建 src/engine/ScoringEngine.ts**

从 main.js 迁移 `ScoringEngine` 类。

- [ ] **Step 3: 运行测试**

```bash
npm test -- src/engine/ScoringEngine.test.ts
```

- [ ] **Step 4: 提交**

```bash
git add src/engine/ && git commit -m "feat: 实现计分引擎及单元测试"
```

---

### Task 7: Joker 系统

**Files:**
- Create: `src/engine/JokerSystem.test.ts`, `src/engine/JokerSystem.ts`

- [ ] **Step 1: 创建 JokerSystem 测试**

测试各类型 Joker 效果触发逻辑。

- [ ] **Step 2: 创建 src/engine/JokerSystem.ts**

从 main.js 迁移 `JokerSystem` 类。

- [ ] **Step 3: 运行测试**

- [ ] **Step 4: 提交**

---

### Task 8: 其他引擎

**Files:**
- Create: `src/engine/BlindManager.ts`, `src/engine/ShopManager.ts`, `src/engine/TarotSystem.ts`

- [ ] **Step 1: 创建 src/engine/BlindManager.ts**

从 main.js 迁移 `BlindManager` 类。

- [ ] **Step 2: 创建 src/engine/ShopManager.ts**

从 main.js 迁移 `ShopManager` 类。

- [ ] **Step 3: 创建 src/engine/TarotSystem.ts**

从 main.js 迁移 `TarotSystem` 类。

- [ ] **Step 4: 创建 src/engine/index.ts**

```typescript
export { DeckManager } from './DeckManager'
export { HandEvaluator } from './HandEvaluator'
export { ScoringEngine } from './ScoringEngine'
export { JokerSystem } from './JokerSystem'
export { BlindManager } from './BlindManager'
export { ShopManager } from './ShopManager'
export { TarotSystem } from './TarotSystem'
```

- [ ] **Step 5: 提交**

```bash
git add src/engine/ && git commit -m "feat: 完成引擎层迁移"
```

---

## Phase D：状态管理层

### Task 9: Zustand Store

**Files:**
- Create: `src/store/gameStore.ts`, `src/store/index.ts`

- [ ] **Step 1: 创建 src/store/gameStore.ts**

```typescript
import { create } from 'zustand'
import { Card } from '../types/card'
import { GameState, ScreenType, TarotOrPlanet } from '../types/game'
import { DeckManager } from '../engine/DeckManager'
import { HandEvaluator } from '../engine/HandEvaluator'
import { ScoringEngine } from '../engine/ScoringEngine'
import { JokerSystem } from '../engine/JokerSystem'
import { BlindManager } from '../engine/BlindManager'
import { ShopManager } from '../engine/ShopManager'
import { TarotSystem } from '../engine/TarotSystem'
import { HAND_TYPES } from '../constants/handTypes'
import { GameState as GameStateClass } from '../types/game'

interface GameStore {
  // 状态
  screen: ScreenType
  deck: DeckManager
  hand: Card[]
  selectedCards: Card[]
  totalScore: number
  targetScore: number
  handsRemaining: number
  activeJokers: import('../types/joker').Joker[]
  money: number
  currentAnte: number
  currentBlindIndex: number
  shopItems: { jokers: import('../types/joker').Joker[]; tarotPlanet: TarotOrPlanet | null }
  handLevelBonus: Record<string, number>
  tarotEffects: import('../types/game').TarotEffect
  lastResult: import('../types/hand').HandResult | null
  lastScore: import('../types/scoring').ScoreResult | null
  lastJokerContext: import('../types/scoring').JokerContext | null

  // Actions
  startGame: () => void
  selectCard: (card: Card) => void
  playHand: () => void
  nextStep: () => void
  continueGame: () => void
  sortHand: (by: 'suit' | 'rank') => void
  selectBlind: (index: number) => void
  confirmAnte: () => void
  backToAnteSelect: () => void
  buyItem: (type: 'joker' | 'tarotPlanet', index: number) => void
  leaveShop: () => void
  backToTitle: () => void
  enterShop: () => void

  // 内部
  _setScreen: (screen: ScreenType) => void
  _initBlind: (blindIndex: number) => void
}
```

实现所有 actions，逻辑从 main.js 的 `Game` 类迁移。

- [ ] **Step 2: 创建 src/store/index.ts**

```typescript
export { useGameStore } from './gameStore'
```

- [ ] **Step 3: 提交**

```bash
git add src/store/ && git commit -m "feat: 实现 Zustand 状态管理"
```

---

## Phase E：React 组件

### Task 10: 基础 UI 组件

**Files:**
- Create: `src/components/ui/Button.tsx`, `src/components/ui/StatusBar.tsx`, `src/components/ui/ProgressBar.tsx`, `src/components/ui/ScorePanel.tsx`

- [ ] **Step 1: 创建 src/components/ui/Button.tsx**

```tsx
import React from 'react'
import './Button.css'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  size?: 'normal' | 'small'
}

export function Button({ variant = 'primary', size = 'normal', className = '', children, ...props }: ButtonProps) {
  const classes = [
    'btn',
    variant === 'primary' ? 'btn-primary' : 'btn-secondary',
    size === 'small' ? 'btn-small' : '',
    className,
  ].filter(Boolean).join(' ')

  return <button className={classes} {...props}>{children}</button>
}
```

- [ ] **Step 2: 批量创建其他 UI 组件**

- [ ] **Step 3: 提交**

---

### Task 11: 扑克牌组件

**Files:**
- Create: `src/components/card/Card.tsx`, `src/components/card/Card.css`, `src/components/card/CardContainer.tsx`

- [ ] **Step 1: 创建 Card.tsx**

```tsx
import React from 'react'
import { Card as CardType } from '../../types/card'
import './Card.css'

interface CardProps {
  card: CardType
  selected: boolean
  onClick: () => void
  style?: React.CSSProperties
}

export function Card({ card, selected, onClick, style }: CardProps) {
  return (
    <div
      className={`card ${card.isRed ? 'red' : 'black'} ${selected ? 'selected' : ''}`}
      onClick={onClick}
      style={style}
    >
      <div className="corner top">
        <span className="rank">{card.rank}</span>
        <span className="suit">{card.suit}</span>
      </div>
      <span className="center-suit">{card.suit}</span>
      <div className="corner bottom">
        <span className="rank">{card.rank}</span>
        <span className="suit">{card.suit}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 Card.css**（从 index.css 提取 .card 相关样式）

- [ ] **Step 3: 创建 CardContainer.tsx**

- [ ] **Step 4: 提交**

---

### Task 12: Joker 组件

**Files:**
- Create: `src/components/joker/JokerSlot.tsx`, `src/components/joker/JokerArea.tsx`, `src/components/joker/JokerSlot.css`

- [ ] **Step 1: 创建 JokerSlot.tsx**

- [ ] **Step 2: 创建 JokerArea.tsx**

- [ ] **Step 3: 提交**

---

### Task 13: Screen 组件

**Files:**
- Create: `src/components/screens/TitleScreen.tsx`, `src/components/screens/PlayingScreen.tsx`, `src/components/screens/ScoringScreen.tsx`, `src/components/screens/ShopScreen.tsx`, `src/components/screens/GameOverScreen.tsx`, `src/components/screens/VictoryScreen.tsx`, `src/components/screens/AnteSelect.tsx`, `src/components/screens/BlindSelect.tsx`

- [ ] **Step 1: 创建 PlayingScreen.tsx**（最核心）

```tsx
import React from 'react'
import { useGameStore } from '../../store'
import { Card } from '../card/Card'
import { JokerArea } from '../joker/JokerArea'
import { StatusBar } from '../ui/StatusBar'
import { ProgressBar } from '../ui/ProgressBar'
import { ScorePanel } from '../ui/ScorePanel'
import { Button } from '../ui/Button'
import './PlayingScreen.css'

export function PlayingScreen() {
  const {
    hand,
    selectedCards,
    selectCard,
    playHand,
    continueGame,
    sortHand,
    totalScore,
    targetScore,
    handsRemaining,
    money,
    currentAnte,
    deck,
  } = useGameStore()

  const progress = Math.min(100, (totalScore / targetScore) * 100)

  return (
    <div className="game-content">
      <StatusBar
        currentAnte={currentAnte}
        blindName={['Small Blind', 'Big Blind', 'Boss Blind'][0]}
        targetScore={targetScore}
        totalScore={totalScore}
        handsRemaining={handsRemaining}
        money={money}
      />
      <ProgressBar value={progress} text={`${totalScore} / ${targetScore}`} />
      <ScorePanel selectedCards={selectedCards} />
      <JokerArea />
      <div className="hand-area">
        <div className="hand-label">
          手牌（已选 {selectedCards.length} 张）
        </div>
        <div className="cards-container">
          {hand.map((card, i) => (
            <Card
              key={card.id}
              card={card}
              selected={selectedCards.includes(card)}
              onClick={() => selectCard(card)}
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
      <div className="actions">
        <Button onClick={playHand} disabled={selectedCards.length < 1}>
          出牌 ({selectedCards.length}张)
        </Button>
        <Button variant="secondary" size="small" onClick={continueGame}>
          补牌继续
        </Button>
        <Button variant="secondary" size="small" onClick={() => sortHand('suit')}>
          ♠♥ 理牌
        </Button>
        <Button variant="secondary" size="small" onClick={() => sortHand('rank')}>
          A-K 理牌
        </Button>
      </div>
      <div className="action-hint">按空格键快速出牌</div>
    </div>
  )
}
```

- [ ] **Step 2: 批量创建其他 Screen 组件**

- [ ] **Step 3: 提交**

---

### Task 14: 游戏主容器

**Files:**
- Create: `src/components/Game.tsx`

- [ ] **Step 1: 创建 src/components/Game.tsx**

```tsx
import React from 'react'
import { useGameStore } from '../store'
import { TitleScreen } from './screens/TitleScreen'
import { AnteSelect } from './screens/AnteSelect'
import { BlindSelect } from './screens/BlindSelect'
import { PlayingScreen } from './screens/PlayingScreen'
import { ScoringScreen } from './screens/ScoringScreen'
import { ShopScreen } from './screens/ShopScreen'
import { GameOverScreen } from './screens/GameOverScreen'
import { VictoryScreen } from './screens/VictoryScreen'

export function Game() {
  const screen = useGameStore(s => s.screen)

  switch (screen) {
    case 'TITLE':       return <TitleScreen />
    case 'ANTE_SELECT': return <AnteSelect />
    case 'BLIND_SELECT': return <BlindSelect />
    case 'PLAYING':    return <PlayingScreen />
    case 'SCORING':    return <ScoringScreen />
    case 'SHOP':       return <ShopScreen />
    case 'GAME_OVER':  return <GameOverScreen />
    case 'VICTORY':    return <VictoryScreen />
    default:            return <TitleScreen />
  }
}
```

- [ ] **Step 2: 更新 src/App.tsx**

```tsx
import { Game } from './components/Game'

function App() {
  return <Game />
}

export default App
```

- [ ] **Step 3: 验证开发服务器**

```bash
npm run dev
```

确保 http://localhost:5173 能正常打开游戏

- [ ] **Step 4: 提交**

```bash
git add src/components/ && git commit -m "feat: 实现 React 组件层"
```

---

### Task 15: 键盘快捷键 Hook

**Files:**
- Create: `src/hooks/useKeyboard.ts`

- [ ] **Step 1: 创建 useKeyboard.ts**

```typescript
import { useEffect } from 'react'
import { useGameStore } from '../store'

export function useKeyboard() {
  const screen = useGameStore(s => s.screen)
  const playHand = useGameStore(s => s.playHand)
  const selectBlind = useGameStore(s => s.selectBlind)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && screen === 'PLAYING') {
        e.preventDefault()
        playHand()
      }
      if (screen === 'BLIND_SELECT') {
        if (e.key === '1') selectBlind(0)
        if (e.key === '2') selectBlind(1)
        if (e.key === '3') selectBlind(2)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [screen, playHand, selectBlind])
}
```

- [ ] **Step 2: 在 Game.tsx 中使用**

```tsx
import { useKeyboard } from '../hooks/useKeyboard'
// ...
export function Game() {
  useKeyboard()
  // ...
}
```

- [ ] **Step 3: 提交**

---

## Phase F：收尾

### Task 16: Playwright E2E 测试验证

**Files:**
- Run: Playwright 测试（不修改，只验证）

- [ ] **Step 1: 验证 Playwright 测试**

确保现有 E2E 测试仍能通过。由于 CSS class 名不变，DOM 结构基本一致，测试应通过。

- [ ] **Step 2: 提交**

---

### Task 17: 更新文档

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 更新 CLAUDE.md**

将技术栈部分更新为 TypeScript + React + Vite，移除单文件描述。

- [ ] **Step 2: 更新项目文件表格**

- [ ] **Step 3: 提交**

---

## 任务清单汇总

| # | 任务 | 阶段 |
|---|------|------|
| 0 | 创建 Vite 项目 | 前置 |
| 1 | 迁移样式文件 | 前置 |
| 2 | 创建类型定义 | A |
| 3 | 迁移常量数据 | B |
| 4 | 手牌判定引擎 | C |
| 5 | 牌堆管理引擎 | C |
| 6 | 计分引擎 | C |
| 7 | Joker 系统 | C |
| 8 | 其他引擎 | C |
| 9 | Zustand Store | D |
| 10 | 基础 UI 组件 | E |
| 11 | 扑克牌组件 | E |
| 12 | Joker 组件 | E |
| 13 | Screen 组件 | E |
| 14 | 游戏主容器 | E |
| 15 | 键盘快捷键 Hook | E |
| 16 | E2E 测试验证 | F |
| 17 | 更新文档 | F |
