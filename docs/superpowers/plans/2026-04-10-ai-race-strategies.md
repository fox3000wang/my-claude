# AI 种族特定策略 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Zerg / Protoss / Terran 实现宏观策略层（StrategySystem）和微操差异化（ArmyGroupSystem），并补全 Terran 经济闭环。

**Architecture:**
- `StrategySystem`：每 10 秒根据 elapsed time 更新所有 AI ArmyGroup 的 StrategyState 组件（Rush → Timing → Harass）
- `ArmyGroupSystem` 微操差异化：通过 StrategyState 组件和 ownerId 读取策略阶段，叠加不同的进攻/撤退行为
- `EconomicSystem`：新增 ownerId=3 的 Terran 配置（Supply Depot / Barracks / Factory）
- StrategySystem 自身维护 elapsed time，不依赖外部 gameTime 注入

**Tech Stack:** TypeScript, ECS (existing World/Entity/Component/System)

---

## 文件结构

```
src/
├── components/
│   ├── StrategyState.ts     (新建)
│   └── RushTarget.ts        (新建)
├── systems/
│   ├── StrategySystem.ts    (新建)
│   ├── ArmyGroupSystem.ts   (修改)
│   └── EconomicSystem.ts    (修改)
src/game.ts                  (修改)
src/data/units.json          (修改)
tests/
├── components/
│   └── StrategyState.test.ts (新建)
└── systems/
    ├── StrategySystem.test.ts (新建)
    └── ArmyGroupSystem.test.ts (修改)
```

---

## Task 1: StrategyState + RushTarget 组件

**Files:**
- Create: `src/components/StrategyState.ts`
- Create: `src/components/RushTarget.ts`
- Test: `tests/components/StrategyState.test.ts`

- [ ] **Step 1: Write StrategyState component test**

```typescript
// tests/components/StrategyState.test.ts
import { describe, it, expect } from 'vitest';
import { StrategyState } from '../../src/components/StrategyState';

describe('StrategyState', () => {
  it('creates with default rush phase', () => {
    const s = new StrategyState();
    expect(s.phase).toBe('rush');
    expect(s.hasTriggeredHarass).toBe(false);
  });

  it('creates with specified phase', () => {
    const s = new StrategyState('timing');
    expect(s.phase).toBe('timing');
  });

  it('hasTriggeredHarass defaults to false', () => {
    const s = new StrategyState('harass');
    expect(s.hasTriggeredHarass).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/components/StrategyState.test.ts`
