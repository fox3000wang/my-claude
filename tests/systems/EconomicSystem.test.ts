import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../src/core/ecs/World';
import { EconomicSystem } from '../../src/systems/EconomicSystem';
import { PlayerResources } from '../../src/components/PlayerResources';
import { Building } from '../../src/components/Building';
import { Position } from '../../src/components/Position';
import { TrainQueue } from '../../src/components/TrainQueue';
import { Renderable } from '../../src/components/Renderable';

function makeBuilding(world: World, type: string, _ownerId: number, x: number, z: number, hasQueue = false) {
  const e = world.createEntity();
  e.addComponent(new Building(type as Building['buildingType'], false, 0));
  e.addComponent(new Position(x, 0, z));
  e.addComponent(new Renderable(`building_${type}`, 1));
  if (hasQueue) {
    e.addComponent(new TrainQueue([], 0));
  }
  return e;
}

describe('EconomicSystem', () => {
  let world: World;
  let system: EconomicSystem;
  let resources: PlayerResources;

  beforeEach(() => {
    world = new World();
    system = new EconomicSystem();
    world.addSystem(system);
    resources = new PlayerResources(1000, 0, 10); // 1000 minerals, 0/10 supply
    system.setResourcesForOwner(1, resources);
  });

  it('Zerg: queues Overlord in Hatchery when supply buffer exhausted', () => {
    const hatchery = makeBuilding(world, 'hatchery', 1, 0, 0, true);
    resources.useSupply(8); // supplyUsed=8, supplyMax=10, free=2 ≤ SUPPLY_BUFFER(4)

    world.update(5);

    const queue = hatchery.getComponent<TrainQueue>('TrainQueue')!;
    expect(queue.queue).toContain('overlord');
  });

  it('Zerg: does not double-queue Overlord if queue already has one', () => {
    const hatchery = makeBuilding(world, 'hatchery', 1, 0, 0, true);
    hatchery.getComponent<TrainQueue>('TrainQueue')!.queue.push('overlord');
    resources.useSupply(8);

    world.update(5);

    const queue = hatchery.getComponent<TrainQueue>('TrainQueue')!;
    expect(queue.queue.filter(u => u === 'overlord').length).toBe(1);
  });

  it('Protoss: sets pendingSupplyBuilding flag when supply buffer exhausted', () => {
    makeBuilding(world, 'nexus', 2, 0, 0, true);
    const p2 = new PlayerResources(1000, 0, 10);
    system.setResourcesForOwner(2, p2);
    p2.useSupply(8);

    world.update(5);

    expect((system as unknown as { pendingSupplyBuilding: Set<number> }).pendingSupplyBuilding.has(2)).toBe(true);
  });

  it('sets pendingProductionBuilding when no production buildings exist', () => {
    makeBuilding(world, 'nexus', 1, 0, 0, false); // only base, no production

    world.update(5);

    expect((system as unknown as { pendingProductionBuilding: Set<number> }).pendingProductionBuilding.has(1)).toBe(true);
  });

  it('does not over-queue when all queues have ≥ TRAIN_QUEUE_TARGET', () => {
    const hatchery = makeBuilding(world, 'hatchery', 1, 0, 0, true);
    const queue = hatchery.getComponent<TrainQueue>('TrainQueue')!;
    queue.queue.push('zergling', 'zergling', 'zergling'); // already at target
    resources.useSupply(25);

    world.update(5);

    expect(queue.queue.length).toBe(3);
  });

  it('phase 1 (supply < 20): only trains worker units', () => {
    const hatchery = makeBuilding(world, 'hatchery', 1, 0, 0, true);
    resources.useSupply(10); // supplyUsed=10 < PRODUCTION_THRESHOLD(20)

    world.update(5);

    const queue = hatchery.getComponent<TrainQueue>('TrainQueue')!;
    expect(queue.queue.every(u => u === 'drone')).toBe(true);
  });

  it('phase 2 (supply >= 20): applies worker budget and trains army in ratios', () => {
    const hatchery = makeBuilding(world, 'hatchery', 1, 0, 0, true);
    resources.useSupply(25); // supplyUsed=25 >= 20

    world.update(5);

    const queue = hatchery.getComponent<TrainQueue>('TrainQueue')!;
    expect(queue.queue.length).toBeGreaterThan(0);
    // Worker budget: 1 worker slot per tick (ceil(0.2 * 3) = 1)
    expect(queue.queue.some(u => u === 'drone')).toBe(true);
    // Overlord is added by handleSupply independently; filter it out of army check
    const armyUnits = queue.queue.filter(u => u !== 'drone' && u !== 'overlord');
    expect(armyUnits.length).toBeGreaterThan(0);
    expect(armyUnits.every(u => ['zergling', 'hydralisk', 'mutalisk'].includes(u))).toBe(true);
  });

  it('does nothing if decision timer not reached', () => {
    const hatchery = makeBuilding(world, 'hatchery', 1, 0, 0, true);
    resources.useSupply(8);

    world.update(1); // only 1s, less than DECISION_INTERVAL=5

    const queue = hatchery.getComponent<TrainQueue>('TrainQueue')!;
    expect(queue.queue.length).toBe(0);
  });
});
