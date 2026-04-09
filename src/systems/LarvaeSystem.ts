import { System } from '../core/ecs/System';
import { Building } from '../components/Building';

const LARVAE_REGEN_INTERVAL = 15; // seconds
const MAX_LARVAE = 2;

export class LarvaeSystem extends System {
  readonly name = 'LarvaeSystem';
  private timer = 0;

  update(delta: number): void {
    this.timer += delta;
    if (this.timer < LARVAE_REGEN_INTERVAL) return;
    this.timer = 0;

    const buildings = this.world!.getEntitiesWithComponents('Building');
    for (const entity of buildings) {
      const building = entity.getComponent<Building>('Building')!;
      if (building.spawns && building.larvae < MAX_LARVAE) {
        building.larvae++;
      }
    }
  }
}
