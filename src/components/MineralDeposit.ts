import { Component } from '../core/ecs/Component';

export class MineralDeposit extends Component {
  constructor(
    public amount: number = 1500,
  ) {
    super('MineralDeposit');
  }
}
