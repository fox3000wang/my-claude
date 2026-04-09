import { motion, AnimatePresence } from 'framer-motion';
import { Tile } from '../../types/game';
import { BOARD_SIZE, TILE_SIZE, TILE_GAP, BOARD_PADDING, TILE_EMOJIS } from '../../constants/gameConfig';
import './GameBoard.css';

interface GameBoardProps {
  board: Tile[][];
  onTileClick: (row: number, col: number) => void;
}

const CELL_SIZE = TILE_SIZE + TILE_GAP;

export function GameBoard({ board, onTileClick }: GameBoardProps) {
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
        <AnimatePresence>
          {board.map((row, rowIndex) =>
            row.map((tile, colIndex) => {
              if (!tile || !tile.type) return null;

              return (
                <motion.div
                  key={tile.stableId}
                  className={`tile ${tile.isSelected ? 'selected' : ''} ${tile.isMatching ? 'matching' : ''}`}
                  style={{
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    left: colIndex * CELL_SIZE,
                    // visualRow 初始 = row（板生成时）；下落后 visualRow 保持旧值
                    top: tile.visualRow * CELL_SIZE,
                  }}
                  animate={{
                    top: rowIndex * CELL_SIZE,
                    scale: tile.isSelected ? 1.15 : 1,
                    opacity: 1,
                  }}
                  exit={{ opacity: 0, transition: { duration: 0.05 } }}
                  transition={{
                    top: { duration: 1, ease: 'easeOut' },
                    scale: { type: 'spring', stiffness: 500, damping: 25 },
                    opacity: { duration: 0.2 },
                  }}
                  onClick={() => onTileClick(rowIndex, colIndex)}
                >
                  <span className="tile-emoji">{TILE_EMOJIS[tile.type]}</span>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
