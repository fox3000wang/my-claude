import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../src/core/ecs/World';
import { TrainingSystem } from '../../src/systems/TrainingSystem';
import { Building } from '../../src/components/Building';
import { TrainQueue } from '../../src/components/TrainQueue';
import { Position } from '../../src/components/Position';
import { PlayerResources } from '../../src/components/PlayerResources';
import { Unit } from '../../src/components/Unit';

describe('TrainingSystem Zerg larvae', () => {
  let world: World;
  let system: TrainingSystem;
  let resources: PlayerResources;

  beforeEach(() => {
    world = new World();
    system = new TrainingSystem();
    resources = new PlayerResources();
    resources.addMinerals(1000);
    system.setPlayerResources(resources);
    world.addSystem(system);
  });

  it('can train when larvae > 0', () => {
    const hatchery = world.createEntity();
    hatchery.addComponent(new Position(0, 0, 0));
    hatchery.addComponent(new Building('hatchery', false, 1, 2, ['drone', 'zergling']));
    hatchery.addComponent(new TrainQueue(['zergling']));

    // Complete training instantly by ticking enough
    world.update(5);

    const entities = world.getEntitiesWithComponents('Unit');
    expect(entities.length).toBeGreaterThan(0);
    const building = hatchery.getComponent<Building>('Building')!;
    expect(building.larvae).toBe(1); // 2 - 1 consumed
  });

  it('cannot train when larvae === 0', () => {
    const hatchery = world.createEntity();
    hatchery.addComponent(new Position(0, 0, 0));
    hatchery.addComponent(new Building('hatchery', false, 1, 0, ['drone', 'zergling']));
    hatchery.addComponent(new TrainQueue(['zergling']));

    world.update(5);

    const entities = world.getEntitiesWithComponents('Unit');
    // No units should be trained — larvae was 0
    expect(entities.length).toBe(0);
  });

  it('larvae decrements after training', () => {
    const hatchery = world.createEntity();
    hatchery.addComponent(new Position(0, 0, 0));
    hatchery.addComponent(new Building('hatchery', false, 1, 2, ['drone']));
    hatchery.addComponent(new TrainQueue(['drone']));

    world.update(5);

    const building = hatchery.getComponent<Building>('Building')!;
    expect(building.larvae).toBe(1);
  });

  it('skips larvae check for Terran buildings (no larvae property)', () => {
    const barracks = world.createEntity();
    barracks.addComponent(new Position(0, 0, 0));
    barracks.addComponent(new Building('barracks', false, 1));
    barracks.addComponent(new TrainQueue(['marine']));

    world.update(5);

    const entities = world.getEntitiesWithComponents('Unit');
    expect(entities.length).toBeGreaterThan(0);
  });

  it('trained unit gets correct ownerId from building', () => {
    const aiResources = new PlayerResources();
    aiResources.addMinerals(1000);
    system.setResourcesForOwner(1, aiResources);

    const hatchery = world.createEntity();
    hatchery.addComponent(new Position(0, 0, 0));
    hatchery.addComponent(new Building('hatchery', false, 1, 2, ['drone'], undefined, 0, 0, 1));
    hatchery.addComponent(new TrainQueue(['drone']));

    world.update(5);

    const entities = world.getEntitiesWithComponents('Unit');
    expect(entities.length).toBeGreaterThan(0);
    const unit = entities[0].getComponent<Unit>('Unit')!;
    expect(unit.ownerId).toBe(1);
  });
});
