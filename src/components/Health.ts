import { Component } from '../core/ecs/Component';

export class Health extends Component {
  constructor(
    public current: number,
    public max: number,
  ) {
    super('Health');
  }

  isDead(): boolean {
    return this.current <= 0;
  }

  takeDamage(amount: number): void {
    this.current = Math.max(0, this.current - amount);
  }

  heal(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);
  }
}
