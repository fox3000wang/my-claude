import { describe, it, expect } from 'vitest';
import { Energy } from '../../src/components/Energy';

describe('Energy', () => {
  it('regenerates energy over time', () => {
    const energy = new Energy(50, 200, 0.7875);
    energy.tick(10); // 0.7875 * 10 = 7.875
    expect(energy.current).toBeCloseTo(57.875, 2);
  });

  it('caps at max energy', () => {
    const energy = new Energy(195, 200, 0.7875);
    energy.tick(10); // would add 7.875, capped to 200
    expect(energy.current).toBe(200);
  });

  it('spends energy when sufficient', () => {
    const energy = new Energy(100, 200);
    const success = energy.spend(50);
    expect(success).toBe(true);
    expect(energy.current).toBe(50);
  });

  it('rejects spending more than available', () => {
    const energy = new Energy(30, 200);
    const success = energy.spend(50);
    expect(success).toBe(false);
    expect(energy.current).toBe(30); // unchanged
  });

  it('does not regenerate when at max', () => {
    const energy = new Energy(200, 200, 1.0);
    energy.tick(5);
    expect(energy.current).toBe(200);
  });
});
