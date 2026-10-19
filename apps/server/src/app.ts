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
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

export type VoiceClipLookup = (id: string) => {data: Buffer; mime: string} | undefined;

export interface AppServerOptions {
  /** Where the built player app lives. Missing directory = API only. */
  playerDir?: string;
  /** Live counts for /health. */
  stats?: () => {rooms: number; connections: number};
  /** Spoken replies, served at /voice/<id>. */
  voiceClip?: VoiceClipLookup;
  /** Speaks an authored line (subtitles) and resolves to its clip id, or null. */
  speak?: (text: string, voice: {edge: string; rate?: string; pitch?: string}) => Promise<string | null>;
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
    const voice = /^\/voice\/([a-f0-9]{8,40})(\.(mp3|wav|m4a))?$/.exec(url.pathname);
    if (voice) {
      const clip = options.voiceClip?.(voice[1]!);
      if (!clip) {
        sendJson(res, 404, {error: 'not_found'});
        return;
      }
      // Content-addressed (hash of voice + text): safe to cache for good. Media players ask for byte ranges.
      const headers = {'content-type': clip.mime, 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=31536000, immutable', 'access-control-allow-origin': '*'};
      const size = clip.data.length;
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
      if (range && (range[1] || range[2])) {
        const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
        const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
        if (start >= size || start > end) {
          res.writeHead(416, {'content-range': `bytes */${size}`});
          res.end();
          return;
        }
        res.writeHead(206, {...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1});
        res.end(req.method === 'HEAD' ? undefined : clip.data.subarray(start, end + 1));
        return;
      }
      res.writeHead(200, {...headers, 'content-length': size});
      res.end(req.method === 'HEAD' ? undefined : clip.data);
      return;
    }
    // Spoken subtitles: /speak?text=…&voice=en-GB-SoniaNeural[&rate=-4%&pitch=-8%] → a 302 to its /voice clip.
    if (url.pathname === '/speak' && options.speak) {
      const text = (url.searchParams.get('text') ?? '').trim();
      const voice = url.searchParams.get('voice') ?? '';
      if (!text || text.length > 400 || !/^[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural$/.test(voice)) {
        sendJson(res, 400, {error: 'bad_request'});
        return;
      }
      const tone = (v: string | null) => (v && /^[+-]\d{1,2}%$/.test(v) ? v : undefined);
      options
        .speak(text, {edge: voice, rate: tone(url.searchParams.get('rate')), pitch: tone(url.searchParams.get('pitch'))})
        .then(id => {
          if (!id) return sendJson(res, 503, {error: 'voice_unavailable'});
          res.writeHead(302, {location: `/voice/${id}.m4a`, 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=86400'});
          res.end();
        })
        .catch(() => sendJson(res, 503, {error: 'voice_unavailable'}));
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
