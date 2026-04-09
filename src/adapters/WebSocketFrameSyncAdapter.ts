import type { FrameSyncAdapter, FrameCommand } from './FrameSyncAdapter';

export interface ServerMessage {
  type: 'welcome' | 'player_joined' | 'player_left' | 'tick' | 'error';
  playerId?: number;
  isSpectator?: boolean;
  frame?: number;
  players?: { id: number; name: string; isSpectator: boolean }[];
  commands?: FrameCommand[];
  message?: string;
}

export class WebSocketFrameSyncAdapter implements FrameSyncAdapter {
  private ws: WebSocket | null = null;
  private callbacks: ((command: FrameCommand) => void)[] = [];
  private _isSpectator = false;
  private _playerId = -1;
  private _isConnected = false;
  private _url = '';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private onWelcomeCallback?: (playerId: number, isSpectator: boolean, players: ServerMessage['players']) => void;

  connect(url: string): void {
    this._url = url;
    this.doConnect();
  }

  private doConnect(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
    }

    this.ws = new WebSocket(this._url);

    this.ws.onopen = () => {
      this._isConnected = true;
      console.log('[WS] Connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        this.handleMessage(msg);
      } catch (e) {
        console.error('[WS] Failed to parse message:', e);
      }
    };

    this.ws.onclose = () => {
      this._isConnected = false;
      console.log('[WS] Disconnected, reconnecting in 3s...');
      this.reconnectTimer = setTimeout(() => this.doConnect(), 3000);
    };

    this.ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }

  private handleMessage(msg: ServerMessage): void {
    if (msg.type === 'welcome') {
      this._playerId = msg.playerId ?? -1;
      this._isSpectator = msg.isSpectator ?? false;
      console.log(`[WS] Welcome: playerId=${this._playerId}, spectator=${this._isSpectator}`);
      this.onWelcomeCallback?.(this._playerId, this._isSpectator, msg.players);
    }

    if (msg.type === 'tick' && msg.commands) {
      for (const cmd of msg.commands) {
        for (const cb of this.callbacks) {
          cb(cmd);
        }
      }
    }

    if (msg.type === 'error') {
      console.error('[WS] Server error:', msg.message);
    }
  }

  sendCommand(command: FrameCommand): void {
    if (!this._isSpectator && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'command',
        frame: command.frame,
        playerId: this._playerId,
        actions: command.actions,
      }));
    }
  }

  onCommand(callback: (command: FrameCommand) => void): void {
    this.callbacks.push(callback);
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  get playerId(): number {
    return this._playerId;
  }

  get isSpectator(): boolean {
    return this._isSpectator;
  }

  onWelcome(cb: (playerId: number, isSpectator: boolean, players?: ServerMessage['players']) => void): void {
    this.onWelcomeCallback = cb;
  }

  join(name: string, asSpectator = false): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'join', name, asSpectator }));
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this._isConnected = false;
  }
}
