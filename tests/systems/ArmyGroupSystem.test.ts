import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../src/core/ecs/World';
import { ArmyGroupSystem } from '../../src/systems/ArmyGroupSystem';
import { ArmyGroup } from '../../src/components/ArmyGroup';
import { Unit } from '../../src/components/Unit';
import { Position } from '../../src/components/Position';
import { Combat } from '../../src/components/Combat';
import { Health } from '../../src/components/Health';

function makeUnit(world: World, ownerId: number, x: number, z: number, hp = 100): number {
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

  it('stays idle when no enemies nearby', () => {
    const group = world.createEntity();
    group.addComponent(new ArmyGroup(1));
    const uid = makeUnit(world, 1, 0, 0);
    group.getComponent<ArmyGroup>('ArmyGroup')!.addUnit(uid);

    world.update(0.1);
    expect(group.getComponent<ArmyGroup>('ArmyGroup')!.mode).toBe('idle');
  });

  it('attacks when strength >= threshold and enemy nearby', () => {
    const group = world.createEntity();
    group.addComponent(new ArmyGroup(1));
    // 2 full-health units = strength 2.0, need >= 3, add 2 more
    makeUnit(world, 1, 0, 0, 100);
    makeUnit(world, 1, 1, 0, 100);
    makeUnit(world, 1, 2, 0, 100);
    const g = group.getComponent<ArmyGroup>('ArmyGroup')!;
    const all = world.getEntitiesWithComponents('Unit');
    for (const e of all) {
      if (e.getComponent<Unit>('Unit')?.ownerId === 1) {
        g.addUnit(e.id);
      }
    }
    g.attackThreshold = 3;

    // Player unit nearby
    makeUnit(world, 0, 5, 0);

    world.update(0.1);
    expect(g.mode).toBe('attack');
  });

  it('retreats when strength below retreatThreshold', () => {
    const group = world.createEntity();
    group.addComponent(new ArmyGroup(1));
    const g = group.getComponent<ArmyGroup>('ArmyGroup')!;
    const uid1 = makeUnit(world, 1, 0, 0, 10);  // 10/100 = 0.1
    const uid2 = makeUnit(world, 1, 1, 0, 10);  // 10/100 = 0.1
    g.addUnit(uid1);
    g.addUnit(uid2);
    g.retreatThreshold = 0.3;  // need avg >= 0.3, we have 0.1

    makeUnit(world, 0, 5, 0);

    world.update(0.1);
    expect(g.mode).toBe('retreat');
  });

  it('sets MoveTarget on member units when mode=attack', () => {
    const group = world.createEntity();
    group.addComponent(new ArmyGroup(1));
    const g = group.getComponent<ArmyGroup>('ArmyGroup')!;
    g.setRallyPoint(0, 0);
    const uid1 = makeUnit(world, 1, 0, 0, 100);
    const uid2 = makeUnit(world, 1, 1, 0, 100);
    g.addUnit(uid1);
    g.addUnit(uid2);
    g.attackThreshold = 1;  // 2 units = strength 2.0, well above 1

    makeUnit(world, 0, 15, 0); // within DETECTION_RANGE (30)

    world.update(0.1);

    const unit = world.getEntity(uid1)!;
    expect(unit.hasComponent('MoveTarget')).toBe(true);
  });
});
