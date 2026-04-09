import { System } from '../core/ecs/System';
import { Researching } from '../components/Researching';
import { PlayerResources } from '../components/PlayerResources';

export class ResearchSystem extends System {
  readonly name = 'ResearchSystem';
  private playerResources: PlayerResources | null = null;

  setPlayerResources(resources: PlayerResources): void {
    this.playerResources = resources;
  }

  update(delta: number): void {
    if (!this.playerResources) return;

    const entities = this.world!.getEntitiesWithComponents('Researching');

    for (const entity of entities) {
      const researching = entity.getComponent<Researching>('Researching')!;
      const completed = researching.tick(delta);

      if (completed) {
        this.applyResearch(researching.techId);
        entity.removeComponent('Researching');
      }
    }
  }

  private applyResearch(techId: string): void {
    if (techId === 'warp_gate' && this.playerResources) {
      this.playerResources.hasWarpGate = true;
    }
  }
}
