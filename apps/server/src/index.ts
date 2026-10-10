import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createCharacterService, createVoiceService} from './ai';
import {createAppServer} from './app';
import {loadConfig} from './config';
import {RoomManager} from './rooms/RoomManager';
import {attachGameSocket, WEBSOCKET_PATH} from './websocket/server';

// Secrets live in apps/server/.env (git-ignored). Real environment variables win.
const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const config = loadConfig();
const log = (line: string) => console.log(line);
const characters = createCharacterService(config.ai, log);
const voices = createVoiceService(config.ai, log);

// msedge-tts is an unofficial client; a fault inside its socket handler must not take the game down.
process.on('uncaughtException', err => {
  if (/msedge-tts/.test(err?.stack ?? '')) {
    log(`[voice] ignored msedge-tts fault: ${err.message}`);
    return;
  }
  console.error(err);
  process.exit(1);
});
const rooms = new RoomManager(config);
let socketCount = () => 0;

const server = createAppServer({stats: () => ({rooms: rooms.size, connections: socketCount()}), voiceClip: id => {
  const clip = voices.clip(id);
  log(`[voice] GET ${id} ${clip ? "200" : "404"}`);
  return clip;
}});
const sockets = attachGameSocket(server, rooms, {log, characters, voices});
socketCount = () => sockets.connections.count;

server.listen(config.port, config.host, () => {
  console.log(`[roomriddle-server] listening on http://${config.host}:${config.port}`);
  console.log(`[roomriddle-server] WebSocket:  ws://<host>:${config.port}${WEBSOCKET_PATH}`);
  console.log(`[roomriddle-server] phones join at ${config.publicUrl}/join/<code>  (set PUBLIC_URL to override)`);
  console.log(`[roomriddle-server] players per room: ${config.minPlayers}–${config.maxPlayers}`);
  const providers = characters.providerNames;
  console.log(`[roomriddle-server] character replies: ${providers.length ? `${providers.join(' → ')} → authored` : 'authored lines only (no AI keys)'}`);
  console.log(`[roomriddle-server] spoken replies: ${voices.enabled ? voices.providerNames.join(' → ') : 'off (subtitles only)'}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void sockets.close().then(() => server.close(() => process.exit(0)));
  });
}
