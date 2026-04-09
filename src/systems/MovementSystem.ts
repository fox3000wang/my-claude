import { System } from '../core/ecs/System';
import { Position } from '../components/Position';
import { MoveTarget } from '../components/MoveTarget';

const ARRIVE_THRESHOLD = 0.3;

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
  }
}
