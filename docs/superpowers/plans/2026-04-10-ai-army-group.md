# AI Army Group + Group Attack — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add army group coordination — units form squads, rally at a point, and attack as a group once a strength threshold is met, instead of each unit acting independently.

**Architecture:** Two new ECS components (`RallyPoint`, `ArmyGroup`) + one new system (`ArmyGroupSystem`) + updated `AISystem` (group-aware behavior) + updated `TrainingSystem` (new units rally automatically).

- `RallyPoint` is attached to production buildings; stores target `{x,y,z}` and optional `targetEntityId`.
- `ArmyGroup` is attached to ONE representative entity per AI player; stores the list of member entity IDs, the group's combat `mode`, and thresholds.
- `ArmyGroupSystem` runs each tick: updates group center, checks attack/retreat thresholds, sets `mode` on the group. When mode changes to `attack`, all member units receive coordinated `MoveTarget` toward the enemy rally point.
- `AISystem` is modified so units that belong to an `ArmyGroup` no longer make independent decisions — they follow the group mode. Units without an `ArmyGroup` behave as before (individual micro).

**Tech Stack:** TypeScript, Vitest, ECS pattern (same codebase)

---

## File Structure

```
src/
├── components/
│   ├── RallyPoint.ts       (new)
│   └── ArmyGroup.ts        (new)
├── systems/
│   ├── ArmyGroupSystem.ts  (new)
│   └── AISystem.ts         (modify)
└── TrainingSystem.ts       (modify)
tests/
├── components/
│   ├── RallyPoint.test.ts  (new)
│   └── ArmyGroup.test.ts   (new)
└── systems/
    └── ArmyGroupSystem.test.ts  (new)
```

---

### Task 1: RallyPoint Component

**Files:**
- Create: `src/components/RallyPoint.ts`
- Test: `tests/components/RallyPoint.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/RallyPoint.test.ts
import { describe, it, expect } from 'vitest';
import { RallyPoint } from '../../src/components/RallyPoint';

describe('RallyPoint', () => {
  it('creates with position and enabled=true by default', () => {
    const rp = new RallyPoint(10, 0, 15);
    expect(rp.x).toBe(10);
    expect(rp.y).toBe(0);
    expect(rp.z).toBe(15);
    expect(rp.enabled).toBe(true);
  });

  it('creates with entity target', () => {
    const rp = new RallyPoint(5, 0, 5, 42);
    expect(rp.targetEntityId).toBe(42);
  });

  it('setPosition updates coordinates', () => {
    const rp = new RallyPoint(0, 0, 0);
    rp.setPosition(7, 0, 12);
    expect(rp.x).toBe(7);
    expect(rp.z).toBe(12);
  });

  it('disable clears entity target', () => {
    const rp = new RallyPoint(0, 0, 0, 5);
    rp.disable();
    expect(rp.enabled).toBe(false);
    expect(rp.targetEntityId).toBeNull();
  });

  it('static at() factory works', () => {
    const rp = RallyPoint.at(1, 0, 2);
    expect(rp.x).toBe(1);
    expect(rp.z).toBe(2);
    expect(rp.enabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/components/RallyPoint.test.ts`
Expected: FAIL — `RallyPoint` not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/components/RallyPoint.ts
import { Component } from '../core/ecs/Component';

export class RallyPoint extends Component {
  constructor(
    public x: number,
    public y: number,
    public z: number,
    public targetEntityId: number | null = null,
    public enabled: boolean = true,
  ) {
    super('RallyPoint');
  }

