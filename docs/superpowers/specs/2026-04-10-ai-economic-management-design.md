# AI 经济管理系统 — 设计文档

> **适用对象**：AI 开发工程师
> **目标**：为 AI 添加经济管理能力——自动建造 supply 建筑、生产建筑，并根据固定比例训练单位。

## 背景

当前 AI 仅负责战斗微操（撤退、进攻、巡逻），完全不参与经济决策：
- 不建造任何建筑
- 不训练任何单位
- 不管理工人

`ArmyGroupSystem`（Phase A）已实现军队协调，但军队需要通过 `EconomicSystem` 持续补充兵力。

## 架构概览

新增 `EconomicSystem`，每 5 秒为每个 AI 玩家（ownerId = 1, 2...）执行一次经济决策：

```
每 tick 优先级：
1. Supply 检查   →  建造 supply 建筑
2. 产能检查       →  建造/扩展生产建筑
3. 兵种填充       →  按比例训练单位
```

**关键设计原则**：
- 每个 ownerId 独立运行自己的经济循环
- 决策基于当前 `PlayerResources` 余额和 `supplyUsed / supplyMax`
- 不改动现有的 `BuildSystem`、`TrainingSystem`、`ResourceSystem`

---

## 种族配置

### Zerg（ownerId = 1）

| 决策项 | 值 |
|--------|-----|
| Supply 建筑 | Overlord（`TrainingSystem`，不是 `BuildSystem`） |
| 基地建筑 | Hatchery |
| 生产建筑 | Spawning Pool → Hydralisk Den → Spire（按需解锁） |
| 工人单位 | Drone |
| 主力单位比例 | Zergling 70% / Hydralisk 20% / Mutalisk 10% |

### Protoss（ownerId = 2）

| 决策项 | 值 |
|--------|-----|
| Supply 建筑 | Pylon（`BuildSystem`） |
| 基地建筑 | Nexus |
| 生产建筑 | Gateway → Cybernetics Core → Stargate（按需解锁） |
| 工人单位 | Probe |
| 主力单位比例 | Zealot 40% / Dragoon 35% / High Templar 15% / Dark Templar 10% |

---

## Supply 检查逻辑

```
if (supplyMax - supplyUsed <= 4 && !supplyBuildingInProgress):
  Zerg:   在 Hatchery 队列中插入 Overlord
  Protoss: 调用 BuildSystem.placeBuilding('pylon')
```

- **Buffer = 4**：在 supply 耗尽前留 4 格余量，避免战斗中突然断 supply
- `supplyBuildingInProgress`：检查是否有 supply 建筑正在建造（Zerg 查 Hatchery 队列，Protoss 查 Grid 中的在建建筑）
- Zerg Overlord 通过 `TrainQueue` 训练（`units.json` 中 supply = -8，表示增加 cap）

---

## 产能检查逻辑

```
if (没有生产建筑):
  建造第一个生产建筑（Zerg: Spawning Pool, Protoss: Gateway）
else if (supplyUsed > 20 && 所有生产建筑队列深度 < 2):
  建造第二个生产建筑（同上）
```

- `supplyUsed > 20` 是门槛：确保有足够经济基础时才扩张产能
- "队列深度 < 2"：少于 2 个单位排队 = 产能空闲，需要更多建筑
- Zerg 生化池（Hatchery/spawning_pool）通过 `BuildSystem.placeBuilding()` 建造
- 生产建筑完成后再向其 `TrainQueue` 填充单位

---

## 单位训练逻辑

### 阶段 1：早期（supplyUsed < 20）

仅训练工人，维持经济收入：
- Zerg: Drone
- Protoss: Probe

### 阶段 2：中期（supplyUsed >= 20）

用固定比例填充所有生产队列：

**Zerg 示例（总数 10 个单位）：**
```
Zergling:  10 × 0.70 = 7
Hydralisk: 10 × 0.20 = 2
Mutalisk:  10 × 0.10 = 1
```

**Protoss 示例（总数 10 个单位）：**
```
Zealot:         10 × 0.40 = 4
Dragoon:        10 × 0.35 = 3.5 → 4
High Templar:   10 × 0.15 = 1.5 → 2
Dark Templar:   10 × 0.10 = 1
```

