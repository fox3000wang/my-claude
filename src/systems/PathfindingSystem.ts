import { System } from '../core/ecs/System';
import { World } from '../core/ecs/World';
import { Pathfinding } from '../components/Pathfinding';
import { MoveTarget } from '../components/MoveTarget';
import { Position } from '../components/Position';
import { Grid } from '../utils/grid';
import { astar } from '../utils/pathfinding';

export class PathfindingSystem extends System {
  readonly name = 'PathfindingSystem';

  constructor(private grid: Grid) {
    super();
  }

  setWorld(world: World): void {
    this.world = world;
  }

  update(_delta: number): void {
    const entities = this.world!.getEntitiesWithComponents(
      'Position',
      'MoveTarget',
      'Pathfinding',
    );

    for (const entity of entities) {
      const pos = entity.getComponent<Position>('Position')!;
      const mt = entity.getComponent<MoveTarget>('MoveTarget')!;
      const pf = entity.getComponent<Pathfinding>('Pathfinding')!;

      // Compute A* path when pathfinding is not active
      if (!pf.isActive) {
        const startCell = this.grid.cellAt(pos.x, pos.y, pos.z);
        const goalCell = this.grid.cellAt(mt.x, mt.y, mt.z);

        const cellPath = astar(this.grid, startCell, goalCell);

        if (cellPath.length > 0) {
          const worldPath = cellPath.map(cell => {
            const world = this.grid.cellToWorld(cell.x, cell.z);
            return { x: world.x, y: pos.y, z: world.z };
          });
          pf.setPath(worldPath);
        }
      }

      // Follow active path
      if (pf.isActive) {
        const waypoint = pf.currentWaypoint();
        if (waypoint === null) continue;

        const dx = pos.x - waypoint.x;
        const dz = pos.z - waypoint.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < 0.5) {
          const current = pf.currentWaypoint()!;
          // Set MoveTarget to current waypoint first, then advance
          mt.x = current.x;
          mt.y = current.y;
          mt.z = current.z;
          pf.advance();
        }
      }
    }
  }
}
