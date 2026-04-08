# TypeScript + React 架构改造设计方案

**日期**: 2026-04-09
**状态**: 设计中
**目标**: 重构代码结构，为 Phase 4（8 Ante、Boss 负面效果、生命值）快速迭代铺路

---

## 1. 背景与目标

当前项目为单文件 HTML/CSS/JS (`main.js` ~1000 行)，包含：
- 游戏逻辑（扑克牌生成、洗牌、手牌判定、计分引擎）
- Joker 系统（22 张卡牌、效果触发器）
- Roguelike 流程（Ante/Blind/商店）
- UI 渲染（RenderEngine 类）

**改造目标**：
- 代码按领域拆分，职责清晰
- TypeScript 严格类型，消除隐式 any
- React 组件化 UI 层
- 不改变任何游戏规则和逻辑

---

## 2. 技术选型

| 技术 | 选择 | 理由 |
|------|------|------|
| 构建工具 | Vite | 极速 HMR、TypeScript 原生支持 |
| UI 框架 | React 18 | 社区成熟，组件化友好 |
| 类型语言 | TypeScript 5 (strict) | 编译时类型检查 |
| 状态管理 | Zustand | 轻量、React 18 兼容、无样板代码 |
| 样式方案 | CSS Modules | 作用域样式隔离，不改现有 class 名 |
| 测试 | 保留现有 tests/ | E2E 测试不变，逻辑层写单元测试 |

**不引入**：Redux（过度设计）、Tailwind（需新增配置）、Next.js（SSR 没必要）

---

## 3. 项目结构

```
src/
├── main.tsx                    # 入口，渲染 App
├── App.tsx                     # 根组件，游戏状态集成
├── index.css                   # 全局样式（从 style.css 迁移）
│
├── types/                      # 类型定义
│   ├── card.ts                 # Card, Deck, Suit, Rank 类型
│   ├── hand.ts                 # HandType, HandResult 类型
│   ├── joker.ts                # Joker, JokerEffect, Rarity 类型
│   ├── game.ts                 # GameState, Blind, Ante, Shop 类型
│   └── tarot.ts                # Tarot, Planet 类型
│
├── engine/                     # 纯逻辑层（无 React 依赖）
│   ├── DeckManager.ts          # 洗牌、发牌、弃牌
│   ├── HandEvaluator.ts        # 手牌判定（1-5 张）
│   ├── ScoringEngine.ts        # 计分公式
│   ├── JokerSystem.ts          # Joker 效果触发器
│   ├── TarotSystem.ts          # Tarot/Planet 效果
│   ├── BlindManager.ts         # Ante/Blind 进度
│   └── ShopManager.ts          # 商店生成与购买
│
├── constants/                  # 常量数据
│   ├── suits.ts                # SUITS, RANKS
│   ├── handTypes.ts            # HAND_TYPES 定义
│   ├── jokers.ts               # 22 张 Joker 数据
│   ├── tarot.ts                # 15 张 Tarot 数据
│   └── planets.ts               # 10 张 Planet 数据
│
├── store/                      # Zustand 状态管理
│   └── gameStore.ts            # 游戏状态 store（唯一真相源）
│
├── hooks/                      # React hooks 封装
│   ├── useGameState.ts         # 游戏状态读取
│   ├── usePreviewScore.ts      # 选牌预览分数计算
│   └── useKeyboard.ts          # 键盘快捷键
│
├── components/                 # React 组件
│   ├── Game.tsx                # 游戏主容器（状态机路由）
│   ├── screens/
│   │   ├── TitleScreen.tsx     # 标题画面
│   │   ├── AnteSelect.tsx      # Ante 选择
│   │   ├── BlindSelect.tsx     # Blind 选择
│   │   ├── PlayingScreen.tsx    # 出牌界面
│   │   ├── ScoringScreen.tsx   # 计分展示
│   │   ├── ShopScreen.tsx      # 商店
│   │   ├── GameOverScreen.tsx  # 失败画面
│   │   └── VictoryScreen.tsx   # 胜利画面
│   ├── card/
│   │   ├── Card.tsx            # 单张扑克牌组件
│   │   └── CardContainer.tsx   # 手牌容器
│   ├── joker/
│   │   ├── JokerSlot.tsx       # Joker 槽位
│   │   └── JokerArea.tsx       # Joker 展示区
│   └── ui/
│       ├── StatusBar.tsx       # 状态栏
│       ├── ProgressBar.tsx     # 进度条
│       ├── ScorePanel.tsx      # 计分面板
│       ├── Button.tsx          # 按钮组件
│       └── HandArea.tsx        # 手牌区域
│
└── utils/                      # 工具函数
    └── format.ts               # 数字格式化等
```

