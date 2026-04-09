export interface GridCell {
  x: number;
  z: number;
}

export class Grid {
  public readonly width: number;
  public readonly height: number;
  public readonly cellSize: number;
  private blocked: Set<string>;

  constructor(width: number, height: number, cellSize: number) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.blocked = new Set<string>();
  }

  private inBounds(cellX: number, cellZ: number): boolean {
    return cellX >= 0 && cellX < this.width && cellZ >= 0 && cellZ < this.height;
  }

  private key(x: number, z: number): string {
    return `${x},${z}`;
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
    return !this.blocked.has(this.key(cellX, cellZ));
  }

  blockCell(cellX: number, cellZ: number): void {
    if (this.inBounds(cellX, cellZ)) {
      this.blocked.add(this.key(cellX, cellZ));
    }
  }

  unblockCell(cellX: number, cellZ: number): void {
    if (this.inBounds(cellX, cellZ)) {
      this.blocked.delete(this.key(cellX, cellZ));
    }
  }

  getBlockedCount(): number {
    return this.blocked.size;
  }
}
