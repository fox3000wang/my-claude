import { TileType, LevelConfig } from '../types/game';

export const BOARD_SIZE = 8;

export const TILE_TYPES: TileType[] = ['cat', 'dog', 'rabbit', 'panda', 'fox'];

export const TILE_EMOJIS: Record<TileType, string> = {
  cat: '🐱',
  dog: '🐶',
  rabbit: '🐰',
  panda: '🐼',
  fox: '🦊',
};

// 糖果色：与 emoji 原色配套，玻璃质感用（中心亮→边缘深）
export const TILE_COLORS: Record<TileType, { primary: string; glow: string }> = {
  cat:    { primary: '#FF8FAB', glow: 'rgba(255, 143, 171, 0.7)' },   // 暖桃粉
  dog:    { primary: '#FFAA47', glow: 'rgba(255, 170, 71, 0.7)' },   // 琥珀金
  rabbit: { primary: '#FF7EB3', glow: 'rgba(255, 126, 179, 0.7)' }, // 樱花粉
  panda:  { primary: '#C4B5FD', glow: 'rgba(196, 181, 253, 0.7)' },  // 薰衣草紫
  fox:    { primary: '#FF9F45', glow: 'rgba(255, 159, 69, 0.7)' },   // 蜜橙金
};

export const TILE_SIZE = 42;
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
