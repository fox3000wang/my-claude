import { useGameLogic } from './hooks/useGameLogic';
import { GameBoard } from './components/Game/GameBoard';
import { Header } from './components/UI/Header';
import { Button } from './components/UI/Button';
import { WinModal } from './components/Modal/WinModal';
import { LoseModal } from './components/Modal/LoseModal';

function App() {
  const {
    gameState,
    handleTileClick,
    restartLevel,
    nextLevel,
  } = useGameLogic();

  return (
    <div className="app">
      <div className="game-container">
        <h1 className="game-title">消消乐</h1>

        <Header gameState={gameState} />

        <GameBoard
          board={gameState.board}
          onTileClick={handleTileClick}
        />

        <Button onClick={restartLevel} variant="secondary">
          重新开始
        </Button>

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
      </div>
    </div>
  );
}

export default App;
