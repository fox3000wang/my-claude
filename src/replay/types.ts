import type { Action } from '../adapters/FrameSyncAdapter';

export interface ReplayFrame {
  frame: number;
  actions: Action[];
}

export interface ReplayMetadata {
  version: string;
  mapName: string;
  duration: number; // total frames
  players: ReplayPlayerInfo[];
  recordedAt: string; // ISO date string
}

export interface ReplayPlayerInfo {
  id: number;
  name: string;
  race: 'terran' | 'zerg' | 'protoss';
  isAI: boolean;
}

export interface ReplayFile {
  metadata: ReplayMetadata;
  frames: ReplayFrame[];
}
