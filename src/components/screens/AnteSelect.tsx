import { useGameStore } from '../../store/gameStore'
import { Button } from '../ui/Button'
import { ANTE_TARGETS } from '../../engine/BlindManager'

const BLIND_NAMES = ['Small', 'Big', 'Boss']
const BLIND_REWARDS = ['$3', '$4', '$5']

export function AnteSelect() {
  const currentAnte = useGameStore(s => s.currentAnte)
  const money = useGameStore(s => s.money)
  const selectBlind = useGameStore(s => s.selectBlind)

  const targets = ANTE_TARGETS[currentAnte - 1] ?? [100, 150, 200]

  return (
    <div className="ante-screen">
      <div className="ante-header">
        <h2>Ante {currentAnte}</h2>
        <div className="ante-money">
          <span className="money-icon">$</span>
          <span className="money-value">{money}</span>
        </div>
      </div>
      <p className="ante-hint">选择一个 Blind 开始挑战</p>
      <div className="blind-list">
        {BLIND_NAMES.map((name, i) => (
          <div key={i} className="blind-option">
            <div className="blind-info">
              <span className="blind-name">{name}</span>
              <span className="blind-target">目标: {targets[i]}分</span>
              <span className="blind-reward">{BLIND_REWARDS[i]}</span>
            </div>
            <Button size="small" onClick={() => selectBlind(i)}>
              选择
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
