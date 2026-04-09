import * as THREE from 'three';
import { System } from '../core/ecs/System';
import { Entity } from '../core/ecs/Entity';
import { Selected } from '../components/Selected';
import { Position } from '../components/Position';
import { Unit } from '../components/Unit';
import { MoveTarget } from '../components/MoveTarget';
import { Combat } from '../components/Combat';
import type { InputManager } from '../input/InputManager';

export class SelectionSystem extends System {
  readonly name = 'SelectionSystem';
  private input: InputManager;
  private camera: THREE.Camera;
  private selectedIds = new Set<number>();
  private _clickStart: { x: number; y: number } | null = null;

  constructor(input: InputManager, camera: THREE.Camera) {
    super();
    this.input = input;
    this.camera = camera;

    this.input.onMouseDown((state) => {
      if (state.button === 0) {
        this._clickStart = { x: state.x, y: state.y };
      }
    });

    this.input.onMouseUp((state) => {
      if (state.button === 0) {
        if (this._clickStart) {
          const dx = Math.abs(state.x - this._clickStart.x);
          const dy = Math.abs(state.y - this._clickStart.y);
          // 鼠标移动超过5像素视为框选，否则为点击
          if (dx > 5 || dy > 5) {
            const box = this.input.getSelectionBox();
            if (box) this.selectByBox(box);
          } else {
            this.selectByClick(state.worldX, state.worldZ);
          }
        }
        this._clickStart = null;
      }
    });

    // 右键点击：攻击敌方或移动到目标
    this.input.onMouseUp((state) => {
      if (state.button === 2 && this.selectedIds.size > 0) {
        // Find enemy unit under click
        const allUnits = this.world!.getEntitiesWithComponents('Position', 'Unit', 'Combat');
        let targetEnemyId: number | null = null;
        for (const e of allUnits) {
          const pos = e.getComponent<Position>('Position')!;
          const unit = e.getComponent<Unit>('Unit')!;
          if (unit.ownerId === 0) continue; // not enemy
          const dist = Math.hypot(pos.x - state.worldX, pos.z - state.worldZ);
          if (dist < 2.5) {
            targetEnemyId = e.id;
            break;
          }
        }

        if (targetEnemyId !== null) {
          // Set Combat.targetId on selected units
          for (const id of this.selectedIds) {
            const entity = this.world!.getEntity(id);
            if (entity?.hasComponent('Combat')) {
              entity.getComponent<Combat>('Combat')!.targetId = targetEnemyId;
            }
          }
        } else {
          // Existing MoveTarget logic
          for (const id of this.selectedIds) {
            const entity = this.world!.getEntity(id);
            if (entity) {
              if (entity.hasComponent('MoveTarget')) {
                const mt = entity.getComponent<MoveTarget>('MoveTarget')!;
                mt.x = state.worldX;
                mt.z = state.worldZ;
                mt.arrived = false;
              } else {
                entity.addComponent(MoveTarget.at(state.worldX, 0, state.worldZ));
              }
            }
          }
        }
      }
    });
  }

  private selectByClick(worldX: number, worldZ: number): void {
    // 清除所有选中
    this.clearAllSelections();

    const units = this.world!.getEntitiesWithComponents('Position', 'Unit', 'Selected');
    let closest: { entity: Entity | undefined; dist: number } | null = null;
    const clickRadius = 2.5;

    for (const entity of units) {
      const pos = entity.getComponent<Position>('Position')!;
      const unit = entity.getComponent<Unit>('Unit')!;
      // 只选玩家单位
      if (unit.ownerId !== 0) continue;
      const dist = Math.hypot(pos.x - worldX, pos.z - worldZ);
      if (dist < clickRadius && (!closest || dist < closest.dist)) {
        closest = { entity: this.world!.getEntity(entity.id), dist };
      }
    }

    if (closest?.entity) {
      closest.entity.getComponent<Selected>('Selected')!.select();
      this.selectedIds.add(closest.entity.id);
    }
  }

  private selectByBox(screenBox: { x1: number; y1: number; x2: number; y2: number }): void {
    this.clearAllSelections();

    const units = this.world!.getEntitiesWithComponents('Position', 'Unit', 'Selected');
    for (const entity of units) {
      const pos = entity.getComponent<Position>('Position')!;
      const unit = entity.getComponent<Unit>('Unit')!;
      if (unit.ownerId !== 0) continue;

      const screen = this.worldToScreen(pos.x, pos.z);
      if (
        screen.x >= screenBox.x1 &&
        screen.x <= screenBox.x2 &&
        screen.y >= screenBox.y1 &&
        screen.y <= screenBox.y2
      ) {
        entity.getComponent<Selected>('Selected')!.select();
        this.selectedIds.add(entity.id);
      }
    }
  }

  private worldToScreen(worldX: number, worldZ: number): { x: number; y: number } {
    const v = new THREE.Vector3(worldX, 0.5, worldZ);
    v.project(this.camera);
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
    this.selectedIds.clear();
  }

  update(_delta: number): void {
    // 选择逻辑由事件驱动
  }

  getSelectedIds(): number[] {
    return Array.from(this.selectedIds);
  }
}
