import { useState, useCallback, useRef } from 'react';
import { GameState, Tile } from '../types/game';
import { LEVELS } from '../constants/gameConfig';
import {
  createBoardWithoutInitialMatches,
  isAdjacent,
  findMatches,
  calculateScore,
  swapTiles,
  dropTiles,
  removeMatches,
} from '../utils/boardUtils';

const INITIAL_LEVEL = 1;
const MATCH_ANIMATION_DURATION = 300;

function createInitialState(level: number): GameState {
  const levelConfig = LEVELS[level - 1] || LEVELS[0];
  return {
    board: createBoardWithoutInitialMatches(),
    selectedTile: null,
    score: 0,
    targetScore: levelConfig.targetScore,
    level: levelConfig.level,
    moves: levelConfig.maxMoves,
    maxMoves: levelConfig.maxMoves,
    gameStatus: 'playing',
  };
}

export function useGameLogic() {
  const [gameState, setGameState] = useState<GameState>(() => createInitialState(INITIAL_LEVEL));
  const isProcessingRef = useRef(false);

  // 两阶段处理：先标记匹配tiles → 动画播放 → 删除下落
  const processMatchesInStages = useCallback((board: Tile[][], currentScore: number, currentMoves: number) => {
    const matches = findMatches(board);

    if (matches.length === 0) {
      const gameStatus = currentScore >= gameState.targetScore ? 'won' : currentMoves <= 0 ? 'lost' : 'playing';
      return { board, score: currentScore, moves: currentMoves, gameStatus };
    }

    // 第一阶段：收集所有匹配位置的 tile（保留在 DOM 中播放动画）
    const matchPositions = new Set<string>();
    for (const match of matches) {
      for (const pos of match) {
        matchPositions.add(`${pos.row}-${pos.col}`);
      }
    }

    // 标记为匹配状态（触发动画）
    const boardWithMatches = board.map(row =>
      row.map(tile => {
        if (!tile) return tile;
        const key = `${tile.row}-${tile.col}`;
        return matchPositions.has(key)
          ? { ...tile, isMatching: true, isSelected: false }
          : { ...tile, isSelected: false };
      })
    );

    const matchScore = calculateScore(matches);

    // 立即更新：显示匹配动画
    setGameState(prev => ({
      ...prev,
      board: boardWithMatches,
      selectedTile: null,
    }));

    // 第二阶段：动画结束后删除并下落
    setTimeout(() => {
      let newBoard = removeMatches(boardWithMatches, matches);
      newBoard = dropTiles(newBoard);
      const newScore = currentScore + matchScore;

      const gameStatus = newScore >= gameState.targetScore ? 'won' : currentMoves <= 0 ? 'lost' : 'playing';
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        score: newScore,
        moves: currentMoves,
        gameStatus,
      }));

      // 检查级联：递归处理新的匹配
      const nextMatches = findMatches(newBoard);
      if (nextMatches.length > 0) {
        setTimeout(() => processMatchesInStages(newBoard, newScore, currentMoves), 50);
      }
    }, MATCH_ANIMATION_DURATION);

    return null;
  }, [gameState.targetScore]);

  const handleTileClick = useCallback((row: number, col: number) => {
    if (isProcessingRef.current) return;
    if (gameState.gameStatus !== 'playing') return;

    // 防御性检查
    if (!gameState.board[row] || !gameState.board[row][col]) return;

    setGameState(prevState => {
      if (prevState.selectedTile === null) {
        // 选中方块
        const newBoard = prevState.board.map(r =>
          r.map(t => (t ? { ...t, isSelected: false } : t))
        );
        if (newBoard[row]?.[col]) {
          newBoard[row][col].isSelected = true;
        }

        return {
          ...prevState,
          board: newBoard,
          selectedTile: { row, col },
        };
      } else {
        const { row: selectedRow, col: selectedCol } = prevState.selectedTile;

        // 点击同一位置，取消选中
        if (selectedRow === row && selectedCol === col) {
          const newBoard = prevState.board.map(r =>
            r.map(t => (t ? { ...t, isSelected: false } : t))
          );
          return {
            ...prevState,
            board: newBoard,
            selectedTile: null,
          };
        }

        // 检查是否相邻
        if (!isAdjacent(prevState.selectedTile, { row, col })) {
          // 不相邻，重新选中
          const newBoard = prevState.board.map(r =>
            r.map(t => (t ? { ...t, isSelected: false } : t))
          );
          if (newBoard[row]?.[col]) {
            newBoard[row][col].isSelected = true;
          }
          return {
            ...prevState,
            board: newBoard,
            selectedTile: { row, col },
          };
        }

        // 相邻，尝试交换
        isProcessingRef.current = true;
        let newBoard = swapTiles(prevState.board, prevState.selectedTile, { row, col });
        newBoard = newBoard.map(r =>
          r.map(t => (t ? { ...t, isSelected: false } : t))
        );

        const matches = findMatches(newBoard);

        if (matches.length === 0) {
          // 无匹配，交换回来
          newBoard = swapTiles(newBoard, prevState.selectedTile, { row, col });
          isProcessingRef.current = false;

          return {
            ...prevState,
            board: newBoard,
            selectedTile: null,
          };
        }

        // 有匹配，执行两阶段消除（动画 + 删除下落）
        const newMoves = prevState.moves - 1;
        processMatchesInStages(newBoard, prevState.score, newMoves);

        isProcessingRef.current = false;

        return {
          ...prevState,
          selectedTile: null,
        };
      }
    });
  }, [gameState.gameStatus, processMatchesInStages]);

  const restartLevel = useCallback(() => {
    isProcessingRef.current = false;
    setGameState(prev => createInitialState(prev.level));
  }, []);

  const nextLevel = useCallback(() => {
    const nextLevelNum = gameState.level + 1;
    if (nextLevelNum <= LEVELS.length) {
      setGameState(createInitialState(nextLevelNum));
    } else {
      // 所有关卡通关，从第一关重新开始
      setGameState(createInitialState(1));
    }
  }, [gameState.level]);

  const startNewGame = useCallback(() => {
    setGameState(createInitialState(INITIAL_LEVEL));
  }, []);

  return {
    gameState,
    handleTileClick,
    restartLevel,
    nextLevel,
    startNewGame,
  };
}
