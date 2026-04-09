import { System } from '../core/ecs/System';
import { Entity } from '../core/ecs/Entity';
import { TrainQueue } from '../components/TrainQueue';
import { Building } from '../components/Building';
import { Position } from '../components/Position';
import { Renderable } from '../components/Renderable';
import { Unit } from '../components/Unit';
import { Selected } from '../components/Selected';
import { PlayerResources } from '../components/PlayerResources';
import unitsData from '../data/units.json';

export class TrainingSystem extends System {
  readonly name = 'TrainingSystem';
  private _prevLengths = new Map<number, number>();
  private playerResources: PlayerResources | null = null;

  setPlayerResources(resources: PlayerResources): void {
    this.playerResources = resources;
  }

  update(delta: number): void {
    const buildings = this.world!.getEntitiesWithComponents('TrainQueue', 'Building', 'Position');

    for (const entity of buildings) {
      const queue = entity.getComponent<TrainQueue>('TrainQueue')!;
      const building = entity.getComponent<Building>('Building')!;

      if (building.isConstructing) continue;
      if (queue.isEmpty()) continue;

      const prevLen = this._prevLengths.get(entity.id) ?? queue.queue.length;
      queue.tick(delta);
      const newLen = queue.queue.length;

      if (newLen < prevLen) {
        const unitType = queue.queue[0] ?? 'marine';
        this.spawnUnit(entity, unitType);
      }

      this._prevLengths.set(entity.id, newLen);
    }
  }

  private spawnUnit(buildingEntity: Entity | undefined, unitType: string): void {
    if (!buildingEntity) return;

    const building = buildingEntity.getComponent<Building>('Building')!;
    if (building.spawns && building.larvae <= 0) {
      return; // Zerg spawning building — no larvae available
    }

    const pos = buildingEntity.getComponent<Position>('Position')!;
    const data = (unitsData as Record<string, unknown>)[unitType] as {
      health: number;
      maxHealth: number;
      cost: { minerals: number; supply: number };
    } | undefined;
    const health = data?.health ?? 40;
    const maxHealth = data?.maxHealth ?? 40;
    const mineralCost = data?.cost?.minerals ?? 0;
    const supplyCost = data?.cost?.supply ?? 0;

    if (this.playerResources) {
      if (!this.playerResources.spend(mineralCost)) return;
      this.playerResources.useSupply(supplyCost);
    }

    if (building.spawns) {
      building.larvae--;
    }

    const newEntity = this.world!.createEntity();
    newEntity.addComponent(new Position(pos.x + 3, 0, pos.z));
    newEntity.addComponent(new Renderable(`unit_${unitType}`, 1));
    newEntity.addComponent(new Unit(unitType as Unit['unitType'], health, maxHealth, 0));
    newEntity.addComponent(new Selected(false));
  }
}
