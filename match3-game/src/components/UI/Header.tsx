import { GameState } from '../../types/game';
import './Header.css';

interface HeaderProps {
  gameState: GameState;
}

export function Header({ gameState }: HeaderProps) {
  return (
    <div className="header">
      <div className="header-item">
        <span className="header-label">关卡</span>
        <span className="header-value">{gameState.level}</span>
      </div>
      <div className="header-item">
        <span className="header-label">目标</span>
        <span className="header-value target">{gameState.targetScore}</span>
      </div>
      <div className="header-item">
        <span className="header-label">得分</span>
        <span className="header-value score">{gameState.score}</span>
      </div>
      <div className="header-item">
        <span className="header-label">步数</span>
        <span className={`header-value moves ${gameState.moves <= 3 ? 'low' : ''}`}>
          {gameState.moves}
        </span>
      </div>
    </div>
  );
}
