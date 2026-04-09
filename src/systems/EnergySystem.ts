import { System } from '../core/ecs/System';
import { Energy } from '../components/Energy';

export class EnergySystem extends System {
  readonly name = 'EnergySystem';

  update(delta: number): void {
    const entities = this.world!.getEntitiesWithComponents('Energy');

    for (const entity of entities) {
      const energy = entity.getComponent<Energy>('Energy')!;
      energy.tick(delta);
    }
  }
}
