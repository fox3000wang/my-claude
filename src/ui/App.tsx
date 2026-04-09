import { useState } from 'react';
import type { Entity } from '../core/ecs/Entity';
import { GameCanvas, currentGame } from './GameCanvas';
import { HUD } from './HUD/HUD';

export function App() {
  const [minerals] = useState(200);
  const [supplyUsed] = useState(0);
  const [supplyMax] = useState(10);
  const [selectedEntities] = useState<Entity[]>([]);

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
      <HUD
        minerals={minerals}
        supplyUsed={supplyUsed}
        supplyMax={supplyMax}
        selectedEntities={selectedEntities}
        onCommand={(cmd) => currentGame?.issueCommand(cmd)}
      />
    </div>
  );
}
