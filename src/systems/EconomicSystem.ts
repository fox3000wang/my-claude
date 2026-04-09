import { System } from '../core/ecs/System';
import { PlayerResources } from '../components/PlayerResources';
import { Building } from '../components/Building';
import { TrainQueue } from '../components/TrainQueue';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DECISION_INTERVAL = 5;    // seconds between decisions
const SUPPLY_BUFFER = 4;         // build supply when free ≤ this
const PRODUCTION_THRESHOLD = 20;  // expand production when supplyUsed > this
const TRAIN_QUEUE_TARGET = 3;     // target units per production queue
const WORKER_BUDGET = 0.2;       // fraction of queue reserved for workers

// ---------------------------------------------------------------------------
// Race Config
// ---------------------------------------------------------------------------
type RaceConfig = {
  supplyBuilding: { type: 'train' | 'build'; unitOrBuilding: string };
  productionBuilding: string;
  worker: string;
  armyRatios: { unit: string; ratio: number }[];
};

const RACE_CONFIG: Record<number, RaceConfig> = {
  1: { // Zerg
    supplyBuilding: { type: 'train', unitOrBuilding: 'overlord' },
    productionBuilding: 'spawning_pool',
    worker: 'drone',
    armyRatios: [
      { unit: 'zergling',  ratio: 0.70 },
      { unit: 'hydralisk', ratio: 0.20 },
      { unit: 'mutalisk',  ratio: 0.10 },
    ],
  },
  2: { // Protoss
    supplyBuilding: { type: 'build', unitOrBuilding: 'pylon' },
    productionBuilding: 'gateway',
    worker: 'probe',
    armyRatios: [
      { unit: 'zealot',       ratio: 0.40 },
      { unit: 'dragoon',      ratio: 0.35 },
      { unit: 'high_templar', ratio: 0.15 },
      { unit: 'dark_templar', ratio: 0.10 },
    ],
  },
};

// ---------------------------------------------------------------------------
// EconomicSystem
// ---------------------------------------------------------------------------
export class EconomicSystem extends System {
  readonly name = 'EconomicSystem';
  private decisionTimer = 0;
  private ownerResources = new Map<number, PlayerResources>();

  /** Exposed for testing */
  readonly pendingSupplyBuilding = new Set<number>();
  /** Exposed for testing */
  readonly pendingProductionBuilding = new Set<number>();

  setResourcesForOwner(ownerId: number, resources: PlayerResources): void {
    this.ownerResources.set(ownerId, resources);
  }

  update(delta: number): void {
    this.decisionTimer += delta;
    if (this.decisionTimer < DECISION_INTERVAL) return;
    this.decisionTimer = 0;

    for (const [ownerId, resources] of this.ownerResources) {
      this.runForOwner(ownerId, resources);
    }
  }

  private runForOwner(ownerId: number, resources: PlayerResources): void {
    const config = RACE_CONFIG[ownerId];
    if (!config) return;

    this.handleProduction(ownerId, resources, config);
    this.handleTraining(ownerId, resources, config);
    this.handleSupply(ownerId, resources, config);
  }

  // -------------------------------------------------------------------------
  // Supply
  // -------------------------------------------------------------------------
  private handleSupply(ownerId: number, resources: PlayerResources, config: RaceConfig): void {
    const supplyFree = resources.supplyMax - resources.supplyUsed;
    if (supplyFree > SUPPLY_BUFFER) return;
    if (this.supplyBuildingInProgress(ownerId, config)) return;

    if (config.supplyBuilding.type === 'train') {
      // Zerg supply (Overlord) is handled through handleTraining for hatcheries
      // Only Protoss uses pendingSupplyBuilding for build-type supply
      return;
    } else {
      this.pendingSupplyBuilding.add(ownerId);
    }
  }

