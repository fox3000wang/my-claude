import { System } from '../core/ecs/System';
import { Position } from '../components/Position';
import { Combat } from '../components/Combat';
import { MoveTarget } from '../components/MoveTarget';
import { Unit } from '../components/Unit';
import { Health } from '../components/Health';

export class AISystem extends System {
  readonly name = 'AISystem';
  private decisionTimer = 0;
  private readonly DECISION_INTERVAL = 3; // 每3秒决策一次

  update(delta: number): void {
    this.decisionTimer += delta;
    if (this.decisionTimer < this.DECISION_INTERVAL) return;
    this.decisionTimer = 0;

    const aiUnits = this.world!.getEntitiesWithComponents('Unit', 'Position', 'Combat')
      .filter(e => (e.getComponent<Unit>('Unit')?.ownerId ?? 0) !== 0);

    for (const entity of aiUnits) {
      const pos = entity.getComponent<Position>('Position')!;
      const combat = entity.getComponent<Combat>('Combat')!;

      // 找最近的玩家单位
      const playerUnits = this.world!.getEntitiesWithComponents('Unit', 'Position')
        .filter(e => (e.getComponent<Unit>('Unit')?.ownerId ?? 0) === 0);

      let nearest: { entity: ReturnType<typeof this.world!.getEntity>; dist: number } | null = null;
      for (const pu of playerUnits) {
        if (!pu.hasComponent('Health')) continue;
        const ppos = pu.getComponent<Position>('Position')!;
        const dist = Math.hypot(ppos.x - pos.x, ppos.z - pos.z);
        if (!nearest || dist < nearest.dist) {
          nearest = { entity: pu, dist };
        }
      }

      if (nearest && nearest.dist < 15) {
        combat.targetId = nearest.entity?.id ?? null;
        if (nearest.dist > combat.range) {
          const targetPos = nearest.entity?.getComponent<Position>('Position');
          if (targetPos) {
            const dx = targetPos.x - pos.x;
            const dz = targetPos.z - pos.z;
            const len = Math.hypot(dx, dz);
            entity.addComponent(MoveTarget.at(
              pos.x + (dx / len) * 5,
              0,
              pos.z + (dz / len) * 5,
            ));
          }
        }
      } else {
        // 随机移动
        const angle = Math.random() * Math.PI * 2;
        const dist = 5 + Math.random() * 10;
        entity.addComponent(MoveTarget.at(
          pos.x + Math.cos(angle) * dist,
          0,
          pos.z + Math.sin(angle) * dist,
        ));
      }
    }
  }
}
