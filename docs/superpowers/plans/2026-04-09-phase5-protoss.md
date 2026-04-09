# Phase 5: 神族 Protoss

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 添加神族 Protoss 单位、建筑、护盾系统（Shield 独立组件 + 自动回复）、能量系统（Energy 组件供法师单位），扩展 UnitType 和 BuildingType，完善 Phase 4 的种族颜色体系。

**Architecture:**
- `Shield` 组件独立于 `Health`，护盾优先扣除，自动回复（ShieldSystem 每秒 +2.0，离战斗 4 秒后触发）
- `Energy` 组件独立，初始 0，最大值 200，法师单位自动被动回能（+0.7875/秒）
- 护盾颜色金黄 (0xffcc00)，与 Protoss 单位主色一致
- Warp Gate 升级在 `PlayerResources` 中通过布尔标记实现，`TrainingSystem` 对 Warp Gate 生产的单位传送落地

**Tech Stack:** Three.js + React + ECS + TypeScript strict + Vitest

---

## Task 1: 扩展 UnitType 和 BuildingType + Protoss 数据

**Files:**
- Modify: `src/components/Unit.ts` — 扩展 UnitType union type
- Modify: `src/components/Building.ts` — 扩展 BuildingType union type，添加 `energy?: number` 属性（Nexus 能量）
- Modify: `src/data/units.json` — 添加 Protoss 单位数据
- Modify: `src/data/buildings.json` — 添加 Protoss 建筑数据

**Protoss 单位数据 (添加到 units.json):**
```json
"zealot": {
  "name": "Zealot",
  "health": 100,
  "maxHealth": 100,
  "shields": 50,
  "maxShields": 50,
  "attack": 8,
  "armor": 1,
  "range": 1,
  "speed": 2.5,
  "cost": { "minerals": 100, "supply": 2 }
},
"dragoon": {
  "name": "Dragoon",
  "health": 100,
  "maxHealth": 100,
  "shields": 80,
  "maxShields": 80,
  "attack": 20,
  "armor": 1,
  "range": 6,
  "speed": 2.5,
  "cost": { "minerals": 125, "supply": 2 }
},
"high_templar": {
  "name": "High Templar",
  "health": 40,
  "maxHealth": 40,
  "shields": 40,
  "maxShields": 40,
  "attack": 0,
  "armor": 0,
  "range": 7,
  "speed": 2.0,
  "energy": 200,
  "maxEnergy": 200,
  "cost": { "minerals": 50, "supply": 2 }
},
"dark_templar": {
  "name": "Dark Templar",
  "health": 80,
  "maxHealth": 80,
  "shields": 80,
  "maxShields": 80,
  "attack": 45,
  "armor": 3,
  "range": 1,
  "speed": 3.0,
  "cost": { "minerals": 125, "supply": 2 }
},
"scout": {
  "name": "Scout",
  "health": 100,
  "maxHealth": 100,
  "shields": 100,
  "maxShields": 100,
  "attack": 8,
  "armor": 0,
  "range": 5,
  "speed": 5.0,
  "cost": { "minerals": 100, "supply": 2 }
}
```

