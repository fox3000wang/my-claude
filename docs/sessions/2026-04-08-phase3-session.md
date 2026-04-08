# Phase 3 开发会话记录

**日期：** 2026-04-08
**会话目标：** 为小丑牌实现 Phase 3（完整 Roguelike 流程）

---

## 1. 起点状态

### 已完成（Phase 1 + Phase 2）
- 单文件 `index.html`（约 1860 行，~73KB）
- 52 张扑克牌生成与洗牌
- 1-5 张牌德州扑克风格判定
- 计分系统（基础分 + 面值分）
- 手牌选择、补牌继续、胜负判定
- 22 张 Joker 卡牌系统（JokerSystem + 效果触发）
- Joker 槽位渲染（银/绿/紫稀有度）
- Joker 实时预览 + 计分动画

### 待实现（Phase 3 原始范围）
- 8 个 Ante（每 Ante 3 个 Blind）
- 商店系统（Joker/道具购买）
- 经济系统（筹码 $）
- Boss Blind 负面效果

---

## 2. 头脑风暴：8 个关键设计决策

### Q1: Phase 3 范围
- **A) 完整实现** — 8 Ante + 完整商店 + Boss 效果
- **B) 核心流程优先** — 8 Ante + Blind 选择 + 商店（仅 Joker）
- **C) MVP 渐进式** — 先做 3 Ante + 简单商店，验证核心循环后再扩展

**选择：C** — MVP 渐进式，先用 3 Ante + 简单商店验证核心循环。

---

### Q2: 简化商店的初始设计
- **A) 商店只卖 Joker** — 2 Joker + 免费初始 Joker
- **B) 商店随机生成 Joker + Tarot/Planet**
- **C) 固定 Joker 池购买**

**选择：B** — 商店显示 2 Joker + 1 Tarot/Planet，完整卡片体系体验。

---

### Q3: 经济系统简化
- **A) 固定经济** — 每 Ante $4，通过奖励 $3/$4/$5
- **B) 递增经济** — 随 Ante 推进奖励递增
- **C) 最简经济** — 只有奖励，无盲注费用

**选择：A** — 固定经济：每 Ante +$4，Small/Big/Boss 奖励 $3/$4/$5。

---

### Q4: Phase 2 Joker 系统的兼容性
- **A) 保留初始 Joker** — 保留给 2 张基础 Joker 作为引导
- **B) 从零开始** — 不给初始 Joker，玩家商店购买
- **C) 可选开局**

**选择：A** — 保留 2 张初始 Joker（J002 + J003）作为演示。

---

### Q5: Tarot/Planet 卡功能范围
- **A) Tarot/Planet 仅展示** — 购买但不实现效果
- **B) Tarot 基础效果** — Tarot 实现，Planet 暂不
- **C) 完整效果** — Tarot + Planet 效果都实现

**选择：C** — 完整效果，Phase 3 提前交付 Tarot + Planet 完整功能。

---

### Q6: Ante 内 Blind 选择
- **A) 每 Ante 单 Blind** — 无选择，流程最简
- **B) 每 Ante 含 3 Blind** — 可选，但只需击败 1 个
- **C) 每 Ante 含 3 Blind + 必须全部完成** — Small → Big → Boss 顺序必须全过

**选择：C** — 保留完整 Small → Big → Boss 顺序，MVP 难度对齐 SPEC。

---

### Q7: 生命值（筹码）机制
- **A) 无生命值** — 只有经济，无失败惩罚
- **B) 简单生命值** — 4 点生命，耗尽游戏结束
- **C) 完整生命值** — 对齐 SPEC 的 Boss 机制

**选择：A** — 最简化，专注 Ante/Blind/商店核心循环。

---

### Q8: 游戏失败后的循环
- **A) 简单失败重置** — 筹码耗尽游戏结束，不保留任何 Joker
- **B) 失败重置但保留 Joker** — 保留已购买 Joker
- **C) 失败惩罚重置** — 损失一半 Joker

**选择：A** — 最简，筹码耗尽游戏结束，重新开始。

---

### 架构方案选择
- **A) 分层平滑扩展（推荐）** — 在现有代码上增量插层
- **B) 状态机重写** — 完全重构状态机
- **C) 单文件模块化隔离** — 按模块拆分但仍在 HTML 内

**选择：A** — 分层平滑扩展，最大程度复用 Phase 1/2 代码。

---

## 3. 最终设计决策汇总

