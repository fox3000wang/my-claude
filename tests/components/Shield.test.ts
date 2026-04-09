import { describe, it, expect } from 'vitest';
import { Shield } from '../../src/components/Shield';

describe('Shield', () => {
  it('absorbs damage up to current shield', () => {
    const shield = new Shield(50, 50);
    const overflow = shield.takeDamage(30);
    expect(overflow).toBe(0);
    expect(shield.current).toBe(20);
  });

  it('passes overflow damage to caller when depleted', () => {
    const shield = new Shield(50, 50);
    const overflow = shield.takeDamage(70);
    expect(overflow).toBe(20);
    expect(shield.current).toBe(0);
  });

  it('regenerates over time', () => {
    const shield = new Shield(20, 50, 2.0); // 2 HP/sec
    shield.regenerate(5); // 5 seconds
    expect(shield.current).toBe(30); // 20 + 2*5 = 30
  });

  it('regen delay timer counts down', () => {
    const shield = new Shield(50, 50, 2.0, 4.0);
    shield.startRegenTimer();
    expect(shield.tickRegenTimer(2)).toBe(false); // still waiting
    expect(shield.tickRegenTimer(3)).toBe(true);  // timer expired
  });

  it('starts regen timer when damaged', () => {
    const shield = new Shield(50, 50, 2.0, 4.0);
    shield.takeDamage(10);
    expect(shield.regenDelayTimer).toBe(4.0);
  });
});
