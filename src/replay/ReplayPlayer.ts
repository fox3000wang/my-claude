import type { Game } from '../game';
import type { Action } from '../adapters/FrameSyncAdapter';
import type { ReplayFile } from './types';

export type ReplayState = 'idle' | 'playing' | 'paused' | 'ended';

/**
 * Plays back a recorded replay file, applying recorded actions to the game.
 */
export class ReplayPlayer {
  private state: ReplayState = 'idle';
  private currentFrame = 0;
  private frameIndex = 0;
  private animationId: number | null = null;
  private lastTime = 0;
  private elapsed = 0;
  private onStateChange: ((state: ReplayState, frame: number, total: number) => void) | null = null;

  constructor(
    private game: Game,
    private replay: ReplayFile,
  ) {}

  setStateChangeCallback(cb: (state: ReplayState, frame: number, total: number) => void): void {
    this.onStateChange = cb;
  }

  getState(): ReplayState {
    return this.state;
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  getTotalFrames(): number {
    return this.replay.metadata.duration;
  }

  play(): void {
    if (this.state === 'ended') {
      this.frameIndex = 0;
      this.currentFrame = 0;
      this.elapsed = 0;
    }
    this.state = 'playing';
    this.lastTime = performance.now();
    this.loop();
    this.notify();
  }

  pause(): void {
    this.state = 'paused';
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.notify();
  }

  stop(): void {
    this.state = 'idle';
    this.frameIndex = 0;
    this.currentFrame = 0;
    this.elapsed = 0;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.notify();
  }

  seek(frame: number): void {
    this.currentFrame = frame;
    this.elapsed = 0;
    // Find frameIndex for this frame
    this.frameIndex = this.replay.frames.findIndex((f) => f.frame >= frame);
    if (this.frameIndex === -1) this.frameIndex = this.replay.frames.length;
    // Apply actions up to this frame
    for (let i = 0; i < this.frameIndex; i++) {
      this.applyFrame(this.replay.frames[i]);
    }
    this.notify();
  }

  private loop = (): void => {
    if (this.state !== 'playing') return;

    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.elapsed += delta;

    // Advance 1 frame per 0.1s (server tick rate = 10/s)
    const TICK = 0.1;
    const framesToAdvance = Math.floor(this.elapsed / TICK);
    if (framesToAdvance < 1) {
      this.animationId = requestAnimationFrame(this.loop);
      return;
    }
    this.elapsed -= framesToAdvance * TICK;
    this.currentFrame += framesToAdvance;

    // Apply all frames up to currentFrame
    while (
      this.frameIndex < this.replay.frames.length &&
      this.replay.frames[this.frameIndex].frame <= this.currentFrame
    ) {
      this.applyFrame(this.replay.frames[this.frameIndex]);
      this.frameIndex++;
    }

    this.notify();

    if (this.currentFrame >= this.replay.metadata.duration) {
      this.state = 'ended';
      if (this.animationId !== null) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      this.notify();
      return;
    }

    this.animationId = requestAnimationFrame(this.loop);
  };

  private applyFrame(frame: { actions: Action[] }): void {
    for (const action of frame.actions) {
      this.game.applyAction(action);
    }
  }

  private notify(): void {
    this.onStateChange?.(this.state, this.currentFrame, this.replay.metadata.duration);
  }
}
