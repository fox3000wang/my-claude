import { Component } from '../core/ecs/Component';

export class MoveTarget extends Component {
  constructor(
    public x: number,
    public y: number,
    public z: number,
    public arrived: boolean = false,
  ) {
    super('MoveTarget');
  }

  static at(x: number, y: number, z: number = 0): MoveTarget {
    return new MoveTarget(x, y, z, false);
  }
}
