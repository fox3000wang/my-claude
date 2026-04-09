import { System } from '../core/ecs/System';
import { Position } from '../components/Position';
import { Building } from '../components/Building';
import { PlayerResources } from '../components/PlayerResources';
import { Health } from '../components/Health';
import { Renderable } from '../components/Renderable';
import buildingsData from '../data/buildings.json';

const BUILD_TIME = 5; // 秒

export class BuildSystem extends System {
  readonly name = 'BuildSystem';
  private playerResources: PlayerResources | null = null;

  setPlayerResources(resources: PlayerResources): void {
    this.playerResources = resources;
  }

  update(delta: number): void {
    const buildings = this.world!.getEntitiesWithComponents('Building');

    for (const entity of buildings) {
      const building = entity.getComponent<Building>('Building')!;
      if (!building.isConstructing) continue;

      building.constructingProgress += delta / BUILD_TIME;
      if (building.constructingProgress >= 1) {
        building.completeConstruction();
        if (!entity.hasComponent('Health')) {
          const data = (buildingsData as Record<string, unknown>)[building.buildingType] as {
            health: number;
          } | undefined;
          if (data) {
            entity.addComponent(new Health(data.health, data.health));
          }
        }
      }
    }
  }

  placeBuilding(
    buildingType: string,
    x: number,
    z: number,
  ): boolean {
    const data = (buildingsData as Record<string, unknown>)[buildingType] as {
      cost: { minerals: number };
      supply: number;
    } | undefined;
    if (!data || !this.playerResources) return false;

    if (!this.playerResources.canAfford(data.cost.minerals, data.supply)) return false;

    this.playerResources.spend(data.cost.minerals);
    this.playerResources.useSupply(data.supply);

    const entity = this.world!.createEntity();
    entity.addComponent(new Position(x, 0, z));
    entity.addComponent(new Building(buildingType as Building['buildingType'], true, 0));
    entity.addComponent(new Renderable(`building_${buildingType}`, 1));
    return true;
  }
}
