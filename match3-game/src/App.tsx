import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameLogic } from './hooks/useGameLogic';
import { GameBoard } from './components/Game/GameBoard';
import { Header } from './components/UI/Header';
import { WinModal } from './components/Modal/WinModal';
import { LoseModal } from './components/Modal/LoseModal';
import { StartScreen } from './components/Start/StartScreen';
import { initAudio, playBgm, stopBgm } from './utils/soundEngine';
import './App.css';

function App() {
  const [started, setStarted] = useState(false);
  const [musicOn, setMusicOn] = useState(true);

  const {
    gameState,
    handleTileClick,
    restartLevel,
    nextLevel,
  } = useGameLogic();

  const handleStart = useCallback(() => {
    initAudio();
    if (musicOn) playBgm();
    setStarted(true);
  }, [musicOn]);

  const toggleMusic = useCallback(() => {
    if (musicOn) {
      stopBgm();
    } else {
      initAudio();
      playBgm();
    }
    setMusicOn(prev => !prev);
  }, [musicOn]);

  return (
    <div className="app">
      <div className="game-container">
        <AnimatePresence mode="wait">
          {!started ? (
            <motion.div
              key="start"
              className="screen-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
              transition={{ duration: 0.4 }}
            >
              <StartScreen onStart={handleStart} />
            </motion.div>
          ) : (
            <motion.div
              key="game"
              className="screen-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {/* 音乐开关 */}
              <button
                className="music-toggle"
                onClick={toggleMusic}
                aria-label={musicOn ? '关闭音乐' : '开启音乐'}
              >
                {musicOn ? '🎵' : '🔇'}
              </button>

              <h1 className="game-title">开心消消乐</h1>

              <Header gameState={gameState} />

              <GameBoard
                board={gameState.board}
                onTileClick={handleTileClick}
              />

              <WinModal
                isOpen={gameState.gameStatus === 'won'}
                score={gameState.score}
                level={gameState.level}
                onNextLevel={nextLevel}
                onRestart={restartLevel}
              />

              <LoseModal
                isOpen={gameState.gameStatus === 'lost'}
                score={gameState.score}
                targetScore={gameState.targetScore}
                onRestart={restartLevel}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
