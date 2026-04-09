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
  maxSelectable,
  label,
}: CardContainerProps) {
  return (
    <div className="hand-area">
      {label && <div className="hand-label">{label}</div>}
      <div className="cards-container">
        {cards.map((card) => {
          const isSelected = selectedIds.includes(card.id)
          const canSelect =
            isSelected || (maxSelectable === undefined || selectedIds.length < maxSelectable)
          return (
            <Card
              key={card.id}
              card={card}
              selected={isSelected}
              onClick={() => {
                if (canSelect) onSelect(card.id)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
