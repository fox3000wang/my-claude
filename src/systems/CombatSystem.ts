import { System } from '../core/ecs/System';
import { Entity } from '../core/ecs/Entity';
import { Position } from '../components/Position';
import { Combat } from '../components/Combat';
import { Health } from '../components/Health';

export class CombatSystem extends System {
  readonly name = 'CombatSystem';

  update(delta: number): void {
    const combatants = this.world!.getEntitiesWithComponents('Combat', 'Position');

    for (const entity of combatants) {
      const combat = entity.getComponent<Combat>('Combat')!;
      combat.tickCooldown(delta);

      if (combat.targetId === null) continue;

      const target = this.world!.getEntity(combat.targetId);
      if (!target || !target.hasComponent('Health')) {
        combat.targetId = null;
        continue;
      }

      const targetPos = target.getComponent<Position>('Position')!;
      const selfPos = entity.getComponent<Position>('Position')!;
      const dist = Math.hypot(targetPos.x - selfPos.x, targetPos.z - selfPos.z);

      if (dist <= combat.range && combat.canAttack()) {
        this.performAttack(entity, target, combat);
        combat.resetCooldown();
      }
    }
  }

  private performAttack(attacker: Entity | undefined, target: Entity | undefined, combat: Combat): void {
    if (!attacker || !target) return;

    const targetHealth = target.getComponent<Health>('Health');
    const targetCombat = target.getComponent<Combat>('Combat');
    if (!targetHealth) return;

    const damage = Math.max(1, combat.attack - (targetCombat?.armor ?? 0));
    targetHealth.takeDamage(damage);

    if (targetHealth.isDead()) {
      this.world!.removeEntity(target.id);
      combat.targetId = null;
    }
  }
}
