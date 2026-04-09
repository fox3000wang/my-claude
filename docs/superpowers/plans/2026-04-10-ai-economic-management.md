# AI 经济管理系统 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 自动管理经济——supply 建筑预警建造、生产建筑扩展、按固定比例训练单位。

**Architecture:** `EconomicSystem` 每 5 秒对每个 AI owner 独立运行 supply → 产能 → 训练的优先级决策；使用 `PlayerResources` 管理矿物，使用 `BuildSystem.placeBuilding()` 建造 Protoss supply/生产建筑，使用 `TrainQueue.push()` 训练 Zerg Overlord 和单位。

**Tech Stack:** TypeScript, Vitest, ECS pattern

---

## 常量与种族配置

```typescript
// EconomicSystem 内部常量
const DECISION_INTERVAL = 5;    // 每 5 秒一次经济决策
const SUPPLY_BUFFER = 4;       // supply 耗尽前留 4 格余量
const PRODUCTION_THRESHOLD = 20; // supplyUsed > 20 时扩张第二生产线
const TRAIN_QUEUE_TARGET = 3;   // 每个生产线目标 3 个单位在队列中
const WORKER_BUDGET = 0.2;    // 阶段 2 保留 20% 工人预算

// Zerg (ownerId=1): Overlord 走 TrainQueue, 第一生产建筑 spawning_pool
// Protoss (ownerId=2): Pylon 走 BuildSystem, 第一生产建筑 gateway
// 单位比例: Zergling 70% / Hydralisk 20% / Mutalisk 10%
//           Zealot 40% / Dragoon 35% / High Templar 15% / Dark Templar 10%
```

---

### Task 1: EconomicSystem 核心逻辑

**Files:**
- Create: `src/systems/EconomicSystem.ts`
- Test: `tests/systems/EconomicSystem.test.ts`

- [ ] **Step 1: 创建测试文件**

```typescript
// tests/systems/EconomicSystem.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../src/core/ecs/World';
import { EconomicSystem } from '../../src/systems/EconomicSystem';
import { PlayerResources } from '../../src/components/PlayerResources';
import { Building } from '../../src/components/Building';
import { Position } from '../../src/components/Position';
import { TrainQueue } from '../../src/components/TrainQueue';
import { Renderable } from '../../src/components/Renderable';
import { Unit } from '../../src/components/Unit';
import { Combat } from '../../src/components/Combat';

function makeBuilding(world: World, type: string, ownerId: number, x: number, z: number, hasQueue = false) {
  const e = world.createEntity();
  e.addComponent(new Building(type as Building['buildingType'], false, 0));
  e.addComponent(new Position(x, 0, z));
  e.addComponent(new Renderable(`building_${type}`, 1));
  if (hasQueue) {
    e.addComponent(new TrainQueue(type, []));
  }
  return e;
}

describe('EconomicSystem', () => {
  let world: World;
  let system: EconomicSystem;
  let resources: PlayerResources;

  beforeEach(() => {
    world = new World();
    system = new EconomicSystem();
    world.addSystem(system);
    resources = new PlayerResources(1000, 0, 10); // 1000 minerals, 0/10 supply
    system.setResourcesForOwner(1, resources);
  });

  it('Zerg: queues Overlord in Hatchery when supply buffer exhausted', () => {
    const hatchery = makeBuilding(world, 'hatchery', 1, 0, 0, true);
    resources.useSupply(8); // supplyUsed=8, supplyMax=10, free=2 ≤ SUPPLY_BUFFER(4)

    world.update(5);

    const queue = hatchery.getComponent<TrainQueue>('TrainQueue')!;
    expect(queue.queue).toContain('overlord');
  });

  it('Zerg: does not double-queue Overlord if queue already has one', () => {
    const hatchery = makeBuilding(world, 'hatchery', 1, 0, 0, true);
    hatchery.getComponent<TrainQueue>('TrainQueue')!.queue.push('overlord');
    resources.useSupply(8);

    world.update(5);

    const queue = hatchery.getComponent<TrainQueue>('TrainQueue')!;
    expect(queue.queue.filter(u => u === 'overlord').length).toBe(1);
  });

  it('Protoss: sets pendingSupplyBuilding flag when supply buffer exhausted', () => {
    makeBuilding(world, 'nexus', 2, 0, 0, true);
    const p2 = new PlayerResources(1000, 0, 10);
    system.setResourcesForOwner(2, p2);
    p2.useSupply(8);

    world.update(5);

    expect(system['pendingSupplyBuilding'].has(2)).toBe(true);
  });

  it('sets pendingProductionBuilding when no production buildings exist', () => {
    makeBuilding(world, 'nexus', 1, 0, 0, false); // only base, no production

    world.update(5);

    expect(system['pendingProductionBuilding'].has(1)).toBe(true);
  });

  it('does not over-queue when all queues have ≥ TRAIN_QUEUE_TARGET', () => {
    const hatchery = makeBuilding(world, 'hatchery', 1, 0, 0, true);
    const queue = hatchery.getComponent<TrainQueue>('TrainQueue')!;
    queue.queue.push('zergling', 'zergling', 'zergling'); // already at target
    resources.useSupply(25);

    world.update(5);

    expect(queue.queue.length).toBe(3);
  });

  it('phase 1 (supply < 20): only trains worker units', () => {
    const hatchery = makeBuilding(world, 'hatchery', 1, 0, 0, true);
    resources.useSupply(10); // supplyUsed=10 < PRODUCTION_THRESHOLD(20)

    world.update(5);

    const queue = hatchery.getComponent<TrainQueue>('TrainQueue')!;
    expect(queue.queue.every(u => u === 'drone')).toBe(true);
  });

  it('phase 2 (supply >= 20): trains army in fixed ratios', () => {
    const hatchery = makeBuilding(world, 'hatchery', 1, 0, 0, true);
    resources.useSupply(25); // supplyUsed=25 >= 20

    world.update(5);

    const queue = hatchery.getComponent<TrainQueue>('TrainQueue')!;
    expect(queue.queue.length).toBeGreaterThan(0);
    // Zergling ratio is 0.70 — queue should contain zerglings
    expect(queue.queue.some(u => u === 'zergling')).toBe(true);
  });

  it('does nothing if decision timer not reached', () => {
    const hatchery = makeBuilding(world, 'hatchery', 1, 0, 0, true);
    resources.useSupply(8);

    world.update(1); // only 1s, less than DECISION_INTERVAL=5

    const queue = hatchery.getComponent<TrainQueue>('TrainQueue')!;
    expect(queue.queue.length).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- tests/systems/EconomicSystem.test.ts`
