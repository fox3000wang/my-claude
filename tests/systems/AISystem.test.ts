import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../src/core/ecs/World';
import { AISystem } from '../../src/systems/AISystem';
import { Position } from '../../src/components/Position';
import { Combat } from '../../src/components/Combat';
import { MoveTarget } from '../../src/components/MoveTarget';
import { Unit } from '../../src/components/Unit';
import { Health } from '../../src/components/Health';

describe('AISystem', () => {
  let world: World;
  let system: AISystem;

  beforeEach(() => {
    world = new World();
    system = new AISystem();
    world.addSystem(system);
  });

  it('skips decision tick if timer not reached', () => {
    // AI unit (ownerId = 1)
    const aiUnit = world.createEntity();
    aiUnit.addComponent(new Unit('marine', 100, 100, 1));
    aiUnit.addComponent(new Position(0, 0, 0));
    aiUnit.addComponent(new Combat(10, 2, 5, 1));

    // Player unit (ownerId = 0)
    const playerUnit = world.createEntity();
    playerUnit.addComponent(new Unit('marine', 100, 100, 0));
    playerUnit.addComponent(new Position(5, 0, 0)); // within 20 units
    playerUnit.addComponent(new Health(100, 100));

    // Small delta that doesn't reach the 3-second decision interval
    world.update(1);
    world.update(1);

    // Decision timer should NOT have reset — no decisions made yet
    // (decisionTimer accumulates: 1+1=2 < 3, so still < DECISION_INTERVAL)
    const combat = aiUnit.getComponent<Combat>('Combat');
    // Target should NOT be set yet because 2 seconds haven't passed
    expect(combat!.targetId).toBeNull();
    // No MoveTarget should have been added
    expect(aiUnit.hasComponent('MoveTarget')).toBe(false);
  });

  it('sets combat target when player unit is within range', () => {
    // AI unit (ownerId = 1)
    const aiUnit = world.createEntity();
    aiUnit.addComponent(new Unit('marine', 100, 100, 1));
    aiUnit.addComponent(new Position(0, 0, 0));
    aiUnit.addComponent(new Combat(10, 2, 5, 1));

    // Player unit (ownerId = 0) at distance 10 (within 20 units)
    const playerUnit = world.createEntity();
    playerUnit.addComponent(new Unit('marine', 100, 100, 0));
    playerUnit.addComponent(new Position(10, 0, 0));
    playerUnit.addComponent(new Health(100, 100));

    // Accumulate enough delta to trigger a decision (3 seconds)
    world.update(3);

    // Combat target should be set to the player unit
    const combat = aiUnit.getComponent<Combat>('Combat');
    expect(combat!.targetId).toBe(playerUnit.id);
  });
});
