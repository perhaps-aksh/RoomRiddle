import { createAppServer } from './app';

const port = Number(process.env.PORT ?? 4000);
// Loopback by default. Phones on the LAN need HOST=0.0.0.0 (Phase 4).
const host = process.env.HOST ?? '127.0.0.1';

const server = createAppServer();

server.listen(port, host, () => {
  console.log(`[roomriddle-server] listening on http://${host}:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
