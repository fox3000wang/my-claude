import { useState, useCallback, useRef } from 'react';
import { GameState } from '../types/game';
import { LEVELS } from '../constants/gameConfig';
import {
  createBoardWithoutInitialMatches,
  isAdjacent,
  findMatches,
  calculateScore,
  swapTiles,
  dropTiles,
} from '../utils/boardUtils';

const INITIAL_LEVEL = 1;

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

  const processMatches = useCallback((board: typeof gameState.board, currentScore: number, currentMoves: number): { board: typeof gameState.board; score: number; moves: number; gameStatus: typeof gameState.gameStatus } => {
    let newBoard = board;
    let newScore = currentScore;
    let newMoves = currentMoves;
    let multiplier = 1;
    let hasMatches = true;

    while (hasMatches) {
      const matches = findMatches(newBoard);

      if (matches.length === 0) {
        hasMatches = false;
      } else {
        const matchScore = calculateScore(matches) * multiplier;
        newScore += matchScore;
        newBoard = dropTiles(newBoard);
        multiplier++;
      }
    }

    const gameStatus = newScore >= gameState.targetScore ? 'won' : newMoves <= 0 ? 'lost' : 'playing';

    return { board: newBoard, score: newScore, moves: newMoves, gameStatus };
  }, [gameState.targetScore]);

  const handleTileClick = useCallback((row: number, col: number) => {
    if (isProcessingRef.current) return;
    if (gameState.gameStatus !== 'playing') return;

    setGameState(prevState => {
      if (prevState.selectedTile === null) {
        // 选中方块
        const newBoard = prevState.board.map(r =>
          r.map(t => ({ ...t, isSelected: false }))
        );
        newBoard[row][col].isSelected = true;

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
            r.map(t => ({ ...t, isSelected: false }))
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
            r.map(t => ({ ...t, isSelected: false }))
          );
          newBoard[row][col].isSelected = true;
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
          r.map(t => ({ ...t, isSelected: false }))
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

        // 有匹配，执行消除
        const newMoves = prevState.moves - 1;
        const result = processMatches(newBoard, prevState.score, newMoves);

        isProcessingRef.current = false;

        return {
          ...prevState,
          board: result.board,
          score: result.score,
          moves: result.moves,
          selectedTile: null,
          gameStatus: result.gameStatus,
        };
      }
    });
  }, [gameState.gameStatus, processMatches]);

  const restartLevel = useCallback(() => {
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
