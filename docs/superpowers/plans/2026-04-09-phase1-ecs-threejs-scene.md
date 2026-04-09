# Phase 1: 项目搭建 + ECS 架构 + Three.js 渲染场景

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 跑通 Three.js + React + ECS 渲染管线，ECS World 能运行，地图和轨道相机正常工作，React HUD 骨架就位。

**Architecture:** Vite 构建 React 应用，Three.js 独立于 React 运行（canvas 通过 ref 挂载），ECS World 在 requestAnimationFrame loop 中驱动，React UI 只负责 HUD 不参与游戏循环。

**Tech Stack:** Vite 5 + React 18 + TypeScript strict + Three.js r170 + Vitest

---

## 文件结构（新建）

```
src/
├── core/
│   └── ecs/
│       ├── World.ts           # ECS 世界，管理所有实体/组件/系统
│       ├── Entity.ts           # 实体类，只有 ID
│       ├── Component.ts       # 组件基类 & 类型注册表
│       └── System.ts          # 系统基类
├── components/
│   ├── Position.ts            # 位置 { x, y, z }
│   ├── Renderable.ts          # 渲染 { meshId: string }
│   ├── Unit.ts                # 单位 { unitType: string }
│   └── MineralDeposit.ts      # 矿物点 { amount: number }
├── systems/
│   └── (Phase 1 仅框架，系统后续阶段添加)
├── renderer/
│   ├── SceneManager.ts        # Three.js 场景、相机、灯光管理
│   ├── EntityRenderer.ts      # Entity → Object3D 映射渲染
│   └── camera/
│       └── OrbitCameraController.ts  # 轨道相机：拖拽/缩放/框选
├── adapters/
│   └── FrameSyncAdapter.ts    # 帧同步接口（空实现）
├── ui/
│   ├── App.tsx                # React 根组件
│   ├── GameCanvas.tsx         # Three.js canvas 挂载点
│   └── HUD/
│       ├── HUD.tsx           # HUD 容器
│       └── Minimap.tsx        # 小地图（占位）
├── data/
│   └── units.json             # 单位配置数据（Phase 1 仅人族 SCV）
├── main.tsx                   # React 入口
└── game.ts                    # Three.js 游戏主循环（非 React）
```

---

## Task 1: 初始化 Vite + React + TypeScript 项目

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/vite-env.d.ts`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "starcraft-web",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "three": "^0.170.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/three": "^0.170.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.7.2",
    "vite": "^6.0.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
})
```

- [ ] **Step 5: 创建 index.html**

```html
<!doctype html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>StarCraft Web</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body, #root { width: 100%; height: 100%; overflow: hidden; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: 创建 src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 7: 运行 pnpm install 安装依赖**

Run: `pnpm install`（或 npm / yarn）
Expected: node_modules 安装成功，无报错

- [ ] **Step 8: 提交**

```bash
git add package.json tsconfig.json tsconfig.node.json vite.config.ts index.html src/
git commit -m "feat: 初始化 Vite + React + TypeScript 项目"
```

---

## Task 2: 创建 ECS 核心框架

**Files:**
- Create: `src/core/ecs/Component.ts`
- Create: `src/core/ecs/Entity.ts`
- Create: `src/core/ecs/System.ts`
- Create: `src/core/ecs/World.ts`
- Create: `src/core/ecs/index.ts`
- Create: `tests/core/ecs/World.test.ts`

- [ ] **Step 1: 创建 src/core/ecs/Component.ts**

```typescript
// 组件基类，所有游戏组件需继承此类
export abstract class Component {
  readonly name: string;

  protected constructor(name: string) {
    this.name = name;
  }
}

// 组件注册表，用于类型安全查询
export class ComponentRegistry {
  private static map = new Map<string, new () => Component>();

  static register<T extends Component>(name: string, ctor: new () => T): void {
    this.map.set(name, ctor);
  }

  static get(name: string): new () => Component | undefined {
    return this.map.get(name);
  }
}
```

- [ ] **Step 2: 创建 src/core/ecs/Entity.ts**

```typescript
import type { Component } from './Component';

export class Entity {
  readonly id: number;
  private components = new Map<string, Component>();

