import { Component } from '../core/ecs/Component';

export type BuildingType = 'command_center' | 'supply_depot' | 'barracks' | 'engineering_bay'
  | 'hatchery' | 'spawning_pool' | 'hydralisk_den' | 'spire' | 'extractor'
  | 'nexus' | 'pylon' | 'gateway' | 'cybernetics_core' | 'forge' | 'stargate'
  | 'templar_archives' | 'photon_cannon';

export class Building extends Component {
  constructor(
    public buildingType: BuildingType,
    public isConstructing: boolean = false,
    public constructingProgress: number = 0,
    public larvae: number = 0,
    public spawns?: string[],
    public unlocks?: string[],
    public energy: number = 0,
    public maxEnergy: number = 0,
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
