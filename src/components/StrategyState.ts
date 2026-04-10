import { Component } from '../core/ecs/Component';

export type StrategyPhase = 'rush' | 'timing' | 'harass';

export class StrategyState extends Component {
  constructor(
    public phase: StrategyPhase = 'rush',
    public rushStartTime: number = 0,
    public hasTriggeredHarass: boolean = false,
  ) {
    super('StrategyState');
  }
}
