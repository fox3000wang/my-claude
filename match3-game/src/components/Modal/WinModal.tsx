import { Modal } from './Modal';
import { Button } from '../UI/Button';
import './WinModal.css';

interface WinModalProps {
  isOpen: boolean;
  score: number;
  level: number;
  onNextLevel: () => void;
  onRestart: () => void;
}

export function WinModal({ isOpen, score, level, onNextLevel, onRestart }: WinModalProps) {
  const stars = score >= level * 500 + 1000 ? 3 : score >= level * 500 + 500 ? 2 : 1;

  return (
    <Modal isOpen={isOpen}>
      <div className="win-modal">
        <h2 className="win-title">恭喜过关!</h2>
        <div className="stars">
          {Array(3).fill(0).map((_, i) => (
            <span key={i} className={`star ${i < stars ? 'active' : ''}`}>
              {i < stars ? '★' : '☆'}
            </span>
          ))}
        </div>
        <p className="win-score">本关得分: {score}</p>
        <div className="win-buttons">
          <Button onClick={onRestart} variant="secondary">
            重玩本关
          </Button>
          <Button onClick={onNextLevel}>
            下一关
          </Button>
        </div>
      </div>
    </Modal>
  );
}
