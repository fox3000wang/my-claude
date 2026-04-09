# Phase 2: 人族核心逻辑

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现人族核心游戏循环——选择单位、移动/寻路、战斗、资源采集、建筑建造、单位生产，验证一局可玩的 PVE 对战。

**Architecture:** ECS 驱动游戏逻辑，System 每帧查询实体组件组合并处理。输入事件通过 InputManager 分发为 Action，HUD 通过 React 订阅 ECS 状态。

**Tech Stack:** 同 Phase 1（Three.js + React + ECS）

---

## 文件结构（新增）

```
src/
├── core/
│   └── ecs/
│       └── World.ts          # 补充 updateEntityComponent 方法
├── components/               # 新增
│   ├── Health.ts             # 生命值 { current, max }
│   ├── Building.ts           # 建筑 { buildingType, isConstructing, constructingProgress }
│   ├── ResourceCarrier.ts     # 资源携带 { carrying, capacity, depositTarget }
│   ├── Combat.ts             # 战斗 { attack, armor, range, cooldown, targetId }
│   ├── Selected.ts           # 选中状态 { selected: boolean }
│   ├── MoveTarget.ts         # 移动目标 { x, y, z, arrived: boolean }
│   ├── Pathfinding.ts        # 寻路 { path: Vec3[], currentIndex }
│   ├── TrainQueue.ts         # 训练队列 { queue: string[], progress }
│   └── PlayerResources.ts   # 玩家资源 { minerals, supplyUsed, supplyMax }
├── systems/
│   ├── InputSystem.ts        # 解析鼠标/键盘输入，分发命令
│   ├── SelectionSystem.ts    # 单位选择（点击 + 框选）
│   ├── MovementSystem.ts     # 移动 + 简化 A* 寻路
│   ├── CombatSystem.ts       # 战斗：攻击判定、护甲计算、仇恨
│   ├── ResourceSystem.ts     # SCV 采集闭环
│   ├── BuildSystem.ts       # 建筑建造（指令 + 建造动画）
│   ├── TrainingSystem.ts     # 单位训练队列
│   └── AISystem.ts          # 简单 AI（每帧随机移动+攻击）
├── input/
│   └── InputManager.ts       # 鼠标/键盘事件管理
├── ui/
│   └── HUD/
│       ├── HUD.tsx           # 升级：连接玩家资源状态
│       ├── SelectionPanel.tsx # 选中单位信息面板
│       └── BuildPanel.tsx    # 建造指令面板
└── data/
    └── buildings.json        # 建筑配置数据
```

---

## Task 1: 补充游戏组件（Health, Building, Combat, Selected, MoveTarget, Pathfinding, TrainQueue, PlayerResources）

**Files:**
- Create: `src/components/Health.ts`
- Create: `src/components/Building.ts`
- Create: `src/components/ResourceCarrier.ts`
- Create: `src/components/Combat.ts`
- Create: `src/components/Selected.ts`
- Create: `src/components/MoveTarget.ts`
- Create: `src/components/Pathfinding.ts`
- Create: `src/components/TrainQueue.ts`
- Create: `src/components/PlayerResources.ts`
- Modify: `src/components/index.ts`

- [ ] **Step 1: 创建 src/components/Health.ts**

```typescript
import { Component } from '../core/ecs/Component';

export class Health extends Component {
  constructor(
    public current: number,
    public max: number,
  ) {
    super('Health');
  }

  isDead(): boolean {
    return this.current <= 0;
  }

  takeDamage(amount: number): void {
    this.current = Math.max(0, this.current - amount);
  }

  heal(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);
  }
}
```

- [ ] **Step 2: 创建 src/components/Building.ts**

```typescript
import { Component } from '../core/ecs/Component';

export type BuildingType = 'command_center' | 'supply_depot' | 'barracks' | 'engineering_bay';

export class Building extends Component {
  constructor(
    public buildingType: BuildingType,
    public isConstructing: boolean = false,
    public constructingProgress: number = 0, // 0~1
  ) {
    super('Building');
  }

  startConstruction(): void {
    this.isConstructing = true;
    this.constructingProgress = 0;
  }

  completeConstruction(): void {
    this.isConstructing = false;
    this.constructingProgress = 1;
  }
}
```

- [ ] **Step 3: 创建 src/components/ResourceCarrier.ts**

```typescript
import { Component } from '../core/ecs/Component';

export class ResourceCarrier extends Component {
  constructor(
    public carrying: number = 0,
    public capacity: number = 8,
    public depositTargetId: number | null = null, // 返回哪个基地
    public mineralTargetId: number | null = null,  // 采集哪个矿物点
  ) {
    super('ResourceCarrier');
  }

  isFull(): boolean {
    return this.carrying >= this.capacity;
  }

  harvest(amount: number): void {
    this.carrying = Math.min(this.capacity, this.carrying + amount);
  }

  deposit(): number {
    const delivered = this.carrying;
    this.carrying = 0;
    return delivered;
  }
}
```

- [ ] **Step 4: 创建 src/components/Combat.ts**

