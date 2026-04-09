export function HUD() {
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
            width: '100%',
            height: '100%',
            background: 'rgba(0,30,60,0.8)',
            border: '1px solid rgba(100,150,255,0.3)',
            borderRadius: 4,
          }}
        />
      </div>

      {/* 建造队列区域 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(200,220,255,0.5)',
          fontSize: 12,
          fontFamily: 'monospace',
        }}
      >
        [ Select units to see build options ]
      </div>

      {/* 资源面板 */}
      <div
        style={{
          width: 200,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          fontFamily: 'monospace',
          fontSize: 12,
          color: '#aaccee',
        }}
      >
        <div>
          <span style={{ color: '#88ccff' }}>Mineral:</span> 400
        </div>
        <div>
          <span style={{ color: '#44ff88' }}>Supply:</span> 20 / 30
        </div>
      </div>
    </div>
  );
}
