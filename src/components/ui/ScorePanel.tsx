import React from 'react'

interface JokerContrib {
  id: string
  mult?: number
  bonus?: number
}

interface ScorePanelProps {
  handType?: string
  baseScore?: number
  faceValue?: number
  mult?: number
  bonus?: number
  jokerContrib?: JokerContrib[]
  isPreview?: boolean
}

export function ScorePanel({
  handType,
  baseScore = 0,
  faceValue = 0,
  mult = 0,
  bonus = 0,
  jokerContrib = [],
  isPreview = false,
}: ScorePanelProps) {
  const totalScore = Math.floor((baseScore + faceValue) * (1 + mult) + bonus)

  return (
    <div className="score-panel">
      {handType && (
        <div className="hand-type-display">{handType}</div>
      )}

      {handType && (mult > 0 || bonus > 0 || jokerContrib.length > 0) && (
        <div className="score-breakdown">
          <span className="score-item">
            <span>Base</span>
            <span className="value">+{baseScore}</span>
          </span>
          {faceValue > 0 && (
            <span className="score-item">
              <span>Face</span>
              <span className="value">+{faceValue}</span>
            </span>
          )}
          {mult > 0 && (
            <span className="score-item">
              <span>Mult</span>
              <span className="value">×{(1 + mult).toFixed(1)}</span>
            </span>
          )}
          {bonus > 0 && (
            <span className="score-item">
              <span>Bonus</span>
              <span className="value">+{bonus}</span>
            </span>
          )}
          {jokerContrib.map((j) => (
            <React.Fragment key={j.id}>
              {j.mult != null && j.mult > 0 && (
                <span className="joker-badge mult">J×{j.mult.toFixed(1)}</span>
              )}
              {j.bonus != null && j.bonus > 0 && (
                <span className="joker-badge bonus">J+{j.bonus}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {totalScore > 0 && (
        <div className="score-final">{totalScore}</div>
      )}

      {isPreview && totalScore > 0 && (
        <div className="score-hint">预估分数</div>
      )}
    </div>
  )
}
