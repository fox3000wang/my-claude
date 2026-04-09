import { Component } from '../core/ecs/Component';

export class RallyPoint extends Component {
  constructor(
    public x: number,
    public y: number,
    public z: number,
    public targetEntityId: number | null = null,
    public enabled: boolean = true,
  ) {
    super('RallyPoint');
  }

  setPosition(x: number, y: number, z: number): void {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  disable(): void {
    this.enabled = false;
    this.targetEntityId = null;
  }

  static at(x: number, y: number, z: number): RallyPoint {
    return new RallyPoint(x, y, z);
  }
}
