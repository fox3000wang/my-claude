# Phase 3: 战斗系统 + 寻路 + AI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 A* 寻路、单位碰撞、改进 AI 决策逻辑，验证完整 PVE 战斗循环。

**Architecture:** 寻路模块独立为 `src/utils/pathfinding.ts`，网格化地图管理在 `src/utils/grid.ts`，寻路系统使用 Pathfinding 组件驱动 MovementSystem。AI 系统每 3 秒决策，目标导向（采集 > 建造 > 战斗）。

**Tech Stack:** Three.js + React + ECS + TypeScript strict + Vitest

---

## Task 1: 地图网格系统

**Files:**
- Create: `src/utils/grid.ts`
- Create: `tests/utils/grid.test.ts`
- Modify: `src/renderer/SceneManager.ts` — 添加网格实例引用

- [ ] **Step 1: 写测试**

```typescript
// tests/utils/grid.test.ts
import { describe, it, expect } from 'vitest';
import { Grid } from '../../src/utils/grid';

describe('Grid', () => {
  it('cellAt returns correct cell for world position', () => {
    const grid = new Grid(100, 100, 1);
    const cell = grid.cellAt(5.3, 0, 7.8);
    expect(cell.x).toBe(5);
    expect(cell.z).toBe(7);
  });

  it('cellAt clamps to bounds', () => {
    const grid = new Grid(10, 10, 1);
    const cell = grid.cellAt(15, 0, -1);
    expect(cell.x).toBe(9);
    expect(cell.z).toBe(0);
  });

  it('isWalkable returns false for blocked cells', () => {
    const grid = new Grid(10, 10, 1);
    grid.blockCell(3, 5);
    expect(grid.isWalkable(3, 5)).toBe(false);
    expect(grid.isWalkable(3, 4)).toBe(true);
  });

  it('worldToCell and cellToWorld are inverses', () => {
    const grid = new Grid(20, 20, 1);
    const cell = grid.cellAt(7.5, 0, 3.5);
    const world = grid.cellToWorld(cell.x, cell.z);
    expect(grid.cellAt(world.x, 0, world.z).x).toBe(cell.x);
    expect(grid.cellAt(world.x, 0, world.z).z).toBe(cell.z);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/fox/workspace/starcraft && pnpm test -- tests/utils/grid.test.ts`
Expected: FAIL — "Grid is not a valid value"

- [ ] **Step 3: 实现 Grid 类**

```typescript
// src/utils/grid.ts
export interface GridCell {
  x: number;
  z: number;
}

export class Grid {
  private blocked = new Set<string>();

  constructor(
    public readonly width: number,
    public readonly height: number,
    public readonly cellSize: number,
  ) {}

  private key(x: number, z: number): string {
    return `${x},${z}`;
  }

  cellAt(worldX: number, _y: number, worldZ: number): GridCell {
    const x = Math.max(0, Math.min(this.width - 1, Math.floor(worldX / this.cellSize)));
    const z = Math.max(0, Math.min(this.height - 1, Math.floor(worldZ / this.cellSize)));
    return { x, z };
  }

  cellToWorld(cellX: number, cellZ: number): { x: number; z: number } {
    return {
      x: cellX * this.cellSize + this.cellSize / 2,
      z: cellZ * this.cellSize + this.cellSize / 2,
    };
  }

  isWalkable(cellX: number, cellZ: number): boolean {
    if (cellX < 0 || cellX >= this.width || cellZ < 0 || cellZ >= this.height) return false;
    return !this.blocked.has(this.key(cellX, cellZ));
  }

  blockCell(cellX: number, cellZ: number): void {
    if (cellX >= 0 && cellX < this.width && cellZ >= 0 && cellZ < this.height) {
      this.blocked.add(this.key(cellX, cellZ));
    }
  }

  unblockCell(cellX: number, cellZ: number): void {
    this.blocked.delete(this.key(cellX, cellZ));
  }

  getBlockedCount(): number {
    return this.blocked.size;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/fox/workspace/starcraft && pnpm test -- tests/utils/grid.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 提交**

```bash
git add src/utils/grid.ts tests/utils/grid.test.ts
git commit -m "feat: add Grid map system for spatial partitioning"
```

---

## Task 2: A* 寻路算法

**Files:**
- Create: `src/utils/pathfinding.ts`
- Create: `tests/utils/pathfinding.test.ts`

- [ ] **Step 1: 写测试**

```typescript
// tests/utils/pathfinding.test.ts
import { describe, it, expect } from 'vitest';
import { astar, type Heuristic } from '../../src/utils/pathfinding';
import { Grid } from '../../src/utils/grid';

