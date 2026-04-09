import { Component } from '../core/ecs/Component';

export class Position extends Component {
  constructor(
    public x: number,
    public y: number,
    public z: number = 0,
  ) {
    super('Position');
  }
}
