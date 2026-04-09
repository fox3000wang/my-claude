import { useEffect, useRef } from 'react';
import { Game } from '../game';

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const game = new Game();
    gameRef.current = game;

    const { width, height } = container.getBoundingClientRect();
    game.init(container, width, height);
    game.start();

    const handleResize = () => {
      const { width: w, height: h } = container.getBoundingClientRect();
      game.resize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', cursor: 'grab' }}
    />
  );
}
