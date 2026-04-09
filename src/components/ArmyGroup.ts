import { Component } from '../core/ecs/Component';

export type ArmyGroupMode = 'idle' | 'attack' | 'defend' | 'retreat';

export interface UnitHealthRef {
  current: number;
  max: number;
}

export class ArmyGroup extends Component {
  unitIds: number[] = [];
  mode: ArmyGroupMode = 'idle';
  attackThreshold = 3;       // min strength before attacking
  retreatThreshold = 0.3;    // fraction of max strength below which to retreat
  rallyX = 0;
  rallyZ = 0;
  hasRallyPoint = false;

  constructor(public ownerId: number) {
    super('ArmyGroup');
  }

  addUnit(id: number): boolean {
    if (this.unitIds.includes(id)) return false;
    this.unitIds.push(id);
    return true;
  }

  removeUnit(id: number): void {
    const idx = this.unitIds.indexOf(id);
    if (idx !== -1) this.unitIds.splice(idx, 1);
  }

  setMode(mode: ArmyGroupMode): boolean {
    if (this.mode === mode) return false;
    this.mode = mode;
    return true;
  }

  setRallyPoint(x: number, z: number): void {
    this.rallyX = x;
    this.rallyZ = z;
    this.hasRallyPoint = true;
  }

  calcStrength(healths: UnitHealthRef[]): number {
    return healths.reduce((sum, h) => sum + (h.max > 0 ? h.current / h.max : 0), 0);
  }
}
