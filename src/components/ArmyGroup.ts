import { Component } from '../core/ecs/Component';

export type ArmyGroupMode = 'idle' | 'attack' | 'defend' | 'retreat';

/** Shape of a unit's health snapshot, used for strength calculation. */
export interface UnitHealthRef {
  current: number;
  max: number;
}

export class ArmyGroup extends Component {
  /** IDs of units registered to this group */
  unitIds: number[] = [];

  /** Current group behavior mode */
  mode: ArmyGroupMode = 'idle';

  /**
   * Minimum combined strength before group will transition to 'attack'.
   * Strength = sum of (currentHealth / maxHealth) per unit, so a group
   * with 3 full-health units has strength = 3.0 and will attack.
   */
  attackThreshold = 3;

  /**
   * Fraction of maximum possible strength below which the group retreats.
   * Calculated as groupStrength / unitIds.length.
   * Default 0.3 means the group retreats when average unit health drops below 30%.
   */
  retreatThreshold = 0.3;

  /** Rally point X coordinate */
  rallyX = 0;

  /** Rally point Z coordinate */
  rallyZ = 0;

  /** Whether a rally point has been set */
  hasRallyPoint = false;

  constructor(public ownerId: number) {
    super('ArmyGroup');
  }

  /** Adds a unit ID; returns true only if it was newly added (not a duplicate). */
  addUnit(id: number): boolean {
    if (this.unitIds.includes(id)) return false;
    this.unitIds.push(id);
    return true;
  }

  /** Removes a unit ID from the group. */
  removeUnit(id: number): void {
    this.unitIds = this.unitIds.filter(uid => uid !== id);
  }

  /** Sets the group mode; returns true only if the mode actually changed. */
  setMode(mode: ArmyGroupMode): boolean {
    if (this.mode === mode) return false;
    this.mode = mode;
    return true;
  }

  /** Sets the rally point coordinates. */
  setRallyPoint(x: number, z: number): void {
    this.rallyX = x;
    this.rallyZ = z;
    this.hasRallyPoint = true;
  }

  /**
   * Calculates combined army strength as the sum of (currentHealth / maxHealth)
   * for each unit. A full-health unit contributes 1.0; a unit at 50% health
   * contributes 0.5. Dead or invalid units contribute 0.
   */
  calcStrength(healths: UnitHealthRef[]): number {
    return healths.reduce((sum, h) => sum + (h.max > 0 ? h.current / h.max : 0), 0);
  }
}
