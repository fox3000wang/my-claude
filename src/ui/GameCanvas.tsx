import { useEffect, useRef } from 'react';
import { Game } from '../game';

// Shared reference so HUD can call game.issueCommand
export let currentGame: Game | null = null;

interface GameCanvasProps {
  /** Pass a pre-constructed Game (e.g. from multiplayer connection in App.tsx). */
  game?: Game;
}

export function GameCanvas({ game: injectedGame }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use injected game, or create a local one
    const game = injectedGame ?? new Game();
    currentGame = game;

    // Only call init once — if the injected game was already initialised, skip
    if (!injectedGame) {
      const { width, height } = container.getBoundingClientRect();
      game.init(container, width, height);
    }

    game.start();

    const handleResize = () => {
      const { width: w, height: h } = container.getBoundingClientRect();
      game.resize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      // Only dispose if this canvas owns the game
      if (!injectedGame) {
        game.dispose();
      }
      currentGame = null;
    };
  }, [injectedGame]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
  );
}
