import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Action } from '../../src/adapters/FrameSyncAdapter';
import type { ReplayFile } from '../../src/replay/types';

// Mock the game module (Game constructor references Three.js/WebGL which don't exist in node)
vi.mock('../../src/game', () => ({
  Game: vi.fn(),
}));

import { ReplayPlayer } from '../../src/replay/ReplayPlayer';

function makeReplay(frames: Array<{ frame: number; actions: Action[] }>, duration = 100): ReplayFile {
  return {
    metadata: {
      version: '1.0',
      mapName: 'test-map',
      duration,
      players: [],
      recordedAt: new Date().toISOString(),
    },
    frames,
  };
}

function makeMockGame() {
  return { applyAction: vi.fn() };
}

describe('ReplayPlayer', () => {
  let mockGame: ReturnType<typeof makeMockGame>;
  let player: ReplayPlayer;
  let stateChanges: Array<{ state: string; frame: number; total: number }>;

  beforeEach(() => {
    mockGame = makeMockGame();
    stateChanges = [];
    // vi.useFakeTimers() mocks Date but NOT RAF/performance. We stub them to use
    // vi's fake timers via setTimeout so they can be controlled by vi.advanceTimersByTime().
    vi.useFakeTimers({ shouldAdvanceTime: false });
    if (typeof globalThis.requestAnimationFrame === 'undefined') {
      let tick = 0;
      globalThis.requestAnimationFrame = vi.fn((_cb: FrameRequestCallback) => {
        // Schedule the callback to fire on the next timer tick; advancing time by 17ms
        // simulates one animation frame (~60fps) and updates the mocked performance.now()
        const id = setTimeout(() => {
          tick += 17;
          vi.advanceTimersByTime(17); // advances performance.now() so loop() sees delta > 0
        }, 0) as unknown as number;
        return id;
      });
    }
    if (typeof globalThis.cancelAnimationFrame === 'undefined') {
      globalThis.cancelAnimationFrame = vi.fn((_id: number) => {});
    }
  });

  afterEach(() => {
    player?.stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts in idle state', () => {
    const replay = makeReplay([]);
    player = new ReplayPlayer(mockGame as any, replay);
    expect(player.getState()).toBe('idle');
    expect(player.getCurrentFrame()).toBe(0);
    expect(player.getTotalFrames()).toBe(100);
  });

  it('transitions to playing on play()', () => {
    const replay = makeReplay([]);
    player = new ReplayPlayer(mockGame as any, replay);
    player.play();
    expect(player.getState()).toBe('playing');
  });

  it('transitions to paused on pause()', () => {
    const replay = makeReplay([]);
    player = new ReplayPlayer(mockGame as any, replay);
    player.play();
    player.pause();
    expect(player.getState()).toBe('paused');
  });

  it('transitions to idle on stop()', () => {
    const replay = makeReplay([]);
    player = new ReplayPlayer(mockGame as any, replay);
    player.play();
    player.stop();
    expect(player.getState()).toBe('idle');
    expect(player.getCurrentFrame()).toBe(0);
  });

  it('calls stateChangeCallback on state transitions', () => {
    const replay = makeReplay([]);
    player = new ReplayPlayer(mockGame as any, replay);
    player.setStateChangeCallback((state, frame, total) => {
      stateChanges.push({ state, frame, total });
    });
    player.play();
    player.pause();
    player.stop();

    expect(stateChanges[0].state).toBe('playing');
    expect(stateChanges[1].state).toBe('paused');
    expect(stateChanges[2].state).toBe('idle');
  });

  it('seek resets currentFrame to specified value', () => {
    const replay = makeReplay([
      { frame: 0, actions: [{ type: 'select', entityIds: [1] }] },
      { frame: 10, actions: [{ type: 'move', entityId: 1, targetX: 5, targetY: 0, targetZ: 3 }] },
      { frame: 20, actions: [{ type: 'stop', entityId: 1 }] },
    ]);
    player = new ReplayPlayer(mockGame as any, replay);
    player.seek(10);
    expect(player.getCurrentFrame()).toBe(10);
  });

  it('seek applies all frames with number < target frame', () => {
    const replay = makeReplay([
      { frame: 0, actions: [{ type: 'select', entityIds: [1] }] },
      { frame: 10, actions: [{ type: 'move', entityId: 1, targetX: 5, targetY: 0, targetZ: 3 }] },
      { frame: 20, actions: [{ type: 'stop', entityId: 1 }] },
    ]);
    player = new ReplayPlayer(mockGame as any, replay);

    // seek(0): findIndex(frame >= 0) = 0, applies frames[0..-1] = nothing
    player.seek(0);
    expect(mockGame.applyAction).not.toHaveBeenCalled();

    // seek(1): findIndex(frame >= 1) = 1 (frame 10), applies frames[0..0] = frame 0 only
    player.seek(1);
    expect(mockGame.applyAction).toHaveBeenCalledTimes(1);
    expect(mockGame.applyAction).toHaveBeenCalledWith({ type: 'select', entityIds: [1] });
  });

  it('seek applies frames 0 and 10 when seeking to frame 11', () => {
    const replay = makeReplay([
      { frame: 0, actions: [{ type: 'select', entityIds: [1] }] },
      { frame: 10, actions: [{ type: 'move', entityId: 1, targetX: 5, targetY: 0, targetZ: 3 }] },
      { frame: 20, actions: [{ type: 'stop', entityId: 1 }] },
    ]);
    player = new ReplayPlayer(mockGame as any, replay);

    // seek(11): findIndex(frame >= 11) = 2 (frame 20), applies frames[0..1]
    player.seek(11);
    expect(mockGame.applyAction).toHaveBeenCalledTimes(2);
    expect(mockGame.applyAction).toHaveBeenCalledWith({ type: 'select', entityIds: [1] });
    expect(mockGame.applyAction).toHaveBeenCalledWith({ type: 'move', entityId: 1, targetX: 5, targetY: 0, targetZ: 3 });
  });

  it('play() from idle transitions to playing without resetting frame', () => {
    const replay = makeReplay([]);
    player = new ReplayPlayer(mockGame as any, replay);

    player.seek(5);
    expect(player.getCurrentFrame()).toBe(5);
    expect(player.getState()).toBe('idle');

    player.play(); // from 'idle' state: just transitions to 'playing', does not reset frame
    expect(player.getState()).toBe('playing');
    expect(player.getCurrentFrame()).toBe(5);
  });
});
