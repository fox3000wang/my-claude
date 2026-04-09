import { Component } from '../core/ecs/Component';

export class PlayerResources extends Component {
  constructor(
    public minerals: number = 400,
    public supplyUsed: number = 0,
    public supplyMax: number = 10,
    public hasWarpGate: boolean = false,
  ) {
    super('PlayerResources');
  }

  spend(minerals: number): boolean {
    if (this.minerals < minerals) return false;
    this.minerals -= minerals;
    return true;
  }

  addMinerals(amount: number): void {
    this.minerals += amount;
  }

  canAfford(minerals: number, supply: number): boolean {
    return this.minerals >= minerals && (this.supplyUsed + supply) <= this.supplyMax;
  }

  useSupply(amount: number): void {
    this.supplyUsed += amount;
  }
}
