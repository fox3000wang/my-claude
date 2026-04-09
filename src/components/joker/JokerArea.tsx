import type { Joker } from '../../types/joker'
import { JokerSlot } from './JokerSlot'

export interface JokerAreaProps {
  jokers: Joker[]
  triggeredIds?: string[]
  contributions?: Array<{ id: string; mult?: number; bonus?: number }>
  maxSlots?: number
}

export function JokerArea({
  jokers,
  triggeredIds = [],
  contributions = [],
  maxSlots = 5,
}: JokerAreaProps) {
  // Build a map from id -> contribution for quick lookup
  const contribMap = new Map<string, { mult?: number; bonus?: number }>()
  for (const c of contributions) {
    contribMap.set(c.id, { mult: c.mult, bonus: c.bonus })
  }

  const slots = Array.from({ length: maxSlots }, (_, i) => {
    const joker = jokers[i]
    const triggered = joker ? triggeredIds.includes(joker.id) : false
    const contrib = joker ? contribMap.get(joker.id) : undefined
    return { joker, triggered, contrib }
  })

  return (
    <div className="joker-area" aria-label="Joker 区域">
      <div className="joker-slots">
        {slots.map(({ joker, triggered, contrib }, i) => (
          <JokerSlot
            key={joker?.id ?? `empty-${i}`}
            joker={joker}
            triggered={triggered}
            contrib={contrib}
          />
        ))}
      </div>
    </div>
  )
}
