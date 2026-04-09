import type { Joker, JokerEffect } from '../../types/joker'
import './JokerSlot.css'

export interface JokerSlotProps {
  joker?: Joker
  triggered?: boolean
  contrib?: { mult?: number; bonus?: number }
}

function formatEffect(effect: JokerEffect): string {
  const { type, mult, bonus, hands, money, value, bonus_per } = effect

  switch (type) {
    case 'score_mult':
      return mult != null ? `+${mult} Mult` : ''
    case 'flat_mult':
      return mult != null ? `+${mult} Mult` : ''
    case 'flat_bonus':
      return bonus != null ? `+${bonus} Bonus` : ''
    case 'hand_mult':
      return hands?.[0] && mult != null ? `${hands[0]} +${mult} Mult` : ''
    case 'hand_mult_bonus':
      return hands?.[0] && mult != null && bonus != null
        ? `${hands[0]} +${mult} Mult +${bonus} Bonus`
        : hands?.[0] && mult != null
          ? `${hands[0]} +${mult} Mult`
          : ''
    case 'mult_boost':
      return mult != null ? `×(1+${mult}) Score` : ''
    case 'draw':
      return value != null ? `+${value} 抽牌` : ''
    case 'money':
      return money != null ? `+$ ${money}` : ''
    case 'money_mult':
      return mult != null ? `金钱 ×${mult}` : ''
    case 'money_bonus':
      return bonus != null ? `+$ ${bonus}` : ''
    case 'count_mult':
      return mult != null ? `+${mult} Mult` : ''
    case 'count_bonus':
      return bonus != null ? `+${bonus} Bonus` : ''
    case 'value_mult':
      return mult != null ? `+${mult} Mult` : ''
    case 'even_mult':
      return mult != null ? `+${mult} Mult` : ''
    case 'odd_bonus':
      return bonus != null ? `+${bonus} Bonus` : ''
    case 'suit_diverse_mult':
      return mult != null ? `+${mult} Mult` : ''
    case 'last_hand_mult':
      return mult != null ? `+${mult} Mult` : ''
    case 'passive':
      return bonus_per != null ? `+${bonus_per}% Bonus` : ''
    default:
      return ''
  }
}

export function JokerSlot({ joker, triggered = false, contrib }: JokerSlotProps) {
  if (!joker) {
    return <div className="joker-slot empty" aria-label="空槽位"><span className="joker-empty-msg">暂无</span></div>
  }

  const classes = [
    'joker-slot',
    `rarity-${joker.rarity}`,
    triggered && 'triggered',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      aria-label={`${joker.name}, ${joker.rarity}`}
    >
      <span className="joker-id">{joker.id}</span>
      <span className="joker-name">{joker.name}</span>
      <span className="joker-effect">{formatEffect(joker.effect)}</span>

      {contrib && (
        <div className="joker-contrib">
          {contrib.mult != null && contrib.mult > 0 && (
            <span className="joker-badge mult">+{contrib.mult}</span>
          )}
          {contrib.bonus != null && contrib.bonus > 0 && (
            <span className="joker-badge bonus">+{contrib.bonus}</span>
          )}
        </div>
      )}
    </div>
  )
}
