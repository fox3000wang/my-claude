import { System } from '../core/ecs/System';
import { Position } from '../components/Position';
import { MoveTarget } from '../components/MoveTarget';
import { Unit } from '../components/Unit';

const ARRIVE_THRESHOLD = 0.3;
const UNIT_RADIUS = 0.5;
const SEPARATION_FORCE = 2.0;

export class MovementSystem extends System {
  readonly name = 'MovementSystem';

  update(delta: number): void {
    const entities = this.world!.getEntitiesWithComponents('Position', 'MoveTarget');

    for (const entity of entities) {
      const pos = entity.getComponent<Position>('Position')!;
      const move = entity.getComponent<MoveTarget>('MoveTarget')!;

      if (move.arrived) continue;

      const dx = move.x - pos.x;
      const dz = move.z - pos.z;
      const dist = Math.hypot(dx, dz);

      if (dist < ARRIVE_THRESHOLD) {
        move.arrived = true;
        pos.x = move.x;
        pos.z = move.z;
        continue;
      }

      // 速度：3 格/秒
      const speed = 3;
      const step = Math.min(speed * delta, dist);
      pos.x += (dx / dist) * step;
      pos.z += (dz / dist) * step;
    }

    // Separation: push overlapping units apart
    const allUnits = this.world!.getEntitiesWithComponents('Position', 'Unit');
    for (const entity of allUnits) {
      const pos = entity.getComponent<Position>('Position')!;
      let sx = 0, sz = 0;
      for (const other of allUnits) {
        if (other.id === entity.id) continue;
        const opos = other.getComponent<Position>('Position')!;
        const dx = pos.x - opos.x;
        const dz = pos.z - opos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < UNIT_RADIUS * 2 && dist > 0) {
          const overlap = UNIT_RADIUS * 2 - dist;
          sx += (dx / dist) * overlap * SEPARATION_FORCE;
          sz += (dz / dist) * overlap * SEPARATION_FORCE;
        }
      }
      pos.x += sx * delta;
      pos.z += sz * delta;
    }
  }
}