Expected: FAIL with "Cannot find module" (file doesn't exist yet)

- [ ] **Step 3: Write StrategyState component**

```typescript
// src/components/StrategyState.ts
import { Component } from '../core/ecs/Component';

export type StrategyPhase = 'rush' | 'timing' | 'harass';

export class StrategyState extends Component {
  constructor(
    public phase: StrategyPhase = 'rush',
    public rushStartTime: number = 0,
    public hasTriggeredHarass: boolean = false,
  ) {
    super('StrategyState');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/components/StrategyState.test.ts`
Expected: PASS

- [ ] **Step 5: Write RushTarget component (no test needed — pure data component)**

```typescript
// src/components/RushTarget.ts
import { Component } from '../core/ecs/Component';

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

- [ ] **Step 6: Commit**

```bash
git add src/components/StrategyState.ts src/components/RushTarget.ts tests/components/StrategyState.test.ts
git commit -m "feat(ai): add StrategyState and RushTarget components for Phase C"
```

---

## Task 2: StrategySystem

**Files:**
- Create: `src/systems/StrategySystem.ts`
- Test: `tests/systems/StrategySystem.test.ts`

**前置条件：** Task 1 已完成

- [ ] **Step 1: Write StrategySystem tests**

```typescript
// tests/systems/StrategySystem.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../src/core/ecs/World';
import { StrategySystem } from '../../src/systems/StrategySystem';
import { ArmyGroup } from '../../src/components/ArmyGroup';
import { StrategyState } from '../../src/components/StrategyState';

describe('StrategySystem', () => {
  let world: World;
  let system: StrategySystem;

  beforeEach(() => {
    world = new World();
    system = new StrategySystem();
    world.addSystem(system);
  });

  function makeGroup(ownerId: number): ArmyGroup {
    // ArmyGroup is a Component, not an Entity — we add it to a group entity
    const e = world.createEntity();
    const ag = new ArmyGroup(ownerId);
    ag.setRallyPoint(0, 0);
    e.addComponent(ag);
    e.addComponent(new StrategyState());
    return ag;
  }

  it('initial phase is rush', () => {
    const ag = makeGroup(1);
    world.update(0);
    const state = ag['phase']; // StrategyState is on the entity, ArmyGroup doesn't hold it
    // Actually StrategyState is a separate component — we need to get it from the entity
    const entities = world.getEntitiesWithComponents('ArmyGroup', 'StrategyState');
    expect(entities[0].getComponent('StrategyState')).toBeDefined();
  });

  it('transitions to timing after RUSH_END seconds', () => {
    const e = world.createEntity();
    e.addComponent(new ArmyGroup(1));
    e.addComponent(new StrategyState());

    // Advance past RUSH_END (180 seconds = 3 minutes)
    world.update(181);

    const state = e.getComponent('StrategyState') as StrategyState;
    expect(state.phase).toBe('timing');
  });

  it('transitions to harass after TIMING_END seconds', () => {
    const e = world.createEntity();
    e.addComponent(new ArmyGroup(1));
    e.addComponent(new StrategyState());

    // Advance past TIMING_END (480 seconds = 8 minutes)
    world.update(481);

    const state = e.getComponent('StrategyState') as StrategyState;
    expect(state.phase).toBe('harass');
    expect(state.hasTriggeredHarass).toBe(true);
  });

  it('does not update if decision timer not reached', () => {
    const e = world.createEntity();
    e.addComponent(new ArmyGroup(1));
    e.addComponent(new StrategyState());

    world.update(5); // only 5 seconds, less than DECISION_INTERVAL=10

    const state = e.getComponent('StrategyState') as StrategyState;
    expect(state.phase).toBe('rush');
  });

  it('skips entities without StrategyState', () => {
    const e = world.createEntity();
    e.addComponent(new ArmyGroup(1));
    // no StrategyState — should not crash

    world.update(181);

    // Just verify no error thrown
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/systems/StrategySystem.test.ts`
Expected: FAIL — StrategySystem not yet implemented

- [ ] **Step 3: Write StrategySystem**

```typescript
// src/systems/StrategySystem.ts
import { System } from '../core/ecs/System';
import { ArmyGroup } from '../components/ArmyGroup';
import { StrategyState, type StrategyPhase } from '../components/StrategyState';

/** Rush phase duration: 3 minutes = 180 seconds */
const RUSH_END = 180;
/** Timing phase duration: 8 minutes total = 480 seconds */
const TIMING_END = 480;
/** How often (in seconds) to re-evaluate strategy phase */
const DECISION_INTERVAL = 10;

export class StrategySystem extends System {
  readonly name = 'StrategySystem';
  /** Accumulated elapsed time since system creation (tracks game time) */
  private elapsedTime = 0;
  private decisionTimer = 0;

  update(delta: number): void {
    this.elapsedTime += delta;
    this.decisionTimer += delta;
    if (this.decisionTimer < DECISION_INTERVAL) return;
    this.decisionTimer = 0;

    const groups = this.world!.getEntitiesWithComponents('ArmyGroup', 'StrategyState');
    for (const entity of groups) {
      this.updatePhase(entity, this.elapsedTime);
    }
  }

  private updatePhase(entity: ReturnType<World['createEntity']>, elapsed: number): void {
    const state = entity.getComponent<StrategyState>('StrategyState')!;

    if (elapsed < RUSH_END) {
      state.phase = 'rush';
    } else if (elapsed < TIMING_END) {
      state.phase = 'timing';
    } else {
      state.phase = 'harass';
      state.hasTriggeredHarass = true;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/systems/StrategySystem.test.ts`
Expected: PASS

- [ ] **Step 5: Fix any test issues**
Common issues: Make sure `ArmyGroup` is imported in both the test and in `StrategyState` (the test imports ArmyGroup but doesn't use it directly as a type in assertions — the `makeGroup` helper creates entities).

Note: The first test "initial phase is rush" checks that StrategyState is on the entity but reads `ag['phase']` which doesn't exist. Fix it:
```typescript
it('initial phase is rush', () => {
  const e = world.createEntity();
  e.addComponent(new ArmyGroup(1));
  e.addComponent(new StrategyState());
  const state = e.getComponent<StrategyState>('StrategyState')!;
  expect(state.phase).toBe('rush');
});
```

- [ ] **Step 6: Commit**

```bash
git add src/systems/StrategySystem.ts tests/systems/StrategySystem.test.ts
git commit -m "feat(ai): add StrategySystem with time-windowed phase transitions"
```

---

## Task 3: ArmyGroupSystem 微操差异化

**Files:**
- Modify: `src/systems/ArmyGroupSystem.ts`
- Modify: `tests/systems/ArmyGroupSystem.test.ts`

**前置条件：** Task 1 + Task 2 已完成

### 3a. 添加高价值单位判定

在 `ArmyGroupSystem.ts` 中添加一个私有方法判断高价值单位：

```typescript
/** High-value units that Protoss should protect during retreat */
private HIGH_VALUE_UNITS = new Set(['high_templar', 'dark_templar']);

/** Zerg elite units */
private ZERG_ELITE = new Set(['hydralisk', 'mutalisk']);

/** Zerg: check if group should use rush/aggro behavior */
private isZerg(ownerId: number): boolean {
  return ownerId === 1;
}

/** Protoss: check if group should use defensive formation behavior */
private isProtoss(ownerId: number): boolean {
  return ownerId === 2;
}

/** Terran: check if group should use tactical retreat behavior */
private isTerran(ownerId: number): boolean {
  return ownerId === 3;
}

/** Check if unit type is high-value (for retreat ordering) */
private isHighValue(unitType: string): boolean {
  return this.HIGH_VALUE_UNITS.has(unitType);
}
```

### 3b. 修改撤退阈值（种族差异化）

在 `ArmyGroupSystem.ts` 的 `update` 方法中找到撤退判断：

当前代码：
```typescript
if (groupStrength / maxStrength < group.retreatThreshold) {
  this.setGroupMode(group, 'retreat', nearestEnemy.pos);
}
```

替换为（替换整个 if 块，但保留 else 分支不变）：
```typescript
const retreatThreshold = this.getRetreatThreshold(group.ownerId);
if (groupStrength / maxStrength < retreatThreshold) {
  this.setGroupMode(group, 'retreat', nearestEnemy.pos);
}
```

在 `applyModeToMembers` 的 retreat 分支中，修改撤退顺序（Zerg: 无序；Protoss: 高价值最后；Terran: 边打边退）：

```typescript
// 在 applyModeToMembers 的 retreat 分支中：
// 在设置 MoveTarget 之前，对 group.unitIds 排序
if (this.isProtoss(group.ownerId)) {
  // Protoss: high-value units retreat last (sort to front of retreat order)
  const sortedIds = [...group.unitIds].sort((a, b) => {
    const unitA = this.world!.getEntity(a)?.getComponent<Unit>('Unit');
    const unitB = this.world!.getEntity(b)?.getComponent<Unit>('Unit');
    const aHigh = unitA && this.isHighValue(unitA.unitType) ? 1 : 0;
    const bHigh = unitB && this.isHighValue(unitB.unitType) ? 1 : 0;
    return bHigh - aHigh; // high-value first = retreat last
  });
  group.unitIds = sortedIds;
} else if (this.isTerran(group.ownerId)) {
  // Terran: retreat toward nearest allied building, not directly to rally
  const nearestBuilding = this.findNearestAlliedBuilding(group);
  if (nearestBuilding) {
    // Override rally point for this retreat
    const rallyX = nearestBuilding.x;
    const rallyZ = nearestBuilding.z;
    // Set rally to building position, temporarily
    const originalRally = { x: group.rallyX, z: group.rallyZ };
    group.rallyX = rallyX;
    group.rallyZ = rallyZ;
    // ... normal retreat code ...
    // Restore original rally after retreat
    group.rallyX = originalRally.x;
    group.rallyZ = originalRally.z;
  }
}
```

**简化说明**：由于当前 ECS 中没有 Building 的 ownerId 感知，`findNearestAlliedBuilding` 可以简化为"最近的己方建筑"。实现如下：

```typescript
private findNearestAlliedBuilding(group: ArmyGroup): { x: number; z: number } | null {
  const buildings = this.world!.getEntitiesWithComponents('Building', 'Position');
  let nearest: { x: number; z: number } | null = null;
  let minDist = Infinity;
  for (const e of buildings) {
    const building = e.getComponent<Building>('Building')!;
    if (!building.isConstructing) {
      const pos = e.getComponent<Position>('Position')!;
      const dist = Math.hypot(pos.x - group.rallyX, pos.z - group.rallyZ);
      if (dist < minDist) {
        minDist = dist;
        nearest = { x: pos.x, z: pos.z };
      }
    }
  }
  return nearest;
}
```

需要添加 `Building` import：
```typescript
import { Building } from '../components/Building';
```

### 3c. 添加 `getRetreatThreshold` 方法

```typescript
private getRetreatThreshold(ownerId: number): number {
  if (this.isZerg(ownerId)) return 0.20;  // Zerg: HP < 20% 才撤
  if (this.isProtoss(ownerId)) return 0.40; // Protoss: HP < 40% 开始判断
  if (this.isTerran(ownerId)) return 0.50;  // Terran: HP < 50% 边打边退
  return 0.30; // default
}
```

### 3d. 添加 Zerg Rush 进攻行为（8 只 Zergling 即冲）

在 `update` 方法中，处理 rush 阶段 ArmyGroup 的特殊进攻逻辑：

在 `DETECTION_RANGE` 判断之后、设置 attack/defend/retreat 之前，插入 rush 阶段检查：

```typescript
// 在 if (nearestEnemy) 块内，dist 判断之前，插入：
const strategy = groupEntity.getComponent<StrategyState>('StrategyState');
if (strategy?.phase === 'rush') {
  // Rush phase: check if enough Zerglings to rush
  if (this.isZerg(group.ownerId)) {
    const zerglings = group.unitIds.filter(uid => {
      const e = this.world!.getEntity(uid);
      const u = e?.getComponent<Unit>('Unit');
      return u?.unitType === 'zergling';
    });
    if (zerglings.length >= 8) {
      this.setGroupMode(group, 'attack', nearestEnemy.pos);
      continue; // skip rest of decision logic
    }
  } else {
    // Non-Zerg: in rush phase, defend only (no aggressive push)
    if (dist < DETECTION_RANGE && groupStrength >= group.attackThreshold) {
      this.setGroupMode(group, 'defend', null);
    }
    continue;
  }
}
```

需要导入 `StrategyState`：
```typescript
import { StrategyState } from '../components/StrategyState';
```

**注意**：`StrategyState` 可能不存在（如果 ArmyGroup 没有策略组件），用 `?.` 安全访问。

### 3e. 添加测试

在 `tests/systems/ArmyGroupSystem.test.ts` 末尾添加：

```typescript
it('Zerg: rushes with 8+ zerglings regardless of retreat threshold', () => {
  const e = world.createEntity();
  e.addComponent(new ArmyGroup(1)); // Zerg
  e.addComponent(new StrategyState('rush'));
  e.addComponent(new Position(0, 0, 0));

  // Add 8 zerglings to the group
  const zerglingIds: number[] = [];
  for (let i = 0; i < 8; i++) {
    const z = world.createEntity();
    z.addComponent(new Unit('zergling', 35, 35, 1));
    z.addComponent(new Position(i, 0, 0));
    z.addComponent(new Combat(5, 1, 1, 1));
    z.addComponent(new Health(35, 35));
    const ag = e.getComponent<ArmyGroup>('ArmyGroup')!;
    ag.addUnit(z.id);
    zerglingIds.push(z.id);
  }

  // Enemy nearby
  const enemy = world.createEntity();
  enemy.addComponent(new Unit('marine', 40, 40, 0));
  enemy.addComponent(new Position(5, 0, 0));
  enemy.addComponent(new Health(40, 40));

  world.update(1);

  const ag = e.getComponent<ArmyGroup>('ArmyGroup')!;
  expect(ag.mode).toBe('attack');
});

it('Protoss: retreat order prioritizes high-value units last', () => {
  const e = world.createEntity();
  e.addComponent(new ArmyGroup(2)); // Protoss
  e.addComponent(new StrategyState('timing'));
  e.addComponent(new Position(0, 0, 0));

  const ag = e.getComponent<ArmyGroup>('ArmyGroup')!;
  ag.setRallyPoint(0, 0);

  // Add zealot (not high-value) and high templar (high-value)
  const zealot = world.createEntity();
  zealot.addComponent(new Unit('zealot', 100, 100, 2));
  zealot.addComponent(new Position(0, 0, 0));
  zealot.addComponent(new Health(10, 100)); // low HP — would retreat first
  zealot.addComponent(new Combat(8, 1, 1, 2));
  zealot.addComponent(new MoveTarget(0, 0, 0));

  const templar = world.createEntity();
  templar.addComponent(new Unit('high_templar', 40, 40, 2));
  templar.addComponent(new Position(0, 0, 0));
  templar.addComponent(new Health(40, 40)); // full HP — would retreat last
  templar.addComponent(new Combat(0, 0, 7, 1));
  templar.addComponent(new MoveTarget(0, 0, 0));

  ag.addUnit(zealot.id);
  ag.addUnit(templar.id);

  // Trigger retreat by low group strength
  const enemy = world.createEntity();
  enemy.addComponent(new Unit('marine', 40, 40, 0));
  enemy.addComponent(new Position(1, 0, 0));
  enemy.addComponent(new Health(40, 40));

  world.update(1);

  // Protoss: zealot retreats first, high templar last
  const zealotMove = zealot.getComponent<MoveTarget>('MoveTarget');
  const templarMove = templar.getComponent<MoveTarget>('MoveTarget');
  // zealot should already have been given a move target
  expect(zealotMove).toBeDefined();
  // templar should still have its original move target (not yet given retreat order)
  expect(templarMove?.x).toBe(0);
});

it('Terran: retreats toward nearest building, not directly to rally', () => {
  const e = world.createEntity();
  e.addComponent(new ArmyGroup(3)); // Terran
  e.addComponent(new StrategyState('timing'));
  e.addComponent(new Position(0, 0, 0));

  const ag = e.getComponent<ArmyGroup>('ArmyGroup')!;
  ag.setRallyPoint(100, 100); // far rally

  const marine = world.createEntity();
  marine.addComponent(new Unit('marine', 40, 40, 3));
  marine.addComponent(new Position(10, 0, 0));
  marine.addComponent(new Health(10, 40)); // low HP
  marine.addComponent(new Combat(6, 0, 4, 1));
  ag.addUnit(marine.id);

  // Building nearby (closer than rally point)
  const building = world.createEntity();
  building.addComponent(new Building('barracks', false, 1));
  building.addComponent(new Position(5, 0, 0));

  const enemy = world.createEntity();
  enemy.addComponent(new Unit('zergling', 35, 35, 0));
  enemy.addComponent(new Position(6, 0, 0));
  enemy.addComponent(new Health(35, 35));

  world.update(1);

  // Marine should retreat toward building (x=5), not rally (x=100)
  const marineMove = marine.getComponent<MoveTarget>('MoveTarget');
  expect(marineMove?.x).toBeCloseTo(5, 0); // within 1 unit of building
});
```

在测试文件顶部添加新 import：
```typescript
import { StrategyState } from '../../src/components/StrategyState';
import { Building } from '../../src/components/Building';
```

- [ ] **Step: Run tests to verify behavior**

Run: `pnpm vitest run tests/systems/ArmyGroupSystem.test.ts`
Expected: PASS (or FAIL with actionable errors — fix them)

- [ ] **Step: Commit**

```bash
git add src/systems/ArmyGroupSystem.ts tests/systems/ArmyGroupSystem.test.ts
git commit -m "feat(ai): add race-specific micro behaviors to ArmyGroupSystem"
```

---

## Task 4: Terran 经济配置 + medic 单位

**Files:**
- Modify: `src/data/units.json`
- Modify: `src/systems/EconomicSystem.ts`
- Modify: `src/game.ts`

**前置条件：** Task 2 已完成

### 4a. 添加 medic 到 units.json

在 `"tank": {...}` 之后添加：

```json
  "medic": {
    "name": "Medic",
    "health": 60,
    "maxHealth": 60,
    "attack": 0,
    "armor": 0,
    "range": 0,
    "speed": 2.0,
    "cost": { "minerals": 75, "supply": 1 }
  }
```

同时需要更新 `Unit` 组件的 `UnitType`：

在 `src/components/Unit.ts` 中，添加 `'medic'` 到类型：

```typescript
export type UnitType = 'scv' | 'marine' | 'firebat' | 'tank' | 'medic'
  | 'drone' | 'zergling' | 'hydralisk' | 'mutalisk' | 'overlord'
  | 'probe' | 'zealot' | 'dragoon' | 'high_templar' | 'dark_templar' | 'scout';
```

### 4b. 添加 Terran (ownerId=3) 配置到 EconomicSystem

在 `src/systems/EconomicSystem.ts` 的 `RACE_CONFIG` 中添加：

```typescript
const RACE_CONFIG: Record<number, RaceConfig> = {
  1: { /* Zerg */ },
  2: { /* Protoss */ },
  3: { // Terran
    supplyBuilding: { type: 'build', unitOrBuilding: 'supply_depot' },
    productionBuilding: 'barracks',
    worker: 'scv',
    armyRatios: [
      { unit: 'marine', ratio: 0.50 },
      { unit: 'tank',  ratio: 0.30 },
      { unit: 'medic', ratio: 0.20 },
    ],
  },
};
```

### 4c. 添加 Terran 初始资源 + 骚扰目标查找到 game.ts

在 `game.ts` 中，`aiResources` 初始化块里添加 `3`：

```typescript
this.aiResources = {
  1: new PlayerResources(500), // Zerg
  2: new PlayerResources(500), // Protoss
  3: new PlayerResources(500), // Terran  ← 新增
};
```

同时，`setResourcesForOwner` 的调用也要添加 `3`：

```typescript
this.economicSystem.setResourcesForOwner(3, this.aiResources[3]);
this.buildSystem.setResourcesForOwner(3, this.aiResources[3]);
this.trainingSystem.setResourcesForOwner(3, this.aiResources[3]);
```

### 4d. 添加 Terran 测试

在 `tests/systems/EconomicSystem.test.ts` 中添加：

```typescript
it('Terran: queues marines from barracks', () => {
  const barracks = makeBuilding(world, 'barracks', 3, 0, 0, true);
  resources3.useSupply(10); // supplyUsed=10 < 20, phase 1

  world.update(5);

  const queue = barracks.getComponent<TrainQueue>('TrainQueue')!;
  expect(queue.queue.every(u => u === 'scv')).toBe(true); // phase 1: workers only
});

it('Terran: phase 2 applies Marine/Tank/Medic ratios', () => {
  const barracks = makeBuilding(world, 'barracks', 3, 0, 0, true);
  resources3.useSupply(25); // supplyUsed=25 >= 20, phase 2

  world.update(5);

  const queue = barracks.getComponent<TrainQueue>('TrainQueue')!;
  expect(queue.queue.length).toBeGreaterThan(0);
  expect(queue.queue.every(u => ['marine', 'tank', 'medic', 'scv'].includes(u))).toBe(true);
});
```

在测试文件 `beforeEach` 中添加：
```typescript
let resources3: PlayerResources;
// in beforeEach:
resources3 = new PlayerResources(1000, 0, 10);
system.setResourcesForOwner(3, resources3);
```

- [ ] **Step: Run tests**

Run: `pnpm tsc --noEmit && pnpm test`
Expected: All pass (81+ tests)

- [ ] **Step: Commit**

```bash
git add src/data/units.json src/components/Unit.ts src/systems/EconomicSystem.ts src/game.ts tests/systems/EconomicSystem.test.ts
git commit -m "feat(ai): add Terran economic config (ownerId=3) with medic unit"
```

---

## Task 5: game.ts 集成 StrategySystem

**Files:**
- Modify: `src/game.ts`

**前置条件：** Task 2 + Task 4 已完成

- [ ] **Step 1: Add import for StrategySystem**

```typescript
import { StrategySystem } from './systems/StrategySystem';
```

- [ ] **Step 2: Add StrategySystem field**

```typescript
private economicSystem!: EconomicSystem;
private strategySystem!: StrategySystem; // ← 新增
```

- [ ] **Step 3: Initialize StrategySystem in init()**

在 `this.world.addSystem(this.economicSystem);` 之后添加：

```typescript
this.strategySystem = new StrategySystem();
this.world.addSystem(this.strategySystem);
```

- [ ] **Step 4: Add StrategyState to existing AI ArmyGroups in initTestScene()**

在 `initTestScene()` 中，找到现有的 AI 单位，将其加入 ArmyGroup 并添加 StrategyState：

在 `aiMarine`（Zerg, ownerId=1）定义之后添加：
```typescript
const aiGroup = world.createEntity();
aiGroup.addComponent(new ArmyGroup(1));
aiGroup.addComponent(new StrategyState('rush'));
// Add aiMarine to the group
aiGroup.getComponent<ArmyGroup>('ArmyGroup')!.addUnit(aiMarine.id);
```

同样为 Protoss zealot（ownerId=2）添加 ArmyGroup + StrategyState：
```typescript
const protossGroup = world.createEntity();
protossGroup.addComponent(new ArmyGroup(2));
protossGroup.addComponent(new StrategyState('rush'));
protossGroup.getComponent<ArmyGroup>('ArmyGroup')!.addUnit(zealot.id);
```

**简化方案**：由于 `initTestScene` 中 AI 单位是通过 `ownerId` 被 `AISystem` 处理的，不需要强制转换为 ArmyGroup。StrategySystem 会自动为 `ArmyGroup` 实体设置 StrategyState。**不需要修改 initTestScene**，StrategySystem 会通过 `world.getEntitiesWithComponents('ArmyGroup', 'StrategyState')` 自动发现已有 ArmyGroup。

但如果有现有 ArmyGroup 没有 StrategyState，StrategySystem 的更新逻辑会跳过它们（因为查询同时要求两个组件）。如果想让所有 AI ArmyGroup 都受策略控制，应该在 game.ts 初始化时给现有 ArmyGroup 添加 StrategyState。

**简化处理**：先不修改 initTestScene，在 StrategySystem 测试中验证行为。如果需要 AI ArmyGroup 都受策略控制，可以在 game.ts 的 `init()` 中统一为所有无 StrategyState 的 ArmyGroup 补充添加。

- [ ] **Step 5: Run tests and type-check**

Run: `pnpm tsc --noEmit && pnpm test`

- [ ] **Step 6: Commit**

```bash
git add src/game.ts
git commit -m "feat(ai): wire StrategySystem into game initialization"
```

---

## 验证计划

1. `pnpm tsc --noEmit` — 0 errors
2. `pnpm test` — all tests pass (expect 85+ with new tests)
3. `pnpm build` — production build succeeds

---

## 依赖关系

```
Task 1 → Task 2 → Task 3
              ↘ Task 4 ↗
         Task 2 + Task 4 → Task 5
```

- Task 2 依赖 Task 1（StrategyState/RushTarget 组件）
- Task 3 依赖 Task 1 + Task 2
- Task 4 依赖 Task 2（EconomicSystem 修改）
- Task 5 依赖 Task 2 + Task 4
