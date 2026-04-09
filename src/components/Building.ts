import { Component } from '../core/ecs/Component';

export type BuildingType = 'command_center' | 'supply_depot' | 'barracks' | 'engineering_bay';

export class Building extends Component {
  constructor(
    public buildingType: BuildingType,
    public isConstructing: boolean = false,
    public constructingProgress: number = 0,
  ) {
    super('Building');
  }

  startConstruction(): void {
    this.isConstructing = true;
    this.constructingProgress = 0;
  }

  completeConstruction(): void {
    this.isConstructing = false;
    this.constructingProgress = 1;
  }
}
