import type { Card as CardType } from '../../types/card'
import './Card.css'

interface CardProps {
  card: CardType
  selected?: boolean
  onClick?: () => void
  faceDown?: boolean
}

export function Card({ card, selected = false, onClick, faceDown = false }: CardProps) {
  const classes = [
    'card',
    card.isRed ? 'red' : 'black',
    selected && 'selected',
    faceDown && 'face-down',
  ]
    .filter(Boolean)
    .join(' ')

  if (faceDown) {
    return <div className={classes} aria-label="Card face down" />
  }

  return (
    <div
      className={classes}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${card.rank} of ${card.suit}${selected ? ', selected' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      {/* Top-left corner */}
      <div className="corner top">
        <span className="rank">{card.rank}</span>
        <span className="suit">{card.suit}</span>
      </div>

      {/* Center suit */}
      <div className="center-suit">{card.suit}</div>

      {/* Bottom-right corner */}
      <div className="corner bottom">
        <span className="rank">{card.rank}</span>
        <span className="suit">{card.suit}</span>
      </div>
    </div>
  )
}
