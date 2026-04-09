import { Component } from '../core/ecs/Component';

export class Combat extends Component {
  public cooldownTimer = 0;

  constructor(
    public attack: number,
    public armor: number,
    public range: number,
    public cooldown: number,
    public targetId: number | null = null,
  ) {
    super('Combat');
  }

  canAttack(): boolean {
    return this.cooldownTimer <= 0 && this.targetId !== null;
  }

  tickCooldown(delta: number): void {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= delta;
    }
  }

  resetCooldown(): void {
    this.cooldownTimer = this.cooldown;
  }
}