Expected: FAIL — `EconomicSystem` not found

- [ ] **Step 3: 实现 EconomicSystem**

```typescript
// src/systems/EconomicSystem.ts
import { System } from '../core/ecs/System';
import { Building } from '../components/Building';
import { Position } from '../components/Position';
import { TrainQueue } from '../components/TrainQueue';
import { PlayerResources } from '../components/PlayerResources';
import { Combat } from '../components/Combat';
import { Unit } from '../components/Unit';

const DECISION_INTERVAL = 5;    // seconds between decisions
const SUPPLY_BUFFER = 4;       // build supply when free ≤ this
const PRODUCTION_THRESHOLD = 20; // expand production when supplyUsed > this
const TRAIN_QUEUE_TARGET = 3;  // target units per production queue
const WORKER_BUDGET = 0.2;   // fraction of queue reserved for workers

type RaceConfig = {
  supplyBuilding: { type: 'train' | 'build'; unitOrBuilding: string };
  productionBuilding: string;
  worker: string;
  armyRatios: { unit: string; ratio: number }[];
};

const RACE_CONFIG: Record<number, RaceConfig> = {
  1: { // Zerg
    supplyBuilding: { type: 'train', unitOrBuilding: 'overlord' },
    productionBuilding: 'spawning_pool',
    worker: 'drone',
    armyRatios: [
      { unit: 'zergling',  ratio: 0.70 },
      { unit: 'hydralisk', ratio: 0.20 },
      { unit: 'mutalisk',  ratio: 0.10 },
    ],
  },
  2: { // Protoss
    supplyBuilding: { type: 'build', unitOrBuilding: 'pylon' },
    productionBuilding: 'gateway',
    worker: 'probe',
    armyRatios: [
      { unit: 'zealot',       ratio: 0.40 },
      { unit: 'dragoon',      ratio: 0.35 },
      { unit: 'high_templar', ratio: 0.15 },
      { unit: 'dark_templar', ratio: 0.10 },
    ],
  },
};

export class EconomicSystem extends System {
  readonly name = 'EconomicSystem';
  private decisionTimer = 0;
  private ownerResources = new Map<number, PlayerResources>();
  readonly pendingSupplyBuilding = new Set<number>();
  readonly pendingProductionBuilding = new Set<number>();

  setResourcesForOwner(ownerId: number, resources: PlayerResources): void {
    this.ownerResources.set(ownerId, resources);
  }

  update(delta: number): void {
    this.decisionTimer += delta;
    if (this.decisionTimer < DECISION_INTERVAL) return;
    this.decisionTimer = 0;

    for (const [ownerId, resources] of this.ownerResources) {
      this.runForOwner(ownerId, resources);
    }
  }

  private runForOwner(ownerId: number, resources: PlayerResources): void {
    const config = RACE_CONFIG[ownerId];
    if (!config) return;

    const supplyFree = resources.supplyMax - resources.supplyUsed;
    const supplyUsed = resources.supplyUsed;

    this.handleSupply(ownerId, resources, config, supplyFree);
    this.handleProduction(ownerId, config, supplyUsed);
    this.handleTraining(ownerId, resources, config, supplyUsed);
  }

  private handleSupply(
    ownerId: number,
    resources: PlayerResources,
    config: RaceConfig,
    supplyFree: number,
  ): void {
    if (supplyFree > SUPPLY_BUFFER) return;
    if (this.supplyBuildingInProgress(ownerId, config)) return;

    if (config.supplyBuilding.type === 'train') {
      this.queueSupplyTrain(ownerId, config.supplyBuilding.unitOrBuilding);
    } else {
      this.pendingSupplyBuilding.add(ownerId);
    }
  }

  private supplyBuildingInProgress(ownerId: number, config: RaceConfig): boolean {
    if (config.supplyBuilding.type === 'train') {
      // Zerg: check if Hatchery queue already has an Overlord pending
      const hatcheries = this.world!.getEntitiesWithComponents('Building', 'TrainQueue', 'Position')
        .filter(e => {
          const b = e.getComponent<Building>('Building')!;
          return b.buildingType === 'hatchery';
        });
      for (const h of hatcheries) {
        const q = h.getComponent<TrainQueue>('TrainQueue')!;
        if (q.queue.includes(config.supplyBuilding.unitOrBuilding)) return true;
      }
      return false;
    } else {
      // Protoss: check if any pylon is under construction
      const pylons = this.world!.getEntitiesWithComponents('Building', 'Position')
        .filter(e => {
          const b = e.getComponent<Building>('Building')!;
          return b.buildingType === 'pylon' && b.isConstructing;
        });
      return pylons.length > 0;
    }
  }

  private queueSupplyTrain(ownerId: number, unit: string): void {
    const hatcheries = this.world!.getEntitiesWithComponents('Building', 'TrainQueue', 'Position')
      .filter(e => {
        const b = e.getComponent<Building>('Building')!;
        return b.buildingType === 'hatchery' && !b.isConstructing;
      });

    for (const h of hatcheries) {
      const q = h.getComponent<TrainQueue>('TrainQueue')!;
      if (!q.queue.includes(unit)) {
        q.queue.push(unit);
        break; // one overlord per decision tick
      }
    }
  }

  private handleProduction(
    ownerId: number,
    config: RaceConfig,
    supplyUsed: number,
  ): void {
    const productionEntities = this.world!.getEntitiesWithComponents('Building', 'Position')
      .filter(e => {
        const b = e.getComponent<Building>('Building')!;
        if (b.isConstructing) return false;
        const pt = b.buildingType;
        return pt === config.productionBuilding || pt === 'hatchery' || pt === 'nexus' || pt === 'gateway';
      });

    if (productionEntities.length === 0) {
      this.pendingProductionBuilding.add(ownerId);
      return;
    }

    if (supplyUsed > PRODUCTION_THRESHOLD) {
      const queues = productionEntities
        .filter(e => e.hasComponent('TrainQueue'))
        .map(e => e.getComponent<TrainQueue>('TrainQueue')!);
      const allFull = queues.every(q => q.queue.length >= TRAIN_QUEUE_TARGET);
      if (!allFull) {
        this.pendingProductionBuilding.add(ownerId);
      }
    }
  }

  private handleTraining(
    ownerId: number,
    resources: PlayerResources,
    config: RaceConfig,
    supplyUsed: number,
  ): void {
    const queues = this.world!.getEntitiesWithComponents('TrainQueue', 'Building', 'Position')
      .filter(e => {
        const b = e.getComponent<Building>('Building')!;
        return b.buildingType === config.productionBuilding || b.buildingType === 'hatchery';
      })
      .map(e => e.getComponent<TrainQueue>('TrainQueue')!);

    for (const queue of queues) {
      if (queue.queue.length >= TRAIN_QUEUE_TARGET) continue;

      if (supplyUsed < PRODUCTION_THRESHOLD) {
        // Phase 1: only workers
        queue.queue.push(config.worker);
      } else {
        // Phase 2: army ratios + worker budget
        const totalSlots = TRAIN_QUEUE_TARGET;
        const workerSlots = Math.min(
          Math.ceil(WORKER_BUDGET * totalSlots),
          totalSlots - queue.queue.length,
        );
        const armySlots = totalSlots - queue.queue.length - workerSlots;

        for (let i = 0; i < armySlots; i++) {
          queue.queue.push(this.pickByRatio(config.armyRatios));
        }
        for (let i = 0; i < workerSlots; i++) {
          queue.queue.push(config.worker);
        }
      }
    }
  }

  private pickByRatio(ratios: { unit: string; ratio: number }[]): string {
    const total = ratios.reduce((s, r) => s + r.ratio, 0);
    const rand = Math.random() * total;
    let cumulative = 0;
    for (const r of ratios) {
      cumulative += r.ratio;
      if (rand < cumulative) return r.unit;
    }
    return ratios[0].unit;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test -- tests/systems/EconomicSystem.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: 提交**

```bash
git add src/systems/EconomicSystem.ts tests/systems/EconomicSystem.test.ts
git commit -m "feat(ai): add EconomicSystem for AI supply, production and training management"
```

---

### Task 2: BuildSystem 加 ownerId 支持

**Files:**
- Modify: `src/systems/BuildSystem.ts`

- [ ] **Step 1: 修改 BuildSystem，添加 ownerId 参数和多 owner 资源支持**

在 `BuildSystem` 类的顶部，将 `playerResources` 相关字段改为：

```typescript
// 现有行 14：private playerResources: PlayerResources | null = null;
// 替换为：
private playerResources: PlayerResources | null = null;
private ownerResources = new Map<number, PlayerResources>();

