export interface FrameCommand {
  frame: number;
  playerId: number;
  actions: Action[];
}

export type Action =
  | { type: 'move'; entityId: number; targetX: number; targetY: number; targetZ: number }
  | { type: 'attack'; entityId: number; targetId: number }
  | { type: 'build'; entityId: number; buildingType: string; x: number; y: number }
  | { type: 'train'; entityId: number; unitType: string }
  | { type: 'harvest'; entityId: number; targetId: number }
  | { type: 'stop'; entityId: number }
  | { type: 'select'; entityIds: number[] }
  | { type: 'deselect'; entityIds: number[] };

export interface FrameSyncAdapter {
  sendCommand(command: FrameCommand): void;
  onCommand(callback: (command: FrameCommand) => void): void;
  isConnected(): boolean;
}

export class LocalFrameSyncAdapter implements FrameSyncAdapter {
  private callbacks: ((command: FrameCommand) => void)[] = [];

  sendCommand(_command: FrameCommand): void {
    // Alpha: 本地模拟，命令直接本地处理
  }

  onCommand(callback: (command: FrameCommand) => void): void {
    this.callbacks.push(callback);
  }

  isConnected(): boolean {
    return true;
  }
}
