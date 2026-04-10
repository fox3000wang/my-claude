import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../src/core/ecs/World';
import { StrategySystem } from '../../src/systems/StrategySystem';
import { ArmyGroup } from '../../src/components/ArmyGroup';
import { StrategyState } from '../../src/components/StrategyState';

describe('StrategySystem', () => {
  let world: World;
  let system: StrategySystem;

  beforeEach(() => {
    world = new World();
    system = new StrategySystem();
    world.addSystem(system);
  });

  it('keeps rush phase for first 180 seconds', () => {
    const e = world.createEntity();
    e.addComponent(new ArmyGroup(1));
    e.addComponent(new StrategyState());

    world.update(90); // 90 seconds = still in rush

    const state = e.getComponent<StrategyState>('StrategyState')!;
    expect(state.phase).toBe('rush');
  });

  it('transitions to timing after 180 seconds', () => {
    const e = world.createEntity();
    e.addComponent(new ArmyGroup(1));
    e.addComponent(new StrategyState());

    world.update(181); // past RUSH_END

    const state = e.getComponent<StrategyState>('StrategyState')!;
    expect(state.phase).toBe('timing');
  });

  it('transitions to harass after 480 seconds', () => {
    const e = world.createEntity();
    e.addComponent(new ArmyGroup(1));
    e.addComponent(new StrategyState());

    world.update(481); // past TIMING_END

    const state = e.getComponent<StrategyState>('StrategyState')!;
    expect(state.phase).toBe('harass');
    expect(state.hasTriggeredHarass).toBe(true);
  });

  it('does not update if decision timer not reached', () => {
    const e = world.createEntity();
    e.addComponent(new ArmyGroup(1));
    e.addComponent(new StrategyState());

    world.update(5); // only 5 seconds

    const state = e.getComponent<StrategyState>('StrategyState')!;
    expect(state.phase).toBe('rush');
  });

  it('skips entities without StrategyState component', () => {
    const e = world.createEntity();
    e.addComponent(new ArmyGroup(1));
    // no StrategyState — should not crash

    world.update(181); // past RUSH_END

    // Just verify no error
    expect(true).toBe(true);
  });
});
