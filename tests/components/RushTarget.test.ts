import { describe, it, expect } from 'vitest';
import { RushTarget } from '../../src/components/RushTarget';

describe('RushTarget', () => {
  it('creates with null target and zero rally by default', () => {
    const rt = new RushTarget();
    expect(rt.targetEntityId).toBeNull();
    expect(rt.rallyX).toBe(0);
    expect(rt.rallyZ).toBe(0);
  });

  it('creates with specified target entity id', () => {
    const rt = new RushTarget(42);
    expect(rt.targetEntityId).toBe(42);
  });

  it('creates with specified rally coordinates', () => {
    const rt = new RushTarget(null, 10, 20);
    expect(rt.rallyX).toBe(10);
    expect(rt.rallyZ).toBe(20);
  });
});
