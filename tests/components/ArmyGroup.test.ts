import { describe, it, expect } from 'vitest';
import { ArmyGroup } from '../../src/components/ArmyGroup';

describe('ArmyGroup', () => {
  it('creates with ownerId and defaults', () => {
    const ag = new ArmyGroup(1);
    expect(ag.ownerId).toBe(1);
    expect(ag.mode).toBe('idle');
    expect(ag.unitIds).toEqual([]);
    expect(ag.attackThreshold).toBe(3);
    expect(ag.retreatThreshold).toBe(0.3);
    expect(ag.rallyX).toBe(0);
    expect(ag.rallyZ).toBe(0);
  });

  it('addUnit deduplicates and returns true only if new', () => {
    const ag = new ArmyGroup(1);
    expect(ag.addUnit(5)).toBe(true);
    expect(ag.addUnit(5)).toBe(false); // duplicate
    expect(ag.unitIds).toEqual([5]);
  });

  it('removeUnit splices correctly', () => {
    const ag = new ArmyGroup(1);
    ag.addUnit(1);
    ag.addUnit(2);
    ag.addUnit(3);
    ag.removeUnit(2);
    expect(ag.unitIds).toEqual([1, 3]);
  });

  it('setMode returns true only on change', () => {
    const ag = new ArmyGroup(1);
    expect(ag.setMode('attack')).toBe(true);
    expect(ag.mode).toBe('attack');
    expect(ag.setMode('attack')).toBe(false); // no change
  });

  it('strength calculations are correct', () => {
    const ag = new ArmyGroup(1);
    ag.addUnit(1);
    ag.addUnit(2);
    // 1 full-health unit, 1 half-health unit = 1.0 + 0.5 = 1.5
    const strength = ag.calcStrength([
      { current: 50, max: 50 },
      { current: 50, max: 100 },
    ]);
    expect(strength).toBe(1.5);
  });
});
