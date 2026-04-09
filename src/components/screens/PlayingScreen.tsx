import { useMemo } from 'react'
import { useGameStore } from '../../store/gameStore'
import { HandEvaluator, ScoringEngine } from '../../engine'
import { JokerSystem } from '../../engine/JokerSystem'
import { StatusBar } from '../ui/StatusBar'
import { ProgressBar } from '../ui/ProgressBar'
import { ScorePanel } from '../ui/ScorePanel'
import { CardContainer } from '../card/CardContainer'
import { JokerArea } from '../joker/JokerArea'
import { Button } from '../ui/Button'
import { JokerContext } from '../../types/scoring'

const handEvaluator = new HandEvaluator()
const scoringEngine = new ScoringEngine()
const previewJokerSystem = new JokerSystem()

function computePreview(
  selectedCards: ReturnType<typeof useGameStore.getState>['selectedCards'],
  activeJokers: ReturnType<typeof useGameStore.getState>['activeJokers']
) {
  if (selectedCards.length === 0) return null

  const result = handEvaluator.evaluate(selectedCards)
  const jokerCtx: JokerContext = {
    jokers: activeJokers,
    activeJokerIds: activeJokers.map(j => j.id),
    handType: result.type.name,
    cardCount: selectedCards.length,
    isLastHand: false,
    triggeredEffects: [],
  }
  const score = scoringEngine.calculate(result, jokerCtx)
  return { result, score }
}

export function PlayingScreen() {
  const ante = useGameStore(s => s.currentAnte)
  const blindIndex = useGameStore(s => s.currentBlindIndex)
  const targetScore = useGameStore(s => s.targetScore)
  const totalScore = useGameStore(s => s.totalScore)
  const handsRemaining = useGameStore(s => s.handsRemaining)
  const hand = useGameStore(s => s.hand)
  const selectedCards = useGameStore(s => s.selectedCards)
  const activeJokers = useGameStore(s => s.activeJokers)
  const selectCard = useGameStore(s => s.selectCard)
  const playHand = useGameStore(s => s.playHand)
  const sortHand = useGameStore(s => s.sortHand)

  const preview = useMemo(
    () => computePreview(selectedCards, activeJokers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCards, activeJokers]
  )

  return (
    <div className="playing-screen">
      <StatusBar
        ante={ante}
        blind={blindIndex}
        targetScore={targetScore}
        currentScore={totalScore}
        handsRemaining={handsRemaining}
      />
      <ProgressBar current={totalScore} target={targetScore} />

      {preview ? (
        <ScorePanel
          handType={preview.result.type.name}
          baseScore={preview.score.baseScore}
          faceValue={preview.score.faceValue}
          mult={preview.score.mult}
          boostFactor={preview.score.boostFactor}
          bonus={preview.score.bonus}
          jokerContrib={preview.score.jokerContrib}
          isPreview
        />
      ) : (
        <ScorePanel isPreview />
      )}

      <CardContainer
        cards={hand}
        selectedIds={selectedCards.map(c => c.id)}
        onSelect={selectCard}
        maxSelectable={5}
      />

      <JokerArea jokers={activeJokers} />

      <div className="actions">
        <Button onClick={playHand} disabled={selectedCards.length === 0}>
          出牌
        </Button>
        <Button variant="secondary" onClick={() => sortHand('rank')}>
          理牌
        </Button>
      </div>

      <p className="action-hint">按空格键出牌</p>
    </div>
  )
}