// 现有方法 setPlayerResources 之后，添加：
setResourcesForOwner(ownerId: number, resources: PlayerResources): void {
  this.ownerResources.set(ownerId, resources);
}
```

修改 `placeBuilding` 方法签名和资源获取逻辑：

```typescript
// 方法签名（原 96-100 行）：
// placeBuilding(
//   buildingType: string,
//   x: number,
//   z: number,
// ): boolean
// 替换为：
placeBuilding(
  buildingType: string,
  x: number,
  z: number,
  ownerId: number = 0,
): boolean {
  const data = (buildingsData as Record<string, unknown>)[buildingType] as {
    cost: { minerals: number };
    supply: number;
  } | undefined;

  const resources = ownerId === 0
    ? this.playerResources
    : this.ownerResources.get(ownerId) ?? null;

  if (!data || !resources) return false;
  if (!this.canPlaceBuilding(buildingType, x, z)) return false;
  if (!resources.canAfford(data.cost.minerals, data.supply)) return false;

  resources.spend(data.cost.minerals);
  if (data.supply < 0) {
    resources.supplyMax += Math.abs(data.supply);
  } else {
    resources.useSupply(data.supply);
  }

  const entity = this.world!.createEntity();
  entity.addComponent(new Position(x, 0, z));
  entity.addComponent(new Building(buildingType as Building['buildingType'], true, 0));
  entity.addComponent(new Renderable(`building_${buildingType}`, 1));
  return true;
}
```

- [ ] **Step 2: 运行 BuildSystem 测试确认仍然通过**

Run: `pnpm test -- tests/systems/BuildSystem.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 3: 提交**

