import * as THREE from 'three';
import type { World } from '../core/ecs/World';
import type { Entity } from '../core/ecs/Entity';
import { Position } from '../components/Position';
import { Renderable } from '../components/Renderable';
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

  private createMesh(_meshType: string, scale: number, entity: Entity): THREE.Object3D {
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
