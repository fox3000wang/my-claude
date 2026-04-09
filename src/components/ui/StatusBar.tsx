
const BLIND_NAMES = ['Small', 'Big', 'Boss']

interface StatusBarProps {
  ante: number
  blind: number
  targetScore: number
  currentScore: number
  handsRemaining: number
  money?: number
}

export function StatusBar({ ante, blind, targetScore, currentScore, handsRemaining, money = 0 }: StatusBarProps) {
  const blindName = BLIND_NAMES[blind] ?? 'Small'

  return (
    <div className="status-bar">
      <div className="status-item">
        <span className="status-label">Ante</span>
        <span className="status-value">{ante}</span>
      </div>
      <div className="status-item">
        <span className="status-label">Blind</span>
        <span className="status-value">{blindName}</span>
      </div>
      <div className="status-item">
        <span className="status-label">Score</span>
        <span className="status-value">
          <span id="currentScore" className="status-value current">{currentScore}</span>
          {' / '}
          <span className="status-value target">{targetScore}</span>
        </span>
      </div>
      <div className="status-item">
        <span className="status-label">Hands</span>
        <span className="status-value hands">{handsRemaining}x</span>
      </div>
      <div className="status-item">
        <span className="status-label">Money</span>
        <span className="status-value">${money}</span>
      </div>
    </div>
  )
}
