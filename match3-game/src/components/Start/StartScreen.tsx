import { motion } from 'framer-motion';
import { TILE_EMOJIS, TILE_COLORS } from '../../constants/gameConfig';
import './StartScreen.css';

interface StartScreenProps {
  onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  const animals = ['cat', 'dog', 'rabbit', 'panda', 'fox'] as const;

  return (
    <div className="start-screen">
      {/* 标题 */}
      <motion.h1
        className="start-title"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        开心消消乐
      </motion.h1>

      {/* 5只动物糖果球 */}
      <div className="animals-row">
        {animals.map((type, i) => {
          const color = TILE_COLORS[type];
          const dark = shadeColor(color.primary, -30);
          return (
            <motion.div
              key={type}
              className="animal-ball"
              style={{
                background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55) 0%, ${color.primary}99 45%, ${dark}BB 100%)`,
                boxShadow: `0 0 14px ${color.glow}, 0 4px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.5)`,
              }}
              initial={{ opacity: 0, y: 40, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.5, ease: 'backOut' }}
            >
              <span className="animal-emoji">{TILE_EMOJIS[type]}</span>
            </motion.div>
          );
        })}
      </div>

      {/* 开始按钮 */}
      <motion.button
        className="start-btn"
        onClick={onStart}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        ✨ 开始游戏 ✨
      </motion.button>
    </div>
  );
}

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
