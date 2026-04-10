import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReplayRecorder } from '../../src/replay/ReplayRecorder';
import type { FrameSyncAdapter, FrameCommand } from '../../src/adapters/FrameSyncAdapter';

function makeAdapter(): FrameSyncAdapter {
  const adapter = {
    isConnected: vi.fn(() => true),
    sendCommand: vi.fn(),
    onCommand: vi.fn(),
  } as unknown as FrameSyncAdapter;
  return adapter;
}

describe('ReplayRecorder', () => {
  let adapter: FrameSyncAdapter;
  let recorder: ReplayRecorder;
  let commandHandler: (cmd: FrameCommand) => void;

  beforeEach(() => {
    adapter = makeAdapter();
    // Capture the registered command handler so tests can fire it
    (adapter.onCommand as ReturnType<typeof vi.fn>).mockImplementation((cb: (cmd: FrameCommand) => void) => {
      commandHandler = cb;
    });
    recorder = new ReplayRecorder(adapter);
  });

  it('starts and stops recording', () => {
    expect(recorder.isRecording()).toBe(false);
    recorder.startRecording();
    expect(recorder.isRecording()).toBe(true);
    recorder.stopRecording();
    expect(recorder.isRecording()).toBe(false);
  });

  it('records commands while recording', () => {
    recorder.startRecording();
    commandHandler({ frame: 1, playerId: 0, actions: [{ type: 'move', entityId: 1, targetX: 10, targetY: 0, targetZ: 5 }] });
    commandHandler({ frame: 2, playerId: 0, actions: [{ type: 'attack', entityId: 2, targetId: 3 }] });
    recorder.stopRecording();

    const replay = recorder.buildReplayFile('test-map');
    expect(replay.frames).toHaveLength(2);
    expect(replay.frames[0].frame).toBe(1);
    expect(replay.frames[0].actions).toHaveLength(1);
    expect(replay.frames[1].frame).toBe(2);
  });

  it('does NOT record commands when not recording', () => {
    recorder.startRecording();
    recorder.stopRecording();
    // Commands fired after stopRecording should be ignored
    commandHandler({ frame: 1, playerId: 0, actions: [{ type: 'move', entityId: 1, targetX: 10, targetY: 0, targetZ: 5 }] });

    const replay = recorder.buildReplayFile();
    expect(replay.frames).toHaveLength(0);
  });

  it('buildReplayFile returns correct structure', () => {
    recorder.startRecording();
    commandHandler({ frame: 5, playerId: 1, actions: [{ type: 'stop', entityId: 7 }] });
    recorder.stopRecording();

    const replay = recorder.buildReplayFile('Eternal Empire', [
      { id: 1, name: 'Alice', race: 'terran', isAI: false },
    ]);

    expect(replay.metadata.version).toBe('1.0');
    expect(replay.metadata.mapName).toBe('Eternal Empire');
    expect(replay.metadata.duration).toBe(5);
    expect(replay.metadata.players).toHaveLength(1);
    expect(replay.metadata.recordedAt).toBeTruthy();
    expect(replay.frames).toHaveLength(1);
    expect(replay.frames[0].frame).toBe(5);
  });

  it('sorts frames by frame number', () => {
    recorder.startRecording();
    commandHandler({ frame: 10, playerId: 0, actions: [{ type: 'select', entityIds: [1] }] });
    commandHandler({ frame: 1, playerId: 0, actions: [{ type: 'deselect', entityIds: [1] }] });
    recorder.stopRecording();

    const replay = recorder.buildReplayFile();
    expect(replay.frames[0].frame).toBe(1);
    expect(replay.frames[1].frame).toBe(10);
  });

  it('download() throws ReferenceError in node (requires browser globals)', () => {
    recorder.startRecording();
    recorder.stopRecording();
    // download() uses document.createElement / URL.createObjectURL which don't exist in node
    expect(() => recorder.download('my-replay.json')).toThrow('document is not defined');
  });

  it('exportJSON produces valid JSON', () => {
    recorder.startRecording();
    commandHandler({ frame: 1, playerId: 0, actions: [{ type: 'stop', entityId: 1 }] });
    recorder.stopRecording();
    const json = recorder.exportJSON();
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed.metadata.version).toBe('1.0');
    expect(parsed.frames).toHaveLength(1);
  });
});
