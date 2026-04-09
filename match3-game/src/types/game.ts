export type TileType = 'cat' | 'dog' | 'rabbit' | 'panda' | 'fox';

export interface Position {
  row: number;
  col: number;
}

export interface Tile {
  type: TileType;
  row: number;
  col: number;
  isSelected: boolean;
  isMatching: boolean;
  visualRow: number;
  /** 稳定 ID，贯穿 tile 整个生命周期 */
  stableId: number;
}

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

export interface GameState {
  board: Tile[][];
  selectedTile: Position | null;
  score: number;
  targetScore: number;
  level: number;
  moves: number;
  maxMoves: number;
  gameStatus: GameStatus;
}

export interface LevelConfig {
  level: number;
  targetScore: number;
  maxMoves: number;
}
