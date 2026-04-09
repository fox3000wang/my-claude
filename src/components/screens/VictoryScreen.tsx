import { useGameStore } from '../../store/gameStore'
import { Button } from '../ui/Button'

export function VictoryScreen() {
  const totalScore = useGameStore(s => s.totalScore)
  const money = useGameStore(s => s.money)
  const backToTitle = useGameStore(s => s.backToTitle)

  return (
    <div className="end-screen victory">
      <h2>胜利！</h2>
      <div className="end-stats">
        <p className="end-score">
          最终得分: <strong>{totalScore}</strong>
        </p>
        <p className="end-money">
          金币: <strong>${money}</strong>
        </p>
      </div>
      <Button onClick={backToTitle}>再来一局</Button>
    </div>
  )
}
