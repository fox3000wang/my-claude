import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../src/core/ecs/World';
import { BuildSystem } from '../../src/systems/BuildSystem';
import { Grid } from '../../src/utils/grid';
import { PlayerResources } from '../../src/components/PlayerResources';

describe('BuildSystem', () => {
  let grid: Grid;
  let world: World;
  let buildSystem: BuildSystem;
  let resources: PlayerResources;

  beforeEach(() => {
    grid = new Grid(100, 100, 1);
    world = new World();
    resources = new PlayerResources();
    buildSystem = new BuildSystem(grid);
    buildSystem.setPlayerResources(resources);
    world.addSystem(buildSystem);
  });

  describe('canPlaceBuilding', () => {
    it('returns false when cells are blocked', () => {
      // Pre-block some cells at world (5, 5) which is cell (5, 5)
      // A size-3 building (command_center) at (5, 5) covers cells (3,3) to (6,6)
      grid.blockCell(4, 4);

      // Should return false because one of the footprint cells is blocked
      expect(buildSystem.canPlaceBuilding('command_center', 5, 5)).toBe(false);
    });

    it('returns true when all footprint cells are walkable', () => {
      // No cells blocked — should be placeable
      expect(buildSystem.canPlaceBuilding('command_center', 5, 5)).toBe(true);
      expect(buildSystem.canPlaceBuilding('supply_depot', 10, 10)).toBe(true);
    });
  });

  describe('grid cell blocking', () => {
    it('blocks grid cells when placing a building', () => {
      // Place a supply_depot (size 2) at world (10, 10)
      // Size 2 → halfSize = 1, covers cells (9,9) to (11,11)
      const placed = buildSystem.placeBuilding('supply_depot', 10, 10);
      expect(placed).toBe(true);

      // Blocking happens after completeConstruction() in update()
      world.update(5);

      // Verify footprint cells are blocked
      expect(grid.isWalkable(9, 9)).toBe(false);
      expect(grid.isWalkable(11, 11)).toBe(false);
    });

    it('blocks correct footprint for command_center (size 3)', () => {
      // command_center has size 3, covers cells (3,3) to (6,6) at world (5,5)
      buildSystem.placeBuilding('command_center', 5, 5);

      // Advance time so construction completes
      world.update(5);

      // Corner cells should be blocked
      expect(grid.isWalkable(3, 3)).toBe(false);
      expect(grid.isWalkable(6, 6)).toBe(false);
      // Center of footprint
      expect(grid.isWalkable(4, 4)).toBe(false);
      expect(grid.isWalkable(5, 5)).toBe(false);
      // Cells outside footprint should still be walkable
      expect(grid.isWalkable(2, 2)).toBe(true);
      expect(grid.isWalkable(7, 7)).toBe(true);
    });
  });
});
