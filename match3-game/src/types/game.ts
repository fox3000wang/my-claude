export type TileType = 'red' | 'yellow' | 'blue' | 'green' | 'purple';

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
