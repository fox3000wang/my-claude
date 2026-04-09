import { useGameStore } from '../store'
import { TitleScreen } from './screens/TitleScreen'
import { AnteSelect } from './screens/AnteSelect'
import { BlindSelect } from './screens/BlindSelect'
import { PlayingScreen } from './screens/PlayingScreen'
import { ScoringScreen } from './screens/ScoringScreen'
import { ShopScreen } from './screens/ShopScreen'
import { GameOverScreen } from './screens/GameOverScreen'
import { VictoryScreen } from './screens/VictoryScreen'
import { useKeyboard } from '../hooks/useKeyboard'

export function Game() {
  useKeyboard()
  const screen = useGameStore(s => s.screen)

  switch (screen) {
    case 'TITLE':       return <TitleScreen />
    case 'ANTE_SELECT': return <AnteSelect />
    case 'BLIND_SELECT': return <BlindSelect />
    case 'PLAYING':     return <PlayingScreen />
    case 'SCORING':     return <ScoringScreen />
    case 'SHOP':        return <ShopScreen />
    case 'GAME_OVER':   return <GameOverScreen />
    case 'VICTORY':     return <VictoryScreen />
    default:            return <TitleScreen />
  }
}
