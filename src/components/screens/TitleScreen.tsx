import { useGameStore } from '../../store/gameStore'
import { Button } from '../ui/Button'

const SUITS = ['♠', '♥', '♦', '♣', '♠']

export function TitleScreen() {
  const startGame = useGameStore(s => s.startGame)

  return (
    <div className="title-screen">
      <h1>🃏 小丑牌</h1>
      <div className="title-cards" aria-hidden="true">
        {SUITS.map((suit, i) => (
          <div key={i} className={`mini-card suit-${['spade', 'heart', 'diamond', 'club', 'spade'][i]}`}>
            {suit}
          </div>
        ))}
      </div>
      <Button onClick={startGame}>开始游戏</Button>
    </div>
  )
}
