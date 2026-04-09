import type { Card as CardType } from '../../types/card'
import { Card } from './Card'

interface CardContainerProps {
  cards: CardType[]
  selectedIds: string[]
  onSelect: (cardId: string) => void
  maxSelectable?: number
  label?: string
}

export function CardContainer({
  cards,
  selectedIds,
  onSelect,
  label,
}: CardContainerProps) {
  return (
    <div className="hand-area">
      {label && <div className="hand-label">{label}</div>}
      <div className="cards-container">
        {cards.map((card) => (
          <Card
            key={card.id}
            card={card}
            selected={selectedIds.includes(card.id)}
            onClick={() => onSelect(card.id)}
          />
        ))}
      </div>
    </div>
  )
}
