import { useRef, useEffect, useCallback } from 'react';
import { Tile } from '../../types/game';
import {
  BOARD_SIZE,
  TILE_SIZE,
  TILE_GAP,
  BOARD_PADDING,
  TILE_COLORS,
} from '../../constants/gameConfig';
import './GameBoard.css';

interface GameBoardProps {
  board: Tile[][];
  onTileClick: (row: number, col: number) => void;
}

const CANVAS_WIDTH = BOARD_SIZE * (TILE_SIZE + TILE_GAP) + BOARD_PADDING * 2;
const CANVAS_HEIGHT = BOARD_SIZE * (TILE_SIZE + TILE_GAP) + BOARD_PADDING * 2;

export function GameBoard({ board, onTileClick }: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 绘制背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.roundRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 16);
    ctx.fill();

    // 绘制方块
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = board[row][col];
        if (!tile.type) continue;

        const x = BOARD_PADDING + col * (TILE_SIZE + TILE_GAP);
        const y = BOARD_PADDING + row * (TILE_SIZE + TILE_GAP);
        const centerX = x + TILE_SIZE / 2;
        const centerY = y + TILE_SIZE / 2;
        const radius = TILE_SIZE / 2 - 2;

        // 选中状态放大
        const scale = tile.isSelected ? 1.1 : 1;
        const scaledRadius = radius * scale;
        const offsetX = tile.isSelected ? -scaledRadius + radius : 0;
        const offsetY = tile.isSelected ? -scaledRadius + radius : 0;

        // 绘制阴影
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;

        // 绘制主体圆形
        const gradient = ctx.createRadialGradient(
          centerX + offsetX - 5,
          centerY + offsetY - 5,
          0,
          centerX + offsetX,
          centerY + offsetY,
          scaledRadius
        );
        gradient.addColorStop(0, lightenColor(TILE_COLORS[tile.type], 20));
        gradient.addColorStop(1, TILE_COLORS[tile.type]);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX + offsetX, centerY + offsetY, scaledRadius, 0, Math.PI * 2);
        ctx.fill();

        // 选中边框
        if (tile.isSelected) {
          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = '#FFF';
          ctx.lineWidth = 3;
          ctx.stroke();

          // 发光效果
          ctx.shadowColor = TILE_COLORS[tile.type];
          ctx.shadowBlur = 15;
          ctx.stroke();
        }

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // 绘制高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(
          centerX + offsetX - scaledRadius * 0.25,
          centerY + offsetY - scaledRadius * 0.25,
          scaledRadius * 0.2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }, [board]);

  useEffect(() => {
    drawBoard();
  }, [drawBoard]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const col = Math.floor((x - BOARD_PADDING) / (TILE_SIZE + TILE_GAP));
    const row = Math.floor((y - BOARD_PADDING) / (TILE_SIZE + TILE_GAP));

    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      onTileClick(row, col);
    }
  };

  return (
    <div className="game-board-container">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleClick}
        className="game-board"
      />
    </div>
  );
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}
