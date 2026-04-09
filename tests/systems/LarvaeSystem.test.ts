import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../src/core/ecs/World';
import { LarvaeSystem } from '../../src/systems/LarvaeSystem';
import { Building } from '../../src/components/Building';

describe('LarvaeSystem', () => {
  let world: World;
  let system: LarvaeSystem;

  beforeEach(() => {
    world = new World();
    system = new LarvaeSystem();
    world.addSystem(system);
  });

  it('regenerates larvae after interval', () => {
    const hatchery = world.createEntity();
    hatchery.addComponent(new Building('hatchery', false, 1, 1, ['drone', 'zergling']));

    // 15 seconds pass in two ticks
    world.update(10);
    world.update(5);

    const building = hatchery.getComponent<Building>('Building')!;
    expect(building.larvae).toBe(2); // 1 + 1 regenerated
  });

  it('does not exceed max larvae cap', () => {
    const hatchery = world.createEntity();
    hatchery.addComponent(new Building('hatchery', false, 1, 2, ['drone', 'zergling']));

    // Multiple intervals
    world.update(15);
    world.update(15);
    world.update(15);

    const building = hatchery.getComponent<Building>('Building')!;
    expect(building.larvae).toBe(2); // capped at MAX_LARVAE
  });

  it('skips non-spawning buildings', () => {
    const barracks = world.createEntity();
    barracks.addComponent(new Building('barracks'));

    world.update(15);

    const building = barracks.getComponent<Building>('Building')!;
    expect(building.larvae).toBe(0); // no spawns — larvae unchanged
  });

  it('does not regen before interval completes', () => {
    const hatchery = world.createEntity();
    hatchery.addComponent(new Building('hatchery', false, 1, 1, ['drone']));

    world.update(14); // not enough

    const building = hatchery.getComponent<Building>('Building')!;
    expect(building.larvae).toBe(1); // no change yet
  });
});
