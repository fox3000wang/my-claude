# CLAUDE.md

本项目是一个网页版小丑牌（Joker Poker / Balatro-like）Roguelike 扑克牌游戏。

---

## 项目概述

玩家通过出扑克手牌获得分数，击败 8 个 Ante（每 Ante 含 Small/Big/Boss 3 个 Blind），收集并组合 Joker 卡牌构建强力 Combo，在有限出牌次数内达到目标分数通关。

---

## 技术栈

- **框架**：Vite + React 18 + TypeScript 5（strict mode）
- **状态管理**：Zustand
- **测试**：Vitest（单元测试）+ Playwright（E2E）
- **构建**：单页面应用，输出 `dist/`
- **字体**：Google Fonts（Inter + Oswald）
- **图标**：纯 CSS + Unicode（♠ ♥ ♦ ♣）
- **存档**：LocalStorage

---

## 核心规则

### 扑克牌系统

- 标准 52 张（无大小王），4 种花色，13 种面值
- 面值分：2-10=面值数字，J=11, Q=12, K=13, A=14
- A 支持 A-2-3-4-5 小顺子

### 手牌判定（德州扑克风格，按牌数判定）

| 牌数 | 可判定牌型 |
|------|-----------|
| 5张 | 皇家同花顺(100) → 同花顺(80) → 四条(60) → 葫芦(40) → 同花(30) → 顺子(30) → 三条(20) → 两对(15) → 一对(10) → 高牌(5) |
| 4张 | 四条 → 三条 → 两对 → 一对 → 高牌 |
| 3张 | 三条 → 一对 → 高牌 |
| 2张 | 一对 → 高牌 |
| 1张 | 单张（面值分） |

### 计分公式

```
最终得分 = 基础分 + 面值分（5张完整手牌）
最终得分 = 基础分 + 面值分（1-4张德州风判定）
```

### 玩法

- 每次出牌选 **1-5 张手牌**
- 每局共 **4 次出牌机会**
- 目标分数达到 **300 分** 获胜
- 可随时点击「补牌继续」重新洗牌
- **自动理牌**：开局发牌和每次补牌后，自动按面值（A→K）排序

---

## 游戏状态

```
TITLE → PLAYING → SCORING → (继续/结束)
                              ↓
                     GAME_OVER / VICTORY
```

---

## 已实现功能 (Phase 1 MVP)

- [x] 52张扑克牌生成与洗牌
- [x] 1-5张牌德州扑克风格判定
- [x] 计分系统（基础分 + 面值分）
- [x] 手牌选择（点击选中/取消）
- [x] 补牌继续机制
- [x] 胜负判定
- [x] 分数动画展示
- [x] 键盘支持（空格出牌）
- [x] 响应式布局（适配手机）
- [x] 无障碍支持（prefers-reduced-motion）

## 已实现功能 (Phase 2: Joker 系统)

- [x] 22 张 Joker 卡牌数据定义（8 Common / 7 Uncommon / 6 Rare）
- [x] JokerSystem 效果触发器（10 种效果类型）
- [x] Joker 槽位渲染（稀有度边框颜色）
- [x] Joker 实时预览（选牌时显示预估分数）
- [x] Joker 触发动画（计分时闪烁）
- [x] 集成计分引擎：(base + faceValue) × (1 + mult) × (1 + boost) + bonus
- [x] Joker 效果分型展示（Mult/Bonus 分步计分）

## 已实现功能 (Phase 3: Roguelike 完整流程)

- [x] 3 Ante × 3 Blind（Small → Big → Boss 顺序完成）
- [x] 目标分递增（Ante 1: 100/200/100，Ante 2: 150/300/150，Ante 3: 200/400/200）
  - 注：无 Joker 时，计分公式 total = base + faceValue，Boss Blind 校准至 100/150/200 确保可完成
- [x] 经济系统（每 Ante +$4，Small/Big/Boss 奖励 $3/$4/$5）
- [x] 商店系统（2 Joker + 1 Tarot/Planet）
- [x] 15 张 Tarot 卡效果（即时 + 临时加成）
- [x] 10 张 Planet 卡永久升级
- [x] Boss Blind 跳过扣 $2
- [x] 出牌后自动继续（1.5s 后自动补牌）
- [x] 自动理牌（开局发牌 + 每次补牌后，自动按面值 A→K 排序）
- [x] 手动理牌（按花色 ♠♥ / 按面值 A-K）

---

## 待实现功能

### Phase 4: 完整 Balatro 对齐
- 8 个 Ante（当前 MVP 为 3 Ante）
- Boss Blind 负面效果（8 种规则）
- 生命值机制（4 ♥）

### Phase 5: 视觉打磨
- 完整动画系统
- 音效（Web Audio API）
- 暗黑霓虹视觉风格

### Phase 6: 体验增强
- LocalStorage 存档
- 更多 Joker 变体
- 5 个道具（Voucher）

---

## 项目文件

| 文件 | 说明 |
|------|------|
| `src/` | React 组件、引擎、hooks |
| `src/engine/` | 游戏引擎（DeckManager、ScoringEngine、BlindManager、JokerSystem） |
| `src/store/gameStore.ts` | Zustand 全局状态 |
| `src/components/` | React 组件（screens/、joker/、ui/） |
| `src/hooks/useKeyboard.ts` | 键盘快捷键 Hook |
| `index.html` | HTML 入口 |
| `vite.config.ts` | Vite 配置 |
| `SPEC.md` | 完整设计规格说明书 |
| `CLAUDE.md` | 本文件 |
| `tests/game.test.ts` | 核心逻辑单元测试（Vitest） |
| `tests/e2e/game/*.spec.ts` | Playwright E2E 测试（31 个测试全通过） |
| `playwright.config.ts` | E2E 测试配置 |

---

## 开发规范

### 代码组织（src/ 目录结构）

```
src/
├── engine/          # 游戏核心引擎（纯函数，无副作用）
│   ├── DeckManager.ts
│   ├── ScoringEngine.ts
│   ├── BlindManager.ts
│   └── JokerSystem.ts
├── constants/       # 常量数据
│   └── handTypes.ts
├── store/           # Zustand 状态管理
│   └── gameStore.ts
├── components/      # React 组件
│   ├── screens/     # 5 个游戏屏幕
│   ├── joker/       # Joker 相关组件
│   └── ui/          # 通用 UI 组件
├── hooks/           # React Hooks
│   └── useKeyboard.ts
└── App.tsx
```

引擎层（`engine/`）为纯 TypeScript，无 React 依赖，便于单元测试。

### 命名规范

- 类名：PascalCase（`Card`、`DeckManager`）
- 方法名：camelCase（`drawCards`、`evaluate`）
- CSS 类：kebab-case（`.card-selected`）

### Git 提交规范

格式: `<type>: <subject>`（subject 使用简体中文）

type:
- feat: 新功能
- fix: 修复 bug
- docs: 文档更新
- style: 代码格式（不影响逻辑）
- refactor: 重构
- test: 测试相关
- chore: 构建/工具变动

---

## 禁止行为

- 不要在源代码中硬编码敏感信息
- 不要引入外部图片资源
- 不要跳过核心逻辑测试直接提交