  constructor(id: number) {
    this.id = id;
  }

  addComponent(component: Component): this {
    this.components.set(component.name, component);
    return this;
  }

  getComponent<T extends Component>(name: string): T | undefined {
    return this.components.get(name) as T | undefined;
  }

  hasComponent(name: string): boolean {
    return this.components.has(name);
  }

  removeComponent(name: string): void {
    this.components.delete(name);
  }

  getComponentTypes(): string[] {
    return Array.from(this.components.keys());
  }
}
```

- [ ] **Step 3: 创建 src/core/ecs/System.ts**

```typescript
import type { World } from './World';

export abstract class System {
  abstract readonly name: string;
  protected world?: World;

  setWorld(world: World): void {
    this.world = world;
  }

  // 每帧调用，delta 为自上一帧以来的时间（秒）
  abstract update(delta: number): void;
}
```

- [ ] **Step 4: 创建 src/core/ecs/World.ts**

```typescript
import { Entity } from './Entity';
import { System } from './System';
import type { Component } from './Component';

export class World {
  private nextEntityId = 1;
  private entities = new Map<number, Entity>();
  private systems: System[] = [];
  private entityComponentIndex = new Map<number, Set<string>>();

  createEntity(): Entity {
    const entity = new Entity(this.nextEntityId++);
    this.entities.set(entity.id, entity);
    return entity;
  }

  removeEntity(entityId: number): void {
    this.entities.delete(entityId);
    this.entityComponentIndex.delete(entityId);
  }

