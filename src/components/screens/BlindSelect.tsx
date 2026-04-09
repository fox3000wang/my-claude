import { useGameStore } from '../../store/gameStore'
import { Button } from '../ui/Button'

export function BlindSelect() {
  const currentAnte = useGameStore(s => s.currentAnte)
  const blindManager = useGameStore(s => s.blindManager)
  const confirmAnte = useGameStore(s => s.confirmAnte)
  const backToAnteSelect = useGameStore(s => s.backToAnteSelect)
  const selectBlind = useGameStore(s => s.selectBlind)

  const targets = [blindManager.getTargetScoreByIndex(0), blindManager.getTargetScoreByIndex(1), blindManager.getTargetScoreByIndex(2)]
  const rewards = ['$3', '$4', '$5']
  const blindNames = ['Small Blind', 'Big Blind', 'Boss Blind']
  const keys = ['1', '2', '3']

  return (
    <div className="title-screen">
      <h2>Ante {currentAnte} / 3 选择盲注</h2>

      <div className="blind-list">
        {blindNames.map((name, i) => (
          <button
            key={i}
            className="btn btn-secondary blind-btn"
            onClick={() => { selectBlind(i); confirmAnte() }}
          >
            <span className="blind-name">{name}</span>
            <span className="blind-target">目标: {targets[i]}</span>
            <span className="blind-reward">奖励: {rewards[i]}</span>
            {i === 2 && <span className="blind-skip">跳过 -$2</span>}
            <span className="blind-key">按 {keys[i]} 快捷选择</span>
          </button>
        ))}
      </div>

      <Button onClick={backToAnteSelect}>
        返回
      </Button>
    </div>
  )
}
