import { System } from '../core/ecs/System';
import { Entity } from '../core/ecs/Entity';
import { Position } from '../components/Position';
import { Combat } from '../components/Combat';
import { MoveTarget } from '../components/MoveTarget';
import { Unit } from '../components/Unit';
import { Health } from '../components/Health';

export class AISystem extends System {
  readonly name = 'AISystem';
  private decisionTimer = 0;
  private readonly DECISION_INTERVAL = 3; // decision every 3 seconds

  update(delta: number): void {
    this.decisionTimer += delta;
    if (this.decisionTimer < this.DECISION_INTERVAL) return;
    this.decisionTimer = 0;

    const aiUnits = this.world!.getEntitiesWithComponents('Unit', 'Position', 'Combat')
      .filter(e => (e.getComponent<Unit>('Unit')?.ownerId ?? 0) !== 0);

    for (const entity of aiUnits) {
      const unit = entity.getComponent<Unit>('Unit')!;
      const pos = entity.getComponent<Position>('Position')!;
      const combat = entity.getComponent<Combat>('Combat')!;

      // --- Retreat: health < 30% of max ---
      const health = entity.getComponent<Health>('Health');
      const currentHealth = health ? health.current : unit.health;
      const maxHealth = health ? health.max : unit.maxHealth;
      if (currentHealth < maxHealth * 0.3) {
        combat.targetId = null;
        const angle = Math.random() * Math.PI * 2;
        const retreatDist = 8;
        entity.addComponent(MoveTarget.at(
          pos.x + Math.cos(angle) * retreatDist,
          0,
          pos.z + Math.sin(angle) * retreatDist,
        ));
        continue;
      }

      // --- Find nearest player unit ---
      const playerUnits = this.world!.getEntitiesWithComponents('Unit', 'Position')
        .filter(e => (e.getComponent<Unit>('Unit')?.ownerId ?? 0) === 0);

      let nearest: { entity: Entity | undefined; dist: number } | null = null;
      for (const pu of playerUnits) {
        if (!pu.hasComponent('Health')) continue;
        const ppos = pu.getComponent<Position>('Position')!;
        const dist = Math.hypot(ppos.x - pos.x, ppos.z - pos.z);
        if (!nearest || dist < nearest.dist) {
          nearest = { entity: pu, dist };
        }
      }

      if (nearest && nearest.dist < 20) {
        // --- In combat range: set target and stop or move ---
        combat.targetId = nearest.entity?.id ?? null;
        const dist = nearest.dist;
        const attackRange = combat.range * 0.8;

        if (dist > attackRange) {
          // Move toward enemy
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
        } else {
          // In range: stop moving
          entity.addComponent(new MoveTarget(pos.x, 0, pos.z, true));
        }
      } else {
        // --- No nearby enemies: patrol/roam ---
        const angle = Math.random() * Math.PI * 2;
        const patrolDist = 5 + Math.random() * 10; // 5-15 units
        entity.addComponent(MoveTarget.at(
          pos.x + Math.cos(angle) * patrolDist,
          0,
          pos.z + Math.sin(angle) * patrolDist,
        ));
      }
    }
  }
}