| 决策项 | 最终方案 |
|--------|---------|
| Ante 数量 | 3 Ante（MVP） |
| Blind 数量 | 每 Ante 3 个（Small/Big/Boss） |
| Blind 完成 | 必须全部完成（顺序制） |
| 目标分 | Ante 1: 100/150/200，Ante 2: 150/250/350，Ante 3: 200/350/500 |
| 经济 | 每 Ante +$4，Small/Big/Boss 奖励 $3/$4/$5 |
| 生命值 | 无 |
| 初始 Joker | 保留 2 张（J002 + J003） |
| 商店商品 | 2 Joker + 1 Tarot/Planet |
| Tarot 效果 | 完整实现（15 张） |
| Planet 效果 | 完整实现（10 张） |
| 失败重置 | 不保留任何进度 |
| 架构 | 分层平滑扩展 |

---

## 4. 设计文档

写入文件：`docs/superpowers/specs/2026-04-08-joker-poker-phase3-design.md`

内容包含：
- 状态机扩展（新增 ANTE_SELECT/BLIND_SELECT/SHOP）
- 目标分规则表
- 奖励规则表
- BlindManager 接口设计
- ShopManager 接口设计
- TarotSystem 触发机制
- Planet 升级机制
- 渲染界面设计
- 实现步骤（6 步）
- 待 Phase 4+ 实现的功能列表

---

## 5. 实现计划

写入文件：`docs/superpowers/plans/2026-04-08-joker-poker-phase3-plan.md`

共 9 个 Task，依赖链清晰：

```
Task 1: Tarot/Planet 数据定义
    ↓
Task 2: BlindManager 类
    ↓
Task 3: GameState 扩展
    ↓
Task 4: ShopManager + TarotSystem 类
    ↓
Task 5: ScoringEngine Planet 集成
    ↓
Task 6: RenderEngine 新渲染方法
    ↓
Task 7: Game 主类状态跳转
    ↓
Task 8: 整合验证
```

---

## 6. 执行过程

### Task 1: Tarot/Planet 数据定义 ✅
- 在 `JOKER_RARITY` 之后插入 `TAROTS[]`（15 张）和 `PLANETS[]`（10 张）
- 每张卡含 id、name、effect、desc、price 字段

### Task 2: BlindManager 类 ✅
- 插入 `JokerSystem` 类之后
- 实现 `getTargetScore()`、`getReward()`、`advanceToNextBlind()` 等方法

### Task 3: GameState 扩展 ✅
- STATES 枚举新增 3 个状态
- 构造函数新增 `blindManager`、`money`、`shopItems`、`handLevelBonus`、`tarotEffects` 字段
- `startGame()` 改为从零开始，进入 `ANTE_SELECT` 状态

### Task 4: ShopManager + TarotSystem ✅
- 插入 `JokerSystem` 类之后（BlindManager 之前）
- `ShopManager.generateShop()`：2 Joker（排除已拥有）+ 1 Tarot/Planet
- `TarotSystem.apply()`：处理 Tarot 即时/临时效果
- `TarotSystem.getScoreBonus()`：计分时读取 Tarot 加成
- `TarotSystem.clearRoundEffects()`：回合结束时清理

### Task 5: ScoringEngine Planet 集成 ✅
- `calculate()` 签名扩展为 `calculate(result, jokerContext, gameState)`
- 叠加 `planetBonus`（Planet 升级加成）
- 叠加 `tarotMult` + `tarotBonus`（Tarot 效果）
- 更新 `GameState.playHand()` 调用处传入 `this`

### Task 6: RenderEngine 新渲染方法 ✅
- `render()` switch 新增 3 个 case
- `renderAnteSelect()`：Ante 选择界面，显示 Joker 和筹码
- `renderBlindSelect()`：Blind 选择界面（3 个按钮 + 键盘 1/2/3）
- `renderShop()`：商店界面，Joker 区 + Tarot/Planet 区
- `renderPlaying()` 顶部栏更新：Ante / 盲注名 / 目标分 / 当前分 / 剩余 / 筹码

### Task 7: Game 主类状态跳转 ✅
- `nextStep()`：重构为完整的状态跳转逻辑
  - 清理 Tarot 效果
  - 判断盲注是否通过 → 发放奖励
  - Boss 完成 → 进入商店
  - 其他 Blind → 进入下一 Blind 选择