```typescript
import { Component } from '../core/ecs/Component';

export class Combat extends Component {
  public cooldownTimer = 0;

  constructor(
    public attack: number,
    public armor: number,
    public range: number,      // 攻击范围（格）
    public cooldown: number,    // 攻击间隔（秒）
    public targetId: number | null = null,
  ) {
    super('Combat');
  }

  canAttack(): boolean {
    return this.cooldownTimer <= 0 && this.targetId !== null;
  }

  tickCooldown(delta: number): void {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= delta;
    }
  }

  resetCooldown(): void {
    this.cooldownTimer = this.cooldown;
  }
}
```

- [ ] **Step 5: 创建 src/components/Selected.ts**

```typescript
import { Component } from '../core/ecs/Component';

export class Selected extends Component {
  constructor(
    public selected: boolean = false,
  ) {
    super('Selected');
  }

  select(): void {
    this.selected = true;
  }

  deselect(): void {
    this.selected = false;
  }
}
```

- [ ] **Step 6: 创建 src/components/MoveTarget.ts**

```typescript
import { Component } from '../core/ecs/Component';

export class MoveTarget extends Component {
  constructor(
    public x: number,
    public y: number,
    public z: number,
    public arrived: boolean = false,
  ) {
    super('MoveTarget');
  }

  static at(x: number, y: number, z: number = 0): MoveTarget {
    return new MoveTarget(x, y, z, false);
  }
}
```

- [ ] **Step 7: 创建 src/components/Pathfinding.ts**

```typescript
import { Component } from '../core/ecs/Component';

export class Pathfinding extends Component {
  public path: { x: number; y: number; z: number }[] = [];
  public currentIndex = 0;
  public isActive = false;

  constructor() {
    super('Pathfinding');
  }

  setPath(path: { x: number; y: number; z: number }[]): void {
    this.path = path;
    this.currentIndex = 0;
    this.isActive = path.length > 0;
  }

  clear(): void {
    this.path = [];
    this.currentIndex = 0;
    this.isActive = false;
  }

  currentWaypoint(): { x: number; y: number; z: number } | null {
    if (this.currentIndex < this.path.length) {
      return this.path[this.currentIndex];
    }
    return null;
  }

  advance(): void {
    this.currentIndex++;
    if (this.currentIndex >= this.path.length) {
      this.clear();
    }
  }
}
```

- [ ] **Step 8: 创建 src/components/TrainQueue.ts**

```typescript
import { Component } from '../core/ecs/Component';

export class TrainQueue extends Component {
  constructor(
    public queue: string[] = [],
    public currentProgress: number = 0, // 0~1
    public trainingTime: number = 2,    // 单个单位训练时长（秒）
  ) {
    super('TrainQueue');
  }

  enqueue(unitType: string): void {
    this.queue.push(unitType);
  }

  dequeue(): string | null {
    return this.queue.shift() ?? null;
  }

  tick(delta: number): void {
    if (this.queue.length === 0) return;
    this.currentProgress += delta / this.trainingTime;
    if (this.currentProgress >= 1) {
      this.currentProgress = 0;
      this.queue.shift();
    }
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
```

- [ ] **Step 9: 创建 src/components/PlayerResources.ts**

```typescript
import { Component } from '../core/ecs/Component';

export class PlayerResources extends Component {
  constructor(
    public minerals: number = 400,
    public supplyUsed: number = 0,
    public supplyMax: number = 10,
  ) {
    super('PlayerResources');
  }

  spend(minerals: number): boolean {
    if (this.minerals < minerals) return false;
    this.minerals -= minerals;
    return true;
  }

  addMinerals(amount: number): void {
    this.minerals += amount;
  }

  canAfford(minerals: number, supply: number): boolean {
    return this.minerals >= minerals && (this.supplyUsed + supply) <= this.supplyMax;
  }

  useSupply(amount: number): void {
    this.supplyUsed += amount;
  }
}
```

- [ ] **Step 10: 更新 src/components/index.ts**

```typescript
export { Position } from './Position';
export { Renderable } from './Renderable';
export { Unit } from './Unit';
export { MineralDeposit } from './MineralDeposit';
export { Health } from './Health';
export { Building } from './Building';
export { ResourceCarrier } from './ResourceCarrier';
export { Combat } from './Combat';
export { Selected } from './Selected';
export { MoveTarget } from './MoveTarget';
export { Pathfinding } from './Pathfinding';
export { TrainQueue } from './TrainQueue';
export { PlayerResources } from './PlayerResources';
```

- [ ] **Step 11: 提交**

```bash
git add src/components/
git commit -m "feat: 补充游戏组件 (Health, Building, Combat, Selected, MoveTarget, Pathfinding, TrainQueue, PlayerResources)"
```

---

## Task 2: InputManager（鼠标/键盘事件管理）

**Files:**
- Create: `src/input/InputManager.ts`
- Modify: `src/game.ts`（注册 InputManager）

- [ ] **Step 1: 创建 src/input/InputManager.ts**

