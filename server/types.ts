// Shared types between server and client (copied to avoid import issues)

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

export interface Player {
  id: number;
  name: string;
  isSpectator: boolean;
  ws: WebSocket;
}

// Server → Client messages
export type ServerMessage =
  | { type: 'welcome'; playerId: number; isSpectator: boolean; frame: number; players: PlayerInfo[] }
  | { type: 'player_joined'; playerId: number; name: string }
  | { type: 'player_left'; playerId: number }
  | { type: 'tick'; frame: number; commands: FrameCommand[] }
  | { type: 'error'; message: string };

export interface PlayerInfo {
  id: number;
  name: string;
  isSpectator: boolean;
}

// Client → Server messages
export type ClientMessage =
  | { type: 'join'; name: string; asSpectator: boolean }
  | { type: 'command'; frame: number; playerId: number; actions: Action[] };