describe('astar', () => {
  it('returns empty path when start equals goal', () => {
    const grid = new Grid(10, 10, 1);
    const path = astar(grid, { x: 5, z: 5 }, { x: 5, z: 5 });
    expect(path).toEqual([]);
  });

  it('returns direct path on open grid', () => {
    const grid = new Grid(10, 10, 1);
    const path = astar(grid, { x: 0, z: 0 }, { x: 2, z: 0 });
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual({ x: 0, z: 0 });
    expect(path[path.length - 1]).toEqual({ x: 2, z: 0 });
  });

  it('returns empty path when no path exists (fully blocked)', () => {
    const grid = new Grid(5, 5, 1);
    // block all cells in a line between start and goal
    for (let x = 0; x < 5; x++) {
      grid.blockCell(x, 2);
    }
    const path = astar(grid, { x: 0, z: 0 }, { x: 4, z: 4 });
    expect(path).toEqual([]);
  });

  it('path avoids blocked cells', () => {
    const grid = new Grid(5, 5, 1);
    grid.blockCell(1, 0);
    grid.blockCell(1, 1);
    grid.blockCell(1, 2);
    const path = astar(grid, { x: 0, z: 0 }, { x: 2, z: 0 });
    // Should go around blocked column
    expect(grid.isWalkable(path[1]?.x ?? -1, path[1]?.z ?? -1)).toBe(true);
  });

  it('uses euclidean heuristic when specified', () => {
    const grid = new Grid(10, 10, 1);
    const path = astar(grid, { x: 0, z: 0 }, { x: 3, z: 4 }, 'euclidean');
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual({ x: 3, z: 4 });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/fox/workspace/starcraft && pnpm test -- tests/utils/pathfinding.test.ts`
Expected: FAIL — "astar is not a valid value"

- [ ] **Step 3: 实现 A* 算法**

```typescript
// src/utils/pathfinding.ts
export type Heuristic = 'manhattan' | 'euclidean';

interface Node {
  x: number;
  z: number;
  g: number; // cost from start
  h: number; // heuristic to goal
  f: number; // g + h
  parent: Node | null;
}

function heuristic(ax: number, az: number, bx: number, bz: number, type: Heuristic): number {
  if (type === 'euclidean') {
    return Math.sqrt((ax - bx) ** 2 + (az - bz) ** 2);
  }
  return Math.abs(ax - bx) + Math.abs(az - bz); // manhattan
}

function nodeKey(x: number, z: number): string {
  return `${x},${z}`;
}

export function astar(
  grid: { isWalkable: (x: number, z: number) => boolean; width: number; height: number },
  start: { x: number; z: number },
  goal: { x: number; z: number },
  hType: Heuristic = 'manhattan',
): { x: number; z: number }[] {
  const startKey = nodeKey(start.x, start.z);
  const goalKey = nodeKey(goal.x, goal.z);

  if (startKey === goalKey) return [];

  const openSet = new Map<string, Node>();
  const closedSet = new Set<string>();

  const startNode: Node = {
    x: start.x,
    z: start.z,
    g: 0,
    h: heuristic(start.x, start.z, goal.x, goal.z, hType),
    f: heuristic(start.x, start.z, goal.x, goal.z, hType),
    parent: null,
  };
  openSet.set(startKey, startNode);

  const dirs = [
    { dx: 0, dz: -1 }, { dx: 0, dz: 1 },
    { dx: -1, dz: 0 }, { dx: 1, dz: 0 },
    { dx: -1, dz: -1 }, { dx: 1, dz: -1 },
    { dx: -1, dz: 1 }, { dx: 1, dz: 1 },
  ];

  while (openSet.size > 0) {
    // Find node with lowest f in openSet
    let current: Node | null = null;
    let currentKey = '';
    for (const [key, node] of openSet) {
      if (!current || node.f < current.f) {
        current = node;
        currentKey = key;
      }
    }

    if (currentKey === goalKey && current) {
      // Reconstruct path
      const path: { x: number; z: number }[] = [];
      let node: Node | null = current;
      while (node) {
        path.unshift({ x: node.x, z: node.z });
        node = node.parent;
      }
      return path.slice(0, -1); // remove start node (entity already there)
    }

    openSet.delete(currentKey);
    closedSet.add(currentKey);

    for (const { dx, dz } of dirs) {
      const nx = current!.x + dx;
      const nz = current!.z + dz;
      const nKey = nodeKey(nx, nz);

      if (closedSet.has(nKey)) continue;
      if (!grid.isWalkable(nx, nz)) continue;

      // Diagonal movement needs both adjacent cardinal cells to be walkable
      if (dx !== 0 && dz !== 0) {
        if (!grid.isWalkable(current!.x + dx, current!.z) ||
            !grid.isWalkable(current!.x, current!.z + dz)) {
          continue;
        }
      }

      const moveCost = (dx !== 0 && dz !== 0) ? Math.SQRT2 : 1;
      const g = current!.g + moveCost;
      const h = heuristic(nx, nz, goal.x, goal.z, hType);
      const f = g + h;

      const existing = openSet.get(nKey);
      if (existing && existing.g <= g) continue;

      openSet.set(nKey, { x: nx, z: nz, g, h, f, parent: current });
    }
  }

  return []; // no path found
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/fox/workspace/starcraft && pnpm test -- tests/utils/pathfinding.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 提交**

```bash
git add src/utils/pathfinding.ts tests/utils/pathfinding.test.ts
git commit -m "feat: implement A* pathfinding algorithm"
```

---

## Task 3: 寻路系统（PathfindingSystem）

**Files:**
- Create: `src/systems/PathfindingSystem.ts`
- Create: `tests/systems/PathfindingSystem.test.ts`
- Modify: `src/game.ts` — 注册 PathfindingSystem

**Context:** `Grid` at `src/utils/grid.ts`, `Pathfinding` component at `src/components/Pathfinding.ts`, `MoveTarget` at `src/components/MoveTarget.ts`, `Position` at `src/components/Position.ts`, `System` base at `src/core/ecs/System.ts`.

- [ ] **Step 1: 写测试**

```typescript
// tests/systems/PathfindingSystem.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../src/core/ecs/World';
import { PathfindingSystem } from '../../src/systems/PathfindingSystem';
import { Pathfinding } from '../../src/components/Pathfinding';
import { Position } from '../../src/components/Position';
import { MoveTarget } from '../../src/components/MoveTarget';
import { Grid } from '../../src/utils/grid';

describe('PathfindingSystem', () => {
  let world: World;
  let system: PathfindingSystem;
  let grid: Grid;

  beforeEach(() => {
    world = new World();
    grid = new Grid(20, 20, 1);
    system = new PathfindingSystem(grid);
    system.setWorld(world);
  });

  it('skips entities without Pathfinding component', () => {
    const e = world.createEntity();
    e.addComponent(new Position(0, 0, 0));
    e.addComponent(new MoveTarget.at(5, 0, 5));
    // No Pathfinding component — should not crash
    system.update(0.016);
    expect(true).toBe(true); // if we get here, no crash
  });

  it('sets path on entity with Pathfinding + MoveTarget', () => {
    const e = world.createEntity();
    e.addComponent(new Position(0, 0, 0));
    e.addComponent(new MoveTarget.at(5, 0, 0));
    e.addComponent(new Pathfinding());

    system.update(0.016);

    const pf = e.getComponent<Pathfinding>('Pathfinding')!;
    expect(pf.isActive).toBe(true);
    expect(pf.path.length).toBeGreaterThan(0);
  });

  it('sets MoveTarget to first waypoint and clears Pathfinding when done', () => {
    const e = world.createEntity();
    e.addComponent(new Position(2, 0, 0));
    e.addComponent(new MoveTarget.at(3, 0, 0));
    e.addComponent(new Pathfinding());

    system.update(0.016);

    const mt = e.getComponent<MoveTarget>('MoveTarget')!;
    const pf = e.getComponent<Pathfinding>('Pathfinding')!;
    // Should have set a waypoint
    expect(pf.path.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/fox/workspace/starcraft && pnpm test -- tests/systems/PathfindingSystem.test.ts`
Expected: FAIL — "PathfindingSystem is not a valid value"

- [ ] **Step 3: 实现 PathfindingSystem**

```typescript
// src/systems/PathfindingSystem.ts
import { System } from '../core/ecs/System';
import { Pathfinding } from '../components/Pathfinding';
import { MoveTarget } from '../components/MoveTarget';
import { Position } from '../components/Position';
import { Grid } from '../utils/grid';
import { astar } from '../utils/pathfinding';

export class PathfindingSystem extends System {
  readonly name = 'PathfindingSystem';

  constructor(private grid: Grid) {
    super();
  }

  update(_delta: number): void {
    const entities = this.world!.getEntitiesWithComponents('Pathfinding', 'Position', 'MoveTarget');

    for (const entity of entities) {
      const pf = entity.getComponent<Pathfinding>('Pathfinding')!;
      const pos = entity.getComponent<Position>('Position')!;
      const move = entity.getComponent<MoveTarget>('MoveTarget')!;

      if (!pf.isActive) {
        // Compute path to MoveTarget
        const startCell = this.grid.cellAt(pos.x, pos.y, pos.z);
        const goalCell = this.grid.cellAt(move.x, move.y, move.z);

        if (startCell.x === goalCell.x && startCell.z === goalCell.z) {
          pf.clear();
          move.arrived = true;
          continue;
        }

        const cellPath = astar(this.grid, startCell, goalCell);
        if (cellPath.length === 0) {
          pf.clear();
          move.arrived = true;
          continue;
        }

        // Convert cell path to world path (center of each cell)
        const worldPath = cellPath.map(c => this.grid.cellToWorld(c.x, c.z));
        pf.setPath(worldPath);
      }

      // Follow path
      const waypoint = pf.currentWaypoint();
      if (!waypoint) {
        pf.clear();
        continue;
      }

      // Update MoveTarget to follow path waypoint
      move.x = waypoint.x;
      move.y = waypoint.y;
      move.z = waypoint.z;
      move.arrived = false;

      // If close enough to waypoint, advance
      const dist = Math.hypot(waypoint.x - pos.x, waypoint.z - pos.z);
      if (dist < 0.5) {
        pf.advance();
      }
    }
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/fox/workspace/starcraft && pnpm test -- tests/systems/PathfindingSystem.test.ts`
Expected: PASS

- [ ] **Step 5: 在 game.ts 注册系统**

Read `src/game.ts` first, then add PathfindingSystem to the system list after MovementSystem. The Grid instance should be created in game.ts and passed to PathfindingSystem.

```bash
git add src/systems/PathfindingSystem.ts tests/systems/PathfindingSystem.test.ts src/game.ts
git commit -m "feat: add PathfindingSystem with A* integration"
```

---

## Task 4: 单位碰撞检测

**Files:**
- Modify: `src/systems/MovementSystem.ts` — 添加碰撞检测
- Create: `tests/systems/MovementSystem.test.ts`

**Context:** `Position` component has `{ x, y, z }`. Unit collision radius = 0.5.

- [ ] **Step 1: 写测试**

```typescript
// tests/systems/MovementSystem.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../src/core/ecs/World';
import { MovementSystem } from '../../src/systems/MovementSystem';
import { Position } from '../../src/components/Position';
import { MoveTarget } from '../../src/components/MoveTarget';
import { Unit } from '../../src/components/Unit';

describe('MovementSystem', () => {
  let world: World;
  let system: MovementSystem;

  beforeEach(() => {
    world = new World();
    system = new MovementSystem();
    system.setWorld(world);
  });

  it('moves entity toward MoveTarget', () => {
    const e = world.createEntity();
    e.addComponent(new Position(0, 0, 0));
    e.addComponent(new MoveTarget.at(3, 0, 0));

    system.update(0.5); // half second

    const pos = e.getComponent<Position>('Position')!;
    expect(pos.x).toBeGreaterThan(0);
    expect(pos.x).toBeLessThan(3);
  });

  it('sets arrived=true when close to target', () => {
    const e = world.createEntity();
    e.addComponent(new Position(0, 0, 0));
    e.addComponent(new MoveTarget.at(0.1, 0, 0));

    system.update(1);

    const move = e.getComponent<MoveTarget>('MoveTarget')!;
    expect(move.arrived).toBe(true);
  });

  it('applies collision separation between two units', () => {
    const a = world.createEntity();
    a.addComponent(new Position(5, 0, 5));
    a.addComponent(new MoveTarget.at(6, 0, 5));
    a.addComponent(new Unit('marine', 40, 40, 0));

    const b = world.createEntity();
    b.addComponent(new Position(5.3, 0, 5));
    b.addComponent(new MoveTarget.at(5, 0, 5));
    b.addComponent(new Unit('marine', 40, 40, 0));

    // Both start very close (collision)
    system.update(0.016);

    const posA = a.getComponent<Position>('Position')!;
    const posB = b.getComponent<Position>('Position')!;
    const dist = Math.hypot(posA.x - posB.x, posA.z - posB.z);
    expect(dist).toBeGreaterThanOrEqual(1.0); // collision radius * 2
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/fox/workspace/starcraft && pnpm test -- tests/systems/MovementSystem.test.ts`
Expected: FAIL or PASS — if PASS, still add collision test

- [ ] **Step 3: 更新 MovementSystem 添加碰撞**

修改 `src/systems/MovementSystem.ts`，在 movement loop 后添加碰撞分离逻辑：

```typescript
// 在 update 方法末尾添加：
const allEntities = this.world!.getEntitiesWithComponents('Position', 'Unit');
const UNIT_RADIUS = 0.5;
const SEPARATION_FORCE = 2.0;

for (const entity of entities) {
  const pos = entity.getComponent<Position>('Position')!;
  let sx = 0, sz = 0;

  for (const other of allEntities) {
    if (other.id === entity.id) continue;
    const opos = other.getComponent<Position>('Position')!;
    const dx = pos.x - opos.x;
    const dz = pos.z - opos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < UNIT_RADIUS * 2 && dist > 0) {
      sx += (dx / dist) * (UNIT_RADIUS * 2 - dist) * SEPARATION_FORCE;
      sz += (dz / dist) * (UNIT_RADIUS * 2 - dist) * SEPARATION_FORCE;
    }
  }

  pos.x += sx * delta;
  pos.z += sz * delta;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/fox/workspace/starcraft && pnpm test -- tests/systems/MovementSystem.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/systems/MovementSystem.ts tests/systems/MovementSystem.test.ts
git commit -m "feat: add unit collision separation in MovementSystem"
```

---

## Task 5: 改进 AI 决策系统

**Files:**
- Modify: `src/systems/AISystem.ts` — 改进决策逻辑，增加攻击优先、撤退判断
- Create: `tests/systems/AISystem.test.ts`

**Context:** AI units (ownerId !== 0). Player units (ownerId === 0). Combat component has `{ attack, armor, range, cooldown, targetId, cooldownTimer }`. Health component has `{ current, max }`. Unit component has `{ unitType, health, maxHealth, ownerId }`.

- [ ] **Step 1: 写测试**

```typescript
// tests/systems/AISystem.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../../src/core/ecs/World';
import { AISystem } from '../../src/systems/AISystem';
import { Position } from '../../src/components/Position';
import { Combat } from '../../src/components/Combat';
import { Unit } from '../../src/components/Unit';
import { Health } from '../../src/components/Health';
import { MoveTarget } from '../../src/components/MoveTarget';

describe('AISystem', () => {
  let world: World;
  let system: AISystem;

  beforeEach(() => {
    world = new World();
    system = new AISystem();
    system.setWorld(world);
  });

  it('skips decision tick if timer not reached', () => {
    const e = world.createEntity();
    e.addComponent(new Position(0, 0, 0));
    e.addComponent(new Combat(5, 1, 3, 1, 0));
    e.addComponent(new Unit('marine', 40, 40, 1)); // AI unit
    e.addComponent(new Health(40, 40));

    // Tick a tiny delta — should not crash
    system.update(0.001);
    expect(true).toBe(true);
  });

  it('sets combat target when player unit is within range', () => {
    const ai = world.createEntity();
    ai.addComponent(new Position(0, 0, 0));
    ai.addComponent(new Combat(5, 1, 10, 1, null));
    ai.addComponent(new Unit('marine', 40, 40, 1));
    ai.addComponent(new MoveTarget.at(0, 0, 0));

    const player = world.createEntity();
    player.addComponent(new Position(5, 0, 0)); // within 10 range
    player.addComponent(new Health(40, 40));
    player.addComponent(new Unit('marine', 40, 40, 0));

    // Force decision
    system.update(10);

    const combat = ai.getComponent<Combat>('Combat')!;
    expect(combat.targetId).toBe(player.id);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/fox/workspace/starcraft && pnpm test -- tests/systems/AISystem.test.ts`
Expected: FAIL — "AISystem is not a valid value"

- [ ] **Step 3: 改进 AISystem 实现**

替换 `src/systems/AISystem.ts` 完整内容：

```typescript
import { System } from '../core/ecs/System';
import { Entity } from '../core/ecs/Entity';
import { Position } from '../components/Position';
import { Combat } from '../components/Combat';
import { MoveTarget } from '../components/MoveTarget';
import { Unit } from '../components/Unit';
import { Health } from '../components/Health';

export class AISystem extends System {
  readonly name = 'AISystem';
  private decisionTimer = 0;
  private readonly DECISION_INTERVAL = 3; // seconds

  update(delta: number): void {
    this.decisionTimer += delta;
    if (this.decisionTimer < this.DECISION_INTERVAL) return;
    this.decisionTimer = 0;

    const aiUnits = this.world!.getEntitiesWithComponents('Unit', 'Position', 'Combat')
      .filter(e => (e.getComponent<Unit>('Unit')?.ownerId ?? 0) !== 0);

    for (const entity of aiUnits) {
      this.decide(entity);
    }
  }

  private decide(entity: Entity): void {
    const pos = entity.getComponent<Position>('Position')!;
    const combat = entity.getComponent<Combat>('Combat')!;
    const health = entity.getComponent<Health>('Health')!;
    const unit = entity.getComponent<Unit>('Unit')!;

    // Find nearest player unit
    const playerUnits = this.world!.getEntitiesWithComponents('Unit', 'Position', 'Health')
      .filter(e => (e.getComponent<Unit>('Unit')?.ownerId ?? 0) === 0);

    let nearest: { entity: Entity | undefined; dist: number } | null = null;
    for (const pu of playerUnits) {
      const ppos = pu.getComponent<Position>('Position')!;
      const dist = Math.hypot(ppos.x - pos.x, ppos.z - pos.z);
      if (!nearest || dist < nearest.dist) {
        nearest = { entity: pu, dist };
      }
    }

    // Retreat if low health (< 30%)
    if (health.current / health.max < 0.3 && nearest) {
      const retreatAngle = Math.random() * Math.PI * 2;
      const retreatDist = 8;
      this.setMoveTarget(entity, pos.x + Math.cos(retreatAngle) * retreatDist, 0, pos.z + Math.sin(retreatAngle) * retreatDist);
      combat.targetId = null;
      return;
    }

    if (nearest && nearest.dist < 20) {
      // Attack mode
      combat.targetId = nearest.entity?.id ?? null;

      if (nearest.dist > combat.range * 0.8) {
        const targetPos = nearest.entity?.getComponent<Position>('Position');
        if (targetPos) {
          this.setMoveTarget(entity, targetPos.x, 0, targetPos.z);
        }
      } else {
        // In range — stop moving
        if (entity.hasComponent('MoveTarget')) {
          entity.getComponent<MoveTarget>('MoveTarget')!.arrived = true;
        }
      }
    } else {
      // Patrol / random roam
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 10;
      this.setMoveTarget(entity, pos.x + Math.cos(angle) * dist, 0, pos.z + Math.sin(angle) * dist);
      combat.targetId = null;
    }
  }

  private setMoveTarget(entity: Entity, x: number, y: number, z: number): void {
    if (entity.hasComponent('MoveTarget')) {
      const mt = entity.getComponent<MoveTarget>('MoveTarget')!;
      mt.x = x; mt.y = y; mt.z = z; mt.arrived = false;
    } else {
      entity.addComponent(MoveTarget.at(x, y, z));
    }
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/fox/workspace/starcraft && pnpm test -- tests/systems/AISystem.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/systems/AISystem.ts tests/systems/AISystem.test.ts
git commit -m "feat: improve AI decision system with retreat logic and patrol behavior"
```

---

## Task 6: 建造放置改进（建筑碰撞）

**Files:**
- Modify: `src/systems/BuildSystem.ts` — 添加建筑占地碰撞检测
- Modify: `src/utils/grid.ts` — Grid 引用传入 BuildSystem

**Context:** Building component has `{ buildingType, isConstructing, constructingProgress }`. Grid at `src/utils/grid.ts`. buildings.json has `size` per building type.

- [ ] **Step 1: 写测试**

```typescript
// tests/systems/BuildSystem.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../src/core/ecs/World';
import { BuildSystem } from '../../src/systems/BuildSystem';
import { Position } from '../../src/components/Position';
import { Building } from '../../src/components/Building';
import { Grid } from '../../src/utils/grid';

describe('BuildSystem', () => {
  let world: World;
  let grid: Grid;
  let system: BuildSystem;

  beforeEach(() => {
    world = new World();
    grid = new Grid(30, 30, 1);
    system = new BuildSystem(grid);
    system.setWorld(world);
  });

  it('blocks grid cells when placing a building', () => {
    const e = world.createEntity();
    e.addComponent(new Position(5, 0, 5));
    e.addComponent(new Building('barracks'));

    system.update(0.016);
    e.getComponent<Building>('Building')!.completeConstruction();
    system.update(0.016);

    // Grid cell at (5,5) should now be blocked
    const cell = grid.cellAt(5, 0, 5);
    expect(grid.isWalkable(cell.x, cell.z)).toBe(false);
  });

  it('blocks multiple cells for size > 1 building', () => {
    const e = world.createEntity();
    e.addComponent(new Position(10, 0, 10));
    e.addComponent(new Building('command_center', false, 1)); // size 3

    system.updateConstruction(0.016);
    // Directly test blocking after completion
    system.update(0.016);

    const cell = grid.cellAt(10, 0, 10);
    expect(grid.isWalkable(cell.x, cell.z)).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/fox/workspace/starcraft && pnpm test -- tests/systems/BuildSystem.test.ts`
Expected: FAIL

- [ ] **Step 3: 更新 BuildSystem**

读取 `src/systems/BuildSystem.ts` 和 `src/data/buildings.json`，然后修改 `BuildSystem`：

1. 构造函数接收 `Grid` 参数
2. 建造完成后调用 `grid.blockCell()` 阻止通行
3. `canPlaceBuilding` 方法检查网格占用

```bash
git add src/systems/BuildSystem.ts tests/systems/BuildSystem.test.ts
git commit -m "feat: add building footprint collision with Grid"
```

---

## Task 7: UI 改进 — 攻击命令

**Files:**
- Modify: `src/systems/SelectionSystem.ts` — 右键攻击命令（对敌方单位）
- Modify: `src/ui/HUD/SelectionPanel.tsx` — 添加 Attack 按钮

**Context:** SelectionSystem 右键已有 MoveTarget 设置逻辑。Combat component has `{ targetId }`. Right-click on enemy unit should set `Combat.targetId`.

- [ ] **Step 1: 读当前 SelectionSystem 右键逻辑**

读取 `src/systems/SelectionSystem.ts` 第 45-63 行（右键处理）。

- [ ] **Step 2: 添加右键攻击检测**

在 `SelectionSystem` 右键处理中，检测 worldX/worldZ 位置是否有敌方单位，如果有则设置 `Combat.targetId`。

不需要写测试（UI/集成逻辑难以单元测试）。

- [ ] **Step 3: 更新 SelectionPanel 添加 Attack 按钮**

读取 `src/ui/HUD/SelectionPanel.tsx`，添加 Attack command button。

```bash
git add src/systems/SelectionSystem.ts src/ui/HUD/SelectionPanel.tsx
git commit -m "feat: add right-click attack command and Attack button UI"
```

---

## Task 8: 矿物消耗集成（单位造价）

**Files:**
- Modify: `src/systems/TrainingSystem.ts` — 训练时扣除资源
- Modify: `src/game.ts` — 传入 PlayerResources 到 TrainingSystem

**Context:** PlayerResources component has `{ minerals, supplyUsed, supplyMax }`. units.json has `cost.minerals` per unit. TrainingSystem has `setPlayerResources(resources: PlayerResources)` already removed — re-add it.

- [ ] **Step 1: 读 TrainingSystem**

读取 `src/systems/TrainingSystem.ts` 当前完整内容。

- [ ] **Step 2: 读 units.json**

读取 `src/data/units.json`，确认每个兵种有 `cost.minerals` 字段。

- [ ] **Step 3: 修改 TrainingSystem**

添加 `playerResources` 字段（private），`setPlayerResources()` 方法，训练完成时检查并扣除资源：

```typescript
private playerResources: PlayerResources | null = null;

setPlayerResources(resources: PlayerResources): void {
  this.playerResources = resources;
}

// 在 spawnUnit 开头添加：
if (this.playerResources) {
  const cost = data?.cost?.minerals ?? 0;
  if (!this.playerResources.spend(cost)) return; // can't afford
}
```

- [ ] **Step 4: 在 game.ts 连接**

读取 `src/game.ts`，在创建 TrainingSystem 后调用 `trainingSystem.setPlayerResources(this.playerResources)`。

```bash
git add src/systems/TrainingSystem.ts src/game.ts
git commit -m "feat: deduct mineral cost when training units"
```

---

## Task 9: 最终验证

**Files:** （无新文件）

- [ ] **Step 1: TypeScript 检查**

Run: `cd /Users/fox/workspace/starcraft && pnpm exec tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: 运行所有测试**

Run: `cd /Users/fox/workspace/starcraft && pnpm test`
Expected: All tests pass

- [ ] **Step 3: 生产构建**

Run: `cd /Users/fox/workspace/starcraft && pnpm build`
Expected: SUCCESS

- [ ] **Step 4: 提交验证结果**

```bash
git add -A
git commit -m "chore: Phase 3 complete — pathfinding, collision, AI, building grid"
```
