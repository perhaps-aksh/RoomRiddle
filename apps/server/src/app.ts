import { createServer, type Server, type ServerResponse } from 'node:http';
import { mysteryCatalog } from '@roomriddle/mystery-data';

/**
 * HTTP entry point for the game server. Phase 1 exposes only a health check.
 * Rooms, WebSockets and the authoritative game loop are added in Phase 4
 * under src/rooms, src/websocket and src/game.
 */
export function createAppServer(): Server {
  return createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, {
        status: 'ok',
        service: 'roomriddle-server',
        mysteries: mysteryCatalog.length,
      });
      return;
    }
    sendJson(res, 404, { error: 'not_found' });
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
