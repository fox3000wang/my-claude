import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GameServer } from './GameServer';

const PORT = parseInt(process.env.PORT ?? '9000', 10);

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('StarCraft RTS WebSocket Server\n');
});

const wss = new WebSocketServer({ server: httpServer });
const gameServer = new GameServer();
gameServer.start();

wss.on('connection', (ws: WebSocket) => {
  gameServer.handleConnection(ws);
});

httpServer.listen(PORT, () => {
  console.log(`[Server] StarCraft RTS server running on http://localhost:${PORT}`);
  console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}`);
});
