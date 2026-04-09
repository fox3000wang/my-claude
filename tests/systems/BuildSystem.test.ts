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
      // A size-3 building (command_center) at (5, 5) covers cells (3,3) to (5,5) (3x3 footprint)
      grid.blockCell(4, 4);

      // Should return false because one of the footprint cells is blocked
      expect(buildSystem.canPlaceBuilding('command_center', 5, 5)).toBe(false);
    });

    it('returns true when all footprint cells are walkable', () => {
      // No cells blocked — should be placeable
      expect(buildSystem.canPlaceBuilding('command_center', 5, 5)).toBe(true);
      expect(buildSystem.canPlaceBuilding('supply_depot', 10, 10)).toBe(true);
    });

    it('canPlaceBuilding returns false after another building occupies the footprint', () => {
      // Pre-block a cell that falls within the footprint of supply_depot at (10,10)
      // supply_depot (size=2) at (10,10) covers cells (9,9) to (10,10)
      grid.blockCell(9, 9);
      expect(buildSystem.canPlaceBuilding('supply_depot', 10, 10)).toBe(false);

      // Pre-block a cell outside footprint — should still be placeable
      grid.unblockCell(9, 9);
      grid.blockCell(0, 0); // far away, not in footprint
      expect(buildSystem.canPlaceBuilding('supply_depot', 10, 10)).toBe(true);
    });
  });

  describe('grid cell blocking', () => {
    it('blocks grid cells when placing a building', () => {
      // Place a supply_depot (size 2) at world (10, 10)
      // Size 2 → halfSize = 1.0, covers cells (9,9) to (10,10) (2x2 footprint)
      const placed = buildSystem.placeBuilding('supply_depot', 10, 10);
      expect(placed).toBe(true);

      // Blocking happens after completeConstruction() in update()
      world.update(5);

      // Verify footprint cells are blocked (2x2 area)
      expect(grid.isWalkable(9, 9)).toBe(false);
      expect(grid.isWalkable(10, 10)).toBe(false);
      // Cells outside footprint should still be walkable
      expect(grid.isWalkable(11, 11)).toBe(true);
    });

    it('blocks correct footprint for command_center (size 3)', () => {
      // command_center has size 3, covers cells (3,3) to (5,5) at world (5,5) (3x3 footprint)
      buildSystem.placeBuilding('command_center', 5, 5);

      // Advance time so construction completes
      world.update(5);

      // Corner cells should be blocked (3x3 footprint: cells 3-5)
      expect(grid.isWalkable(3, 3)).toBe(false);
      expect(grid.isWalkable(5, 5)).toBe(false);
      // Center of footprint
      expect(grid.isWalkable(4, 4)).toBe(false);
      // Cells outside footprint should still be walkable
      expect(grid.isWalkable(2, 2)).toBe(true);
      expect(grid.isWalkable(6, 6)).toBe(true);
    });
  });
});