- 新增方法：`confirmAnte()`、`backToAnteSelect()`、`selectBlind()`、`enterShop()`、`leaveShop()`、`buyItem()`
- `GameState.playHand()`：移除旧的状态跳转逻辑
- `bindEvents()`：扩展键盘 1/2/3 选择 Blind
- `continueGame()`：移除旧的状态跳转逻辑
- `playHand()`：修复 Tarot Hermit（free_hand）效果

### Task 8: 整合验证 ✅
- JS 语法检查通过
- 重复类名检查：无重复
- 模板字符串 bug 修复（`renderShop` 中的嵌套模板）
- 提交：`cf77c13`

---

## 7. Balatro 核心规则学习

### 游戏目标
用一副扑克牌打出高分，击败 **8 个 Ante**（共 24 个 Blind），通关即为胜利。

### 核心循环
```
选择 Ante → 选 Blind（Small/Big/Boss）→ 出牌 × 4 次 → 结算
                                                        ↓
                                        通过？→ 拿奖励 → 下一 Blind
                                                        ↓
                            3 Blind 全过 → 商店 → 下一 Ante
```

### 计分公式
```
最终分 = (基础分 + 面值分) × (1 + Mult倍率) + Bonus加成
```

### Joker 卡牌
- 每个 Joker 有不同效果（Mult / Bonus / 条件触发）
- 最多装备 5 个槽位
- 分稀有度：Common（60%）/ Uncommon（30%）/ Rare（10%）

### 经济系统
| 来源 | 金额 |
|------|------|
| 每 Ante 开始 | +$4 |
| 击败 Small Blind | +$3 |
| 击败 Big Blind | +$4 |
| 击败 Boss Blind | +$5 + 额外奖励 |

### Boss Blind 负面效果
- 只能打出 3 种手牌类型
- 面值分数 -2
- Joker 效果减半
- 只有 3 次出牌机会

### Tarot / Planet 卡
- **Tarot** — 一次性效果（转牌、抽牌、加成等）
- **Planet** — 永久升级特定手牌类型的基础分（每种最高 5 级）

---

## 8. 当前实现 vs Balatro 规则对比

### 已对齐
- ✅ 出牌计分循环
- ✅ Joker 效果触发
- ✅ 3 Ante × 3 Blind 流程（Small → Big → Boss 顺序）
- ✅ 商店购买 Joker/Tarot/Planet
- ✅ 经济系统（每 Ante +$4，奖励 $3/$4/$5）
- ✅ Tarot 即时效果（T14 The Star 等）
- ✅ Tarot 临时效果（bonus_double、mult_per_card 等）
- ✅ Planet 永久升级

### 待实现
- ❌ Boss Blind 负面效果（8 种规则）
- ❌ 生命值机制（4 ♥）
- ❌ 8 Ante 完整扩展（当前 MVP 为 3 Ante）
- ❌ Tarot 单次使用消耗（当前购买即永久持有）
- ❌ 道具（Voucher）系统
- ❌ Joker 槽位扩展
- ❌ LocalStorage 存档
- ❌ 音效系统
- ❌ 跳过 Boss 扣 $2 惩罚

---

## 9. Git 提交记录

| 提交 | 内容 |
|------|------|
| `d488945` | docs: 添加 Phase 3 设计方案 |
| `1078a6e` | docs: 添加 Phase 3 实现计划 |
| `cf77c13` | feat: Phase 3 完整 Roguelike 流程 MVP |

---

## 10. 文件变更

| 文件 | 变更 |
|------|------|
| `index.html` | +1053 / -32 行（最终 ~73.7KB） |
| `docs/superpowers/specs/2026-04-08-joker-poker-phase3-design.md` | 新增 |
| `docs/superpowers/plans/2026-04-08-joker-poker-phase3-plan.md` | 新增 |
| `docs/sessions/2026-04-08-phase3-session.md` | 新增（本文件） |

---

## 11. 下一步

### 立即可用
- 测试 Phase 3 完整流程：打开 `index.html` 即可体验

### Phase 4 方向
1. 扩展到 8 个 Ante（完整 Balatro 长度）
2. 实现 Boss Blind 负面效果（8 种）
3. 生命值机制（4 ♥，耗尽游戏结束）
4. Tarot 单次消耗（使用后从库存移除）
5. 道具（Voucher）系统

### Phase 5 方向
1. 完整动画系统（抽牌、出牌、计分动画）
2. 音效系统（Web Audio API）
3. 暗黑霓虹视觉打磨

### Phase 6 方向
1. LocalStorage 存档（最高分、通关记录）
2. 更多 Joker 变体
3. 完整键盘支持