```typescript
export interface MouseState {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  worldZ: number;
  isDown: boolean;
  button: number;
  dragStart: { x: number; y: number } | null;
}

export interface InputManager {
  getMouseState(): MouseState;
  getSelectionBox(): { x1: number; y1: number; x2: number; y2: number } | null;
  onMouseDown(callback: (state: MouseState) => void): void;
  onMouseUp(callback: (state: MouseState) => void): void;
  onMouseMove(callback: (state: MouseState) => void): void;
  onKeyDown(callback: (key: string) => void): void;
  dispose(): void;
}

export class DOMInputManager implements InputManager {
  private canvas: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private mouse = new THREE.Vector2();

  private _mouseState: MouseState = {
    x: 0, y: 0,
    worldX: 0, worldY: 0, worldZ: 0,
    isDown: false, button: 0,
    dragStart: null,
  };

  private selectionBox: { x1: number; y1: number; x2: number; y2: number } | null = null;
  private downCallbacks: ((state: MouseState) => void)[] = [];
  private upCallbacks: ((state: MouseState) => void)[] = [];
  private moveCallbacks: ((state: MouseState) => void)[] = [];
  private keyCallbacks: ((key: string) => void)[] = [];

  constructor(canvas: HTMLElement, camera: THREE.PerspectiveCamera) {
    this.canvas = canvas;
    this.camera = camera;
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('keydown', this.onKeyDown);
  }

  private screenToWorld(clientX: number, clientY: number): { x: number; y: number; z: number } {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, intersection);
    return { x: intersection.x, y: intersection.y, z: intersection.z };
  }

  private onMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    const world = this.screenToWorld(e.clientX, e.clientY);
    this._mouseState = {
      x: e.clientX, y: e.clientY,
      worldX: world.x, worldY: world.y, worldZ: world.z,
      isDown: true, button: e.button,
      dragStart: { x: e.clientX, y: e.clientY },
    };
    this.downCallbacks.forEach(cb => cb(this._mouseState));
  };

  private onMouseMove = (e: MouseEvent): void => {
    const world = this.screenToWorld(e.clientX, e.clientY);
    const dragStart = this._mouseState.isDown ? this._mouseState.dragStart : null;

    this._mouseState = {
      x: e.clientX, y: e.clientY,
      worldX: world.x, worldY: world.y, worldZ: world.z,
      isDown: this._mouseState.isDown,
      button: this._mouseState.button,
      dragStart,
    };

    // 计算选择框
    if (dragStart) {
      this.selectionBox = {
        x1: Math.min(dragStart.x, e.clientX),
        y1: Math.min(dragStart.y, e.clientY),
        x2: Math.max(dragStart.x, e.clientX),
        y2: Math.max(dragStart.y, e.clientY),
      };
    }

    this.moveCallbacks.forEach(cb => cb(this._mouseState));
  };

  private onMouseUp = (e: MouseEvent): void => {
    const world = this.screenToWorld(e.clientX, e.clientY);
    this._mouseState = {
      x: e.clientX, y: e.clientY,
      worldX: world.x, worldY: world.y, worldZ: world.z,
      isDown: false, button: e.button,
      dragStart: this._mouseState.dragStart,
    };
    this.selectionBox = null;
    this.upCallbacks.forEach(cb => cb(this._mouseState));
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keyCallbacks.forEach(cb => cb(e.key));
  };

  getMouseState(): MouseState {
    return { ...this._mouseState };
  }

  getSelectionBox(): { x1: number; y1: number; x2: number; y2: number } | null {
    return this.selectionBox;
  }

  onMouseDown(callback: (state: MouseState) => void): void {
    this.downCallbacks.push(callback);
  }

  onMouseUp(callback: (state: MouseState) => void): void {
    this.upCallbacks.push(callback);
  }

  onMouseMove(callback: (state: MouseState) => void): void {
    this.moveCallbacks.push(callback);
  }

  onKeyDown(callback: (key: string) => void): void {
    this.keyCallbacks.push(callback);
  }

  dispose(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('keydown', this.onKeyDown);
  }
}

import * as THREE from 'three';
```

- [ ] **Step 2: 修改 src/game.ts，注册 InputManager**

在 Game 类 constructor 中添加：
```typescript
import { DOMInputManager } from './input/InputManager';
// ...
private inputManager: DOMInputManager;
// ...
this.inputManager = new DOMInputManager(canvasElement, this.sceneManager.camera);
// ...
// 在 dispose 中：
this.inputManager.dispose();
```

- [ ] **Step 3: 提交**

```bash
git add src/input/ src/game.ts
git commit -m "feat: 实现 InputManager（鼠标/键盘事件 + 射线投射）"
```

---

## Task 3: SelectionSystem + 框选渲染

**Files:**
- Create: `src/systems/SelectionSystem.ts`
- Modify: `src/renderer/EntityRenderer.ts`（添加 selection outline 效果）
- Modify: `src/game.ts`

- [ ] **Step 1: 创建 src/systems/SelectionSystem.ts**

