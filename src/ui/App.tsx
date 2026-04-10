import { useState, useEffect, useCallback, useRef } from 'react';
import type { Entity } from '../core/ecs/Entity';
import { Game } from '../game';
import { WebSocketFrameSyncAdapter } from '../adapters/WebSocketFrameSyncAdapter';
import type { FrameSyncAdapter } from '../adapters/FrameSyncAdapter';
import { ReplayRecorder } from '../replay/ReplayRecorder';
import { ReplayPlayer, type ReplayState } from '../replay/ReplayPlayer';
import type { ReplayFile } from '../replay/types';
import { GameCanvas } from './GameCanvas';
import { HUD } from './HUD/HUD';
import { ErrorBoundary } from './ErrorBoundary';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

export function App() {
  const [game, setGame] = useState<Game | undefined>(undefined);
  const [minerals] = useState(200);
  const [supplyUsed] = useState(0);
  const [supplyMax] = useState(10);
  const [selectedEntities, setSelectedEntities] = useState<Entity[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [playerName, setPlayerName] = useState('Player1');
  const [serverUrl, setServerUrl] = useState('ws://localhost:9000');
  const [joinAsSpectator, setJoinAsSpectator] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [showMultiplayer, setShowMultiplayer] = useState(false);

  // Replay state
  const [isRecording, setIsRecording] = useState(false);
  const [replayPlayer, setReplayPlayer] = useState<ReplayPlayer | null>(null);
  const [replayState, setReplayState] = useState<ReplayState>('idle');
  const [replayFrame, setReplayFrame] = useState(0);
  const [replayTotal, setReplayTotal] = useState(0);

  const recorderRef = useRef<ReplayRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selected entities from game
  useEffect(() => {
    const interval = setInterval(() => {
      if (game) {
        setSelectedEntities(game.getSelectedEntities());
      }
    }, 100);
    return () => clearInterval(interval);
  }, [game]);

  const handleConnect = useCallback(() => {
    if (game) {
      game.dispose();
      setGame(undefined);
    }

    const adapter = new WebSocketFrameSyncAdapter();
    adapter.connect(serverUrl);

    adapter.onWelcome((_playerId, spectator) => {
      setConnectionStatus('connected');
      setIsSpectator(spectator);
      adapter.join(playerName, joinAsSpectator);
    });

    setConnectionStatus('connecting');

    const newGame = new Game(adapter as FrameSyncAdapter);
    setGame(newGame);
  }, [serverUrl, playerName, game]);

  const handleDisconnect = useCallback(() => {
    if (game) {
      game.dispose();
    }
    setGame(undefined);
    setConnectionStatus('idle');
    setIsSpectator(false);
  }, [game]);

  // Start/stop replay recording
  const handleStartRecording = useCallback(() => {
    if (isRecording && recorderRef.current) {
      recorderRef.current.stopRecording();
      recorderRef.current.download(`replay-${Date.now()}.json`);
      setIsRecording(false);
      return;
    }

    if (game) {
      // Wrap the game's frameSync with a recorder
      const originalAdapter = (game as any).frameSync;
      const recorder = new ReplayRecorder(originalAdapter);
      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
    }
  }, [isRecording, game]);

  // Load and play a replay file
  const handleLoadReplay = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !game) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const replay = JSON.parse(e.target?.result as string) as ReplayFile;
        const player = new ReplayPlayer(game, replay);
        player.setStateChangeCallback((state, frame, total) => {
          setReplayState(state);
          setReplayFrame(frame);
          setReplayTotal(total);
        });
        setReplayPlayer(player);
        player.play();
      } catch {
        console.error('[Replay] Failed to parse replay file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [game]);

  const handleReplayPlay = useCallback(() => {
    replayPlayer?.play();
  }, [replayPlayer]);

  const handleReplayPause = useCallback(() => {
    replayPlayer?.pause();
  }, [replayPlayer]);

  const handleReplayStop = useCallback(() => {
    replayPlayer?.stop();
    setReplayPlayer(null);
    setReplayState('idle');
    setReplayFrame(0);
    setReplayTotal(0);
  }, [replayPlayer]);

  const handleReplaySeek = useCallback((frame: number) => {
    replayPlayer?.seek(frame);
  }, [replayPlayer]);

  const statusColor = {
    idle: '#888',
    connecting: '#ffaa00',
    connected: '#00ff88',
    disconnected: '#ff4444',
  }[connectionStatus] as string;

  const replayProgress = replayTotal > 0 ? (replayFrame / replayTotal) * 100 : 0;

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
      <ErrorBoundary>
        <GameCanvas game={game} />
      </ErrorBoundary>

      {/* Top-right toolbar */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 100, display: 'flex', gap: 8 }}>
        {/* Record / Stop Recording */}
        <button
          onClick={handleStartRecording}
          disabled={!game}
          title={isRecording ? 'Stop Recording' : 'Record Replay'}
          style={{
            background: isRecording ? '#dc2626' : '#1a1a2e',
            border: `1px solid ${isRecording ? '#dc2626' : '#333'}`,
            borderRadius: 6,
            color: isRecording ? '#fff' : '#aaa',
            padding: '6px 12px',
            fontSize: 12,
            cursor: game ? 'pointer' : 'not-allowed',
            opacity: game ? 1 : 0.5,
          }}
        >
          {isRecording ? 'Stop Rec' : 'Rec'}
        </button>

        {/* Play Replay */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!game || replayState === 'playing'}
          title="Play Replay"
          style={{
            background: '#1a1a2e',
            border: '1px solid #333',
            borderRadius: 6,
            color: '#aaa',
            padding: '6px 12px',
            fontSize: 12,
            cursor: game && replayState !== 'playing' ? 'pointer' : 'not-allowed',
            opacity: game && replayState !== 'playing' ? 1 : 0.5,
          }}
        >
          Play
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleLoadReplay}
        />

        {/* Multiplayer toggle */}
        <button
          onClick={() => setShowMultiplayer(!showMultiplayer)}
          style={{
            background: showMultiplayer ? '#2563eb' : '#1a1a2e',
            border: `1px solid ${showMultiplayer ? '#2563eb' : '#333'}`,
            borderRadius: 6,
            color: '#aaa',
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          {showMultiplayer ? 'Net ✕' : 'Net'}
        </button>
      </div>

      {/* Replay playback bar */}
      {replayPlayer && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 200,
            background: '#0d1117',
            borderTop: '1px solid #30363d',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            onClick={replayState === 'playing' ? handleReplayPause : handleReplayPlay}
            style={{
              background: '#238636',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              padding: '4px 12px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {replayState === 'playing' ? '⏸' : '▶'}
          </button>

          <button
            onClick={handleReplayStop}
            style={{
              background: '#21262d',
              border: '1px solid #30363d',
              borderRadius: 4,
              color: '#c9d1d9',
              padding: '4px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>

          <span style={{ color: '#8b949e', fontSize: 11, minWidth: 60 }}>
            {replayFrame} / {replayTotal}
          </span>

          <div style={{ flex: 1, position: 'relative', height: 4, background: '#21262d', borderRadius: 2 }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${replayProgress}%`,
                background: '#58a6ff',
                borderRadius: 2,
                transition: 'width 0.1s linear',
              }}
            />
            <input
              type="range"
              min={0}
              max={replayTotal}
              value={replayFrame}
              onChange={(e) => handleReplaySeek(Number(e.target.value))}
              style={{
                position: 'absolute',
                top: '-4px',
                left: 0,
                width: '100%',
                height: 12,
                opacity: 0,
                cursor: 'pointer',
              }}
            />
          </div>

          <span style={{ color: '#8b949e', fontSize: 11, textTransform: 'capitalize' }}>
            {replayState}
          </span>
        </div>
      )}

      {/* Multiplayer panel */}
      {showMultiplayer && (
        <div
          style={{
            position: 'absolute',
            top: 48,
            right: 12,
            zIndex: 100,
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: 8,
            padding: 16,
            width: 280,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>
            NETWORK GAME
          </div>

          {/* Connection status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
            <span style={{ color: statusColor, textTransform: 'capitalize' }}>{connectionStatus}</span>
          </div>

          {/* Server URL */}
          <div>
            <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Server</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              disabled={connectionStatus === 'connected'}
              style={{
                width: '100%',
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: 4,
                color: '#e5e7eb',
                padding: '5px 8px',
                fontSize: 12,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Player name */}
          <div>
            <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Player Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              disabled={connectionStatus === 'connected'}
              maxLength={16}
              style={{
                width: '100%',
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: 4,
                color: '#e5e7eb',
                padding: '5px 8px',
                fontSize: 12,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Spectator toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9ca3af', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={joinAsSpectator}
              onChange={(e) => setJoinAsSpectator(e.target.checked)}
              disabled={connectionStatus === 'connected'}
            />
            Join as Spectator
          </label>

          {/* Connect / Disconnect button */}
          {connectionStatus !== 'connected' ? (
            <button
              onClick={handleConnect}
              style={{
                background: '#2563eb',
                border: 'none',
                borderRadius: 4,
                color: '#fff',
                padding: '7px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Connect
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              style={{
                background: '#dc2626',
                border: 'none',
                borderRadius: 4,
                color: '#fff',
                padding: '7px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Disconnect
            </button>
          )}
        </div>
      )}

      <HUD
        minerals={minerals}
        supplyUsed={supplyUsed}
        supplyMax={supplyMax}
        selectedEntities={selectedEntities}
        isSpectator={isSpectator}
        onCommand={(cmd) => game?.issueCommand(cmd)}
      />
    </div>
  );
}
