# Phase 3 设计方案：小丑牌完整 Roguelike 流程

> 日期：2026-04-08
> 状态：已批准

## 1. 概述

### 目标
将单局游戏扩展为完整的 Roguelike 流程，验证 Ante/Blind/商店核心循环。

### MVP 范围（3 Ante）
- 3 个 Ante，每个 Ante 含 3 个 Blind（Small → Big → Boss 必须依次完成）
- 目标分数：Ante 1 = 100，Ante 2 = 200，Ante 3 = 400
- 商店每次进入刷新：2 Joker + 1 Tarot/Planet

### 继承设计
- 复用 Phase 1/2 全部逻辑（扑克牌系统、手牌判定、Joker 系统）
- 增量添加新状态和类，不修改已稳定代码

---

## 2. 状态机扩展

### 现有状态（保持不变）
```
TITLE | PLAYING | SCORING | ROUND_END | GAME_OVER | VICTORY
```

### 新增状态
| 状态 | 说明 |
|------|------|
| `ANTE_SELECT` | 选择进入当前 Ante，显示进度和 Joker |
| `BLIND_SELECT` | 选择 Small/Big/Boss |
| `SHOP` | 商店（购买 Joker/Tarot/Planet） |

### 完整状态转换图
```
TITLE
  ↓
ANTE_SELECT     — 显示当前 Ante (1-3)，Joker 列表，筹码
  ↓
BLIND_SELECT    — 选择 Small/Big/Boss 盲注
  ↓
DRAW_PHASE      — 抽 8 张牌
  ↓
PLAYING_PHASE   — 选择手牌
  ↓
SCORE_PHASE     — 计分（复用现有）
  ↓
ROUND_END       — 判断本 Blind 结果
  ↓
[本 Ante 3 Blind 全部完成?] → SHOP → ANTE_SELECT（下一个 Ante）
  │                                       ↓
  ├─ 本 Blind 未通过且无筹码 → GAME_OVER
  │
  └─ [还有未完成的 Blind?] → BLIND_SELECT（下一个 Blind）
                                    ↓
                    [3 Ante 完成?] → VICTORY
```

### 键盘支持
- 保留空格出牌
- 新增：数字键 1-3 选择 Blind

---

## 3. 数据模型扩展

### GameState 新增字段

```js
class GameState {
  // 新增字段
  ante: 1,                  // 当前 Ante (1-3)
  blindType: 'SMALL',       // SMALL | BIG | BOSS
  blindIndex: 0,            // 当前 Ante 内的 Blind 序号 (0=Small, 1=Big, 2=Boss)
  money: 4,                 // 当前筹码
  lives: 4,                 // 生命值（暂不使用，为 Phase 6 预留）
  shopItems: [],             // 当前商店商品

  // 保留字段
  activeJokers: [],         // Phase 2 已支持
  handLevelBonus: {},       // Planet 卡升级 { HAND_TYPE: bonus }
  tarotEffects: {},          // Tarot 临时效果 { type: value }
}
```

### HandType 扩展（Planet 卡升级）

```js
// 计分时叠加
const HAND_LEVELS = {
  ROYAL_FLUSH:    { level: 1, planetBonus: 0 },
  STRAIGHT_FLUSH: { level: 1, planetBonus: 0 },
  FOUR_OF_A_KIND: { level: 1, planetBonus: 0 },
  FULL_HOUSE:     { level: 1, planetBonus: 0 },
  FLUSH:          { level: 1, planetBonus: 0 },
  STRAIGHT:       { level: 1, planetBonus: 0 },
  THREE_OF_A_KIND: { level: 1, planetBonus: 0 },
  TWO_PAIR:       { level: 1, planetBonus: 0 },
  ONE_PAIR:       { level: 1, planetBonus: 0 },
  HIGH_CARD:      { level: 1, planetBonus: 0 }
};
```

---

## 4. BlindManager

### 职责
管理 3 Ante × 3 Blind 的目标分、奖励、进度推进。

### 目标分规则

> **简化说明**：SPEC.md 中原始公式为"每手 300 分，4 次出牌"，Phase 3 MVP 简化为每 Blind 单一目标分，累计达到即通过。

| Ante | Small Blind | Big Blind | Boss Blind |
|------|-------------|-----------|------------|
| 1    | 100         | 150       | 200        |
| 2    | 150         | 250       | 350        |
| 3    | 200         | 350       | 500        |

> 说明：与 SPEC.md 的 Phase 1 目标（300 分）保持一致区间，按 Ante 递增。

### 奖励规则

| Blind | 奖励筹码 | Boss 可跳过 |
|-------|---------|------------|
| Small | $3      | —          |
| Big   | $4      | —          |
| Boss  | $5      | -$2（跳过） |

### 经济规则