**实现方式**：
1. 遍历所有有 `TrainQueue` 的生产建筑
2. 计算当前队列中各兵种数量（从 `TrainQueue.queue[]` 读取）
3. 补充不足目标数量的单位（`queue.push(unitType)`）
4. 保留 20% 的工人训练预算（每 5 个单位中 1 个工人）

---

## 组件与接口

### 新增：EconomicSystem

```typescript
class EconomicSystem extends System {
  private decisionTimer = 0;
  private readonly DECISION_INTERVAL = 5; // 每 5 秒一次
  private ownerResources: Map<number, PlayerResources> = new Map();
  private ownerBuildProgress: Map<number, { type: string; done: boolean }> = new Map();

  setResourcesForOwner(ownerId: number, resources: PlayerResources): void { ... }
  update(delta: number): void { ... } // 每 5 秒为每个 owner 运行经济决策
}
```

### 修改：BuildSystem

新增 `placeBuilding` 重载，支持指定 ownerId：

```typescript
placeBuilding(
  buildingType: string,
  x: number,
  z: number,
  ownerId: number,
): void
```

- `ownerId = 0` → 使用玩家资源（现有逻辑）
- `ownerId > 0` → 使用对应 AI 的 `PlayerResources`

### 修改：game.ts

```typescript
// 为每个 AI owner 创建独立的 PlayerResources
this.aiResources = {
  1: new PlayerResources(), // Zerg AI
  2: new PlayerResources(), // Protoss AI
};
this.economicSystem = new EconomicSystem();
this.economicSystem.setResourcesForOwner(1, this.aiResources[1]);
this.economicSystem.setResourcesForOwner(2, this.aiResources[2]);
this.world.addSystem(this.economicSystem);
```

### 修改：TrainingSystem

`spawnUnit` 需要知道新单位属于哪个 owner：

```typescript
private spawnUnit(buildingEntity: Entity, ownerId: number): void {
  // 单位 ownerId 设为对应 AI 的 ownerId
  newEntity.addComponent(new Unit(unitType, health, maxHealth, ownerId));
}
```

---

## 测试策略

### EconomicSystem 单元测试

| 测试用例 | 验证内容 |
|---------|---------|
| Supply 耗尽时自动建造 Overlord / Pylon | `supplyMax - supplyUsed <= 4` 触发 supply 建筑 |
| 有 supply 建筑进行中时不重复建造 | 已有在建 supply 时不再入队 |
| 无生产建筑时自动建造 | 第一tick 即触发生产建筑建造 |
| 队列满时扩张第二生产线 | 队列深度 = 2 时不触发，< 2 且 supply > 20 时触发 |
| 阶段 1 仅训练工人 | supplyUsed < 20 时队列中无战斗单位 |
| 阶段 2 按比例训练 | 队列总长 10，Zergling 数量 ≈ 70% |
| 保留 20% 工人预算 | 工人占队列 ≈ 20% |
| Zerg Overlord 通过 TrainQueue 训练 | 非 BuildSystem |
| Protoss Pylon 通过 BuildSystem 建造 | 非 TrainQueue |

---

## 文件清单

```
src/
├── systems/
│   └── EconomicSystem.ts   (新建)
tests/
├── systems/
│   └── EconomicSystem.test.ts  (新建)
src/systems/BuildSystem.ts      (修改)
src/systems/TrainingSystem.ts    (修改)
src/game.ts                      (修改)
```

---

## 自我检查

1. **占位符检查**：无 TBD / TODO / 不完整步骤 ✅
2. **内部一致性**：Supply buffer = 4 与测试用例一致；Overlord 走 TrainQueue（非 BuildSystem）与实现逻辑一致 ✅
3. **范围检查**：聚焦在 supply + 生产建筑 + 单位训练；工人管理（饱和度）不在本 phase 范围内 ✅
4. **歧义检查**："队列深度 < 2" 明确为 `queue.length < 2`；Zerg Overlord 走 TrainQueue 明确说明 ✅
