import { useGameStore } from '../../store/gameStore'
import { Button } from '../ui/Button'

const TOTAL_ANTES = 3

export function AnteSelect() {
  const currentAnte = useGameStore(s => s.currentAnte)
  const money = useGameStore(s => s.money)
  const activeJokers = useGameStore(s => s.activeJokers)
  const selectBlind = useGameStore(s => s.selectBlind)

  return (
    <div className="title-screen ante-screen">
      <h2>Ante {currentAnte} / {TOTAL_ANTES}</h2>
      <p className="ante-money">筹码: ${money}</p>

      <div className="joker-slots">
        {activeJokers.length === 0 && (
          <div className="joker-empty-msg">暂无卡牌</div>
        )}
      </div>

      <Button id="selectBlindBtn" onClick={() => selectBlind(0)}>
        选择盲注
      </Button>
    </div>
  )
}