**Protoss 建筑数据 (添加到 buildings.json):**
```json
"nexus": {
  "name": "Nexus",
  "health": 1500,
  "cost": { "minerals": 400 },
  "supply": 0,
  "size": 3,
  "energy": 200,
  "spawns": ["probe", "zealot", "dragoon", "scout"]
},
"pylon": {
  "name": "Pylon",
  "health": 300,
  "cost": { "minerals": 100 },
  "supply": 8,
  "size": 1
},
"gateway": {
  "name": "Gateway",
  "health": 500,
  "cost": { "minerals": 150 },
  "supply": 0,
  "size": 2,
  "spawns": ["zealot", "dragoon", "dark_templar"]
},
"cybernetics_core": {
  "name": "Cybernetics Core",
  "health": 650,
  "cost": { "minerals": 200 },
  "supply": 0,
  "size": 2,
  "unlocks": ["dragoon", "scout"]
},
"forge": {
  "name": "Forge",
  "health": 500,
  "cost": { "minerals": 150 },
  "supply": 0,
  "size": 2,
  "unlocks": ["zealot"]
},
"stargate": {
  "name": "Stargate",
  "health": 600,
  "cost": { "minerals": 150 },
  "supply": 0,
  "size": 2,
  "spawns": ["scout"],
  "unlocks": []
},
"templar_archives": {
  "name": "Templar Archives",
  "health": 500,
  "cost": { "minerals": 150 },
  "supply": 0,
  "size": 2,
  "unlocks": ["high_templar", "dark_templar"]
},
"photon_cannon": {
  "name": "Photon Cannon",
  "health": 200,
  "cost": { "minerals": 100 },
  "supply": 0,
  "size": 1,
  "attack": 20,
  "range": 7
}
```

**Unit.ts 修改:**
```typescript
export type UnitType = 'scv' | 'marine' | 'firebat' | 'tank'
  | 'drone' | 'zergling' | 'hydralisk' | 'mutalisk' | 'overlord'
  | 'zealot' | 'dragoon' | 'high_templar' | 'dark_templar' | 'scout';
```

**Building.ts 修改:**
- 添加 `energy?: number`（当前能量）, `maxEnergy?: number` 属性

- [ ] **Step 1: 修改 `src/components/Unit.ts` 扩展 UnitType**
- [ ] **Step 2: 修改 `src/components/Building.ts` 扩展 BuildingType，添加 energy/maxEnergy**
- [ ] **Step 3: 将 Protoss 单位数据追加到 `src/data/units.json`**
- [ ] **Step 4: 将 Protoss 建筑数据追加到 `src/data/buildings.json`**
- [ ] **Step 5: 运行 `pnpm exec tsc --noEmit` 确认无类型错误**
- [ ] **Step 6: 提交**

```bash
git add src/components/Unit.ts src/components/Building.ts src/data/units.json src/data/buildings.json
git commit -m "feat: add Protoss units and buildings data"
```

---

## Task 2: Shield 组件和 ShieldSystem

**Files:**
- Create: `src/components/Shield.ts` — `Shield` 组件
- Create: `src/systems/ShieldSystem.ts` — 护盾回复系统
- Create: `tests/components/Shield.test.ts`

**Shield 组件:**
```typescript
export class Shield extends Component {
  constructor(
    public current: number,
    public max: number,
    public regenRate: number = 2.0,   // per second
    public regenDelay: number = 4.0,  // seconds out of combat before regen
  ) {
    super('Shield');
  }

  takeDamage(amount: number): number {
    // Returns unabsorbed damage (passes to health)
    if (amount <= this.current) {
      this.current = Math.max(0, this.current - amount);
      return 0;
    }
    const overflow = amount - this.current;
    this.current = 0;
    return overflow;
  }

  regenerate(delta: number): void {
    if (this.current < this.max) {
      this.current = Math.min(this.max, this.current + this.regenRate * delta);
    }
  }
}
```

**ShieldSystem 逻辑:**
- 查询所有有 `Shield` 的实体
- 如果单位最近受过伤害（由 CombatSystem 标记 `shieldDamaged = true`），倒计时 `regenDelay` 秒
- 倒计时结束后开始回复：`shield.regenerate(delta)`
- 需要在 CombatSystem 之后运行（game.ts 注册顺序）

- [ ] **Step 1: 创建 `src/components/Shield.ts`**
- [ ] **Step 2: 创建 `src/systems/ShieldSystem.ts`**
- [ ] **Step 3: 创建 `tests/components/Shield.test.ts`**
- [ ] **Step 4: 运行测试确认通过**
- [ ] **Step 5: 在 `src/game.ts` 注册 ShieldSystem（在 CombatSystem 之后）**
- [ ] **Step 6: 提交**

