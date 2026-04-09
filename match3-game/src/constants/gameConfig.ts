import { TileType, LevelConfig } from '../types/game';

export const BOARD_SIZE = 6;

export const TILE_TYPES: TileType[] = ['red', 'yellow', 'blue', 'green', 'purple'];

export const TILE_COLORS: Record<TileType, string> = {
  red: '#FF6B6B',
  yellow: '#FFE66D',
  blue: '#4ECDC4',
  green: '#95E1A3',
  purple: '#C9B1FF',
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
