# AI 种族特定策略 — 设计文档

> **适用对象**：AI 开发工程师
> **目标**：为 Zerg、Protoss、Terran 实现各自的宏观战斗策略（StrategySystem）和微操差异化（ArmyGroupSystem）

## 背景

Phase A（ArmyGroupSystem）实现了统一的军队协调，Phase B（EconomicSystem）实现了种族特定经济管理。

Phase C 在两者之上新增：
- **StrategySystem**（宏观层）：固定时间窗口驱动策略切换（Rush → Timing → Harass）
- **ArmyGroupSystem 微操差异化**：进攻/撤退行为根据种族类型变化
- **Terran 完整经济系统**：补全 Terran（ownerId = 3）的经济闭环

---

## 整体架构

```
StrategySystem（宏观，固定时间窗口）
  ├── Rush Phase（0-3 分钟）
  │     Zerg: 8 只 Zergling 即冲
  │     Protoss: Photon Cannon 防守压制
  │     Terran: Marine + SCV Rush
  ├── Timing Phase（3-8 分钟）
  │     集体进攻 · Tank/龙骑等中级单位主导
  └── Harass Phase（8 分钟+）
        现有单位分兵骚扰经济点

ArmyGroupSystem（微操差异化）
  ├── Zerg: 激进冲锋 · HP<20% 才撤 · 集火随机
  ├── Protoss: 阵型紧凑 · 优先保护高价值单位撤退
  └── Terran: 边打边退防守反击
```

---

## 新增组件

### StrategyState Component

挂在每个 AI ArmyGroup 上，标记当前策略阶段：

```typescript
// src/components/StrategyState.ts
export type StrategyPhase = 'rush' | 'timing' | 'harass';

export class StrategyState extends Component {
  constructor(
    public phase: StrategyPhase = 'rush',
    public rushStartTime: number = 0,  // gameTime when rush started
    public hasTriggeredHarass: boolean = false,
  ) {
    super('StrategyState');
  }
}
```

### RushTarget Component

Rush 阶段专用，标记进攻目标为敌方出生点/基地：

```typescript
// src/components/RushTarget.ts
export class RushTarget extends Component {
  constructor(
    public targetEntityId: number | null = null,
    public rallyX: number = 0,
    public rallyZ: number = 0,
  ) {
    super('RushTarget');
  }
}
```

---

## 新增系统

### StrategySystem

每 10 秒检查游戏时间，更新所有 AI ArmyGroup 的 `StrategyState`：

| 游戏时间 | 策略阶段 | 条件 |
|----------|----------|------|
| 0 - 3 min | Rush | 初始阶段 |
| 3 - 8 min | Timing | Rush 窗口结束 |
| 8 min+ | Harass | Timing 窗口结束 |

```typescript
class StrategySystem extends System {
  private readonly RUSH_END = 180;    // 3 分钟（秒）
  private readonly TIMING_END = 480;  // 8 分钟（秒）
  private decisionTimer = 0;

  update(delta: number): void {
    this.decisionTimer += delta;
    if (this.decisionTimer < 10) return;
    this.decisionTimer = 0;

    const groups = this.world!.getEntitiesWithComponents('ArmyGroup', 'StrategyState');
    for (const group of groups) {
      this.updatePhase(group, this.gameTime);
    }
  }

  private updatePhase(group: Entity, gameTime: number): void {
    const state = group.getComponent<StrategyState>('StrategyState')!;
    if (gameTime < RUSH_END) {
      state.phase = 'rush';
    } else if (gameTime < TIMING_END) {
      state.phase = 'timing';
    } else {
      state.phase = 'harass';
      state.hasTriggeredHarass = true;
    }
  }
}
```

**关键设计原则**：
- 策略单向推进：Rush → Timing → Harass，不回退
- `gameTime` 从 `Game` 实例注入（`game.startTime` 或 `game.currentTime`）
- 不改动 ArmyGroupSystem 的现有逻辑，只新增行为叠加

---

## ArmyGroupSystem 微操差异化

### 进攻风格差异

#### Zerg（ownerId = 1）

- Rush 阶段：有 8 只以上 Zergling 即向敌人基地冲锋，不巡逻
- Timing/Harass：激进冲锋，集火目标随机选择（不优先打 Medic/High Templar）
- 追击行为：敌人撤退时全力追击，不保持阵型

#### Protoss（ownerId = 2）

- Rush 阶段：Photon Cannon 防守，不主动进攻
- Timing/Harass：阵型紧凑，到达战场后保持一定距离（不立即冲锋），等部队集结完毕再冲
- 集火优先级：高价值单位（High Templar、Dark Templar）最后损失

#### Terran（ownerId = 3）

- Rush 阶段：Marine + SCV Rush 直奔敌人基地
- Timing/Harass：稳扎稳打，不冒进，边推进边交战

### 撤退风格差异

#### Zerg

- 撤退阈值：HP < 20% 才撤（死战到底）
- 撤退行为：不组织有序撤退，各自为战
- Rush 失败后：不等重建，直接放弃进攻

#### Protoss

- 撤退阈值：HP < 40% 开始判断
- 撤退行为：有序撤退，优先护送高价值单位（High Templar、Dark Templar）
- 掩护机制：Zealot 断后，High Templar 最后撤

