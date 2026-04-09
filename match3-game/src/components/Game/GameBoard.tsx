import { Tile } from '../../types/game';
import { BOARD_SIZE, TILE_SIZE, TILE_GAP, BOARD_PADDING, TILE_EMOJIS } from '../../constants/gameConfig';
import './GameBoard.css';

interface GameBoardProps {
  board: Tile[][];
  onTileClick: (row: number, col: number) => void;
}

const CELL_SIZE = TILE_SIZE + TILE_GAP;

export function GameBoard({ board, onTileClick }: GameBoardProps) {
  const handleClick = (row: number, col: number) => {
    onTileClick(row, col);
  };

  return (
    <div className="game-board-wrapper">
      <div
        className="game-board"
        style={{
          width: BOARD_SIZE * CELL_SIZE,
          height: BOARD_SIZE * CELL_SIZE,
          padding: BOARD_PADDING,
        }}
      >
        {board.map((row, rowIndex) =>
          row.map((tile, colIndex) => {
            if (!tile || !tile.type) return null;
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`tile ${tile.isSelected ? 'selected' : ''}`}
                style={{
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                  left: colIndex * CELL_SIZE,
                  top: rowIndex * CELL_SIZE,
                }}
                onClick={() => handleClick(rowIndex, colIndex)}
              >
                <span className="tile-emoji">{TILE_EMOJIS[tile.type]}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
