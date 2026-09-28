import {createReadStream, existsSync, statSync} from 'node:fs';
import {createServer, type Server, type ServerResponse} from 'node:http';
import {extname, join, normalize, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mysteryCatalog} from '@roomriddle/mystery-data';

/** Built player web app (apps/player/dist), served to phones at / and /join/<code>. */
export const DEFAULT_PLAYER_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../player/dist');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

export interface AppServerOptions {
  /** Where the built player app lives. Missing directory = API only. */
  playerDir?: string;
  /** Live counts for /health. */
  stats?: () => {rooms: number; connections: number};
}

/**
 * HTTP side of the game server: health check plus the phone web app, so one
 * address serves both (phones open http://<lan-ip>:4000/join/4827).
 * WebSockets are attached separately (src/websocket/server.ts).
 */
export function createAppServer(options: AppServerOptions = {}): Server {
  const playerDir = options.playerDir ?? DEFAULT_PLAYER_DIR;
  return createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendJson(res, 405, {error: 'method_not_allowed'});
      return;
    }
    if (url.pathname === '/health') {
      sendJson(res, 200, {
        status: 'ok',
        service: 'roomriddle-server',
        mysteries: mysteryCatalog.length,
        ...(options.stats ? options.stats() : {}),
      });
      return;
    }
    if (servePlayerApp(res, playerDir, url.pathname)) return;
    sendJson(res, 404, {error: 'not_found'});
  });
}

/** Static files, with the app shell for / and /join/<code>. False if not served. */
function servePlayerApp(res: ServerResponse, root: string, pathname: string): boolean {
  if (!existsSync(join(root, 'index.html'))) return false;
  const isAppRoute = pathname === '/' || /^\/join\/[^/]*\/?$/.test(pathname);
  let relative: string;
  try {
    relative = isAppRoute ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  } catch {
    return false;
  }
  const file = normalize(join(root, relative));
  if (file !== root && !file.startsWith(root + sep)) return false; // path traversal
  if (!existsSync(file) || !statSync(file).isFile()) return false;
  res.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': isAppRoute ? 'no-cache' : 'public, max-age=300',
  });
  createReadStream(file).pipe(res);
  return true;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {'content-type': 'application/json; charset=utf-8'});
  res.end(JSON.stringify(body));
}
