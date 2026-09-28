import {createAppServer} from './app';
import {loadConfig} from './config';
import {RoomManager} from './rooms/RoomManager';
import {attachGameSocket, WEBSOCKET_PATH} from './websocket/server';

const config = loadConfig();
const rooms = new RoomManager(config);
let socketCount = () => 0;

const server = createAppServer({stats: () => ({rooms: rooms.size, connections: socketCount()})});
const sockets = attachGameSocket(server, rooms, {log: line => console.log(line)});
socketCount = () => sockets.connections.count;

server.listen(config.port, config.host, () => {
  console.log(`[roomriddle-server] listening on http://${config.host}:${config.port}`);
  console.log(`[roomriddle-server] WebSocket:  ws://<host>:${config.port}${WEBSOCKET_PATH}`);
  console.log(`[roomriddle-server] phones join at ${config.publicUrl}/join/<code>  (set PUBLIC_URL to override)`);
  console.log(`[roomriddle-server] players per room: ${config.minPlayers}–${config.maxPlayers}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void sockets.close().then(() => server.close(() => process.exit(0)));
  });
}
