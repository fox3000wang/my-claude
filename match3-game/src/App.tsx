import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameLogic } from './hooks/useGameLogic';
import { GameBoard } from './components/Game/GameBoard';
import { Header } from './components/UI/Header';
import { WinModal } from './components/Modal/WinModal';
import { LoseModal } from './components/Modal/LoseModal';
import { StartScreen } from './components/Start/StartScreen';
import './App.css';

function App() {
  const [started, setStarted] = useState(false);

  const {
    gameState,
    handleTileClick,
    restartLevel,
    nextLevel,
  } = useGameLogic();

  const handleStart = () => {
    setStarted(true);
  };

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