```typescript
import { System } from '../core/ecs/System';
import { Selected } from '../components/Selected';
import { Position } from '../components/Position';
import { Unit } from '../components/Unit';
import type { InputManager } from '../input/InputManager';

export class SelectionSystem extends System {
  private input: InputManager;
  private isSelecting = false;
  private selectedEntityIds = new Set<number>();

  constructor(input: InputManager) {
    super();
    this.input = input;

    this.input.onMouseDown((state) => {
      if (state.button === 0) this.isSelecting = true;
    });

    this.input.onMouseUp((state) => {
      if (state.button === 0) {
        const box = this.input.getSelectionBox();
        if (box) {
          this.selectByBox(box);
        } else {
          this.selectByClick(state.worldX, state.worldZ);
        }
        this.isSelecting = false;
      }
    });
  }

  private selectByClick(worldX: number, worldZ: number): void {
    // 清除所有选中
    this.clearAllSelections();

    // 寻找最近的单位
    const units = this.world!.getEntitiesWithComponents('Position', 'Unit', 'Selected');
    let closest: { entity: ReturnType<typeof this.world!.getEntity>; dist: number } | null = null;
    const clickRadius = 2;

    for (const entity of units) {
      const pos = entity.getComponent<Position>('Position')!;
      const dist = Math.hypot(pos.x - worldX, pos.z - worldZ);
      if (dist < clickRadius && (!closest || dist < closest.dist)) {
        closest = { entity: this.world!.getEntity(entity.id), dist };
      }
    }

    if (closest?.entity) {
      const selected = closest.entity.getComponent<Selected>('Selected')!;
      selected.select();
      this.selectedEntityIds.add(closest.entity.id);
    }
  }

  private selectByBox(screenBox: { x1: number; y1: number; x2: number; y2: number }): void {
    this.clearAllSelections();
    const units = this.world!.getEntitiesWithComponents('Position', 'Unit', 'Selected');
    const camera = (this as any)._camera; // 通过 game 注入

    for (const entity of units) {
      const pos = entity.getComponent<Position>('Position')!;
      // 简化的框选：先假设单位在屏幕上的投影在框内即可
      // 真实实现需要投影到屏幕坐标，这里用简化版本
      const screenPos = this.worldToScreen(pos, camera);
      if (
        screenPos.x >= screenBox.x1 &&
        screenPos.x <= screenBox.x2 &&
        screenPos.y >= screenBox.y1 &&
        screenPos.y <= screenBox.y2
      ) {
        entity.getComponent<Selected>('Selected')!.select();
        this.selectedEntityIds.add(entity.id);
      }
    }
  }

  private worldToScreen(pos: Position, camera: THREE.Camera): { x: number; y: number } {
    const v = new THREE.Vector3(pos.x, pos.y + 0.5, pos.z);
    v.project(camera);
    return {
      x: (v.x + 1) / 2 * window.innerWidth,
      y: (-v.y + 1) / 2 * window.innerHeight,
    };
  }

  private clearAllSelections(): void {
    for (const entity of this.world!.getAllEntities()) {
      const selected = entity.getComponent<Selected>('Selected');
      if (selected) selected.deselect();
    }
    this.selectedEntityIds.clear();
  }

  update(_delta: number): void {
    // 选择逻辑由事件驱动，无需每帧处理
  }

  getSelectedIds(): number[] {
    return Array.from(this.selectedEntityIds);
  }
}

import * as THREE from 'three';
```

- [ ] **Step 2: 修改 EntityRenderer 添加选中高亮**

在 `EntityRenderer.syncTransform` 中，检测 `Selected` 组件，改变物体颜色或添加 outline。

- [ ] **Step 3: 修改 game.ts**

```typescript
import { SelectionSystem } from './systems/SelectionSystem';
// ...
this.selectionSystem = new SelectionSystem(this.inputManager);
this.world.addSystem(this.selectionSystem);
// 在 dispose 中清理
```

- [ ] **Step 4: 提交**

```bash
git add src/systems/SelectionSystem.ts src/renderer/EntityRenderer.ts src/game.ts
git commit -m "feat: 实现 SelectionSystem（点击 + 框选单位）"
```

---

## Task 4: MovementSystem + 简化 A* 寻路

**Files:**
- Create: `src/systems/MovementSystem.ts`
- Modify: `src/game.ts`

- [ ] **Step 1: 创建 src/systems/MovementSystem.ts**

```typescript
import { System } from '../core/ecs/System';
import { Position } from '../components/Position';
import { MoveTarget } from '../components/MoveTarget';
import { Pathfinding } from '../components/Pathfinding';
import { Unit } from '../components/Unit';

const ARRIVE_THRESHOLD = 0.3;

export class MovementSystem extends System {
  update(delta: number): void {
    const entities = this.world!.getEntitiesWithComponents('Position', 'MoveTarget');

    for (const entity of entities) {
      const pos = entity.getComponent<Position>('Position')!;
      const move = entity.getComponent<MoveTarget>('MoveTarget')!;

      if (move.arrived) continue;

      const dx = move.x - pos.x;
      const dz = move.z - pos.z;
      const dist = Math.hypot(dx, dz);

      if (dist < ARRIVE_THRESHOLD) {
        move.arrived = true;
        pos.x = move.x;
        pos.z = move.z;
        continue;
      }

      // 向目标方向移动（简化：无障碍）
      const speed = 3; // 格/秒
      const step = Math.min(speed * delta, dist);
      pos.x += (dx / dist) * step;
      pos.z += (dz / dist) * step;
    }
  }
}
```