```bash
git add src/components/Shield.ts src/systems/ShieldSystem.ts tests/components/Shield.test.ts src/game.ts
git commit -m "feat: add Shield component and ShieldSystem for Protoss regeneration"
```

---

## Task 3: CombatSystem 护盾集成

**Files:**
- Modify: `src/systems/CombatSystem.ts` — 攻击时优先扣除护盾

**修改 `performAttack` 逻辑:**
1. 攻击命中后，检查目标是否有 `Shield` 组件
2. 如果有_shield，先扣护盾：`shield.takeDamage(attackDamage)`，剩余溢出伤害扣 Health
3. 如果无护盾，直接扣 Health
4. 无论护盾是否耗尽，标记 `shieldDamaged = true`（如果有 Shield 组件）

```typescript
const targetShield = target.getComponent<Shield>('Shield');
let damage = Math.max(1, combat.attack - (targetCombat?.armor ?? 0));

if (targetShield) {
  const overflow = targetShield.takeDamage(damage);
  if (overflow > 0 && targetHealth) {
    targetHealth.takeDamage(overflow);
  }
  // Mark shield as damaged for regeneration delay
  targetShield.regenDelayTimer = targetShield.regenDelay;
} else if (targetHealth) {
  targetHealth.takeDamage(damage);
}
```

注意：Shield 组件需要额外字段 `regenDelayTimer`（当前倒计时），在 Shield.ts 中添加。

- [ ] **Step 1: 修改 `src/components/Shield.ts` 添加 `regenDelayTimer` 字段**
- [ ] **Step 2: 修改 `src/systems/CombatSystem.ts` 优先扣除护盾逻辑**
- [ ] **Step 3: 运行 `pnpm exec tsc --noEmit` 确认无错误**
- [ ] **Step 4: 提交**

```bash
git add src/components/Shield.ts src/systems/CombatSystem.ts
git commit -m "feat: integrate Shield into CombatSystem damage calculation"
```

---

## Task 4: Energy 组件和 EnergySystem

**Files:**
- Create: `src/components/Energy.ts` — `Energy` 组件
- Create: `src/systems/EnergySystem.ts` — 能量回复系统
- Create: `tests/components/Energy.test.ts`

**Energy 组件:**
```typescript
export class Energy extends Component {
  constructor(
    public current: number,
    public max: number = 200,
    public regenRate: number = 0.7875, // per second
  ) {
    super('Energy');
  }

  spend(amount: number): boolean {
    if (this.current < amount) return false;
    this.current -= amount;
    return true;
  }

  tick(delta: number): void {
    if (this.current < this.max) {
      this.current = Math.min(this.max, this.current + this.regenRate * delta);
    }
  }
}
```

**EnergySystem 逻辑:**
- 查询所有有 `Energy` 的实体，每帧调用 `energy.tick(delta)`
- 法师单位自动回复能量

- [ ] **Step 1: 创建 `src/components/Energy.ts`**
- [ ] **Step 2: 创建 `src/systems/EnergySystem.ts`**
- [ ] **Step 3: 创建 `tests/components/Energy.test.ts`**
- [ ] **Step 4: 运行测试确认通过**
- [ ] **Step 5: 在 `src/game.ts` 注册 EnergySystem（MovementSystem 之后）**
- [ ] **Step 6: 提交**

```bash
git add src/components/Energy.ts src/systems/EnergySystem.ts tests/components/Energy.test.ts src/game.ts
git commit -m "feat: add Energy component and EnergySystem for Protoss spellcasters"
```

---

## Task 5: Protoss 建筑自动供能（Pylon 领域）

**Context:** Protoss 需要 Pylon 提供能量范围，Nexus 产兵消耗能量。

**简化方案 (Phase 5 MVP):**
- 不实现能量领域范围检查（Pylon 数量决定可用能量）
- Nexus 有 `maxEnergy: 200`，训练单位不消耗能量（简化）
- Pylon 建造增加 `supplyMax += 8`（与 Overlord 相同逻辑，已在 Task 6 中实现）

