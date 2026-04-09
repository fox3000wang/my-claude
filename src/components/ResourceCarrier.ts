import { Component } from '../core/ecs/Component';

export class ResourceCarrier extends Component {
  constructor(
    public carrying: number = 0,
    public capacity: number = 8,
    public depositTargetId: number | null = null,
    public mineralTargetId: number | null = null,
  ) {
    super('ResourceCarrier');
  }

  isFull(): boolean {
    return this.carrying >= this.capacity;
  }

  harvest(amount: number): void {
    this.carrying = Math.min(this.capacity, this.carrying + amount);
  }

  deposit(): number {
    const delivered = this.carrying;
    this.carrying = 0;
    return delivered;
  }
}
