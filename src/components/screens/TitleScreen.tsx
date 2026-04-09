import { useGameStore } from '../../store/gameStore'
import { Button } from '../ui/Button'

const SUITS = ['♠', '♥', '♦', '♣', '♠']

export function TitleScreen() {
  const startGame = useGameStore(s => s.startGame)

  return (
    <div className="title-screen">
      <h1>🃏 小丑牌</h1>
      <p className="subtitle">打出扑克牌，获得分数，击败盲注！</p>
      <div className="title-cards" aria-hidden="true">
        {SUITS.map((suit, i) => (
          <div key={i} className={`mini-card suit-${['spade', 'heart', 'diamond', 'club', 'spade'][i]}`}>
            {suit}
          </div>
        ))}
      </div>
      <Button id="startBtn" onClick={startGame}>开始游戏</Button>
    </div>
  )
}