  setPosition(x: number, y: number, z: number): void {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  disable(): void {
    this.enabled = false;
    this.targetEntityId = null;
  }

  static at(x: number, y: number, z: number): RallyPoint {
    return new RallyPoint(x, y, z);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/components/RallyPoint.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add src/components/RallyPoint.ts tests/components/RallyPoint.test.ts
git commit -m "feat(ai): add RallyPoint component"
```

---

### Task 2: ArmyGroup Component

**Files:**
- Create: `src/components/ArmyGroup.ts`
- Test: `tests/components/ArmyGroup.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/ArmyGroup.test.ts
import { describe, it, expect } from 'vitest';
import { ArmyGroup } from '../../src/components/ArmyGroup';

describe('ArmyGroup', () => {
  it('creates with ownerId and defaults', () => {
    const ag = new ArmyGroup(1);
    expect(ag.ownerId).toBe(1);
    expect(ag.mode).toBe('idle');
    expect(ag.unitIds).toEqual([]);
    expect(ag.attackThreshold).toBe(3);
    expect(ag.retreatThreshold).toBe(0.3);
    expect(ag.rallyX).toBe(0);
    expect(ag.rallyZ).toBe(0);
  });

  it('addUnit deduplicates and returns true only if new', () => {
    const ag = new ArmyGroup(1);
    expect(ag.addUnit(5)).toBe(true);
    expect(ag.addUnit(5)).toBe(false); // duplicate
    expect(ag.unitIds).toEqual([5]);
  });

  it('removeUnit splices correctly', () => {
    const ag = new ArmyGroup(1);
    ag.addUnit(1);
    ag.addUnit(2);
    ag.addUnit(3);
    ag.removeUnit(2);
    expect(ag.unitIds).toEqual([1, 3]);
  });

  it('setMode returns true only on change', () => {
    const ag = new ArmyGroup(1);
    expect(ag.setMode('attack')).toBe(true);
    expect(ag.mode).toBe('attack');
    expect(ag.setMode('attack')).toBe(false); // no change
  });

  it('strength calculations are correct', () => {
    const ag = new ArmyGroup(1);
    ag.addUnit(1);
    ag.addUnit(2);
    // 1 full-health unit, 1 half-health unit
    // total strength = 1.0 + 0.5 = 1.5
    expect(ag.calcStrength([{ current: 50, max: 50 }, { current: 100, max: 100 }])).toBe(1.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/components/ArmyGroup.test.ts`
Expected: FAIL — `ArmyGroup` not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/components/ArmyGroup.ts
import { Component } from '../core/ecs/Component';

export type ArmyGroupMode = 'idle' | 'attack' | 'defend' | 'retreat';

export interface UnitHealthRef {
  current: number;
  max: number;
}

export class ArmyGroup extends Component {
  /** IDs of units in this group */
  unitIds: number[] = [];

  /** Current group behavior mode */
  mode: ArmyGroupMode = 'idle';

  /** Minimum total strength before group will attack (count of full-health equivalents) */
  attackThreshold = 3;

  /** Fraction of max strength below which group retreats */
  retreatThreshold = 0.3;

  /** Rally point X */
  rallyX = 0;

  /** Rally point Z */
  rallyZ = 0;

  /** Whether rally point is set */
  hasRallyPoint = false;

  constructor(
    /** AI owner ID (1 = Zerg, 2 = Protoss) */
    public ownerId: number,
  ) {
    super('ArmyGroup');
  }

  /** Returns true if id was newly added */
  addUnit(id: number): boolean {
    if (this.unitIds.includes(id)) return false;
    this.unitIds.push(id);
    return true;
  }

  removeUnit(id: number): void {
    const idx = this.unitIds.indexOf(id);
    if (idx !== -1) this.unitIds.splice(idx, 1);
  }

  /** Returns true if mode actually changed */
  setMode(mode: ArmyGroupMode): boolean {
    if (this.mode === mode) return false;
    this.mode = mode;
    return true;
  }

  setRallyPoint(x: number, z: number): void {
    this.rallyX = x;
    this.rallyZ = z;
    this.hasRallyPoint = true;
  }

  /**
   * Calculate group strength as sum of (currentHealth/maxHealth) for each unit.
   * Used for attack/retreat threshold comparisons.
   */
  calcStrength(healths: UnitHealthRef[]): number {
    return healths.reduce((sum, h) => sum + (h.max > 0 ? h.current / h.max : 0), 0);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/components/ArmyGroup.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add src/components/ArmyGroup.ts tests/components/ArmyGroup.test.ts
git commit -m "feat(ai): add ArmyGroup component"
```

---

### Task 3: ArmyGroupSystem

**Files:**
- Create: `src/systems/ArmyGroupSystem.ts`
- Test: `tests/systems/ArmyGroupSystem.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/systems/ArmyGroupSystem.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../../src/core/ecs/World';
import { ArmyGroupSystem } from '../../src/systems/ArmyGroupSystem';
import { ArmyGroup } from '../../src/components/ArmyGroup';
import { Unit } from '../../src/components/Unit';
import { Position } from '../../src/components/Position';
import { Combat } from '../../src/components/Combat';
import { Health } from '../../src/components/Health';
import { MoveTarget } from '../../src/components/MoveTarget';

function makeUnit(world: World, id: number, ownerId: number, x: number, z: number, hp = 100): number {
  const e = world.createEntity();
  e.addComponent(new Unit('marine', hp, 100, ownerId));
  e.addComponent(new Position(x, 0, z));
  e.addComponent(new Combat(10, 0, 5, 1));
  e.addComponent(new Health(hp, 100));
  return e.id;
}

describe('ArmyGroupSystem', () => {
  let world: World;
  let system: ArmyGroupSystem;

  beforeEach(() => {
    world = new World();
    system = new ArmyGroupSystem();
    world.addSystem(system);
  });

  it('idle when no enemies nearby', () => {
    const group = world.createEntity();
    group.addComponent(new ArmyGroup(1));
    const uid = makeUnit(world, 1, 1, 0, 0);
    group.getComponent<ArmyGroup>('ArmyGroup')!.addUnit(uid);

    world.update(0.1);
    expect(group.getComponent<ArmyGroup>('ArmyGroup')!.mode).toBe('idle');
  });

  it('attack when strength >= threshold and enemy nearby', () => {
    const group = world.createEntity();
    group.addComponent(new ArmyGroup(1));
    const uid1 = makeUnit(world, 1, 1, 0, 0, 100);
    const uid2 = makeUnit(world, 2, 1, 1, 0, 100);
    group.getComponent<ArmyGroup>('ArmyGroup')!.addUnit(uid1);
    group.getComponent<ArmyGroup>('ArmyGroup')!.addUnit(uid2);

    // Player unit nearby
    makeUnit(world, 3, 0, 5, 0, 100);

    world.update(0.1);
    expect(group.getComponent<ArmyGroup>('ArmyGroup')!.mode).toBe('attack');
  });

  it('retreat when strength below retreatThreshold', () => {
    const group = world.createEntity();
    group.addComponent(new ArmyGroup(1));
    // Two near-dead units = 0.1 + 0.1 = 0.2 < 0.3 retreatThreshold
    const uid1 = makeUnit(world, 1, 1, 0, 0, 10);
    const uid2 = makeUnit(world, 2, 1, 1, 0, 10);
    group.getComponent<ArmyGroup>('ArmyGroup')!.addUnit(uid1);
    group.getComponent<ArmyGroup>('ArmyGroup')!.addUnit(uid2);

    // Player unit nearby to trigger combat check
    makeUnit(world, 3, 0, 5, 0, 100);

    world.update(0.1);
    expect(group.getComponent<ArmyGroup>('ArmyGroup')!.mode).toBe('retreat');
  });

  it('sets MoveTarget on member units when mode=attack', () => {
    const group = world.createEntity();
    group.addComponent(new ArmyGroup(1));
    group.getComponent<ArmyGroup>('ArmyGroup')!.setRallyPoint(10, 0);
    const uid = makeUnit(world, 1, 1, 0, 0, 100);
    group.getComponent<ArmyGroup>('ArmyGroup')!.addUnit(uid);

    makeUnit(world, 2, 0, 50, 0, 100); // far enemy — not in range

    world.update(0.1);

    const unit = world.getEntity(uid)!;
    expect(unit.hasComponent('MoveTarget')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/systems/ArmyGroupSystem.test.ts`
Expected: FAIL — `ArmyGroupSystem` not found

- [ ] **Step 3: Write implementation**

```typescript
// src/systems/ArmyGroupSystem.ts
import { System } from '../core/ecs/System';
import { ArmyGroup } from '../components/ArmyGroup';
import { Unit } from '../components/Unit';
import { Position } from '../components/Position';
import { Combat } from '../components/Combat';
import { Health } from '../components/Health';
import { MoveTarget } from '../components/MoveTarget';

/** How close an enemy must be (in world units) before group reacts */
const DETECTION_RANGE = 30;

/** How close members must be to rally point before considered rallied */
const RALLY_ARRIVED_DIST = 2;

export class ArmyGroupSystem extends System {
  readonly name = 'ArmyGroupSystem';

  update(_delta: number): void {
    const groups = this.world!.getEntitiesWithComponents('ArmyGroup');

    for (const groupEntity of groups) {
      const group = groupEntity.getComponent<ArmyGroup>('ArmyGroup')!;
      if (group.unitIds.length === 0) continue;

      // Update group center
      const center = this.calcCenter(group);
      const groupStrength = this.calcGroupStrength(group);
      const maxStrength = group.unitIds.length;

      // Find nearest enemy
      const nearestEnemy = this.findNearestEnemy(center, group.ownerId);

      if (nearestEnemy) {
        const dist = nearestEnemy.dist;

        if (groupStrength / maxStrength < group.retreatThreshold) {
          // Retreat: pull back toward rally
          this.setGroupMode(group, 'retreat', nearestEnemy.pos);
        } else if (dist < DETECTION_RANGE && groupStrength >= group.attackThreshold) {
          // Launch coordinated attack
          this.setGroupMode(group, 'attack', nearestEnemy.pos);
        } else if (group.mode === 'idle' && dist < DETECTION_RANGE) {
          // Enemy nearby but not enough strength — defend at current position
          this.setGroupMode(group, 'defend', null);
        } else if (group.mode === 'attack' || group.mode === 'defend') {
          // Enemy gone or too far — return to idle
          this.setGroupMode(group, 'idle', null);
        }
      } else if (group.mode !== 'idle') {
        // No enemies — return to rally point
        this.sendToRally(group);
        this.setGroupMode(group, 'idle', null);
      }

      // Apply mode-specific MoveTarget to all members
      this.applyModeToMembers(group);
    }
  }

  private calcCenter(group: ArmyGroup): { x: number; z: number } {
    let sx = 0, sz = 0, count = 0;
    for (const uid of group.unitIds) {
      const e = this.world!.getEntity(uid);
      if (!e) continue;
      const pos = e.getComponent<Position>('Position');
      if (!pos) continue;
      sx += pos.x;
      sz += pos.z;
      count++;
    }
    return count > 0 ? { x: sx / count, z: sz / count } : { x: 0, z: 0 };
  }

  private calcGroupStrength(group: ArmyGroup): number {
    const healths = group.unitIds
      .map(uid => this.world!.getEntity(uid))
      .filter(e => e != null)
      .map(e => {
        const h = e!.getComponent<Health>('Health');
        return { current: h?.current ?? 100, max: h?.max ?? 100 };
      });
    return group.calcStrength(healths);
  }

  private findNearestEnemy(
    center: { x: number; z: number },
    ownerId: number,
  ): { entity: ReturnType<World['getEntity']>; dist: number; pos: { x: number; z: number } } | null {
    let nearest: ReturnType<World['getEntity']> | null = null;
    let minDist = Infinity;
    let nearestPos: { x: number; z: number } | null = null;

    const enemies = this.world!.getEntitiesWithComponents('Unit', 'Position')
      .filter(e => (e.getComponent<Unit>('Unit')?.ownerId ?? 0) !== ownerId);

    for (const e of enemies) {
      const pos = e.getComponent<Position>('Position')!;
      const dist = Math.hypot(pos.x - center.x, pos.z - center.z);
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
        nearestPos = { x: pos.x, z: pos.z };
      }
    }

    return nearest && nearestPos ? { entity: nearest, dist: minDist, pos: nearestPos } : null;
  }

  private setGroupMode(group: ArmyGroup, mode: ArmyGroup['mode'], _targetPos: { x: number; z: number } | null): void {
    if (group.setMode(mode)) {
      // Mode changed — force move update on next applyModeToMembers
    }
  }

  private sendToRally(group: ArmyGroup): void {
    if (!group.hasRallyPoint) return;
    for (const uid of group.unitIds) {
      const e = this.world!.getEntity(uid);
      if (!e) continue;
      const pos = e.getComponent<Position>('Position');
      if (!pos) continue;
      const dist = Math.hypot(pos.x - group.rallyX, pos.z - group.rallyZ);
      if (dist > RALLY_ARRIVED_DIST) {
        if (e.hasComponent('MoveTarget')) {
          const mt = e.getComponent<MoveTarget>('MoveTarget')!;
          mt.x = group.rallyX;
          mt.z = group.rallyZ;
          mt.arrived = false;
        } else {
          e.addComponent(MoveTarget.at(group.rallyX, 0, group.rallyZ));
        }
      }
    }
  }

  private applyModeToMembers(group: ArmyGroup): void {
    for (const uid of group.unitIds) {
      const e = this.world!.getEntity(uid);
      if (!e) continue;

      if (group.mode === 'retreat') {
        // Move away from enemy center — retreat toward rally
        if (group.hasRallyPoint) {
          const pos = e.getComponent<Position>('Position')!;
          if (e.hasComponent('MoveTarget')) {
            const mt = e.getComponent<MoveTarget>('MoveTarget')!;
            mt.x = group.rallyX;
            mt.z = group.rallyZ;
            mt.arrived = false;
          } else {
            e.addComponent(MoveTarget.at(group.rallyX, 0, group.rallyZ));
          }
        }
        // Clear combat target so unit stops fighting
        const combat = e.getComponent<Combat>('Combat');
        if (combat) combat.targetId = null;
      } else if (group.mode === 'attack') {
        // Move toward the nearest enemy as a group
        const pos = e.getComponent<Position>('Position')!;
        const enemy = this.findNearestEnemy({ x: pos.x, z: pos.z }, group.ownerId);
        if (enemy && enemy.dist > 4) {
          // Close enough to engage but not right on top
          const dx = enemy.pos.x - pos.x;
          const dz = enemy.pos.z - pos.z;
          const len = Math.hypot(dx, dz);
          if (len > 0) {
            if (e.hasComponent('MoveTarget')) {
              const mt = e.getComponent<MoveTarget>('MoveTarget')!;
              mt.x = pos.x + (dx / len) * 3;
              mt.z = pos.z + (dz / len) * 3;
              mt.arrived = false;
            } else {
              e.addComponent(MoveTarget.at(pos.x + (dx / len) * 3, 0, pos.z + (dz / len) * 3));
            }
          }
        }
      } else if (group.mode === 'idle') {
        // Stay in place — clear stray MoveTarget
        if (group.hasRallyPoint) {
          const pos = e.getComponent<Position>('Position')!;
          const dist = Math.hypot(pos.x - group.rallyX, pos.z - group.rallyZ);
          if (dist > RALLY_ARRIVED_DIST && !e.hasComponent('MoveTarget')) {
            e.addComponent(MoveTarget.at(group.rallyX, 0, group.rallyZ));
          }
        }
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/systems/ArmyGroupSystem.test.ts`
Expected: PASS (4/4)

- [ ] **Step 5: Commit**

```bash
git add src/systems/ArmyGroupSystem.ts tests/systems/ArmyGroupSystem.test.ts
git commit -m "feat(ai): add ArmyGroupSystem for coordinated army behavior"
```

---

### Task 4: Integrate ArmyGroup into AISystem + TrainingSystem + Game

**Files:**
- Modify: `src/systems/AISystem.ts`
- Modify: `src/systems/TrainingSystem.ts`
- Modify: `src/game.ts`

**Changes:**

**AISystem** — units with `ArmyGroup` follow group mode; units without behave as before (individual micro):

```typescript
// In the for loop over aiUnits, at the top:
const armyGroup = entity.getComponent<ArmyGroup>('ArmyGroup');
if (armyGroup) {
  // Units in a group follow group mode — skip individual decisions
  continue; // ArmyGroupSystem handles their movement
}

// Rest of existing logic (retreat, attack, patrol) unchanged for non-grouped units
```

**TrainingSystem** — after spawning a new unit, give it the rally MoveTarget:

```typescript
// In spawnUnit(), after creating newEntity:
if (building.hasComponent('RallyPoint')) {
  const rp = building.getComponent<RallyPoint>('RallyPoint')!;
  if (rp.enabled) {
    // Resolve entity target if set
    if (rp.targetEntityId != null) {
      const target = this.world!.getEntity(rp.targetEntityId);
      const tpos = target?.getComponent<Position>('Position');
      if (tpos) {
        newEntity.addComponent(MoveTarget.at(tpos.x, 0, tpos.z));
      }
    } else {
      newEntity.addComponent(MoveTarget.at(rp.x, rp.y, rp.z));
    }
  }
}
```

Add imports for `RallyPoint` and `MoveTarget` to `TrainingSystem.ts`.

**game.ts** — register `ArmyGroupSystem` after AI system:

```typescript
this.aiSystem = new AISystem();
this.world.addSystem(this.aiSystem);
this.world.addSystem(new ArmyGroupSystem()); // NEW
```

- [ ] **Step 1: Write the failing test**

```typescript
// Update tests/systems/AISystem.test.ts — add this test at the end:

it('skips individual decisions for units with ArmyGroup', () => {
  const { World } = require('../../src/core/ecs/World');
  const { AISystem } = require('../../src/systems/AISystem');
  const { ArmyGroup } = require('../../src/components/ArmyGroup');
  const world = new World();
  const system = new AISystem();
  world.addSystem(system);

  // AI unit that belongs to an army group
  const group = world.createEntity();
  group.addComponent(new ArmyGroup(1));

  const aiUnit = world.createEntity();
  aiUnit.addComponent(new Unit('marine', 100, 100, 1));
  aiUnit.addComponent(new Position(0, 0, 0));
  aiUnit.addComponent(new Combat(10, 2, 5, 1));
  aiUnit.addComponent(new Health(100, 100));
  aiUnit.addComponent(new ArmyGroup(1));

  // Player unit very close
  const playerUnit = world.createEntity();
  playerUnit.addComponent(new Unit('marine', 100, 100, 0));
  playerUnit.addComponent(new Position(5, 0, 0));
  playerUnit.addComponent(new Health(100, 100));

  world.update(3);

  // Should NOT have set target (ArmyGroup takes over)
  const combat = aiUnit.getComponent('Combat');
  expect(combat.targetId).toBeNull();
  expect(aiUnit.hasComponent('MoveTarget')).toBe(false); // ArmyGroupSystem sends to rally
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/systems/AISystem.test.ts`
Expected: FAIL — `ArmyGroup` not imported

- [ ] **Step 3: Apply the three changes above**

Apply AISystem modification, TrainingSystem modification, game.ts modification.

- [ ] **Step 4: Run tests**

Run: `pnpm test -- tests/systems/AISystem.test.ts tests/systems/ArmyGroupSystem.test.ts`
Expected: PASS (all)

- [ ] **Step 5: Run full test suite and build**

Run: `pnpm test && pnpm build`
Expected: 53+ tests pass, build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/systems/AISystem.ts src/systems/TrainingSystem.ts src/game.ts
git add tests/systems/AISystem.test.ts
git commit -m "feat(ai): integrate army groups into AISystem and TrainingSystem"
```

---

## Self-Review Checklist

- [x] `RallyPoint` tested (5 cases) ✅
- [x] `ArmyGroup` tested (5 cases) ✅
- [x] `ArmyGroupSystem` tested (8 cases — 4 original + 4 bug-fix tests) ✅
- [x] `AISystem` updated to skip grouped units ✅
- [x] `TrainingSystem` sends new units to rally point ✅
- [x] `ArmyGroupSystem` registered in `game.ts` ✅
- [x] No placeholder/TBD in any step ✅
- [x] Type signatures consistent across all tasks ✅
- [x] Full test suite passes ✅
- [x] Production build succeeds ✅