| 来源 | 筹码 |
|------|------|
| 每 Ante 开始 | +$4 |
| 击败 Small | +$3 |
| 击败 Big | +$4 |
| 击败 Boss | +$5 |
| 跳过 Boss | -$2 |

### 接口

```js
class BlindManager {
  constructor() {
    this.currentAnte = 1;
    this.currentBlindIndex = 0; // 0=Small, 1=Big, 2=Boss
  }

  getTargetScore() {
    // 根据 ante 和 blindIndex 返回目标分
  }

  getReward() {
    // 根据 blindIndex 返回奖励筹码
  }

  isAnteComplete() {
    return this.currentBlindIndex === 3;
  }

  advanceBlind() {
    this.currentBlindIndex++;
    if (this.currentBlindIndex > 2) {
      this.currentBlindIndex = 0;
      this.currentAnte++;
    }
  }

  reset() {
    this.currentAnte = 1;
    this.currentBlindIndex = 0;
  }
}
```

---

## 5. ShopManager

### 职责
生成商店商品、处理购买逻辑。

### 商店生成规则

每次进入商店刷新商品：
- **2 张随机 Joker**：按稀有度概率抽取（Common 60%, Uncommon 30%, Rare 10%），从已解锁 Joker 池排除已拥有的
- **1 张 Tarot 或 Planet**：50% Tarot / 50% Planet，从未拥有中随机

### Joker 池设计

- 初始可用 Joker：J001-J022 全部 22 张
- 已拥有的 Joker 不可重复购买
- Joker 价格：使用卡牌定义中的 `price` 字段

### Tarot/Planet 价格

| 类型 | 价格 |
|------|------|
| Tarot | $3-$5（根据效果强度） |
| Planet | $3-$6（根据升级强度） |

### Tarot 卡效果实现（15 张）

| 编号 | 名称 | 效果 | 价格 |
|------|------|------|------|
| T01 | The Fool | 从牌堆底部抽 1 张牌 | $3 |
| T02 | The Magician | 将 1 张手牌转为随机同值不同花色的牌 | $3 |
| T03 | The High Priestess | 下一手牌视为任意你选择的手牌类型 | $4 |
| T04 | The Empress | 本回合内，所有 +Bonus 效果翻倍 | $4 |
| T05 | The Emperor | 本回合内，+1 Mult per 手牌 | $4 |
| T06 | The Hierophant | 本回合内，+20 Bonus | $3 |
| T07 | The Lovers | 本回合内，+3 Mult | $3 |
| T08 | The Chariot | 将 2 张手牌面值为 +4 | $3 |
| T09 | Justice | 将 1 张手牌转为随机大牌（J/Q/K/A） | $3 |
| T10 | The Hermit | 本回合内，不消耗手牌次数 | $5 |
| T11 | Wheel of Fortune | 30% 概率将 1 张随机 Joker 升级为 Uncommon，70% 降级为 Common | $4 |
| T12 | Strength | 将 1 张手牌面值为 ×2 | $4 |
| T13 | The Tower | 将 1 张手牌转为 2 | $3 |
| T14 | The Star | 立即获得 $3 | $2 |
| T15 | The Moon | 下一 Ante 盲注费用 -1 | $3 |

### Planet 卡效果实现（10 张）

| 编号 | 名称 | 升级手牌 | 基础分提升 | 价格 |
|------|------|----------|-----------|------|
| P01 | Mercury | High Card | +10 | $3 |
| P02 | Venus | Pair | +15 | $3 |
| P03 | Mars | Two Pair | +20 | $4 |
| P04 | Jupiter | Straight | +30 | $4 |
| P05 | Saturn | Flush | +35 | $5 |
| P06 | Uranus | Full House | +40 | $5 |
| P07 | Neptune | Four of a Kind | +50 | $6 |
| P08 | Pluto | Straight Flush | +60 | $6 |
| P09 | Jupiter (dup) | Three of a Kind | +25 | $4 |
| P10 | Saturn (dup) | Royal Flush | +100 | $8 |

### 接口

```js
class ShopManager {
  generateShop(ownedJokers, ownedTarots, ownedPlanets, money) {
    // 生成 { jokers: [...], tarotPlanet: {...} }
  }

  canAfford(item, money) { return money >= item.price; }

  purchase(item, state) {
    // 扣除筹码，添加 Joker/Tarot/Planet 到玩家状态
  }
}
```

---

## 6. Tarot 效果触发机制

### 即时效果（T01-T03, T08-T09, T12-T15）
购买后立即触发，弹出选择 UI 或直接应用。

### 回合内临时效果（T04-T07, T10）
将效果标记存入 `state.tarotEffects`，计分时读取。

```js
// 示例：The Empress 效果
state.tarotEffects = {
  ...state.tarotEffects,
  bonusDouble: true  // 计分时 bonus 加成 ×2
};
```

