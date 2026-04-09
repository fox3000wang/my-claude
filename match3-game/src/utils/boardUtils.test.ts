import { describe, it, expect } from 'vitest';
import {
  createBoardWithoutInitialMatches,
  isAdjacent,
  findMatches,
  calculateScore,
  swapTiles,
} from './boardUtils';
import { TileType } from '../types/game';
import { BOARD_SIZE } from '../constants/gameConfig';

describe('boardUtils', () => {
  describe('createBoardWithoutInitialMatches', () => {
    it('应创建正确尺寸的棋盘', () => {
      const board = createBoardWithoutInitialMatches();
      expect(board.length).toBe(BOARD_SIZE);
      expect(board[0].length).toBe(BOARD_SIZE);
    });

    it('棋盘不应包含初始匹配', () => {
      const board = createBoardWithoutInitialMatches();
      const matches = findMatches(board);
      expect(matches.length).toBe(0);
    });
  });

  describe('isAdjacent', () => {
    it('应正确判断相邻位置', () => {
      expect(isAdjacent({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
      expect(isAdjacent({ row: 0, col: 0 }, { row: 1, col: 0 })).toBe(true);
      expect(isAdjacent({ row: 0, col: 0 }, { row: 1, col: 1 })).toBe(false);
      expect(isAdjacent({ row: 0, col: 0 }, { row: 0, col: 2 })).toBe(false);
    });
  });

  describe('findMatches', () => {
    it('应检测横向3个匹配', () => {
      const board = Array.from({ length: BOARD_SIZE }, (_, row) =>
        Array.from({ length: BOARD_SIZE }, (_, col) => ({
          type: 'red' as TileType,
          row,
          col,
          isSelected: false,
          isMatching: false,
        }))
      );
      const matches = findMatches(board);
      expect(matches.length).toBe(BOARD_SIZE * 2); // 6行横 + 6列纵
    });

    it('应检测纵向3个匹配', () => {
      const board = Array.from({ length: BOARD_SIZE }, (_, row) =>
        Array.from({ length: BOARD_SIZE }, (_, col) => ({
          type: 'blue' as TileType,
          row,
          col,
          isSelected: false,
          isMatching: false,
        }))
      );
      const matches = findMatches(board);
      expect(matches.length).toBe(BOARD_SIZE * 2); // 6行横 + 6列纵
    });
  });

  describe('calculateScore', () => {
    it('3个匹配得100分', () => {
      const matches = [Array(3).fill({ row: 0, col: 0 })];
      expect(calculateScore(matches)).toBe(100);
    });

    it('4个匹配得200分', () => {
      const matches = [Array(4).fill({ row: 0, col: 0 })];
      expect(calculateScore(matches)).toBe(200);
    });

    it('5个及以上匹配得300分', () => {
      const matches = [Array(5).fill({ row: 0, col: 0 })];
      expect(calculateScore(matches)).toBe(300);
    });
  });

  describe('swapTiles', () => {
    it('应正确交换两个方块', () => {
      const board = Array.from({ length: BOARD_SIZE }, (_, row) =>
        Array.from({ length: BOARD_SIZE }, (_, col) => ({
          type: 'red' as TileType,
          row,
          col,
          isSelected: false,
          isMatching: false,
        }))
      );
      board[0][0].type = 'red';
      board[0][1].type = 'blue';

      const newBoard = swapTiles(board, { row: 0, col: 0 }, { row: 0, col: 1 });

      expect(newBoard[0][0].type).toBe('blue');
      expect(newBoard[0][1].type).toBe('red');
    });
  });
});
