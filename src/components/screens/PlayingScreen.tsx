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

const handEvaluator = new HandEvaluator()
const scoringEngine = new ScoringEngine()

function computePreview(
  selectedCards: ReturnType<typeof useGameStore.getState>['selectedCards'],
  activeJokers: ReturnType<typeof useGameStore.getState>['activeJokers']
) {
  if (selectedCards.length === 0) return null

  const result = handEvaluator.evaluate(selectedCards)
  const previewJokerSystem = new JokerSystem(activeJokers)
  const jokerCtx = previewJokerSystem.computeContext(result)
  const score = scoringEngine.calculate(result, jokerCtx)
  const jokerContrib = score.triggered.map(t => ({
    id: t.jokerId,
    mult: t.jokerMult || 0,
    bonus: t.jokerBonus || 0,
  }))
  return { result, score, jokerContrib }
}

export function PlayingScreen() {
  const ante = useGameStore(s => s.currentAnte)
  const blindIndex = useGameStore(s => s.currentBlindIndex)
  const targetScore = useGameStore(s => s.targetScore)
  const totalScore = useGameStore(s => s.totalScore)
  const handsRemaining = useGameStore(s => s.handsRemaining)
  const discardsRemaining = useGameStore(s => s.discardsRemaining)
  const hand = useGameStore(s => s.hand)
  const selectedCards = useGameStore(s => s.selectedCards)
  const activeJokers = useGameStore(s => s.activeJokers)
  const money = useGameStore(s => s.money)
  const selectCard = useGameStore(s => s.selectCard)
  const playHand = useGameStore(s => s.playHand)
  const discardHand = useGameStore(s => s.discardHand)
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
        discardsRemaining={discardsRemaining}
        money={money}
      />
      <ProgressBar current={totalScore} target={targetScore} />

      {preview ? (
        <ScorePanel
          handType={preview.result.type.name}
          baseScore={preview.score.base}
          faceValue={preview.score.faceValue}
          mult={preview.score.mult}
          boostFactor={preview.score.boostFactor}
          bonus={preview.score.bonus}
          jokerContrib={preview.jokerContrib}
          isPreview
        />
      ) : (
        <ScorePanel isPreview />
      )}

      <p className="hand-label">已选 {selectedCards.length} 张</p>
      <CardContainer
        cards={hand}
        selectedIds={selectedCards.map(c => c.id)}
        onSelect={selectCard}
        maxSelectable={5}
      />

      <JokerArea jokers={activeJokers} />

      <div className="actions">
        <Button id="playBtn" onClick={playHand} disabled={selectedCards.length === 0}>
          {selectedCards.length > 0 ? `${selectedCards.length}张` : '出牌'}
        </Button>
        <Button
          variant="secondary"
          onClick={discardHand}
          disabled={selectedCards.length === 0 || discardsRemaining <= 0}
        >
          弃牌 {discardsRemaining > 0 ? `(${discardsRemaining})` : ''}
        </Button>
        <Button variant="secondary" onClick={() => sortHand('rank')}>
          理牌
        </Button>
      </div>

      <p className="action-hint">按空格键出牌</p>
    </div>
  )
}