  getEntity(entityId: number): Entity | undefined {
    return this.entities.get(entityId);
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  addSystem(system: System): void {
    system.setWorld(this);
    this.systems.push(system);
  }

  removeSystem(systemName: string): void {
    this.systems = this.systems.filter(s => s.name !== systemName);
  }

  // 获取拥有指定组件类型的所有实体
  getEntitiesWithComponents(...componentNames: string[]): Entity[] {
    const result: Entity[] = [];
    for (const entity of this.entities.values()) {
      if (componentNames.every(name => entity.hasComponent(name))) {
        result.push(entity);
      }
    }
    return result;
  }

  update(delta: number): void {
    for (const system of this.systems) {
      system.update(delta);
    }
  }
}
```

- [ ] **Step 5: 创建 src/core/ecs/index.ts**

```typescript
export { World } from './World';
export { Entity } from './Entity';
export { System } from './System';
export { Component, ComponentRegistry } from './Component';
```

- [ ] **Step 6: 创建测试 src/core/ecs/World.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { World } from '../src/core/ecs/World';
import { Entity } from '../src/core/ecs/Entity';
import { System } from '../src/core/ecs/System';
import { Component } from '../src/core/ecs/Component';

class MockComponent extends Component {
  constructor() {
    super('MockComponent');
  }
}

class MockSystem extends System {
  update = vi.fn((_delta: number) => {});
}

describe('World', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it('creates entity with unique id', () => {
    const e1 = world.createEntity();
    const e2 = world.createEntity();
    expect(e1.id).not.toBe(e2.id);
  });

  it('adds and retrieves component', () => {
    const entity = world.createEntity();
    entity.addComponent(new MockComponent());
    expect(entity.getComponent<MockComponent>('MockComponent')).toBeInstanceOf(MockComponent);
  });

  it('removes entity', () => {
    const entity = world.createEntity();
    world.removeEntity(entity.id);
    expect(world.getEntity(entity.id)).toBeUndefined();
  });

  it('runs system update each frame', () => {
    const system = new MockSystem();
    world.addSystem(system);
    world.update(0.016);
    expect(system.update).toHaveBeenCalledWith(0.016);
  });

  it('gets entities with specific components', () => {
    const e1 = world.createEntity().addComponent(new MockComponent());
    const e2 = world.createEntity(); // 无组件
    const entities = world.getEntitiesWithComponents('MockComponent');
    expect(entities).toHaveLength(1);
    expect(entities[0].id).toBe(e1.id);
  });
});
```

- [ ] **Step 7: 运行测试验证 ECS 框架**

Run: `pnpm test`
Expected: 5 tests PASS

- [ ] **Step 8: 提交**

```bash
git add src/core/ tests/ && git commit -m "feat: 实现 ECS 核心框架 (World, Entity, Component, System)"
```

---

## Task 3: 创建游戏组件（Position, Renderable, Unit, MineralDeposit）

**Files:**
- Create: `src/components/Position.ts`
- Create: `src/components/Renderable.ts`
- Create: `src/components/Unit.ts`
- Create: `src/components/MineralDeposit.ts`
- Create: `src/components/index.ts`

- [ ] **Step 1: 创建 src/components/Position.ts**

```typescript
import { Component } from '../core/ecs/Component';

export class Position extends Component {
  constructor(
    public x: number,
    public y: number,
    public z: number = 0,
  ) {
    super('Position');
  }
}
```

- [ ] **Step 2: 创建 src/components/Renderable.ts**

```typescript
import { Component } from '../core/ecs/Component';

export class Renderable extends Component {
  // 关联的 Three.js Mesh 或 Group 的引用
  public object3d: THREE.Object3D | null = null;

  constructor(
    public meshType: string, // e.g. 'unit_marine', 'building_command_center'
    public scale: number = 1,
  ) {
    super('Renderable');
  }
}

// 避免循环依赖，在需要时手动 import three
declare const THREE: typeof import('three');
```

- [ ] **Step 3: 创建 src/components/Unit.ts**

```typescript
import { Component } from '../core/ecs/Component';

export type UnitType = 'scv' | 'marine' | 'firebat' | 'tank';

export class Unit extends Component {
  constructor(
    public unitType: UnitType,
    public health: number,
    public maxHealth: number,
    public ownerId: number = 0,
  ) {
    super('Unit');
  }
}
```

- [ ] **Step 4: 创建 src/components/MineralDeposit.ts**

```typescript
import { Component } from '../core/ecs/Component';

export class MineralDeposit extends Component {
  constructor(
    public amount: number = 1500,
  ) {
    super('MineralDeposit');
  }
}
```

- [ ] **Step 5: 创建 src/components/index.ts**

```typescript
export { Position } from './Position';
export { Renderable } from './Renderable';
export { Unit } from './Unit';
export { MineralDeposit } from './MineralDeposit';
```

- [ ] **Step 6: 提交**

```bash
git add src/components/ && git commit -m "feat: 添加游戏组件 (Position, Renderable, Unit, MineralDeposit)"
```

---

## Task 4: Three.js 渲染层 — 场景管理器

**Files:**
- Create: `src/renderer/SceneManager.ts`
- Create: `src/renderer/camera/OrbitCameraController.ts`
- Create: `src/renderer/index.ts`

- [ ] **Step 1: 创建 src/renderer/camera/OrbitCameraController.ts**

```typescript
import * as THREE from 'three';

export class OrbitCameraController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private target = new THREE.Vector3(0, 0, 0);
  private spherical = new THREE.Spherical(50, Math.PI / 4, 0);

  private rotateSpeed = 0.005;
  private zoomSpeed = 1.2;
  private minDistance = 10;
  private maxDistance = 200;
  private minPolarAngle = 0.1;
  private maxPolarAngle = Math.PI / 2 - 0.1;

  private isDragging = false;
  private prevMouse = { x: 0, y: 0 };
  private onChange?: () => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, onChange?: () => void) {
    this.camera = camera;
    this.domElement = domElement;
    this.onChange = onChange;
    this.bindEvents();
    this.updateCamera();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('mouseleave', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    // 触控支持
    this.domElement.addEventListener('touchstart', this.onTouchStart);
    this.domElement.addEventListener('touchmove', this.onTouchMove);
    this.domElement.addEventListener('touchend', this.onTouchEnd);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0 && e.button !== 2) return;
    this.isDragging = true;
    this.prevMouse = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.prevMouse.x;
    const dy = e.clientY - this.prevMouse.y;
    if (e.button === 2 || e.buttons === 2) {
      // 右键拖拽：旋转
      this.spherical.theta -= dx * this.rotateSpeed;
      this.spherical.phi += dy * this.rotateSpeed;
      this.spherical.phi = THREE.MathUtils.clamp(
        this.spherical.phi,
        this.minPolarAngle,
        this.maxPolarAngle,
      );
    } else {
      // 左键拖拽：平移
      const offset = new THREE.Vector3();
      offset.setFromSpherical(this.spherical);
      const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 2);
      right.multiplyScalar(-dx * 0.1);
      up.multiplyScalar(dy * 0.1);
      this.target.add(right).add(up);
    }
    this.prevMouse = { x: e.clientX, y: e.clientY };
    this.updateCamera();
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.spherical.radius *= e.deltaY > 0 ? this.zoomSpeed : 1 / this.zoomSpeed;
    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius,
      this.minDistance,
      this.maxDistance,
    );
    this.updateCamera();
  };

  private lastTouchDist = 0;

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      this.lastTouchDist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      );
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.prevMouse.x;
      const dy = e.touches[0].clientY - this.prevMouse.y;
      this.spherical.theta -= dx * this.rotateSpeed;
      this.spherical.phi = THREE.MathUtils.clamp(
        this.spherical.phi + dy * this.rotateSpeed,
        this.minPolarAngle,
        this.maxPolarAngle,
      );
      this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.updateCamera();
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      );
      const delta = this.lastTouchDist / dist;
      this.spherical.radius = THREE.MathUtils.clamp(
        this.spherical.radius * delta,
        this.minDistance,
        this.maxDistance,
      );
      this.lastTouchDist = dist;
      this.updateCamera();
    }
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
  };

  private updateCamera(): void {
    const pos = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(pos.add(this.target));
    this.camera.lookAt(this.target);
    this.onChange?.();
  }

  getTarget(): THREE.Vector3 {
    return this.target.clone();
  }

  setTarget(x: number, y: number, z: number): void {
    this.target.set(x, y, z);
    this.updateCamera();
  }

  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('mouseleave', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.domElement.removeEventListener('touchmove', this.onTouchMove);
    this.domElement.removeEventListener('touchend', this.onTouchEnd);
  }
}
```

- [ ] **Step 2: 创建 src/renderer/SceneManager.ts**

```typescript
import * as THREE from 'three';

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private domElement: HTMLElement;

  constructor(domElement: HTMLElement, width: number, height: number) {
    this.domElement = domElement;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 80, 250);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(30, 40, 50);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.domElement.appendChild(this.renderer.domElement);

    // Lights
    this.setupLights();
    // Ground
    this.createGround();
    // Grid helper (调试用)
    const grid = new THREE.GridHelper(200, 40, 0x333355, 0x222244);
    grid.position.y = 0.05;
    this.scene.add(grid);
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x334466, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
    sun.position.set(50, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 300;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    this.scene.add(sun);
  }

  private createGround(): void {
    const geometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    // 给地面一些起伏
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 0.5;
      pos.setZ(i, z);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x2d4a2d,
      roughness: 0.9,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
```

- [ ] **Step 3: 创建 src/renderer/index.ts**

```typescript
export { SceneManager } from './SceneManager';
export { OrbitCameraController } from './camera/OrbitCameraController';
```

- [ ] **Step 4: 提交**

```bash
git add src/renderer/ && git commit -m "feat: 实现 Three.js SceneManager 和 OrbitCameraController"
```

---

## Task 5: 渲染适配层 — EntityRenderer

**Files:**
- Create: `src/renderer/EntityRenderer.ts`

- [ ] **Step 1: 创建 src/renderer/EntityRenderer.ts**

```typescript
import * as THREE from 'three';
import type { World } from '../core/ecs/World';
import type { Entity } from '../core/ecs/Entity';
import { Position } from '../components/Position';
import { Renderable } from '../components/Renderable';
import { MineralDeposit } from '../components/MineralDeposit';
import { Unit } from '../components/Unit';

export class EntityRenderer {
  private scene: THREE.Scene;
  private meshCache = new Map<string, THREE.Object3D>();
  private entityMeshes = new Map<number, THREE.Object3D>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // 从 world 中注册所有已有实体
  registerWorld(world: World): void {
    for (const entity of world.getAllEntities()) {
      this.registerEntity(entity);
    }
  }

  registerEntity(entity: Entity): void {
    const pos = entity.getComponent<Position>('Position');
    const renderable = entity.getComponent<Renderable>('Renderable');
    if (!pos || !renderable) return;

    let mesh = this.meshCache.get(renderable.meshType);
    if (!mesh) {
      mesh = this.createMesh(renderable.meshType, renderable.scale, entity);
      this.meshCache.set(renderable.meshType, mesh);
    }

    const instance = mesh.clone();
    instance.position.set(pos.x, pos.y, pos.z);
    this.scene.add(instance);
    this.entityMeshes.set(entity.id, instance);
    renderable.object3d = instance;
  }

  private createMesh(meshType: string, scale: number, entity: Entity): THREE.Object3D {
    const isMineral = entity.hasComponent('MineralDeposit');
    const isUnit = entity.hasComponent('Unit');

    if (isMineral) {
      // 晶矿：蓝色几何体群
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.3 });
      for (let i = 0; i < 5; i++) {
        const geo = new THREE.OctahedronGeometry(0.8 + Math.random() * 0.6);
        const m = new THREE.Mesh(geo, mat);
        m.position.set(
          (Math.random() - 0.5) * 1.5,
          0.5 + Math.random() * 1,
          (Math.random() - 0.5) * 1.5,
        );
        m.rotation.set(Math.random(), Math.random(), Math.random());
        m.castShadow = true;
        group.add(m);
      }
      group.scale.setScalar(scale);
      return group;
    }

    if (isUnit) {
      const unit = entity.getComponent<Unit>('Unit')!;
      const color = unit.ownerId === 0 ? 0x00aaff : 0xff4422;
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.scale.setScalar(scale);
      return mesh;
    }

    // 默认球体
    const geo = new THREE.SphereGeometry(0.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.setScalar(scale);
    return mesh;
  }

  syncTransform(entity: Entity): void {
    const pos = entity.getComponent<Position>('Position');
    const mesh = this.entityMeshes.get(entity.id);
    if (mesh && pos) {
      mesh.position.set(pos.x, pos.y, pos.z);
    }
  }

  removeEntity(entityId: number): void {
    const mesh = this.entityMeshes.get(entityId);
    if (mesh) {
      this.scene.remove(mesh);
      this.entityMeshes.delete(entityId);
    }
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/renderer/EntityRenderer.ts && git commit -m "feat: 实现 EntityRenderer (Entity → Three.js Object3D 映射)"
```

---

## Task 6: 帧同步接口框架

**Files:**
- Create: `src/adapters/FrameSyncAdapter.ts`

- [ ] **Step 1: 创建 src/adapters/FrameSyncAdapter.ts**

```typescript
export interface FrameCommand {
  frame: number;
  playerId: number;
  actions: Action[];
}

export type Action =
  | { type: 'move'; entityId: number; targetX: number; targetY: number; targetZ: number }
  | { type: 'attack'; entityId: number; targetId: number }
  | { type: 'build'; entityId: number; buildingType: string; x: number; y: number }
  | { type: 'train'; entityId: number; unitType: string }
  | { type: 'harvest'; entityId: number; targetId: number }
  | { type: 'stop'; entityId: number }
  | { type: 'select'; entityIds: number[] }
  | { type: 'deselect'; entityIds: number[] };

export interface FrameSyncAdapter {
  sendCommand(command: FrameCommand): void;
  onCommand(callback: (command: FrameCommand) => void): void;
  isConnected(): boolean;
}

export class LocalFrameSyncAdapter implements FrameSyncAdapter {
  private callbacks: ((command: FrameCommand) => void)[] = [];

  sendCommand(_command: FrameCommand): void {
    // Alpha: 本地模拟，命令直接本地处理
  }

  onCommand(callback: (command: FrameCommand) => void): void {
    this.callbacks.push(callback);
  }

  isConnected(): boolean {
    return true;
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/adapters/FrameSyncAdapter.ts && git commit -m "feat: 帧同步接口框架 (FrameSyncAdapter stub)"
```

---

## Task 7: 游戏主循环 — game.ts

**Files:**
- Create: `src/game.ts`

- [ ] **Step 1: 创建 src/game.ts**

```typescript
import { World } from './core/ecs/World';
import { SceneManager } from './renderer/SceneManager';
import { OrbitCameraController } from './renderer/camera/OrbitCameraController';
import { EntityRenderer } from './renderer/EntityRenderer';
import { LocalFrameSyncAdapter } from './adapters/FrameSyncAdapter';
import { Position } from './components/Position';
import { Renderable } from './components/Renderable';
import { Unit } from './components/Unit';
import { MineralDeposit } from './components/MineralDeposit';

export class Game {
  readonly world: World;
  readonly frameSync: LocalFrameSyncAdapter;
  private sceneManager: SceneManager;
  private cameraController: OrbitCameraController;
  private entityRenderer: EntityRenderer;
  private animationId: number | null = null;
  private lastTime = 0;

  constructor() {
    this.world = new World();
    this.frameSync = new LocalFrameSyncAdapter();
  }

  init(canvasElement: HTMLElement, width: number, height: number): void {
    // Three.js 渲染层
    this.sceneManager = new SceneManager(canvasElement, width, height);

    // 轨道相机
    this.cameraController = new OrbitCameraController(
      this.sceneManager.camera,
      canvasElement,
    );

    // 实体渲染
    this.entityRenderer = new EntityRenderer(this.sceneManager.scene);

    // 初始化测试场景
    this.initTestScene();
  }

  private initTestScene(): void {
    // 添加一个 SCV 单位
    const scv = this.world.createEntity();
    scv.addComponent(new Position(0, 0, 0));
    scv.addComponent(new Renderable('unit_scv', 1));
    scv.addComponent(new Unit('scv', 60, 60, 0));

    // 添加一个 Marine
    const marine = this.world.createEntity();
    marine.addComponent(new Position(5, 0, 3));
    marine.addComponent(new Renderable('unit_marine', 1));
    marine.addComponent(new Unit('marine', 40, 40, 0));

    // 添加两个晶矿点
    const minerals = [
      { x: -20, z: -10 },
      { x: 20, z: 10 },
    ];
    for (const { x, z } of minerals) {
      const mineral = this.world.createEntity();
      mineral.addComponent(new Position(x, 0, z));
      mineral.addComponent(new Renderable('mineral', 1));
      mineral.addComponent(new MineralDeposit(1500));
    }

    // 注册到渲染层
    this.entityRenderer.registerWorld(this.world);
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop = (): void => {
    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // ECS update
    this.world.update(delta);

    // Sync entity transforms to meshes
    for (const entity of this.world.getAllEntities()) {
      this.entityRenderer.syncTransform(entity);
    }

    // Three.js render
    this.sceneManager.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  resize(width: number, height: number): void {
    this.sceneManager.resize(width, height);
  }

  dispose(): void {
    this.stop();
    this.sceneManager.dispose();
    this.cameraController.dispose();
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/game.ts && git commit -m "feat: 实现游戏主循环 (Game 类，集成 ECS + Three.js)"
```

---

## Task 8: React UI 骨架

**Files:**
- Create: `src/ui/GameCanvas.tsx`
- Create: `src/ui/HUD/HUD.tsx`
- Create: `src/ui/HUD/Minimap.tsx`
- Modify: `src/ui/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: 创建 src/ui/GameCanvas.tsx**

```typescript
import { useEffect, useRef } from 'react';
import { Game } from '../game';

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const game = new Game();
    gameRef.current = game;

