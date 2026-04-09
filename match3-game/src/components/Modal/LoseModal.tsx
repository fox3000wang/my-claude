import { Modal } from './Modal';
import { Button } from '../UI/Button';
import './LoseModal.css';

interface LoseModalProps {
  isOpen: boolean;
  score: number;
  targetScore: number;
  onRestart: () => void;
}

export function LoseModal({ isOpen, score, targetScore, onRestart }: LoseModalProps) {
  return (
    <Modal isOpen={isOpen}>
      <div className="lose-modal">
        <h2 className="lose-title">步数用完</h2>
        <p className="lose-info">
          得分 {score} / {targetScore}
        </p>
        <p className="lose-message">差一点点，再试一次!</p>
        <Button onClick={onRestart}>
          重新挑战
        </Button>
      </div>
    </Modal>
  );
}
