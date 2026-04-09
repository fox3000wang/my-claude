import { TileType, LevelConfig } from '../types/game';

export const BOARD_SIZE = 6;

export const TILE_TYPES: TileType[] = ['cat', 'dog', 'rabbit', 'panda', 'fox'];

export const TILE_EMOJIS: Record<TileType, string> = {
  cat: '🐱',
  dog: '🐶',
  rabbit: '🐰',
  panda: '🐼',
  fox: '🦊',
};

export const TILE_COLORS: Record<TileType, string> = {
  cat: '#FFE4C4',
  dog: '#DEB887',
  rabbit: '#FFB6C1',
  panda: '#F5F5F5',
  fox: '#FF8C00',
};

export const TILE_SIZE = 50;
export const TILE_GAP = 4;
export const BOARD_PADDING = 10;

export const BASE_TARGET_SCORE = 1000;
export const SCORE_INCREMENT = 500;
export const MAX_MOVES = 20;

export const SCORE_3_MATCH = 100;
export const SCORE_4_MATCH = 200;
export const SCORE_5_MATCH = 300;

export const LEVELS: LevelConfig[] = Array.from({ length: 20 }, (_, i) => ({
  level: i + 1,
  targetScore: BASE_TARGET_SCORE + i * SCORE_INCREMENT,
  maxMoves: MAX_MOVES,
}));