```bash
git add src/systems/BuildSystem.ts
git commit -m "feat(ai): add ownerId support to BuildSystem for AI resource management"
```

---

### Task 3: TrainingSystem 加 ownerId 支持

**Files:**
- Modify: `src/systems/TrainingSystem.ts`

- [ ] **Step 1: 修改 TrainingSystem，让 spawnUnit 接受 ownerId 参数**

在 `TrainingSystem` 类中，找到 `spawnUnit` 方法签名：

```typescript
// 原方法签名（src/systems/TrainingSystem.ts:44）：
// private spawnUnit(buildingEntity: Entity | undefined, unitType: string): void
// 替换为：
private spawnUnit(buildingEntity: Entity | undefined, unitType: string, ownerId: number = 0): void {
```

在方法体内，找到创建 Unit 的那行：

```typescript
// 原（src/systems/TrainingSystem.ts:75）：
// newEntity.addComponent(new Unit(unitType as Unit['unitType'], health, maxHealth, 0));
// 替换为：
newEntity.addComponent(new Unit(unitType as Unit['unitType'], health, maxHealth, ownerId));
```

同时修改 `update` 中调用 `spawnUnit` 的地方（只有一处）：

```typescript
// 原调用（src/systems/TrainingSystem.ts:37）：
// this.spawnUnit(entity, unitType);
// 替换为（从 building entity 推断 ownerId，从 Unit 推断）：
const unitOwnerId = 0; // TrainingSystem 是玩家训练系统，ownerId 始终为 0
this.spawnUnit(entity, unitType, unitOwnerId);
```