**验证:** Pylon 的 `supply: 8` 在 buildings.json 中已经设置，BuildSystem 的负supply逻辑在 Phase 4 Task 6 已实现（负值加上限）。Pylon 是正值，所以增加 supplyUsed。

- [ ] **Step 1: 确认 buildings.json 中 Pylon 的 `supply: 8` 正确**
- [ ] **Step 2: 确认 BuildSystem.placeBuilding 处理正值 supply**
- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "chore: Protoss Pylon provides supply (verified)"
```

---

## Task 6: Warp Gate 升级

**Files:**
- Modify: `src/components/PlayerResources.ts` — 添加 `hasWarpGate: boolean`
- Modify: `src/systems/BuildSystem.ts` — Warp Gate 研究消耗 + 设置标记
- Modify: `src/systems/TrainingSystem.ts` — Warp Gate 生产的单位瞬间传送落地

**简化方案:**
- Warp Gate 通过 ResearchSystem 实现，研究完成后 `playerResources.hasWarpGate = true`
- Gateway 训练的兵仍然需要时间（Warp Gate 只是 UI 区别），不实现真正的"任意位置 warp"
- Phase 5 只添加框架：ResearchSystem + `hasWarpGate` 标记

**ResearchSystem (新建):**
- 查询所有有 `Researching` 组件的建筑实体
- `Researching` 组件：`{ techId: string, progress: number, time: number }`
- 研究完成时：检查 techId，如果是 `warp_gate`，设置 `playerResources.hasWarpGate = true`

- [ ] **Step 1: 创建 `src/systems/ResearchSystem.ts`**
- [ ] **Step 2: 创建 `src/components/Researching.ts`**
- [ ] **Step 3: 修改 `src/components/PlayerResources.ts` 添加 `hasWarpGate: boolean`**
- [ ] **Step 4: 在 `src/game.ts` 注册 ResearchSystem**
- [ ] **Step 5: 运行 `pnpm exec tsc --noEmit` 确认无错误**
- [ ] **Step 6: 提交**

```bash
git add src/systems/ResearchSystem.ts src/components/Researching.ts src/components/PlayerResources.ts src/game.ts
git commit -m "feat: add ResearchSystem for Protoss Warp Gate research"
```

---

## Task 7: Protoss 测试场景 + AI 扩展

**Files:**
- Modify: `src/game.ts` — 添加 Protoss Zealot 和 Dragoon 到测试场景

**修改 `initTestScene`:**
添加 ownerId = 2 的 Protoss 单位（金黄色）：
```typescript
// Protoss AI Zealot (ownerId = 2)
const zealot = this.world.createEntity();
zealot.addComponent(new Position(10, 0, -5));
zealot.addComponent(new Renderable('unit_zealot', 1));
zealot.addComponent(new Unit('zealot', 100, 100, 2));
zealot.addComponent(new Combat(8, 1, 1, 2.0));
zealot.addComponent(new Shield(50, 50));
```

注意：ownerId=2 的单位已经会渲染成金黄色（Phase 4 Task 2）。

- [ ] **Step 1: 在 `initTestScene` 添加 Protoss Zealot 实体**
- [ ] **Step 2: 运行 `pnpm exec tsc --noEmit` 确认无错误**
- [ ] **Step 3: 提交**

```bash
git add src/game.ts
git commit -m "feat: add Protoss Zealot to test scene"
```

---

## Task 8: 最终验证

**Files:** （无新文件）

- [ ] **Step 1: `pnpm exec tsc --noEmit`**

Expected: 0 errors

- [ ] **Step 2: `pnpm test`**

Expected: All tests pass

- [ ] **Step 3: `pnpm build`**

Expected: SUCCESS

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: Phase 5 complete — Protoss shields, energy, Warp Gate research"
```
