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

    this.handleSupply(ownerId, resources, config);
    this.handleProduction(ownerId, resources, config);
    this.handleTraining(ownerId, resources, config);
  }

  // -------------------------------------------------------------------------
  // Supply
  // -------------------------------------------------------------------------
  private handleSupply(ownerId: number, resources: PlayerResources, config: RaceConfig): void {
    const supplyFree = resources.supplyMax - resources.supplyUsed;
    if (supplyFree > SUPPLY_BUFFER) return;
    if (this.supplyBuildingInProgress(ownerId, config)) return;

    if (config.supplyBuilding.type === 'train') {
      this.queueSupplyTrain(ownerId, config.supplyBuilding.unitOrBuilding);
    } else {
      this.pendingSupplyBuilding.add(ownerId);
    }
  }

  /** Queue a Zerg supply unit (Overlord) on an available Hatchery.
   *  Only called in phase 2 from handleSupply.
   *  Guarded to only add if not already in queue (prevents double-queue). */
  private queueSupplyTrain(ownerId: number, unit: string): void {
    const resources = this.ownerResources.get(ownerId);
    // Only queue overlords in phase 2 so economy-building in phase 1 is not overridden
    if (!resources || resources.supplyUsed < PRODUCTION_THRESHOLD) return;

    const hatcheries = this.world!.getEntitiesWithComponents('Building', 'TrainQueue', 'Position');
    for (const entity of hatcheries) {
      const building = entity.getComponent<Building>('Building')!;
      if (building.buildingType === 'hatchery') {
        const queue = entity.getComponent<TrainQueue>('TrainQueue')!;
        if (queue.queue.length < TRAIN_QUEUE_TARGET && !queue.queue.includes(unit)) {
          queue.queue.push(unit);
          return;
        }
      }
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
      // Check all production queues (includes hatchery for Zerg, gateway for Protoss)
      const productionQueues = this.world!.getEntitiesWithComponents('Building', 'TrainQueue');
      const anyQueueBelowTarget = productionQueues.some(entity => {
        const building = entity.getComponent<Building>('Building')!;
        if (
          building.buildingType === config.productionBuilding ||
          (ownerId === 1 && building.buildingType === 'hatchery') ||
          (ownerId === 2 && building.buildingType === 'gateway')
        ) {
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
    const isPhase1 = resources.supplyUsed < PRODUCTION_THRESHOLD;

    // Hatchery block (Zerg only):
    // - Phase 1: supply conditions (priority over phase conditions) + workers
    // - Phase 2: army (the duplicate overlord/overlord logic removed per SPEC;
    //   hatching pools in phase 2 are handled here; spawning pools are NOT)
    if (config.supplyBuilding.type === 'train') {
      const supplyFree = resources.supplyMax - resources.supplyUsed;

      const hatcheries = this.world!.getEntitiesWithComponents('Building', 'TrainQueue', 'Position');
      for (const entity of hatcheries) {
        const building = entity.getComponent<Building>('Building')!;
        if (building.buildingType !== 'hatchery') continue;

        const queue = entity.getComponent<TrainQueue>('TrainQueue')!;
        if (queue.queue.length >= TRAIN_QUEUE_TARGET) continue;

        if (isPhase1) {
          // Supply conditions: take priority over phase conditions
          if (supplyFree === 0) {
            queue.queue.push(config.worker);
            return;
          }
          if (supplyFree > 0 && supplyFree <= SUPPLY_BUFFER) {
            // Only queue if not already in queue (matches queueSupplyTrain guard)
            if (!queue.queue.includes(config.supplyBuilding.unitOrBuilding)) {
              queue.queue.push(config.supplyBuilding.unitOrBuilding);
            }
            return;
          }
          // Phase 1: workers only
          queue.queue.push(config.worker);
        } else {
          // Phase 2: army on hatching pools
          const slotsRemaining = TRAIN_QUEUE_TARGET - queue.queue.length;
          for (let i = 0; i < slotsRemaining; i++) {
            queue.queue.push(this.pickByRatio(config.armyRatios));
          }
        }
        return;
      }
    }

    // Spawning pool / gateway block: workers in phase 1, workers in phase 2
    // (hatcheries in phase 2 are handled by the hatching block above)
    const productionEntities = this.world!.getEntitiesWithComponents('Building', 'TrainQueue', 'Position');

    for (const entity of productionEntities) {
      const building = entity.getComponent<Building>('Building')!;
      if (building.buildingType !== config.productionBuilding) continue;
      // Skip hatching pools in phase 2 (handled by hatching block above)
      if (!isPhase1 && building.buildingType === 'hatchery') continue;

      const queue = entity.getComponent<TrainQueue>('TrainQueue')!;
      if (queue.queue.length >= TRAIN_QUEUE_TARGET) continue;

      const slotsRemaining = TRAIN_QUEUE_TARGET - queue.queue.length;

      if (isPhase1) {
        // Phase 1: workers only
        queue.queue.push(config.worker);
      } else {
        // Phase 2: workers (spawning pools can't produce army without tech;
        // hatching pools skipped above so they don't double-queue with hatching block)
        for (let i = 0; i < slotsRemaining; i++) {
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
