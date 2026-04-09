import { Component } from '../core/ecs/Component';

export class Energy extends Component {
  constructor(
    public current: number,
    public max: number = 200,
    public regenRate: number = 0.7875,
  ) {
    super('Energy');
  }

  spend(amount: number): boolean {
    if (this.current < amount) return false;
    this.current -= amount;
    return true;
  }

  tick(delta: number): void {
    if (this.current < this.max) {
      this.current = Math.min(this.max, this.current + this.regenRate * delta);
    }
  }
}
