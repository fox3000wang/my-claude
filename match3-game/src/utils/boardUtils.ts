import { Tile, TileType, Position } from '../types/game';
import { BOARD_SIZE, TILE_TYPES } from '../constants/gameConfig';

// 模块级计数器，为每个 tile 分配全局唯一稳定 ID
let tileIdCounter = 0;
function nextTileId(): number {
  return tileIdCounter++;
}

export function getRandomTileType(): TileType {
  return TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
}

export function createEmptyBoard(): Tile[][] {
  return Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => ({
      type: getRandomTileType(),
      row,
      col,
      isSelected: false,
      isMatching: false,
      visualRow: row,
      stableId: nextTileId(),
    }))
  );
}

export function createBoardWithoutInitialMatches(): Tile[][] {
  const board: Tile[][] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    board[row] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      let type = getRandomTileType();

      // 避免初始生成时就有可消除的组合
      while (
        (col >= 2 && board[row][col - 1].type === type && board[row][col - 2].type === type) ||
        (row >= 2 && board[row - 1][col].type === type && board[row - 2][col].type === type)
      ) {
        type = getRandomTileType();
      }

      board[row][col] = {
        type,
        row,
        col,
        isSelected: false,
        isMatching: false,
        visualRow: row,
        stableId: nextTileId(),
      };
    }
  }

  return board;
}

export function isAdjacent(pos1: Position, pos2: Position): boolean {
  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

export function findMatches(board: Tile[][]): Position[][] {
  const matches: Position[][] = [];

  // 横向匹配检测
  for (let row = 0; row < BOARD_SIZE; row++) {
    let matchStart = 0;
    let matchLength = 1;

    for (let col = 1; col <= BOARD_SIZE; col++) {
      const currentTile = board[row]?.[col];
      const startTile = board[row]?.[matchStart];

      if (col < BOARD_SIZE && currentTile && startTile && currentTile.type === startTile.type) {
        matchLength++;
      } else {
        if (matchLength >= 3) {
          const match: Position[] = [];
          for (let i = matchStart; i < matchStart + matchLength; i++) {
            match.push({ row, col: i });
          }
          matches.push(match);
        }
        matchStart = col;
        matchLength = 1;
      }
    }
  }

  // 纵向匹配检测
  for (let col = 0; col < BOARD_SIZE; col++) {
    let matchStart = 0;
    let matchLength = 1;

    for (let row = 1; row <= BOARD_SIZE; row++) {
      const currentTile = board[row]?.[col];
      const startTile = board[matchStart]?.[col];

      if (row < BOARD_SIZE && currentTile && startTile && currentTile.type === startTile.type) {
        matchLength++;
      } else {
        if (matchLength >= 3) {
          const match: Position[] = [];
          for (let i = matchStart; i < matchStart + matchLength; i++) {
            match.push({ row: i, col });
          }
          matches.push(match);
        }
        matchStart = row;
        matchLength = 1;
      }
    }
  }

  return matches;
}

export function calculateScore(matches: Position[][]): number {
  let score = 0;

  for (const match of matches) {
    const length = match.length;
    if (length === 3) {
      score += 100;
    } else if (length === 4) {
      score += 200;
    } else if (length >= 5) {
      score += 300;
    }
  }

  return score;
}

export function removeMatches(board: Tile[][], matches: Position[][]): Tile[][] {
  const newBoard = board.map(row => row.map(tile => tile ? { ...tile } : tile));

  for (const match of matches) {
    for (const pos of match) {
      const tile = newBoard[pos.row]?.[pos.col];
      if (tile) {
        newBoard[pos.row][pos.col] = {
          ...tile,
          type: null as unknown as TileType,
          isMatching: true,
        };
      }
    }
  }

  return newBoard;
}

/**
 * 下落并填充新 tile。
 * existing tiles: visualRow 保持旧值，由 Framer Motion 动画到新位置
 * new tiles: visualRow = row（直接出现在位，无入场动画）
 */
export function dropTiles(board: Tile[][]): Tile[][] {
  const newBoard = board.map(row => row.map(() => null as unknown as Tile));

  for (let col = 0; col < BOARD_SIZE; col++) {
    let writeRow = BOARD_SIZE - 1;

    // 从下往上遍历，把非空方块移下来（visualRow 保持旧值，触发下落动画）
    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      const tile = board[row]?.[col];
      if (tile && tile.type !== null) {
        newBoard[writeRow][col] = {
          ...tile,
          row: writeRow,
          // visualRow 保持不变，由 Framer Motion 动画到新 row
        };
        writeRow--;
      }
    }

    // 顶部填充新方块（visualRow = row，无入场动画）
    for (let row = writeRow; row >= 0; row--) {
      newBoard[row][col] = {
        type: getRandomTileType(),
        row,
        col,
        isSelected: false,
        isMatching: false,
        visualRow: row,
        stableId: nextTileId(),
      };
    }
  }

  return newBoard;
}

export function swapTiles(board: Tile[][], pos1: Position, pos2: Position): Tile[][] {
  const newBoard = board.map(row => row.map(tile => (tile ? { ...tile } : tile)));

  const tile1 = newBoard[pos1.row]?.[pos1.col];
  const tile2 = newBoard[pos2.row]?.[pos2.col];

  if (!tile1 || !tile2) return newBoard;

  newBoard[pos1.row][pos1.col] = { ...tile2, row: pos1.row, col: pos1.col };
  newBoard[pos2.row][pos2.col] = { ...tile1, row: pos2.row, col: pos2.col };

  return newBoard;
}
