import { Component } from '../core/ecs/Component';

export type UnitType = 'scv' | 'marine' | 'firebat' | 'tank'
  | 'drone' | 'zergling' | 'hydralisk' | 'mutalisk' | 'overlord';

export class Unit extends Component {
  constructor(
    public unitType: UnitType,
    public health: number,
    public maxHealth: number,
    public ownerId: number = 0,
  ) {
    super('Unit');
  }
}
