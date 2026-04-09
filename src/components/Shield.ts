import { Component } from '../core/ecs/Component';

export class Shield extends Component {
  public regenDelayTimer: number;

  constructor(
    public current: number,
    public max: number,
    public regenRate: number = 2.0,
    public regenDelay: number = 4.0,
  ) {
    super('Shield');
    this.regenDelayTimer = 0;
  }

  takeDamage(amount: number): number {
    // Returns overflow damage that passes through to health
    this.startRegenTimer();
    if (amount <= this.current) {
      this.current = Math.max(0, this.current - amount);
      return 0;
    }
    const overflow = amount - this.current;
    this.current = 0;
    return overflow;
  }

  regenerate(delta: number): void {
    if (this.current < this.max) {
      this.current = Math.min(this.max, this.current + this.regenRate * delta);
    }
  }

  startRegenTimer(): void {
    this.regenDelayTimer = this.regenDelay;
  }

  tickRegenTimer(delta: number): boolean {
    // Returns true if regenerating (timer expired)
    if (this.regenDelayTimer > 0) {
      this.regenDelayTimer -= delta;
      if (this.regenDelayTimer <= 0) {
        this.regenDelayTimer = 0;
        return true;
      }
      return false;
    }
    return true;
  }
}
