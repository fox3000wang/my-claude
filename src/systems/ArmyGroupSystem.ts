import { System } from '../core/ecs/System';
import { ArmyGroup } from '../components/ArmyGroup';
import { Unit } from '../components/Unit';
import { Position } from '../components/Position';
import { Combat } from '../components/Combat';
import { Health } from '../components/Health';
import { MoveTarget } from '../components/MoveTarget';
import type { Entity } from '../core/ecs/Entity';

/** How close an enemy must be (in world units) before group reacts */
const DETECTION_RANGE = 30;

/** How close members must be to rally point before considered arrived */
const RALLY_ARRIVED_DIST = 2;

export class ArmyGroupSystem extends System {
  readonly name = 'ArmyGroupSystem';

  update(_delta: number): void {
    const groups = this.world!.getEntitiesWithComponents('ArmyGroup');

    for (const groupEntity of groups) {
      const group = groupEntity.getComponent<ArmyGroup>('ArmyGroup')!;
      if (group.unitIds.length === 0) continue;

      const center = this.calcCenter(group);
      const groupStrength = this.calcGroupStrength(group);
      const maxStrength = group.unitIds.length;

      const nearestEnemy = this.findNearestEnemy(center, group.ownerId);

      if (nearestEnemy) {
        const dist = nearestEnemy.dist;

        if (groupStrength / maxStrength < group.retreatThreshold) {
          this.setGroupMode(group, 'retreat', nearestEnemy.pos);
        } else if (dist < DETECTION_RANGE && groupStrength >= group.attackThreshold) {
          this.setGroupMode(group, 'attack', nearestEnemy.pos);
        } else if (dist < DETECTION_RANGE) {
          this.setGroupMode(group, 'defend', null);
        } else if (group.mode === 'attack' || group.mode === 'defend') {
          this.setGroupMode(group, 'idle', null);
        }
      } else if (group.mode !== 'idle') {
        this.sendToRally(group);
        this.setGroupMode(group, 'idle', null);
      }

      this.applyModeToMembers(group);
    }
  }

  private calcCenter(group: ArmyGroup): { x: number; z: number } {
    let sx = 0, sz = 0, count = 0;
    for (const uid of group.unitIds) {
      const e = this.world!.getEntity(uid);
      if (!e) continue;
      const pos = e.getComponent<Position>('Position');
      if (!pos) continue;
      sx += pos.x;
      sz += pos.z;
      count++;
    }
    return count > 0 ? { x: sx / count, z: sz / count } : { x: 0, z: 0 };
  }

  private calcGroupStrength(group: ArmyGroup): number {
    const healths = group.unitIds
      .map(uid => this.world!.getEntity(uid))
      .filter(e => e != null)
      .map(e => {
        const h = e!.getComponent<Health>('Health');
        return { current: h?.current ?? 100, max: h?.max ?? 100 };
      });
    return group.calcStrength(healths);
  }

  private findNearestEnemy(
    center: { x: number; z: number },
    ownerId: number,
  ): { entity: Entity | undefined; dist: number; pos: { x: number; z: number } } | null {
    let nearest: Entity | undefined = undefined;
    let minDist = Infinity;
    let nearestPos: { x: number; z: number } | null = null;

    const enemies = this.world!.getEntitiesWithComponents('Unit', 'Position')
      .filter(e => (e.getComponent<Unit>('Unit')?.ownerId ?? 0) !== ownerId);

    for (const e of enemies) {
      const pos = e.getComponent<Position>('Position')!;
      const dist = Math.hypot(pos.x - center.x, pos.z - center.z);
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
        nearestPos = { x: pos.x, z: pos.z };
      }
    }

    return nearest && nearestPos ? { entity: nearest, dist: minDist, pos: nearestPos } : null;
  }

  private setGroupMode(group: ArmyGroup, mode: ArmyGroup['mode'], _targetPos: { x: number; z: number } | null): void {
    group.setMode(mode);
  }

  private sendToRally(group: ArmyGroup): void {
    if (!group.hasRallyPoint) return;
    for (const uid of group.unitIds) {
      const e = this.world!.getEntity(uid);
      if (!e) continue;
      const pos = e.getComponent<Position>('Position');
      if (!pos) continue;
      const dist = Math.hypot(pos.x - group.rallyX, pos.z - group.rallyZ);
      if (dist > RALLY_ARRIVED_DIST) {
        if (e.hasComponent('MoveTarget')) {
          const mt = e.getComponent<MoveTarget>('MoveTarget')!;
          mt.x = group.rallyX;
          mt.z = group.rallyZ;
          mt.arrived = false;
        } else {
          e.addComponent(MoveTarget.at(group.rallyX, 0, group.rallyZ));
        }
      }
    }
  }

  private applyModeToMembers(group: ArmyGroup): void {
    for (const uid of group.unitIds) {
      const e = this.world!.getEntity(uid);
      if (!e) continue;

      if (group.mode === 'retreat') {
        if (group.hasRallyPoint) {
          if (e.hasComponent('MoveTarget')) {
            const mt = e.getComponent<MoveTarget>('MoveTarget')!;
            mt.x = group.rallyX;
            mt.z = group.rallyZ;
            mt.arrived = false;
          } else {
            e.addComponent(MoveTarget.at(group.rallyX, 0, group.rallyZ));
          }
        }
        const combat = e.getComponent<Combat>('Combat');
        if (combat) combat.targetId = null;
      } else if (group.mode === 'attack') {
        const pos = e.getComponent<Position>('Position')!;
        const enemy = this.findNearestEnemy({ x: pos.x, z: pos.z }, group.ownerId);
        if (enemy && enemy.dist > 4) {
          const dx = enemy.pos.x - pos.x;
          const dz = enemy.pos.z - pos.z;
          const len = Math.hypot(dx, dz);
          if (len > 0) {
            if (e.hasComponent('MoveTarget')) {
              const mt = e.getComponent<MoveTarget>('MoveTarget')!;
              mt.x = pos.x + (dx / len) * 3;
              mt.z = pos.z + (dz / len) * 3;
              mt.arrived = false;
            } else {
              e.addComponent(MoveTarget.at(pos.x + (dx / len) * 3, 0, pos.z + (dz / len) * 3));
            }
          }
        }
      } else if (group.mode === 'idle') {
        if (group.hasRallyPoint) {
          const pos = e.getComponent<Position>('Position')!;
          const dist = Math.hypot(pos.x - group.rallyX, pos.z - group.rallyZ);
          if (dist > RALLY_ARRIVED_DIST) {
            e.addComponent(MoveTarget.at(group.rallyX, 0, group.rallyZ));
          }
        }
      }
    }
  }
}
