import { Entity } from './Entity';
import { System } from './System';

export class World {
  private nextEntityId = 1;
  private entities = new Map<number, Entity>();
  private systems: System[] = [];

  createEntity(): Entity {
    const entity = new Entity(this.nextEntityId++);
    this.entities.set(entity.id, entity);
    return entity;
  }

  removeEntity(entityId: number): void {
    this.entities.delete(entityId);
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
