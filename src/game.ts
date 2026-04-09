import { World } from './core/ecs/World';
import { SceneManager } from './renderer/SceneManager';
import { OrbitCameraController } from './renderer/camera/OrbitCameraController';
import { EntityRenderer } from './renderer/EntityRenderer';
import { LocalFrameSyncAdapter } from './adapters/FrameSyncAdapter';
import { Position } from './components/Position';
import { Renderable } from './components/Renderable';
import { Unit } from './components/Unit';
import { MineralDeposit } from './components/MineralDeposit';
import { DOMInputManager } from './input/InputManager';
import { MovementSystem } from './systems/MovementSystem';
import { CombatSystem } from './systems/CombatSystem';
import { SelectionSystem } from './systems/SelectionSystem';
import { AISystem } from './systems/AISystem';
import { BuildSystem } from './systems/BuildSystem';
import { ResourceSystem } from './systems/ResourceSystem';
import { Selected } from './components/Selected';
import { PlayerResources } from './components/PlayerResources';
import { ResourceCarrier } from './components/ResourceCarrier';
import { Combat } from './components/Combat';

export class Game {
  readonly world: World;
  readonly frameSync: LocalFrameSyncAdapter;
  private sceneManager!: SceneManager;
  private cameraController!: OrbitCameraController;
  private entityRenderer!: EntityRenderer;
  private inputManager!: DOMInputManager;
  private selectionSystem!: SelectionSystem;
  private buildSystem!: BuildSystem;
  private resourceSystem!: ResourceSystem;
  private aiSystem!: AISystem;
  private playerResources!: PlayerResources;
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

    // 输入管理
    this.inputManager = new DOMInputManager(canvasElement, this.sceneManager.camera);

    // Systems
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new CombatSystem());
    this.selectionSystem = new SelectionSystem(this.inputManager, this.sceneManager.camera);
    this.world.addSystem(this.selectionSystem);
    this.aiSystem = new AISystem();
    this.world.addSystem(this.aiSystem);

    // 玩家资源
    this.playerResources = new PlayerResources();
    this.buildSystem = new BuildSystem();
    this.buildSystem.setPlayerResources(this.playerResources);
    this.world.addSystem(this.buildSystem);
    this.resourceSystem = new ResourceSystem();
    this.resourceSystem.setPlayerResources(this.playerResources);
    this.world.addSystem(this.resourceSystem);

    // 初始化测试场景
    this.initTestScene();
  }

  private initTestScene(): void {
    // 添加一个 SCV 单位
    const scv = this.world.createEntity();
    scv.addComponent(new Position(0, 0, 0));
    scv.addComponent(new Renderable('unit_scv', 1));
    scv.addComponent(new Unit('scv', 60, 60, 0));
    scv.addComponent(new ResourceCarrier());
    scv.addComponent(new Selected());

    // 添加一个 Marine
    const marine = this.world.createEntity();
    marine.addComponent(new Position(5, 0, 3));
    marine.addComponent(new Renderable('unit_marine', 1));
    marine.addComponent(new Unit('marine', 40, 40, 0));
    marine.addComponent(new Selected());

    // AI 对手 Marine
    const aiMarine = this.world.createEntity();
    aiMarine.addComponent(new Position(-10, 0, -5));
    aiMarine.addComponent(new Renderable('unit_marine', 1));
    aiMarine.addComponent(new Unit('marine', 40, 40, 1)); // ownerId = 1
    aiMarine.addComponent(new Combat(6, 0, 4, 1.0));

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
    this.inputManager.dispose();
    this.sceneManager.dispose();
    this.cameraController.dispose();
  }
}
