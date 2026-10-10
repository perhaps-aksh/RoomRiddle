import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createCharacterService} from './ai';
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
const rooms = new RoomManager(config);
let socketCount = () => 0;

const server = createAppServer({stats: () => ({rooms: rooms.size, connections: socketCount()})});
const sockets = attachGameSocket(server, rooms, {log, characters});
socketCount = () => sockets.connections.count;

server.listen(config.port, config.host, () => {
  console.log(`[roomriddle-server] listening on http://${config.host}:${config.port}`);
  console.log(`[roomriddle-server] WebSocket:  ws://<host>:${config.port}${WEBSOCKET_PATH}`);
  console.log(`[roomriddle-server] phones join at ${config.publicUrl}/join/<code>  (set PUBLIC_URL to override)`);
  console.log(`[roomriddle-server] players per room: ${config.minPlayers}–${config.maxPlayers}`);
  const voices = characters.providerNames;
  console.log(`[roomriddle-server] character voices: ${voices.length ? `${voices.join(' → ')} → authored` : 'authored lines only (no AI keys)'}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void sockets.close().then(() => server.close(() => process.exit(0)));
  });
}
