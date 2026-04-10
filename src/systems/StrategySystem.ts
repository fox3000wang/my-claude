import { System } from '../core/ecs/System';
import { StrategyState } from '../components/StrategyState';
import type { Entity } from '../core/ecs/Entity';

/** Rush phase duration: 3 minutes = 180 seconds */
const RUSH_END = 180;
/** Timing phase duration: 8 minutes total = 480 seconds */
const TIMING_END = 480;
/** How often (in seconds) to re-evaluate strategy phase */
const DECISION_INTERVAL = 10;

export class StrategySystem extends System {
  readonly name = 'StrategySystem';
  /** Accumulated elapsed time since system creation (tracks game time) */
  private elapsedTime = 0;
  private decisionTimer = 0;

  update(delta: number): void {
    this.elapsedTime += delta;
    this.decisionTimer += delta;
    if (this.decisionTimer < DECISION_INTERVAL) return;
    this.decisionTimer = 0;

    const groups = this.world!.getEntitiesWithComponents('ArmyGroup', 'StrategyState');
    for (const entity of groups) {
      this.updatePhase(entity, this.elapsedTime);
    }
  }

  private updatePhase(entity: Entity, elapsed: number): void {
    const state = entity.getComponent<StrategyState>('StrategyState')!;

    if (elapsed < RUSH_END) {
      state.phase = 'rush';
    } else if (elapsed < TIMING_END) {
      state.phase = 'timing';
    } else {
      state.phase = 'harass';
      state.hasTriggeredHarass = true;
    }
  }
}
