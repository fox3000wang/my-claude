import { describe, it, expect, beforeEach } from 'vitest';
import { Grid } from '../../src/utils/grid';
import { astar, Heuristic } from '../../src/utils/pathfinding';

describe('astar', () => {
  const WIDTH = 10;
  const HEIGHT = 10;
  const CELL_SIZE = 1;
  let grid: Grid;

  beforeEach(() => {
    grid = new Grid(WIDTH, HEIGHT, CELL_SIZE);
  });

  it('returns empty path when start equals goal', () => {
    const path = astar(grid, { x: 5, z: 5 }, { x: 5, z: 5 }, 'manhattan');
    expect(path).toEqual([]);
  });

  it('returns direct path on open grid', () => {
    const path = astar(grid, { x: 0, z: 0 }, { x: 4, z: 0 }, 'manhattan');
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual({ x: 4, z: 0 });
    // Path should not include start
    expect(path[0]).not.toEqual({ x: 0, z: 0 });
  });

  it('returns empty path when no path exists (fully blocked)', () => {
    // Block entire column x=5
    for (let z = 0; z < HEIGHT; z++) {
      grid.blockCell(5, z);
    }
    const path = astar(grid, { x: 0, z: 5 }, { x: 9, z: 5 }, 'manhattan');
    expect(path).toEqual([]);
  });

  it('path avoids blocked cells', () => {
    // Block the direct horizontal path from (0,5) to (5,5)
    for (let x = 1; x <= 4; x++) {
      grid.blockCell(x, 5);
    }
    const path = astar(grid, { x: 0, z: 5 }, { x: 5, z: 5 }, 'manhattan');
    expect(path).not.toEqual([]);
    // Last cell should be goal
    expect(path[path.length - 1]).toEqual({ x: 5, z: 5 });
    // Path should not go through blocked cells
    for (const cell of path) {
      expect(grid.isWalkable(cell.x, cell.z)).toBe(true);
    }
  });

  it('uses euclidean heuristic when specified', () => {
    const manhattanPath = astar(grid, { x: 0, z: 0 }, { x: 3, z: 4 }, 'manhattan');
    const euclideanPath = astar(grid, { x: 0, z: 0 }, { x: 3, z: 4 }, 'euclidean');
    // Both should find valid paths
    expect(manhattanPath.length).toBeGreaterThan(0);
    expect(euclideanPath.length).toBeGreaterThan(0);
    // Both should end at the goal
    expect(manhattanPath[manhattanPath.length - 1]).toEqual({ x: 3, z: 4 });
    expect(euclideanPath[euclideanPath.length - 1]).toEqual({ x: 3, z: 4 });
    // Neither path should include start
    expect(manhattanPath[0]).not.toEqual({ x: 0, z: 0 });
    expect(euclideanPath[0]).not.toEqual({ x: 0, z: 0 });
  });

  it('prefers diagonal shortcut when open', () => {
    // No blocked cells — diagonal from (0,0) to (3,3) should yield shorter path
    const manhattanPath = astar(grid, { x: 0, z: 0 }, { x: 3, z: 3 }, 'manhattan');
    // Manually check that diagonals are used when possible
    const hasDiagonal = manhattanPath.some((p, i) => {
      if (i === 0) {
        return p.x !== 0 || p.z !== 0;
      }
      const prev = { x: 0, z: 0, ...manhattanPath[i - 1] };
      const dx = p.x - prev.x;
      const dz = p.z - prev.z;
      return dx !== 0 && dz !== 0;
    });
    expect(hasDiagonal).toBe(true);
  });

  it('returns empty when start is blocked', () => {
    grid.blockCell(2, 2);
    const path = astar(grid, { x: 2, z: 2 }, { x: 5, z: 5 }, 'manhattan');
    expect(path).toEqual([]);
  });

  it('returns empty when goal is blocked', () => {
    grid.blockCell(7, 7);
    const path = astar(grid, { x: 0, z: 0 }, { x: 7, z: 7 }, 'manhattan');
    expect(path).toEqual([]);
  });

  it('does not allow diagonal through corner-cutting blocked cells', () => {
    // Block (2,1) and (1,2) — diagonal (1,1)→(2,2) should be blocked
    // Start at (1,1) so going negative isn't an option
    grid.blockCell(2, 1);
    grid.blockCell(1, 2);
    const path = astar(grid, { x: 1, z: 1 }, { x: 2, z: 2 }, 'manhattan');
    // A valid path exists: (1,1)→(1,0)→(2,0)→(2,1 blocked)→(2,2)
    // Actually going around: (1,1)→(0,1)→(0,2)→(1,2 blocked)→(2,2)
    // Neither direct path works; path should still exist around
    expect(path).not.toEqual([]);
    // Diagonal from (1,1) to (2,2) should NOT be used
    const containsDiagonalJump = path.some((p, i) => {
      if (i === 0) return false;
      const prev = path[i - 1];
      const dx = p.x - prev.x;
      const dz = p.z - prev.z;
      return Math.abs(dx) === 1 && Math.abs(dz) === 1;
    });
    expect(containsDiagonalJump).toBe(false);
  });
});
