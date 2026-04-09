import { GameCanvas } from './GameCanvas';
import { HUD } from './HUD/HUD';

export function App() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#0a0a1a',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <GameCanvas />
      <HUD />
    </div>
  );
}
