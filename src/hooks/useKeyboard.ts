import { useEffect } from 'react'
import { useGameStore } from '../store'

export function useKeyboard() {
  const screen = useGameStore(s => s.screen)
  const selectedCards = useGameStore(s => s.selectedCards)
  const playHand = useGameStore(s => s.playHand)
  const selectCard = useGameStore(s => s.selectCard)
  const sortHand = useGameStore(s => s.sortHand)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (screen !== 'PLAYING') return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (selectedCards.length > 0) playHand()
          break
        case 'KeyR':
          sortHand('rank')
          break
        case 'KeyS':
          sortHand('suit')
          break
        case 'Escape':
          // deselect all
          selectedCards.forEach(c => selectCard(c.id))
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [screen, selectedCards, playHand, selectCard, sortHand])
}
