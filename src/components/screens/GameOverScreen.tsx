import { useGameStore } from '../../store/gameStore'
import { Button } from '../ui/Button'

export function GameOverScreen() {
  const totalScore = useGameStore(s => s.totalScore)
  const currentAnte = useGameStore(s => s.currentAnte)
  const currentBlindIndex = useGameStore(s => s.currentBlindIndex)
  const backToTitle = useGameStore(s => s.backToTitle)
  const startGame = useGameStore(s => s.startGame)

  return (
    <div className="end-screen gameover">
      <h2>游戏结束</h2>
      <div className="end-stats">
        <p>
          Ante {currentAnte} — Blind {currentBlindIndex + 1}
        </p>
        <p className="end-score">
          最终得分: <strong>{totalScore}</strong>
        </p>
      </div>
      <Button onClick={startGame}>再来一局</Button>
      <Button variant="secondary" onClick={backToTitle}>返回标题</Button>
    </div>
  )
}