- [ ] **Step 2: 修改 game.ts，注册 MovementSystem**

```typescript
import { MovementSystem } from './systems/MovementSystem';
// ...
this.world.addSystem(new MovementSystem());
```

- [ ] **Step 3: 提交**

```bash
git add src/systems/MovementSystem.ts src/game.ts
git commit -m "feat: 实现 MovementSystem（单位移动）"
```

---

## Task 5: CombatSystem（战斗：攻击/护甲/仇恨）

**Files:**
- Create: `src/systems/CombatSystem.ts`
- Modify: `src/game.ts`

- [ ] **Step 1: 创建 src/systems/CombatSystem.ts**

```typescript
import { System } from '../core/ecs/System';
import { Position } from '../components/Position';
import { Combat } from '../components/Combat';
import { Health } from '../components/Health';
import { Unit } from '../components/Unit';

export class CombatSystem extends System {
  update(delta: number): void {
    const combatants = this.world!.getEntitiesWithComponents('Combat', 'Position');

    for (const entity of combatants) {
      const combat = entity.getComponent<Combat>('Combat')!;
      combat.tickCooldown(delta);

      // 如果没有目标，跳过
      if (combat.targetId === null) continue;

      // 检查目标是否已死亡
      const target = this.world!.getEntity(combat.targetId);
      if (!target || !target.hasComponent('Health')) {
        combat.targetId = null;
        continue;
      }

      const targetPos = target.getComponent<Position>('Position')!;
      const selfPos = entity.getComponent<Position>('Position')!;

      // 计算距离
      const dist = Math.hypot(targetPos.x - selfPos.x, targetPos.z - selfPos.z);

      // 如果在攻击范围内
      if (dist <= combat.range) {
        if (combat.canAttack()) {
          this.attack(entity, target, combat);
          combat.resetCooldown();
        }
      } else {
        // 超出范围，停止攻击冷却（重置以便下次能立即攻击）
        // 真实逻辑应该让单位追击，这里简化处理
      }
    }
  }

  private attack(
    attacker: ReturnType<typeof this.world!.getEntity>,
    target: ReturnType<typeof this.world!.getEntity>,
    combat: Combat,
  ): void {
    if (!attacker || !target) return;

    const targetHealth = target.getComponent<Health>('Health');
    if (!targetHealth) return;

    const targetCombat = target.getComponent<Combat>('Combat');
    const damage = Math.max(1, combat.attack - (targetCombat?.armor ?? 0));
    targetHealth.takeDamage(damage);

    // 目标死亡处理
    if (targetHealth.isDead()) {
      this.world!.removeEntity(target.id);
      combat.targetId = null;
    }
  }
}
```

- [ ] **Step 2: 修改 game.ts，注册 CombatSystem**

```typescript
import { CombatSystem } from './systems/CombatSystem';
// ...
this.world.addSystem(new CombatSystem());
```

- [ ] **Step 3: 提交**

```bash
git add src/systems/CombatSystem.ts src/game.ts
git commit -m "feat: 实现 CombatSystem（攻击判定、护甲计算、仇恨）"
```

---

## Task 6: ResourceSystem（SCV 采集闭环）

**Files:**
- Create: `src/systems/ResourceSystem.ts`
- Modify: `src/game.ts`

- [ ] **Step 1: 创建 src/systems/ResourceSystem.ts**

