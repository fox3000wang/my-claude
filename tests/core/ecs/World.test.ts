import { describe, it, expect, vi, beforeEach } from 'vitest';
import { World } from '../../../src/core/ecs/World';
import { System } from '../../../src/core/ecs/System';
import { Component } from '../../../src/core/ecs/Component';

class MockComponent extends Component {
  constructor() {
    super('MockComponent');
  }
}

class MockSystem extends System {
  readonly name = 'MockSystem';
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
    world.createEntity(); // 无组件
    const entities = world.getEntitiesWithComponents('MockComponent');
    expect(entities).toHaveLength(1);
    expect(entities[0].id).toBe(e1.id);
  });
});