    const { width, height } = container.getBoundingClientRect();
    game.init(container, width, height);
    game.start();

    const handleResize = () => {
      const { width: w, height: h } = container.getBoundingClientRect();
      game.resize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', cursor: 'grab' }}
    />
  );
}
```

- [ ] **Step 2: 创建 src/ui/HUD/HUD.tsx**

```typescript
export function HUD() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '120px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
        display: 'flex',
        pointerEvents: 'none',
      }}
    >
      {/* 小地图区域 */}
      <div style={{ width: 160, padding: 8 }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'rgba(0,30,60,0.8)',
            border: '1px solid rgba(100,150,255,0.3)',
            borderRadius: 4,
          }}
        />
      </div>

      {/* 建造队列区域 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(200,220,255,0.5)',
          fontSize: 12,
          fontFamily: 'monospace',
        }}
      >
        [ Select units to see build options ]
      </div>

      {/* 资源面板 */}
      <div
        style={{
          width: 200,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          fontFamily: 'monospace',
          fontSize: 12,
          color: '#aaccee',
        }}
      >
        <div>
          <span style={{ color: '#88ccff' }}>Mineral:</span> 400
        </div>
        <div>
          <span style={{ color: '#44ff88' }}>Supply:</span> 20 / 30
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建 src/ui/HUD/Minimap.tsx（占位）**