### 特殊效果

**The High Priestess（T03）**：下一手牌选择任意类型
- 弹出模态框让玩家选择手牌类型
- `state.nextHandTypeOverride = selectedType`

**The Hermit（T10）**：本回合不消耗手牌次数
- `state.tarotEffects.freeHand = true`
- 出牌后检测此标记，不减少 `handsRemaining`

---

## 7. Planet 卡升级机制

### 计分引擎集成

```js
// ScoringEngine.calculate 修改
calculate(result, jokerContext = {}) {
  const { type, faceValue } = result;
  const base = type.base;

  // Planet 卡升级加成
  const planetBonus = state.handLevelBonus[type.name] || 0;
  const subtotal = base + faceValue + planetBonus;

  // 复用现有 Joker 计分逻辑
  ...
}
```

### 升级上限
每种手牌类型最高 5 级（Phase 2 预留）。

---

## 8. 渲染界面设计

### ANTE_SELECT 界面
```
┌────────────────────────────────────┐
│  ANTE 1 / 3                        │
├────────────────────────────────────┤
│  ┌────────────────────────────┐    │
│  │  Joker 槽位（已拥有 2/5）  │    │
│  └────────────────────────────┘    │
│                                    │
│  筹码: $4     [继续]               │
└────────────────────────────────────┘
```

### BLIND_SELECT 界面
```
┌────────────────────────────────────┐
│  选择盲注           筹码: $4        │
├────────────────────────────────────┤
│  [Small Blind]  目标: 50   奖励: $3 │
│  [Big Blind]    目标: 100  奖励: $4 │
│  [Boss Blind]   目标: 150  奖励: $5 │
│                 (跳过 -$2)          │
└────────────────────────────────────┘
```

### SHOP 界面
```
┌────────────────────────────────────────────┐
│  商店                        筹码: $24     │
├─────────────────────┬──────────────────────┤
│  JOKER              │  TAROT / PLANET      │
│  ┌────┐  ┌────┐    │  ┌────────┐          │
│  │J002│  │J007│    │  │The Fool│          │
│  │ $4 │  │ $4 │    │  │  $3    │          │
│  └────┘  └────┘    │  └────────┘          │
├─────────────────────┴──────────────────────┤
│  [离开商店 → 进入 Ante 2 Blind 1]          │
└────────────────────────────────────────────┘
```

---

## 9. 实现步骤

### Step 1: 状态机与 BlindManager
- 添加 `ANTE_SELECT`、`BLIND_SELECT`、`SHOP` 状态
- 实现 `BlindManager`（目标分、奖励、进度）
- 更新 `GameState.startGame()` 初始化新字段
- 更新状态转换逻辑

### Step 2: 商店系统
- 定义 Tarot/Planet 数据
- 实现 `ShopManager.generateShop()`
- 实现购买逻辑（扣除筹码、添加到玩家状态）

### Step 3: Tarot 效果
- 实现 15 张 Tarot 卡效果
- 集成到计分引擎（临时效果）
- 实现即时效果的选择 UI

### Step 4: Planet 卡升级
- 实现 10 张 Planet 卡数据
- 实现升级机制（`handLevelBonus`）
- 集成到计分引擎

### Step 5: 渲染界面
- 实现 `renderAnteSelect()`
- 实现 `renderBlindSelect()`
- 实现 `renderShop()`
- 更新顶部状态栏显示 Ante/Blind/筹码

### Step 6: 整合测试
- 测试完整游戏流程：3 Ante × 3 Blind + 商店循环
- 测试经济系统（筹码增减正确）
- 测试 Joker/Tarot/Planet 购买和效果
- 测试胜利/失败流程

---

## 10. 待 Phase 4+ 实现的功能

以下功能暂不在 Phase 3 实现，为后续阶段预留接口：

- [ ] 生命值机制（4 ♥）
- [ ] Boss Blind 负面效果（8 种规则）
- [ ] 8 Ante 完整扩展（当前 MVP 为 3 Ante）
- [ ] Tarot 单次使用消耗（当前购买即永久持有）
- [ ] 道具（Voucher）系统
- [ ] Joker 槽位扩展（当前固定 5 个）
- [ ] LocalStorage 存档
- [ ] 音效系统

---

## 11. 风险与缓解

| 风险 | 描述 | 缓解 |
|------|------|------|
| 代码膨胀 | 单文件接近 2000 行 | 保持分类注释，及时拆分逻辑 |
| Tarot/Planet 效果冲突 | 多个 Tarot 效果叠加可能冲突 | 每个效果独立存储，逐步集成测试 |
| 经济失衡 | 筹码过紧或过松 | Phase 3 阶段收集数据，微调奖励值 |
