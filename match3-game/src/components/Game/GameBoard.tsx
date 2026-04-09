import { motion, AnimatePresence } from 'framer-motion';
import { Tile } from '../../types/game';
import { BOARD_SIZE, TILE_SIZE, TILE_GAP, BOARD_PADDING, TILE_EMOJIS, TILE_COLORS } from '../../constants/gameConfig';
import './GameBoard.css';

interface GameBoardProps {
  board: Tile[][];
  onTileClick: (row: number, col: number) => void;
}

const CELL_SIZE = TILE_SIZE + TILE_GAP;

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

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

              const color = TILE_COLORS[tile.type];
              const dark = shadeColor(color.primary, -30);

              return (
                <motion.div
                  key={tile.stableId}
                  className={`tile ${tile.isSelected ? 'selected' : ''} ${tile.isMatching ? 'matching' : ''}`}
                  style={{
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    left: colIndex * CELL_SIZE,
                    top: tile.visualRow * CELL_SIZE,
                    background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55) 0%, ${color.primary}99 45%, ${dark}BB 100%)`,
                    boxShadow: `0 0 14px ${color.glow}, 0 4px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.5)`,
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
