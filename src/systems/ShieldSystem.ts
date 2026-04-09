import { System } from '../core/ecs/System';
import { Shield } from '../components/Shield';

export class ShieldSystem extends System {
  readonly name = 'ShieldSystem';

  update(delta: number): void {
    const entities = this.world!.getEntitiesWithComponents('Shield');

    for (const entity of entities) {
      const shield = entity.getComponent<Shield>('Shield')!;

      // Tick the regen delay timer
      const isRegenerating = shield.tickRegenTimer(delta);

      if (isRegenerating) {
        shield.regenerate(delta);
      }
    }
  }
}
