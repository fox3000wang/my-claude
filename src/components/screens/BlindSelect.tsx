import { useGameStore } from '../../store/gameStore'
import { Button } from '../ui/Button'

const BLIND_NAMES = ['Small', 'Big', 'Boss']

export function BlindSelect() {
  const currentAnte = useGameStore(s => s.currentAnte)
  const currentBlindIndex = useGameStore(s => s.currentBlindIndex)
  const targetScore = useGameStore(s => s.targetScore)
  const confirmAnte = useGameStore(s => s.confirmAnte)
  const backToAnteSelect = useGameStore(s => s.backToAnteSelect)

  const blindName = BLIND_NAMES[currentBlindIndex] ?? 'Small'

  return (
    <div className="blind-select-screen">
      <div className="blind-info">
        <div className="blind-badge">{blindName} Blind</div>
        <h2>Ante {currentAnte}</h2>
        <p className="blind-target-info">
          目标: <strong>{targetScore}</strong> 分
        </p>
      </div>
      <div className="blind-actions">
        <Button onClick={confirmAnte}>出牌！</Button>
        <Button variant="secondary" onClick={backToAnteSelect}>
          返回
        </Button>
      </div>
    </div>
  )
}
