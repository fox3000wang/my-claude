export interface GridCell {
  x: number;
  z: number;
}

export class Grid {
  private readonly width: number;
  private readonly height: number;
  private readonly cellSize: number;
  private blocked: boolean[][];

  constructor(width: number, height: number, cellSize: number) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.blocked = Array.from({ length: height }, () => Array(width).fill(false));
  }

  private inBounds(cellX: number, cellZ: number): boolean {
    return cellX >= 0 && cellX < this.width && cellZ >= 0 && cellZ < this.height;
  }

  cellAt(worldX: number, _y: number, worldZ: number): GridCell {
    const x = Math.max(0, Math.min(this.width - 1, Math.floor(worldX / this.cellSize)));
    const z = Math.max(0, Math.min(this.height - 1, Math.floor(worldZ / this.cellSize)));
    return { x, z };
  }

  cellToWorld(cellX: number, cellZ: number): { x: number; z: number } {
    return {
      x: (cellX + 0.5) * this.cellSize,
      z: (cellZ + 0.5) * this.cellSize,
    };
  }

  isWalkable(cellX: number, cellZ: number): boolean {
    if (!this.inBounds(cellX, cellZ)) return false;
    return !this.blocked[cellZ][cellX];
  }

  blockCell(cellX: number, cellZ: number): void {
    if (this.inBounds(cellX, cellZ)) {
      this.blocked[cellZ][cellX] = true;
    }
  }

  unblockCell(cellX: number, cellZ: number): void {
    if (this.inBounds(cellX, cellZ)) {
      this.blocked[cellZ][cellX] = false;
    }
  }
}