**迁移顺序原则**：
1. `constants/` → `types/` → `engine/`（纯逻辑，先迁）
2. `store/`（状态管理层）
3. `hooks/`（UI 与逻辑的桥接）
4. `components/`（UI，最后迁）

---

## 4. 状态管理设计

使用 Zustand 作为单一 store，避免 React Context 嵌套地狱：

```typescript
// store/gameStore.ts
interface GameStore {
  // 状态
  gameState: GameState;
  screen: ScreenType; // 'TITLE' | 'ANTE_SELECT' | 'PLAYING' | ...

  // Actions
  startGame: () => void;
  selectCard: (index: number) => void;
  playHand: () => void;
  continueGame: () => void;
  selectBlind: (index: number) => void;
  buyItem: (type: 'joker' | 'tarotPlanet', index: number) => void;
  // ...
}
```

**GameState 不变**：直接复用现有的 `GameState` 类逻辑，只做类型化。

---

## 5. 组件设计

### Game.tsx（状态机路由）
```tsx
function Game() {
  const screen = useGameState(s => s.screen);
  switch (screen) {
    case 'TITLE':      return <TitleScreen />;
    case 'PLAYING':    return <PlayingScreen />;
    case 'SCORING':    return <ScoringScreen />;
    // ...
  }
}
```

### PlayingScreen.tsx
```tsx
function PlayingScreen() {
  const { hand, selectedCards, selectCard } = useGame();

  return (
    <div className="hand-area">
      <HandArea>
        {hand.map((card, i) => (
          <Card
            key={card.id}
            card={card}
            selected={selectedCards.includes(card)}
            onClick={() => selectCard(i)}
          />
        ))}
      </HandArea>
      {/* 动作按钮、Joker 区域等 */}
    </div>
  );
}
```

**数据流向**：
```
User Click → useGame().selectCard() → store 更新 → React 自动 re-render
```

---

## 6. 样式迁移策略

1. `style.css` → `src/index.css`（全局样式保留，class 名不变）
2. 组件级别样式用 `*.module.css`（如 `Card.module.css`）
3. **不改变现有 class 名**：保持与 Playwright E2E 测试兼容

---

## 7. 测试策略

| 测试类型 | 工具 | 迁移方式 |
|---------|------|---------|
| 单元测试 | Vitest | 迁移 `tests/game.test.js` 逻辑到 `engine/` 目录的 `*.test.ts` |
| E2E 测试 | Playwright | **不改动** — CSS selector 不变，React 渲染后的 DOM 一致 |
| 组件测试 | Vitest + Testing Library | 新增 Phase 4 功能时编写 |

---

## 8. 迁移步骤（分阶段）

### Phase A：脚手架
- [ ] 创建 Vite + React + TypeScript 项目
- [ ] 安装依赖：zustand, vitest, @testing-library/react
- [ ] 迁移 `style.css` → `src/index.css`

### Phase B：核心逻辑迁移
- [ ] 创建 `src/types/` 类型定义
- [ ] 迁移 `src/engine/`（纯逻辑，无 React）
- [ ] 编写 engine 单元测试（Vitest）

### Phase C：状态层
- [ ] 创建 `src/store/gameStore.ts`
- [ ] 迁移 `constants/` 数据

### Phase D：React 组件
- [ ] 创建 `src/components/` 基础组件
- [ ] 创建各 `screens/` 页面组件
- [ ] 集成键盘快捷键 hook

### Phase E：测试迁移
- [ ] Playwright E2E 测试验证（不改动，只验证通过）
- [ ] 更新 CLAUDE.md 文档

---

## 9. 关键设计决策

1. **engine 层绝对纯函数**：不接受 React 依赖，不使用 hooks，便于单元测试
2. **store 是唯一真相源**：所有组件从 Zustand 读取状态，通过 action 修改
3. **保持现有游戏规则**：完全不改动 `HandEvaluator`、`ScoringEngine` 的计算逻辑
4. **CSS class 名兼容**：确保 Playwright 测试继续工作

---

## 10. 风险与缓解

| 风险 | 缓解 |
|------|------|
| E2E 测试失败 | 保留原有 class 名，CSS 不改名 |
| 状态迁移出错 | engine 层先写单元测试覆盖 |
| 性能下降 | React re-render 通过 Zustand selector 精确控制 |
