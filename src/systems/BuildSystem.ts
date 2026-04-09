import { System } from '../core/ecs/System';
import { Position } from '../components/Position';
import { Building } from '../components/Building';
import { PlayerResources } from '../components/PlayerResources';
import { Health } from '../components/Health';
import { Renderable } from '../components/Renderable';
import { Grid } from '../utils/grid';
import buildingsData from '../data/buildings.json';

const BUILD_TIME = 5; // 秒

export class BuildSystem extends System {
  readonly name = 'BuildSystem';
  private playerResources: PlayerResources | null = null;

  constructor(private grid: Grid) {
    super();
  }

  setPlayerResources(resources: PlayerResources): void {
    this.playerResources = resources;
  }

  private blockBuildingFootprint(buildingType: string, x: number, z: number): void {
    const data = (buildingsData as Record<string, { size: number }>)[buildingType];
    if (!data) return;

    const halfSize = Math.floor(data.size / 2);
    const minCell = this.grid.cellAt(x - halfSize - 0.5, 0, z - halfSize - 0.5);
    const maxCell = this.grid.cellAt(x + halfSize + 0.5, 0, z + halfSize + 0.5);

    for (let cx = minCell.x; cx <= maxCell.x; cx++) {
      for (let cz = minCell.z; cz <= maxCell.z; cz++) {
        this.grid.blockCell(cx, cz);
      }
    }
  }

  canPlaceBuilding(buildingType: string, x: number, z: number): boolean {
    const data = (buildingsData as Record<string, { size: number }>)[buildingType];
    if (!data) return false;

    const halfSize = Math.floor(data.size / 2);
    const minCell = this.grid.cellAt(x - halfSize - 0.5, 0, z - halfSize - 0.5);
    const maxCell = this.grid.cellAt(x + halfSize + 0.5, 0, z + halfSize + 0.5);

    for (let cx = minCell.x; cx <= maxCell.x; cx++) {
      for (let cz = minCell.z; cz <= maxCell.z; cz++) {
        if (!this.grid.isWalkable(cx, cz)) return false;
      }
    }
    return true;
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

        // Block grid cells occupied by the building footprint
        const pos = entity.getComponent<Position>('Position')!;
        this.blockBuildingFootprint(building.buildingType, pos.x, pos.z);
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