```typescript
import { System } from '../core/ecs/System';
import { Position } from '../components/Position';
import { ResourceCarrier } from '../components/ResourceCarrier';
import { MineralDeposit } from '../components/MineralDeposit';
import { PlayerResources } from '../components/PlayerResources';
import { Building } from '../components/Building';
import { Unit } from '../components/Unit';

export class ResourceSystem extends System {
  private playerResources: PlayerResources | null = null;

  initPlayerResources(resources: PlayerResources): void {
    this.playerResources = resources;
  }

  update(delta: number): void {
    if (!this.playerResources) return;

    const carriers = this.world!.getEntitiesWithComponents(
      'ResourceCarrier', 'Position', 'Unit',
    );

    for (const entity of carriers) {
      const carrier = entity.getComponent<ResourceCarrier>('ResourceCarrier')!;
      const pos = entity.getComponent<Position>('Position')!;

      // 如果满载，返回基地
      if (carrier.isFull()) {
        this.returnToBase(entity, carrier, pos);
        continue;
      }

      // 如果没有矿物目标，寻找最近的矿物
      if (carrier.mineralTargetId === null) {
        const nearest = this.findNearestMineral(pos);
        if (nearest) {
          carrier.mineralTargetId = nearest.id;
        }
        continue;
      }

      // 走向矿物
      const mineral = this.world!.getEntity(carrier.mineralTargetId);
      if (!mineral || !mineral.hasComponent('MineralDeposit')) {
        carrier.mineralTargetId = null;
        continue;
      }

      const mineralPos = mineral.getComponent<Position>('Position')!;
      const dist = Math.hypot(mineralPos.x - pos.x, mineralPos.z - pos.z);

      if (dist < 2) {
        // 在矿物点，采集
        const mineralData = mineral.getComponent<MineralDeposit>('MineralDeposit')!;
        const harvestAmount = Math.min(1 * delta, mineralData.amount, carrier.capacity - carrier.carrying);
        carrier.harvest(harvestAmount);
        mineralData.amount -= harvestAmount;

        if (mineralData.amount <= 0) {
          this.world!.removeEntity(mineral.id);
          carrier.mineralTargetId = null;
        }
      }
    }
  }

  private returnToBase(
    entity: ReturnType<typeof this.world!.getEntity>,
    carrier: ResourceCarrier,
    pos: ReturnType<typeof (this.world!.getEntitiesWithComponents)>[0]['getComponent<Position>'],
  ): void {
    if (!entity || !pos) return;
    // 简化：SCV 返回距离最近的 command center
    const bases = this.world!.getEntitiesWithComponents('Building', 'Position');
    let nearestBase: ReturnType<typeof this.world!.getEntity> | null = null;
    let minDist = Infinity;

    for (const b of bases) {
      const building = b.getComponent<Building>('Building')!;
      if (building.buildingType !== 'command_center' || building.isConstructing) continue;
      const bpos = b.getComponent<Position>('Position')!;
      const dist = Math.hypot(bpos.x - pos.x, bpos.z - pos.z);
      if (dist < minDist) {
        minDist = dist;
        nearestBase = b;
      }
    }

    if (nearestBase && minDist < 3) {
      // 交付矿物
      const delivered = carrier.deposit();
      this.playerResources!.addMinerals(delivered);
      carrier.mineralTargetId = null; // 重新寻找矿物
    }
  }

  private findNearestMineral(
    pos: ReturnType<typeof (this.world!.getEntitiesWithComponents)>[0]['getComponent<Position>>,
  ): ReturnType<typeof this.world!.getEntity> | null {
    if (!pos) return null;
    const minerals = this.world!.getEntitiesWithComponents('MineralDeposit', 'Position');
    let nearest: ReturnType<typeof this.world!.getEntity> | null = null;
    let minDist = Infinity;

    for (const mineral of minerals) {
      const mpos = mineral.getComponent<Position>('Position')!;
      const dist = Math.hypot(mpos.x - pos.x, mpos.z - pos.z);
      if (dist < minDist) {
        minDist = dist;
        nearest = mineral;
      }
    }
    return nearest;
  }
}
```

- [ ] **Step 2: 修改 game.ts，注册 ResourceSystem 并初始化 PlayerResources**

- [ ] **Step 3: 提交**

```bash
git add src/systems/ResourceSystem.ts src/game.ts
git commit -m "feat: 实现 ResourceSystem（SCV 采集闭环）"
```

---

## Task 7: BuildSystem（建筑建造 + 建造动画）

**Files:**
- Create: `src/systems/BuildSystem.ts`
- Modify: `src/game.ts`
- Create: `src/data/buildings.json`

- [ ] **Step 1: 创建 src/data/buildings.json**

```json
{
  "command_center": {
    "name": "Command Center",
    "health": 1500,
    "cost": { "minerals": 400 },
    "supply": 0,
    "size": 3
  },
  "supply_depot": {
    "name": "Supply Depot",
    "health": 500,
    "cost": { "minerals": 100 },
    "supply": 8,
    "size": 2
  },
  "barracks": {
    "name": "Barracks",
    "health": 1000,
    "cost": { "minerals": 150 },
    "supply": 0,
    "size": 2
  },
  "engineering_bay": {
    "name": "Engineering Bay",
    "health": 750,
    "cost": { "minerals": 125 },
    "supply": 0,
    "size": 2
  }
}
```

- [ ] **Step 2: 创建 src/systems/BuildSystem.ts**

```typescript
import { System } from '../core/ecs/System';
import { Position } from '../components/Position';
import { Building } from '../components/Building';
import { PlayerResources } from '../components/PlayerResources';
import { Health } from '../components/Health';
import buildingsData from '../data/buildings.json';

const BUILD_TIME = 5; // 建造时间（秒）

export class BuildSystem extends System {
  private playerResources: PlayerResources | null = null;

  setPlayerResources(resources: PlayerResources): void {
    this.playerResources = resources;
  }

  update(delta: number): void {
    const buildings = this.world!.getEntitiesWithComponents('Building');

    for (const entity of buildings) {
      const building = entity.getComponent<Building>('Building')!;
      if (!building.isConstructing) continue;

      building.constructingProgress += delta / BUILD_TIME;
      if (building.constructingProgress >= 1) {
        building.completeConstruction();
        // 建造完成，添加 Health 组件
        if (!entity.hasComponent('Health')) {
          const data = (buildingsData as any)[building.buildingType];
          entity.addComponent(new Health(data.health, data.health));
        }
      }
    }
  }

  placeBuilding(
    buildingType: string,
    x: number,
    z: number,
    resources: PlayerResources,
  ): boolean {
    const data = (buildingsData as any)[buildingType];
    if (!data) return false;

    const cost = data.cost;
    if (!resources.canAfford(cost.minerals, data.supply)) return false;

    resources.spend(cost.minerals);
    resources.useSupply(data.supply);

    const entity = this.world!.createEntity();
    entity.addComponent(new Position(x, 0, z));
    entity.addComponent(new Building(buildingType as any, true, 0));
    entity.addComponent(new Renderable(`building_${buildingType}`, 1));

    return true;
  }
}

import { Renderable } from '../components/Renderable';
```

