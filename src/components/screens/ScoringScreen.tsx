import { useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import { StatusBar } from '../ui/StatusBar'
import { ProgressBar } from '../ui/ProgressBar'
import { ScorePanel } from '../ui/ScorePanel'
import { Button } from '../ui/Button'

export function ScoringScreen() {
  const ante = useGameStore(s => s.currentAnte)
  const blindIndex = useGameStore(s => s.currentBlindIndex)
  const targetScore = useGameStore(s => s.targetScore)
  const totalScore = useGameStore(s => s.totalScore)
  const handsRemaining = useGameStore(s => s.handsRemaining)
  const lastResult = useGameStore(s => s.lastResult)
  const lastScore = useGameStore(s => s.lastScore)
  const continueGame = useGameStore(s => s.continueGame)

  useEffect(() => {
    const timer = setTimeout(() => continueGame(), 1500)
    return () => clearTimeout(timer)
  }, [continueGame])

  return (
    <div className="scoring-screen">
      <StatusBar
        ante={ante}
        blind={blindIndex}
        targetScore={targetScore}
        currentScore={totalScore}
        handsRemaining={handsRemaining}
      />
      <ProgressBar current={totalScore} target={targetScore} />

      {lastResult && lastScore ? (
        <ScorePanel
          handType={lastResult.type.name}
          baseScore={lastScore.baseScore}
          faceValue={lastScore.faceValue}
          mult={lastScore.mult}
          boostFactor={lastScore.boostFactor}
          bonus={lastScore.bonus}
          jokerContrib={lastScore.jokerContrib}
        />
      ) : (
        <ScorePanel />
      )}

      <div className="actions">
        <Button onClick={continueGame}>继续</Button>
      </div>
    </div>
  )
}