#### Terran

- 撤退阈值：HP < 50% 开始边打边退
- 撤退行为：边打边退到最近的防守位置（己方建筑附近）
- 不轻易放弃土地，每后退一段距离就重新组织防线

---

## Terran 经济配置（ownerId = 3）

| 决策项 | 值 |
|--------|-----|
| Supply 建筑 | Supply Depot（`BuildSystem`） |
| 生产建筑 | Barracks → Factory（按需解锁） |
| 工人单位 | SCV |
| 主力单位比例 | Marine 50% / Tank 30% / Medic 20% |

### Supply 检查逻辑

```typescript
if (supplyMax - supplyUsed <= 4 && !supplyBuildingInProgress) {
  Protoss: BuildSystem.placeBuilding('supply_depot', ...)
}
```

Supply Depot 走 `BuildSystem`，与 Protoss Pylon 逻辑相同。

### 产能扩张逻辑

```typescript
if (!hasProductionBuilding) {
  建造 Barracks
} else if (supplyUsed >= 20 && queues深度 < 2) {
  建造 Factory（或第二个 Barracks）
}
```

### Terran 训练比例

```typescript
// ownerId = 3 配置
{
  supplyBuilding: { type: 'build', unitOrBuilding: 'supply_depot' },
  productionBuilding: 'barracks',
  worker: 'scv',
  armyRatios: [
    { unit: 'marine', ratio: 0.50 },
    { unit: 'tank',   ratio: 0.30 },
    { unit: 'medic',  ratio: 0.20 },
  ],
}
```

### 注意事项

- Terran 单位在 `units.json` 中需要有对应条目（marine、tank、medic、scv）
- Tank 属于重工厂单位，解锁需要 Factory 建造完毕
- Medic 属于 Barracks 科技，解锁需要特定科技建筑（可简化处理：Medic 直接从 Barracks 训练）

---

## Harass 阶段骚扰实现

Harass 阶段（8 分钟+），为每个种族新增骚扰小组：

### 通用逻辑

在 Harass 阶段，`StrategySystem` 每 30 秒检查是否需要分兵骚扰：

```typescript
if (state.phase === 'harass' && !state.hasTriggeredHarass) {
  this.spawnHarassGroup(ownerId);
  state.hasTriggeredHarass = true;
}

private spawnHarassGroup(ownerId: number): void {
  const enemyResources = this.findEnemyResourcePoints();
  if (enemyResources.length === 0) return;

  const harassTarget = enemyResources[0];
  const squad = this.world!.createEntity();
  squad.addComponent(new ArmyGroup(ownerId));
  squad.addComponent(new StrategyState('harass'));
  squad.addComponent(new RushTarget(harassTarget.id));
  // 标记为骚扰小组，影响 ArmyGroupSystem 的进攻逻辑
}
```

### 种族骚扰手段

| 种族 | 骚扰单位 | 骚扰目标 | 行为 |
|------|----------|----------|------|
| Zerg | Mutalisk（或 Zergling 绕后） | 敌方 SCV/Probe | 打击落单采集单位后撤离 |
| Protoss | Dark Templar | 敌方经济单位 | 隐身偷袭，不恋战 |
| Terran | Marine 游走组 | 落单 SCV/Probe | 打完就跑，机动骚扰 |

**关键约束**：骚扰小组规模 ≤ 主力部队的 30%，不影响正面战场兵力。

---

## 时间窗口行为总览

| 游戏时间 | 策略 | ArmyGroup 行为 | EconomicSystem |
|----------|------|----------------|----------------|
| 0-3 min | Rush | 立即进攻（Rush 目标） | 快速暴兵（Zerg: Zergling；Protoss: Cannon；Terran: Marine+SCV） |
| 3-8 min | Timing | 正常进攻（集合→冲锋） | 正常出兵节奏，扩张生产建筑 |
| 8 min+ | Harass | 主力进攻 + 骚扰组绕后 | 持续出兵，维持兵力优势 |

---

## 文件清单

```
src/
├── components/
│   ├── StrategyState.ts      (新建)
│   └── RushTarget.ts         (新建)
├── systems/
│   ├── StrategySystem.ts     (新建)
│   ├── ArmyGroupSystem.ts    (修改)
│   └── EconomicSystem.ts     (修改：新增 Terran 配置)
src/game.ts                  (修改：初始化 StrategySystem)
tests/
├── components/
│   └── StrategyState.test.ts (新建)
└── systems/
    ├── StrategySystem.test.ts (新建)
    └── ArmyGroupSystem.test.ts (修改：新增差异化测试)
```

---

## 自我检查

1. **占位符检查**：无 TBD / TODO / 不完整步骤 ✅
2. **内部一致性**：时间窗口 0-3/3-8/8+ 与各策略行为一致 ✅
3. **范围检查**：聚焦在 StrategySystem + ArmyGroup 微操差异化 + Terran 经济；单位科技树简化处理（Medic 从 Barracks 直接出）✅
4. **歧义检查**："骚扰小组规模 ≤ 30%" 明确；"有序撤退"有具体描述（Zealot 断后，高价值单位最后撤）✅
5. **向后兼容**：不改动现有 ArmyGroupSystem 的基本结构，只新增策略叠加 ✅
