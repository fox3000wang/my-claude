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
    world.addSystem(system);
  });

  it('moves entity toward MoveTarget', () => {
    const entity = world.createEntity();
    entity.addComponent(new Position(0, 0, 0));
    entity.addComponent(new MoveTarget(3, 0, 4));

    // One frame with delta=1
    world.update(1);

    const pos = entity.getComponent<Position>('Position')!;
    // Speed is 3, so after 1s should have moved 3 units
    // Initial distance = 5, speed = 3, step = min(3, 5) = 3
    // dx = 3/5 * 3 = 1.8, dz = 4/5 * 3 = 2.4
    expect(pos.x).toBeCloseTo(1.8);
    expect(pos.z).toBeCloseTo(2.4);
  });

  it('sets arrived=true when close to target', () => {
    const entity = world.createEntity();
    entity.addComponent(new Position(0, 0, 0));
    entity.addComponent(new MoveTarget(0.1, 0, 0.1));

    world.update(1);

    const move = entity.getComponent<MoveTarget>('MoveTarget')!;
    const pos = entity.getComponent<Position>('Position')!;
    expect(move.arrived).toBe(true);
    expect(pos.x).toBeCloseTo(0.1);
    expect(pos.z).toBeCloseTo(0.1);
  });

  it('applies collision separation between two units', () => {
    const unit1 = world.createEntity();
    unit1.addComponent(new Position(0, 0, 0));
    unit1.addComponent(new Unit('marine', 100, 100));

    const unit2 = world.createEntity();
    unit2.addComponent(new Position(0.5, 0, 0)); // overlapping with unit1 (distance < UNIT_RADIUS*2 = 1.0)
    unit2.addComponent(new Unit('marine', 100, 100));

    // Update without MoveTarget - movement loop does nothing, separation loop should push apart
    world.update(1);

    const pos1 = unit1.getComponent<Position>('Position')!;
    const pos2 = unit2.getComponent<Position>('Position')!;

    // They should no longer be at the same position - pushed apart
    const dist = Math.hypot(pos1.x - pos2.x, pos1.z - pos2.z);
    expect(dist).toBeGreaterThan(0.5);
    // At least one unit should have moved from its original position
    const moved = Math.abs(pos1.x) > 0.01 || Math.abs(pos2.x - 0.5) > 0.01;
    expect(moved).toBe(true);
  });
});
