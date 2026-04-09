import type { Entity } from '../../core/ecs/Entity';
import { SelectionPanel } from './SelectionPanel';

interface Props {
  minerals: number;
  supplyUsed: number;
  supplyMax: number;
  selectedEntities: Entity[];
  onCommand?: (cmd: 'attack' | 'move' | 'stop') => void;
}

export function HUD({ minerals, supplyUsed, supplyMax, selectedEntities, onCommand }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '120px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
        display: 'flex',
        pointerEvents: 'none',
      }}
    >
      {/* 小地图区域 */}
      <div style={{ width: 160, padding: 8 }}>
        <div
          style={{
            width: '100%', height: '100%',
            background: 'rgba(0,30,60,0.8)',
            border: '1px solid rgba(100,150,255,0.3)',
            borderRadius: 4,
          }}
        />
      </div>

      {/* 选中单位面板 */}
      <SelectionPanel selectedEntities={selectedEntities} onCommand={onCommand} />

      {/* 资源面板 */}
      <div
        style={{
          width: 200, padding: 12,
          display: 'flex', flexDirection: 'column', gap: 4,
          fontFamily: 'monospace', fontSize: 12, color: '#aaccee',
        }}
      >
        <div><span style={{ color: '#88ccff' }}>Mineral:</span> {minerals}</div>
        <div><span style={{ color: '#44ff88' }}>Supply:</span> {supplyUsed} / {supplyMax}</div>
        <div style={{ color: '#00aaff', marginTop: 4 }}>TERRAN</div>
      </div>
    </div>
  );
}
