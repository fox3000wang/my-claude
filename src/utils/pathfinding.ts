export type Heuristic = 'manhattan' | 'euclidean';

export interface Grid {
  isWalkable(x: number, z: number): boolean;
  width: number;
  height: number;
}

interface Node {
  x: number;
  z: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

function heuristic(ax: number, az: number, bx: number, bz: number, hType: Heuristic): number {
  if (hType === 'manhattan') {
    return Math.abs(ax - bx) + Math.abs(az - bz);
  }
  return Math.sqrt((ax - bx) ** 2 + (az - bz) ** 2);
}

function nodeKey(x: number, z: number): string {
  return `${x},${z}`;
}

// Simple binary min-heap for the open list (f-score as priority)
class MinHeap {
  private heap: Node[] = [];

  push(node: Node): void {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): Node | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return min;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.heap[parent].f <= this.heap[idx].f) break;
      [this.heap[parent], this.heap[idx]] = [this.heap[idx], this.heap[parent]];
      idx = parent;
    }
  }

  private bubbleDown(idx: number): void {
    const length = this.heap.length;
    while (true) {
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      let smallest = idx;

      if (left < length && this.heap[left].f < this.heap[smallest].f) {
        smallest = left;
      }
      if (right < length && this.heap[right].f < this.heap[smallest].f) {
        smallest = right;
      }
      if (smallest === idx) break;
      [this.heap[smallest], this.heap[idx]] = [this.heap[idx], this.heap[smallest]];
      idx = smallest;
    }
  }
}

export function astar(
  grid: Grid,
  start: { x: number; z: number },
  goal: { x: number; z: number },
  hType: Heuristic = 'manhattan'
): { x: number; z: number }[] {
  // Return empty if start equals goal
  if (start.x === goal.x && start.z === goal.z) {
    return [];
  }

  // Return empty if start or goal is not walkable
  if (!grid.isWalkable(start.x, start.z) || !grid.isWalkable(goal.x, goal.z)) {
    return [];
  }

  // 8-directional neighbours: 4 cardinal + 4 diagonal
  // Cardinal: cost 1, Diagonal: cost Math.SQRT2
  // Diagonal requires both adjacent cardinal cells to be walkable
  const directions = [
    { dx: 1, dz: 0, cost: 1 },
    { dx: -1, dz: 0, cost: 1 },
    { dx: 0, dz: 1, cost: 1 },
    { dx: 0, dz: -1, cost: 1 },
    { dx: 1, dz: 1, cost: Math.SQRT2 },
    { dx: -1, dz: 1, cost: Math.SQRT2 },
    { dx: 1, dz: -1, cost: Math.SQRT2 },
    { dx: -1, dz: -1, cost: Math.SQRT2 },
  ];

  const open = new MinHeap();
  const closed = new Set<string>();
  const gScores = new Map<string, number>();

  const startNode: Node = {
    x: start.x,
    z: start.z,
    g: 0,
    h: heuristic(start.x, start.z, goal.x, goal.z, hType),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;

  open.push(startNode);
  gScores.set(nodeKey(start.x, start.z), 0);

  while (!open.isEmpty()) {
    const current = open.pop()!;
    const currentKey = nodeKey(current.x, current.z);

    // Skip if already processed (handles stale entries in heap)
    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    // Goal reached — reconstruct path
    if (current.x === goal.x && current.z === goal.z) {
      const path: { x: number; z: number }[] = [];
      let node: Node | null = current;
      while (node !== null) {
        path.unshift({ x: node.x, z: node.z });
        node = node.parent;
      }
      // Exclude start cell
      return path.slice(1);
    }

    for (const { dx, dz, cost } of directions) {
      const nx = current.x + dx;
      const nz = current.z + dz;
      const nKey = nodeKey(nx, nz);

      if (closed.has(nKey)) continue;
      if (!grid.isWalkable(nx, nz)) continue;

      // For diagonal movement, both adjacent cardinal cells must be walkable
      if (dx !== 0 && dz !== 0) {
        if (!grid.isWalkable(current.x + dx, current.z) || !grid.isWalkable(current.x, current.z + dz)) {
          continue;
        }
      }

      const tentativeG = current.g + cost;
      const existingG = gScores.get(nKey);

      if (existingG !== undefined && tentativeG >= existingG) continue;

      gScores.set(nKey, tentativeG);

      const h = heuristic(nx, nz, goal.x, goal.z, hType);
      open.push({
        x: nx,
        z: nz,
        g: tentativeG,
        h,
        f: tentativeG + h,
        parent: current,
      });
    }
  }

  return [];
}
