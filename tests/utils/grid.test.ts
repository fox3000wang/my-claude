import { describe, it, expect, beforeEach } from 'vitest';
import { Grid } from '../../src/utils/grid';

describe('Grid', () => {
  const WIDTH = 10;
  const HEIGHT = 10;
  const CELL_SIZE = 1;
  let grid: Grid;

  beforeEach(() => {
    grid = new Grid(WIDTH, HEIGHT, CELL_SIZE);
  });

  it('cellAt returns correct cell for world position', () => {
    const cell = grid.cellAt(2.3, 0, 5.7);
    expect(cell.x).toBe(2);
    expect(cell.z).toBe(5);
  });

  it('cellAt clamps to bounds', () => {
    const outOfBounds = grid.cellAt(100, 0, -100);
    expect(outOfBounds.x).toBe(9);
    expect(outOfBounds.z).toBe(0);
  });

  it('isWalkable returns false for blocked cells', () => {
    expect(grid.isWalkable(3, 3)).toBe(true);
    grid.blockCell(3, 3);
    expect(grid.isWalkable(3, 3)).toBe(false);
  });

  it('worldToCell and cellToWorld are inverses', () => {
    const worldX = 4.7;
    const worldZ = 2.3;
    const cell = grid.cellAt(worldX, 0, worldZ);
    const world = grid.cellToWorld(cell.x, cell.z);
    expect(world.x).toBe((cell.x + 0.5) * CELL_SIZE);
    expect(world.z).toBe((cell.z + 0.5) * CELL_SIZE);
  });
});