  private supplyBuildingInProgress(ownerId: number, config: RaceConfig): boolean {
    if (config.supplyBuilding.type === 'train') {
      // Zerg: check if any Hatchery's TrainQueue already contains the supply unit
      const hatcheries = this.world!.getEntitiesWithComponents('Building', 'TrainQueue');
      for (const entity of hatcheries) {
        const building = entity.getComponent<Building>('Building')!;
        if (building.buildingType === 'hatchery') {
          const queue = entity.getComponent<TrainQueue>('TrainQueue')!;
          if (queue.queue.includes(config.supplyBuilding.unitOrBuilding)) {
            return true;
          }
        }
      }
      return false;
    } else {
      // Protoss: check if any Building entity has buildingType === pylon && isConstructing === true
      const buildings = this.world!.getEntitiesWithComponents('Building');
      for (const entity of buildings) {
        const building = entity.getComponent<Building>('Building')!;
        if (building.buildingType === config.supplyBuilding.unitOrBuilding && building.isConstructing) {
          return true;
        }
      }
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Production
  // -------------------------------------------------------------------------
  private handleProduction(ownerId: number, resources: PlayerResources, config: RaceConfig): void {
    // Check if any production buildings exist (not constructing)
    const allBuildings = this.world!.getEntitiesWithComponents('Building');

    const hasProductionBuilding = allBuildings.some(entity => {
      const building = entity.getComponent<Building>('Building')!;
      return building.buildingType === config.productionBuilding && !building.isConstructing;
    });

    if (!hasProductionBuilding) {
      this.pendingProductionBuilding.add(ownerId);
      return;
    }

    if (resources.supplyUsed > PRODUCTION_THRESHOLD) {
      // Check all production queues
      const productionQueues = this.world!.getEntitiesWithComponents('Building', 'TrainQueue');
      const anyQueueBelowTarget = productionQueues.some(entity => {
        const building = entity.getComponent<Building>('Building')!;
        if (building.buildingType === config.productionBuilding) {
          const queue = entity.getComponent<TrainQueue>('TrainQueue')!;
          return queue.queue.length < TRAIN_QUEUE_TARGET;
        }
        return false;
      });

      if (anyQueueBelowTarget) {
        this.pendingProductionBuilding.add(ownerId);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Training
  // -------------------------------------------------------------------------
  private handleTraining(ownerId: number, resources: PlayerResources, config: RaceConfig): void {
    const supplyFree = resources.supplyMax - resources.supplyUsed;

    // Handle hatcheries (Zerg only): overlords when supply is emergency, workers when economy is the priority
    if (config.supplyBuilding.type === 'train') {
      const hatcheries = this.world!.getEntitiesWithComponents('Building', 'TrainQueue', 'Position');
      for (const entity of hatcheries) {
        const building = entity.getComponent<Building>('Building')!;
        if (building.buildingType !== 'hatchery') continue;

        const queue = entity.getComponent<TrainQueue>('TrainQueue')!;

        if (queue.queue.length >= TRAIN_QUEUE_TARGET) continue;

        // Economy priority: if supply is exactly at max (free=0), build workers
        // Supply emergency: if free supply is positive but low, build overlords
        if (supplyFree === 0) {
          queue.queue.push(config.worker);
          return;
        }

        if (supplyFree > 0 && supplyFree <= SUPPLY_BUFFER) {
          if (!queue.queue.includes(config.supplyBuilding.unitOrBuilding)) {
            queue.queue.push(config.supplyBuilding.unitOrBuilding);
          }
          return;
        }

        // Normal economy phase (supplyUsed < PRODUCTION_THRESHOLD, free > SUPPLY_BUFFER)
        if (resources.supplyUsed < PRODUCTION_THRESHOLD) {
          queue.queue.push(config.worker);
          return;
        }

        // Phase 2: queue army + workers
        const slotsRemaining = TRAIN_QUEUE_TARGET - queue.queue.length;
        const workerSlots = Math.min(Math.ceil(WORKER_BUDGET * TRAIN_QUEUE_TARGET), slotsRemaining);
        const armySlots = slotsRemaining - workerSlots;

        for (let i = 0; i < armySlots; i++) {
          queue.queue.push(this.pickByRatio(config.armyRatios));
        }
        for (let i = 0; i < workerSlots; i++) {
          queue.queue.push(config.worker);
        }
        return;
      }
    }

    // Handle production buildings (gateway, spawning_pool): workers (phase 1) or army+workers (phase 2)
    const productionEntities = this.world!.getEntitiesWithComponents('Building', 'TrainQueue', 'Position');

    for (const entity of productionEntities) {
      const building = entity.getComponent<Building>('Building')!;
      if (building.buildingType !== config.productionBuilding) continue;

      const queue = entity.getComponent<TrainQueue>('TrainQueue')!;

      if (queue.queue.length >= TRAIN_QUEUE_TARGET) continue;

      const slotsRemaining = TRAIN_QUEUE_TARGET - queue.queue.length;

      if (resources.supplyUsed < PRODUCTION_THRESHOLD) {
        // Phase 1: workers only
        queue.queue.push(config.worker);
      } else {
        // Phase 2: mix of army + workers
        const workerSlots = Math.min(Math.ceil(WORKER_BUDGET * TRAIN_QUEUE_TARGET), slotsRemaining);
        const armySlots = slotsRemaining - workerSlots;

        // Fill armySlots with pickByRatio
        for (let i = 0; i < armySlots; i++) {
          queue.queue.push(this.pickByRatio(config.armyRatios));
        }

        // Fill remaining with worker
        for (let i = 0; i < workerSlots; i++) {
          queue.queue.push(config.worker);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------
  private pickByRatio(ratios: { unit: string; ratio: number }[]): string {
    const total = ratios.reduce((sum, r) => sum + r.ratio, 0);
    let random = Math.random() * total;
    for (const { unit, ratio } of ratios) {
      random -= ratio;
      if (random <= 0) return unit;
    }
    // Fallback to last (should not happen with valid ratios)
    return ratios[ratios.length - 1].unit;
  }
}
