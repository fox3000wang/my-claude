import { Component } from '../core/ecs/Component';

export class RushTarget extends Component {
  constructor(
    public targetEntityId: number | null = null,
    public rallyX: number = 0,
    public rallyZ: number = 0,
  ) {
    super('RushTarget');
  }
}
