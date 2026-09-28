import type {IncomingMessage, Server} from 'node:http';
import {WebSocketServer, type WebSocket} from 'ws';
import type {RoomManager} from '../rooms/RoomManager';
import {ConnectionManager} from './ConnectionManager';
import {MAX_MESSAGE_BYTES} from './messages';
import {MessageRouter} from './router';

export const WEBSOCKET_PATH = '/ws';
const HEARTBEAT_MS = 10_000;
const TICK_MS = 1_000;

export interface GameSocketServer {
  connections: ConnectionManager;
  router: MessageRouter;
  close(): Promise<void>;
}

/**
 * Attaches the RoomRiddle WebSocket endpoint (/ws) to an HTTP server.
 * Transport only: frames go to the router, closes become disconnects, and a
 * heartbeat ping detects phones that vanished without closing (Wi-Fi drop).
 */
export function attachGameSocket(
  httpServer: Server,
  rooms: RoomManager,
  options: {clock?: () => number; log?: (line: string) => void} = {},
): GameSocketServer {
  const clock = options.clock ?? Date.now;
  const log = options.log ?? (() => {});
  const connections = new ConnectionManager(clock);
  const router = new MessageRouter(rooms, connections, clock, log);
  const wss = new WebSocketServer({server: httpServer, path: WEBSOCKET_PATH, maxPayload: MAX_MESSAGE_BYTES});
  const alive = new WeakMap<WebSocket, boolean>();

  wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    alive.set(socket, true);
    const connection = connections.open({
      send: data => socket.send(data),
      close: (code, reason) => socket.close(code, reason),
    });
    log(`[ws] #${connection.id} open from ${request.socket.remoteAddress ?? '?'}`);

    socket.on('pong', () => alive.set(socket, true));
    socket.on('message', (data, isBinary) => {
      if (isBinary) {
        router.handleRaw(connection, '\u0000binary');
        return;
      }
      router.handleRaw(connection, data.toString());
    });
    socket.on('close', () => {
      log(`[ws] #${connection.id} closed`);
      router.handleClose(connection);
    });
    socket.on('error', err => log(`[ws] #${connection.id} error: ${err.message}`));
  });

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (alive.get(socket) === false) {
        socket.terminate();
        continue;
      }
      alive.set(socket, false);
      socket.ping();
    }
  }, HEARTBEAT_MS);

  const ticker = setInterval(() => router.handleTick(rooms.tick(clock())), TICK_MS);

  return {
    connections,
    router,
    close: () =>
      new Promise<void>(resolve => {
        clearInterval(heartbeat);
        clearInterval(ticker);
        for (const socket of wss.clients) socket.terminate();
        wss.close(() => resolve());
      }),
  };
}
