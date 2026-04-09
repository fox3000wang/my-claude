import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../../src/core/ecs/World';
import { PathfindingSystem } from '../../src/systems/PathfindingSystem';
import { Grid } from '../../src/utils/grid';
import { Position } from '../../src/components/Position';
import { MoveTarget } from '../../src/components/MoveTarget';
import { Pathfinding } from '../../src/components/Pathfinding';

describe('PathfindingSystem', () => {
  const WIDTH = 20;
  const HEIGHT = 20;
  const CELL_SIZE = 1;
  let grid: Grid;
  let world: World;
  let system: PathfindingSystem;

  beforeEach(() => {
    grid = new Grid(WIDTH, HEIGHT, CELL_SIZE);
    world = new World();
    system = new PathfindingSystem(grid);
    world.addSystem(system);
  });

  it('skips entities without Pathfinding component', () => {
    const entity = world.createEntity();
    entity.addComponent(new Position(0, 0, 0));
    entity.addComponent(MoveTarget.at(5, 0, 5));

    // Should not throw
    world.update(0.016);

    // Entity still has Position and MoveTarget
    expect(entity.hasComponent('Position')).toBe(true);
    expect(entity.hasComponent('MoveTarget')).toBe(true);
    expect(entity.hasComponent('Pathfinding')).toBe(false);
  });

  it('sets path on entity with Pathfinding + MoveTarget', () => {
    const entity = world.createEntity();
    entity.addComponent(new Position(0, 0, 0));
    entity.addComponent(MoveTarget.at(5, 0, 5));
    entity.addComponent(new Pathfinding());

    world.update(0.016);

    const pf = entity.getComponent<Pathfinding>('Pathfinding')!;
    expect(pf.isActive).toBe(true);
    expect(pf.path.length).toBeGreaterThan(0);
  });

  it('sets MoveTarget to first waypoint and clears Pathfinding when done', () => {
    // Place entity at the first world waypoint so it immediately arrives
    const startCellX = 3;
    const startCellZ = 3;
    const startWorld = grid.cellToWorld(startCellX, startCellZ);

    // Build a single-waypoint path (will be at the start cell's world position)
    const singleCellPath = [{ x: startCellX, z: startCellZ }];
    const worldPath = singleCellPath.map(cell => ({
      x: grid.cellToWorld(cell.x, cell.z).x,
      y: 0,
      z: grid.cellToWorld(cell.x, cell.z).z,
    }));

    const entity = world.createEntity();
    entity.addComponent(new Position(startWorld.x, 0, startWorld.z));
    entity.addComponent(MoveTarget.at(10, 0, 10));
    const pf = new Pathfinding();
    pf.setPath(worldPath);
    entity.addComponent(pf);

    world.update(0.016);

    // Should have arrived: set MoveTarget to waypoint and cleared Pathfinding
    const mt = entity.getComponent<MoveTarget>('MoveTarget')!;
    expect(mt.x).toBeCloseTo(startWorld.x);
    expect(mt.z).toBeCloseTo(startWorld.z);
    expect(pf.isActive).toBe(false);
  });
});
