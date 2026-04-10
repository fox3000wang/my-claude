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
  private ownerResources = new Map<number, PlayerResources>();

  constructor(private grid: Grid) {
    super();
  }

  setPlayerResources(resources: PlayerResources): void {
    this.playerResources = resources;
  }

  setResourcesForOwner(ownerId: number, resources: PlayerResources): void {
    this.ownerResources.set(ownerId, resources);
  }

  private getFootprintCells(
    buildingType: string,
    x: number,
    z: number,
  ): { minCX: number; maxCX: number; minCZ: number; maxCZ: number } | null {
    const data = (buildingsData as Record<string, { size: number }>)[buildingType];
    if (!data) return null;

    const halfSize = data.size / 2; // floating point: 1.5 for size=3, 1.0 for size=2
    // Compute the exclusive upper world boundary in integer space before flooring,
    // avoiding floating-point rounding errors (e.g. 5 + 1.5 = 6.5 exactly, not 6.499...)
    const maxWorldX = Math.floor(x + halfSize) - 1e-9;
    const maxWorldZ = Math.floor(z + halfSize) - 1e-9;
    const minCX = this.grid.cellAt(x - halfSize, 0, z - halfSize).x;
    const maxCX = this.grid.cellAt(maxWorldX, 0, maxWorldZ).x;
    const minCZ = this.grid.cellAt(x - halfSize, 0, z - halfSize).z;
    const maxCZ = this.grid.cellAt(maxWorldX, 0, maxWorldZ).z;
    return { minCX, maxCX, minCZ, maxCZ };
  }

  private blockBuildingFootprint(buildingType: string, x: number, z: number): void {
    const cells = this.getFootprintCells(buildingType, x, z);
    if (!cells) return;

    for (let cx = cells.minCX; cx <= cells.maxCX; cx++) {
      for (let cz = cells.minCZ; cz <= cells.maxCZ; cz++) {
        this.grid.blockCell(cx, cz);
      }
    }
  }

  canPlaceBuilding(buildingType: string, x: number, z: number): boolean {
    const data = (buildingsData as Record<string, { size: number }>)[buildingType];
    if (!data) return false;

    const cells = this.getFootprintCells(buildingType, x, z);
    if (!cells) return false;

    for (let cx = cells.minCX; cx <= cells.maxCX; cx++) {
      for (let cz = cells.minCZ; cz <= cells.maxCZ; cz++) {
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
    ownerId: number = 0,
  ): boolean {
    const data = (buildingsData as Record<string, unknown>)[buildingType] as {
      cost: { minerals: number };
      supply: number;
    } | undefined;
    const resources =
      ownerId === 0
        ? this.playerResources
        : this.ownerResources.get(ownerId) ?? null;
    if (!data || !resources) return false;

    if (!this.canPlaceBuilding(buildingType, x, z)) return false;
    if (!resources.canAfford(data.cost.minerals, data.supply)) return false;

    resources.spend(data.cost.minerals);
    if (data.supply < 0) {
      resources.supplyMax += Math.abs(data.supply);
    } else {
      resources.useSupply(data.supply);
    }

    const entity = this.world!.createEntity();
    entity.addComponent(new Position(x, 0, z));
    entity.addComponent(new Building(buildingType as Building['buildingType'], true, 0, 0, undefined, undefined, 0, 0, ownerId));
    entity.addComponent(new Renderable(`building_${buildingType}`, 1));
    return true;
  }
}