```typescript
// 占位，后续阶段实现真实小地图
export function Minimap() {
  return <div style={{ width: '100%', height: '100%' }} />;
}
```

- [ ] **Step 4: 创建 src/ui/App.tsx**

```typescript
import { GameCanvas } from './GameCanvas';
import { HUD } from './HUD/HUD';

export function App() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#0a0a1a',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <GameCanvas />
      <HUD />
    </div>
  );
}
```

- [ ] **Step 5: 创建 src/main.tsx**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  StrictMode,
  <App />,
);
```

- [ ] **Step 6: 运行开发服务器验证**

Run: `pnpm dev`
Expected: 浏览器打开 http://localhost:5173，显示 3D 场景（地面 + 晶矿 + 两个单位）+ 底部 HUD 面板，无控制台报错

- [ ] **Step 7: 提交**

```bash
git add src/ui/ src/main.tsx && git commit -m "feat: 添加 React UI 骨架 (GameCanvas, HUD)"
```

---

## Task 9: 单位配置数据

**Files:**
- Create: `src/data/units.json`

- [ ] **Step 1: 创建 src/data/units.json**

```json
{
  "scv": {
    "name": "SCV",
    "health": 60,
    "maxHealth": 60,
    "speed": 2.5,
    "cost": { "minerals": 50, "supply": 1 },
    "abilities": ["harvest", "build", "repair"]
  },
  "marine": {
    "name": "Marine",
    "health": 40,
    "maxHealth": 40,
    "attack": 6,
    "armor": 0,
    "range": 4,
    "speed": 2.5,
    "cost": { "minerals": 50, "supply": 1 }
  },
  "firebat": {
    "name": "Firebat",
    "health": 80,
    "maxHealth": 80,
    "attack": 8,
    "armor": 0,
    "range": 1.5,
    "speed": 2.5,
    "cost": { "minerals": 75, "supply": 2 }
  },
  "tank": {
    "name": "Siege Tank",
    "health": 150,
    "maxHealth": 150,
    "attack": 40,
    "armor": 2,
    "range": 8,
    "siegeRange": 12,
    "speed": 1.5,
    "siegeSpeed": 0.5,
    "cost": { "minerals": 125, "supply": 3 }
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/data/units.json && git commit -m "feat: 添加人族单位配置数据"
```

---

## Task 10: 最终验证 & 提交

- [ ] **Step 1: 运行 pnpm build 确认生产构建**

Run: `pnpm build`
Expected: 构建成功，dist/ 目录生成

- [ ] **Step 2: 运行 pnpm test 确认测试通过**

Run: `pnpm test`
Expected: 5 tests PASS

- [ ] **Step 3: 合并提交**

```bash
git log --oneline feat/sc-rts-game
# 确认 Phase 1 所有提交存在
```

---

## Phase 1 验收标准

| 检查项 | 预期 |
|--------|------|
| 浏览器打开 http://localhost:5173 | 显示 3D 等距地图，轨道相机可用 |
| ECS World 能 addEntity/getEntities | 测试通过 |
| Three.js 场景正常渲染 | 地面 + 晶矿 + 单位可见 |
| React HUD 底部面板 | 资源显示区域可见 |
| 控制台无 Error 级别报错 | 无红色报错 |

---

## 实施完成后

Phase 1 完成后，下一步是 **Phase 2: 人族核心逻辑** — SCV 采集闭环、建筑建造、Marine 战斗系统、寻路。