- [ ] **Step 3: 修改 game.ts，注册 BuildSystem**

- [ ] **Step 4: 提交**

```bash
git add src/systems/BuildSystem.ts src/data/buildings.json src/game.ts
git commit -m "feat: 实现 BuildSystem（建筑建造 + 建造动画）"
```

---

## Task 8: TrainingSystem（单位训练队列）+ HUD 升级

**Files:**
- Create: `src/systems/TrainingSystem.ts`
- Create: `src/ui/HUD/SelectionPanel.tsx`
- Create: `src/ui/HUD/BuildPanel.tsx`
- Modify: `src/ui/HUD/HUD.tsx`
- Modify: `src/game.ts`

- [ ] **Step 1: 创建 src/systems/TrainingSystem.ts**

```typescript
import { System } from '../core/ecs/System';
import { TrainQueue } from '../components/TrainQueue';
import { Building } from '../components/Building';
import { Position } from '../components/Position';
import { PlayerResources } from '../components/PlayerResources';
import unitsData from '../data/units.json';

export class TrainingSystem extends System {
  private playerResources: PlayerResources | null = null;

  setPlayerResources(resources: PlayerResources): void {
    this.playerResources = resources;
  }

  update(delta: number): void {
    const productionBuildings = this.world!.getEntitiesWithComponents(
      'TrainQueue', 'Building', 'Position',
    );

    for (const entity of productionBuildings) {
      const queue = entity.getComponent<TrainQueue>('TrainQueue')!;
      const building = entity.getComponent<Building>('Building')!;

      // 未建造完成的建筑不能训练
      if (building.isConstructing) continue;

      if (!queue.isEmpty()) {
        queue.tick(delta);
        // 训练完成（queue.length 减少时触发）
        if (queue.currentProgress === 0 && queue.queue.length < (queue as any)._prevLength) {
          this.spawnUnit(entity, queue);
        }
        (queue as any)._prevLength = queue.queue.length;
      }
    }
  }

  private spawnUnit(buildingEntity: ReturnType<typeof this.world!.getEntity>, queue: TrainQueue): void {
    if (!buildingEntity) return;
    const pos = buildingEntity.getComponent<Position>('Position')!;
    const data = (unitsData as any)[(queue as any)._lastTrained ?? 'marine'];
    // 在建筑旁边生成单位
    const spawnX = pos.x + 3;
    const newEntity = this.world!.createEntity();
    newEntity.addComponent(new Position(spawnX, 0, pos.z));
    newEntity.addComponent(new Renderable(`unit_${(queue as any)._lastTrained}`, 1));
    newEntity.addComponent(new Unit((queue as any)._lastTrained, data.health, data.maxHealth, 0));
    newEntity.addComponent(new Selected(false));
  }
}

import { Renderable } from '../components/Renderable';
import { Unit } from '../components/Unit';
import { Selected } from '../components/Selected';
```

- [ ] **Step 2: 创建 src/ui/HUD/SelectionPanel.tsx**

```typescript
import type { Entity } from '../../core/ecs/Entity';

interface Props {
  selectedEntities: Entity[];
}

export function SelectionPanel({ selectedEntities }: Props) {
  if (selectedEntities.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(200,220,255,0.4)', fontSize: 12, fontFamily: 'monospace' }}>
        [ No units selected ]
      </div>
    );
  }

  const first = selectedEntities[0];
  const unit = first.getComponent('Unit') as any;
  const health = first.getComponent('Health') as any;

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px' }}>
      {selectedEntities.length > 1 && (
        <div style={{ color: '#aaccee', fontFamily: 'monospace', fontSize: 12 }}>
          {selectedEntities.length} units selected
        </div>
      )}
      {unit && (
        <div style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold' }}>
          {unit.unitType.toUpperCase()}
        </div>
      )}
      {health && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ color: '#aaaaaa', fontFamily: 'monospace', fontSize: 10 }}>
            HP: {health.current}/{health.max}
          </div>
          <div style={{ width: 80, height: 4, background: '#333', borderRadius: 2 }}>
            <div style={{ width: `${(health.current / health.max) * 100}%`, height: '100%', background: '#44ff44', borderRadius: 2 }} />
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 创建 src/ui/HUD/BuildPanel.tsx（简化版占位）**

```typescript
export function BuildPanel() {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {/* 建造按钮，后续连接 BuildSystem */}
    </div>
  );
}
```

- [ ] **Step 4: 修改 HUD.tsx，连接 SelectionPanel**

```typescript
// 简化：HUD 订阅 selectionSystem.getSelectedIds()
// 通过 props 或 context 传递选中单位信息
```

- [ ] **Step 5: 修改 game.ts，注册 TrainingSystem**

- [ ] **Step 6: 提交**

```bash
git add src/systems/TrainingSystem.ts src/ui/HUD/SelectionPanel.tsx src/ui/HUD/BuildPanel.tsx src/game.ts
git commit -m "feat: 实现 TrainingSystem 和 SelectionPanel HUD"
```

---

## Task 9: AISystem（简单 AI 对手）

**Files:**
- Create: `src/systems/AISystem.ts`
- Modify: `src/game.ts`

- [ ] **Step 1: 创建 src/systems/AISystem.ts**

```typescript
import { System } from '../core/ecs/System';
import { Position } from '../components/Position';
import { Combat } from '../components/Combat';
import { MoveTarget } from '../components/MoveTarget';
import { Unit } from '../components/Unit';
import { Health } from '../components/Health';