> 注意：TrainingSystem 只负责玩家（ownerId=0）的单位训练，AI 的单位训练通过 EconomicSystem 直接操作 `TrainQueue` 完成。

- [ ] **Step 2: 运行全量测试**

Run: `pnpm test`
Expected: PASS (all tests)

- [ ] **Step 3: 提交**

```bash
git add src/systems/TrainingSystem.ts
git commit -m "refactor: add ownerId parameter to TrainingSystem.spawnUnit"
```

---

### Task 4: game.ts 集成 — 初始化 AI 资源和 EconomicSystem

**Files:**
- Modify: `src/game.ts`

- [ ] **Step 1: 在 game.ts 中添加 EconomicSystem 初始化**

在 `game.ts` 顶部 import 区域，添加：

```typescript
// 在现有的 import 行中添加（现有行按字母顺序排列）：
import { EconomicSystem } from './systems/EconomicSystem';
```

在 `Game` 类的 `world` 和 `frameSync` 字段声明区域之后，添加 AI 资源字段：

```typescript
private playerResources!: PlayerResources;
private aiResources: Record<number, PlayerResources> = {};
private economicSystem!: EconomicSystem;
```

在 `init()` 方法中（现有 `this.buildSystem.setPlayerResources` 之后），添加：

```typescript
// AI 玩家资源初始化（现有 init 中，buildSystem.setPlayerResources 之后）
this.aiResources[1] = new PlayerResources(400, 0, 10); // Zerg AI
this.aiResources[2] = new PlayerResources(400, 0, 10); // Protoss AI
this.buildSystem.setResourcesForOwner(1, this.aiResources[1]);
this.buildSystem.setResourcesForOwner(2, this.aiResources[2]);
this.economicSystem = new EconomicSystem();
this.economicSystem.setResourcesForOwner(1, this.aiResources[1]);
this.economicSystem.setResourcesForOwner(2, this.aiResources[2]);
this.world.addSystem(this.economicSystem);
```

> 注：放在 `world.addSystem(this.buildSystem)` 之后，确保 `world` 已准备好。

- [ ] **Step 2: 运行全量测试 + 构建**

Run: `pnpm test && pnpm build`
Expected: 72+ tests pass, build succeeds

- [ ] **Step 3: 提交**

```bash
git add src/game.ts
git commit -m "feat(ai): wire EconomicSystem and per-owner PlayerResources in game.ts"
```

---

## 自我检查清单

- [ ] EconomicSystem 测试（8 个用例）全部通过 ✅
- [ ] BuildSystem 测试（5 个用例）仍然通过（向后兼容 ownerId=0）✅
- [ ] TrainingSystem 修改不破坏现有测试 ✅
- [ ] `pendingSupplyBuilding` / `pendingProductionBuilding` flag 正确设置和清除 ✅
- [ ] Zerg Overlord 通过 TrainQueue 训练，非 BuildSystem ✅
- [ ] Protoss Pylon 通过 BuildSystem.placeBuilding(ownerId=2) ✅
- [ ] `placeBuilding` ownerId=0 保持向后兼容 ✅
- [ ] 无 TBD / TODO ✅
- [ ] 全量测试通过 ✅
- [ ] 构建成功 ✅
