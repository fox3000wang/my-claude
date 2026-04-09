import React from 'react';
import type { Entity } from '../../core/ecs/Entity';
import type { Unit } from '../../components/Unit';
import type { Health } from '../../components/Health';

interface Props {
  selectedEntities: Entity[];
  onCommand?: (cmd: 'attack' | 'move' | 'stop') => void;
}

const cmdButtonStyle: React.CSSProperties = {
  padding: '4px 12px',
  background: 'rgba(180, 60, 60, 0.8)',
  border: '1px solid rgba(255, 100, 100, 0.5)',
  borderRadius: 3,
  color: '#ffcccc',
  fontFamily: 'monospace',
  fontSize: 11,
  cursor: 'pointer',
  userSelect: 'none',
};

export function SelectionPanel({ selectedEntities, onCommand }: Props) {
  if (selectedEntities.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: 'rgba(200,220,255,0.4)',
        fontSize: 12, fontFamily: 'monospace'
      }}>
        [ No units selected ]
      </div>
    );
  }

  const first = selectedEntities[0];
  const unit = first.getComponent<Unit>('Unit');
  const health = first.getComponent<Health>('Health');

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px' }}>
      {selectedEntities.length > 1 && (
        <div style={{ color: '#aaccee', fontFamily: 'monospace', fontSize: 12 }}>
          {selectedEntities.length} units
        </div>
      )}
      {unit && (
        <div style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold' }}>
          {unit.unitType.toUpperCase()}
        </div>
      )}
      {health && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ color: '#aaaaaa', fontFamily: 'monospace', fontSize: 10 }}>
            HP: {health.current}/{health.max}
          </div>
          <div style={{ width: 80, height: 4, background: '#333', borderRadius: 2 }}>
            <div style={{
              width: `${(health.current / health.max) * 100}%`,
              height: '100%',
              background: health.current / health.max > 0.5 ? '#44ff44' : '#ffaa00',
              borderRadius: 2,
            }} />
          </div>
        </div>
      )}
      {onCommand && (
        <button style={cmdButtonStyle} onClick={() => onCommand('attack')}>
          ATTACK
        </button>
      )}
    </div>
  );
}