export class AISystem extends System {
  private playerEntities: number[] = [];
  private aiMoveTimer = 0;

  setPlayerEntityIds(ids: number[]): void {
    this.playerEntities = ids;
  }

  update(delta: number): void {
    this.aiMoveTimer += delta;

    // 每 3 秒 AI 单位做一次决策
    if (this.aiMoveTimer < 3) return;
    this.aiMoveTimer = 0;

    const aiUnits = this.world!.getEntitiesWithComponents('Unit', 'Position', 'Combat')
      .filter(e => (e.getComponent<Unit>('Unit')?.ownerId ?? 0) !== 0);

    for (const entity of aiUnits) {
      const pos = entity.getComponent<Position>('Position')!;
      const combat = entity.getComponent<Combat>('Combat')!;

      // 寻找最近的玩家单位
      let nearestPlayer: ReturnType<typeof this.world!.getEntity> | null = null;
      let minDist = Infinity;

      for (const pid of this.playerEntities) {
        const playerEntity = this.world!.getEntity(pid);
        if (!playerEntity || !playerEntity.hasComponent('Position')) continue;
        const ppos = playerEntity.getComponent<Position>('Position')!;
        const dist = Math.hypot(ppos.x - pos.x, ppos.z - pos.z);
        if (dist < minDist) {
          minDist = dist;
          nearestPlayer = playerEntity;
        }
      }

      if (nearestPlayer && minDist < 10) {
        const targetPos = nearestPlayer.getComponent<Position>('Position')!;
        // 在射程内就攻击，否则移动到目标
        if (minDist <= combat.range) {
          combat.targetId = nearestPlayer.id;
        } else {
          combat.targetId = nearestPlayer.id;
          // 向目标移动
          const dx = targetPos.x - pos.x;
          const dz = targetPos.z - pos.z;
          const len = Math.hypot(dx, dz);
          entity.addComponent(MoveTarget.at(
            pos.x + (dx / len) * 5,
            0,
            pos.z + (dz / len) * 5,
          ));
        }
      } else {
        // 随机移动
        const angle = Math.random() * Math.PI * 2;
        const dist = 5 + Math.random() * 10;
        entity.addComponent(MoveTarget.at(
          pos.x + Math.cos(angle) * dist,
          0,
          pos.z + Math.sin(angle) * dist,
        ));
      }
    }
  }
}
```

- [ ] **Step 2: 修改 game.ts，添加 AI 对手初始化**

在 `initTestScene()` 中添加 AI 控制的 Marine，ownerId = 1

- [ ] **Step 3: 提交**

```bash
git add src/systems/AISystem.ts src/game.ts
git commit -m "feat: 实现 AISystem（AI 对手随机移动攻击）"
```

---

## Task 10: 最终集成验证

- [ ] **Step 1: 运行 pnpm build**

Run: `pnpm build`
Expected: 构建成功

- [ ] **Step 2: 运行 pnpm test**

Run: `pnpm test`
Expected: 全部测试通过

- [ ] **Step 3: 运行 pnpm dev，手动验证**

预期：
- 鼠标框选能看到选中效果（蓝色方块高亮）
- 点击地面，选中单位移动到目标点
- SCV 能采集矿物并返回 Command Center
- Marine 可攻击矿物（测试用）
- 底部 HUD 显示选中单位信息

- [ ] **Step 4: 提交**

```bash
git log --oneline --stat | head -20
# 确认 Phase 2 所有提交存在
```

---

## Phase 2 验收标准

| 检查项 | 预期 |
|--------|------|
| pnpm build | 构建成功，无报错 |
| pnpm test | 全部测试通过 |
| 鼠标框选 | 能选中多个单位 |
| 点击地面 | 选中单位移动到目标点 |
| SCV 采集 | SCV 走向矿物 → 采集 → 返回基地 → 矿物增加 |
| Marine 攻击 | 攻击范围内的敌人持续扣血，死亡的单位消失 |
| AI 对手 | AI 单位自动追击/攻击玩家单位 |
| HUD | 显示矿物数量、选中单位信息 |
