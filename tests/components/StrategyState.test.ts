import { describe, it, expect } from 'vitest';
import { StrategyState } from '../../src/components/StrategyState';

describe('StrategyState', () => {
  it('creates with default rush phase', () => {
    const s = new StrategyState();
    expect(s.phase).toBe('rush');
    expect(s.hasTriggeredHarass).toBe(false);
  });

  it('creates with specified phase', () => {
    const s = new StrategyState('timing');
    expect(s.phase).toBe('timing');
  });

  it('hasTriggeredHarass defaults to false', () => {
    const s = new StrategyState('harass');
    expect(s.hasTriggeredHarass).toBe(false);
  });

  it('can set rushStartTime', () => {
    const s = new StrategyState('rush', 42);
    expect(s.rushStartTime).toBe(42);
  });
});
