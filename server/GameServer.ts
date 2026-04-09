import type { WebSocket } from 'ws';
import type { FrameCommand, ClientMessage, ServerMessage, PlayerInfo } from './types';

const TICK_RATE = 10; // ticks per second

export class GameServer {
  private clients = new Map<WebSocket, { playerId: number; name: string; isSpectator: boolean }>();
  private commandLog: FrameCommand[] = [];
  private pendingCommands: Map<number, FrameCommand> = new Map();
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private currentFrame = 0;
  private nextPlayerId = 0;

  start(): void {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => this.tick(), 1000 / TICK_RATE);
    console.log(`[GameServer] Started at ${TICK_RATE} tick/s`);
  }

  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  handleConnection(ws: WebSocket): void {
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as ClientMessage;
        this.handleMessage(ws, msg);
      } catch (e) {
        console.error('[GameServer] Invalid message:', e);
      }
    });

    ws.on('close', () => {
      const client = this.clients.get(ws);
      if (client) {
        this.clients.delete(ws);
        this.broadcast({
          type: 'player_left',
          playerId: client.playerId,
        });
        console.log(`[GameServer] Player ${client.name} (id=${client.playerId}) disconnected`);
      }
    });

    ws.on('error', (err) => {
      console.error('[GameServer] WebSocket error:', err);
    });
  }

  private handleMessage(ws: WebSocket, msg: ClientMessage): void {
    if (msg.type === 'join') {
      const playerId = msg.asSpectator ? -1 : this.nextPlayerId++;
      const isSpectator = msg.asSpectator;

      this.clients.set(ws, { playerId, name: msg.name, isSpectator });

      const players: PlayerInfo[] = [];
      for (const [, info] of this.clients) {
        players.push({ id: info.playerId, name: info.name, isSpectator: info.isSpectator });
      }

      // Send welcome to the joining client
      const welcome: ServerMessage = {
        type: 'welcome',
        playerId,
        isSpectator,
        frame: this.currentFrame,
        players,
      };
      ws.send(JSON.stringify(welcome));

      // Notify others
      if (!isSpectator) {
        this.broadcastOthers(ws, {
          type: 'player_joined',
          playerId,
          name: msg.name,
        });
      }

      // Send recent commands to new player (for catch-up)
      const recentCommands = this.commandLog.slice(-100);
      if (recentCommands.length > 0) {
        ws.send(JSON.stringify({
          type: 'tick',
          frame: this.currentFrame,
          commands: recentCommands,
        }));
      }

      console.log(`[GameServer] ${msg.name} joined as ${isSpectator ? 'spectator' : 'player id=' + playerId}`);
    }

    if (msg.type === 'command') {
      const client = this.clients.get(ws);
      if (!client || client.isSpectator) return;

      const cmd: FrameCommand = {
        frame: this.currentFrame,
        playerId: client.playerId,
        actions: msg.actions,
      };

      this.pendingCommands.set(client.playerId, cmd);
      this.commandLog.push(cmd);

      // Broadcast to all clients immediately for responsiveness
      this.broadcast({
        type: 'tick',
        frame: this.currentFrame,
        commands: [cmd],
      });
    }
  }

  private tick(): void {
    this.currentFrame++;
    // Collect all pending commands for this frame
    const frameCommands: FrameCommand[] = [];
    for (const [, cmd] of this.pendingCommands) {
      frameCommands.push(cmd);
    }
    this.pendingCommands.clear();

    if (frameCommands.length > 0) {
      this.commandLog.push(...frameCommands);
      this.broadcast({
        type: 'tick',
        frame: this.currentFrame,
        commands: frameCommands,
      });
    }
  }

  private broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const [ws] of this.clients) {
      if (ws.readyState === 1) { // OPEN
        ws.send(data);
      }
    }
  }

  private broadcastOthers(sender: WebSocket, msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const [ws] of this.clients) {
      if (ws !== sender && ws.readyState === 1) {
        ws.send(data);
      }
    }
  }

  getCommandLog(): FrameCommand[] {
    return this.commandLog;
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  getPlayers(): PlayerInfo[] {
    const players: PlayerInfo[] = [];
    for (const [, info] of this.clients) {
      players.push({ id: info.playerId, name: info.name, isSpectator: info.isSpectator });
    }
    return players;
  }
}
