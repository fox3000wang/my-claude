import { describe, it, expect } from 'vitest';
import { RallyPoint } from '../../src/components/RallyPoint';

describe('RallyPoint', () => {
  it('creates with position and enabled=true by default', () => {
    const rp = new RallyPoint(10, 0, 15);
    expect(rp.x).toBe(10);
    expect(rp.y).toBe(0);
    expect(rp.z).toBe(15);
    expect(rp.enabled).toBe(true);
  });

  it('creates with entity target', () => {
    const rp = new RallyPoint(5, 0, 5, 42);
    expect(rp.targetEntityId).toBe(42);
  });

  it('setPosition updates coordinates', () => {
    const rp = new RallyPoint(0, 0, 0);
    rp.setPosition(7, 0, 12);
    expect(rp.x).toBe(7);
    expect(rp.z).toBe(12);
  });

  it('disable clears entity target', () => {
    const rp = new RallyPoint(0, 0, 0, 5);
    rp.disable();
    expect(rp.enabled).toBe(false);
    expect(rp.targetEntityId).toBeNull();
  });

  it('static at() factory works', () => {
    const rp = RallyPoint.at(1, 0, 2);
    expect(rp.x).toBe(1);
    expect(rp.z).toBe(2);
    expect(rp.enabled).toBe(true);
  });
});
