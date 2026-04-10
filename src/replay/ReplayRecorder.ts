import type { FrameSyncAdapter } from '../adapters/FrameSyncAdapter';
import type { Action } from '../adapters/FrameSyncAdapter';
import type { ReplayFile, ReplayFrame, ReplayMetadata } from './types';

const REPLAY_VERSION = '1.0';

/**
 * Wraps a FrameSyncAdapter and records all sent commands to a ReplayFile.
 */
export class ReplayRecorder {
  private frames: ReplayFrame[] = [];
  private frameMap = new Map<number, Action[]>();
  private _isRecording = false;

  constructor(adapter: FrameSyncAdapter) {
    adapter.onCommand((cmd) => {
      if (!this._isRecording) return;
      const existing = this.frameMap.get(cmd.frame);
      if (existing) {
        existing.push(...cmd.actions);
      } else {
        this.frameMap.set(cmd.frame, [...cmd.actions]);
      }
    });
  }

  startRecording(): void {
    this.frames = [];
    this.frameMap.clear();
    this._isRecording = true;
  }

  stopRecording(): void {
    this._isRecording = false;
    // Sort frames by frame number and build array
    this.frames = Array.from(this.frameMap.entries())
      .map(([frame, actions]) => ({ frame, actions }))
      .sort((a, b) => a.frame - b.frame);
  }

  isRecording(): boolean {
    return this._isRecording;
  }

  buildReplayFile(mapName = 'unknown', players: ReplayMetadata['players'] = []): ReplayFile {
    return {
      metadata: {
        version: REPLAY_VERSION,
        mapName,
        duration: this.frames.length > 0 ? this.frames[this.frames.length - 1].frame : 0,
        players,
        recordedAt: new Date().toISOString(),
      },
      frames: this.frames,
    };
  }

  exportJSON(): string {
    return JSON.stringify(this.buildReplayFile(), null, 2);
  }

  download(filename = 'replay.json'): void {
    const blob = new Blob([this.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
