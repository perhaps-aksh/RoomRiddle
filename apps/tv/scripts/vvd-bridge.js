#!/usr/bin/env node
/**
 * vvd-bridge: gives the Vega Virtual Device a fixed address for the dev server.
 *
 * The VVD runs inside WSL2 and sees WSL's loopback as 10.0.2.2. The server runs
 * on Windows, whose LAN IP changes with DHCP (which used to mean editing
 * SERVER_URL and rebuilding the TV app). This forwards WSL :4000 to the
 * Windows host (WSL's default gateway), so the TV can always use
 * ws://10.0.2.2:4000/ws. Phones keep using the Windows LAN IP.
 *
 * Usage (from Windows): wsl.exe -d Ubuntu-24.04 -- node /mnt/d/RoomRiddle/apps/tv/scripts/vvd-bridge.js
 * No dependencies (node:net only). Dev tooling, not shipped in the app.
 */
const net = require('node:net');
const fs = require('node:fs');

const PORT = Number(process.env.PORT || 4000);

function windowsHost() {
  if (process.env.TARGET_HOST) {
    return process.env.TARGET_HOST;
  }
  // /proc/net/route: default route's gateway, little-endian hex.
  const line = fs
    .readFileSync('/proc/net/route', 'utf8')
    .split('\n')
    .find(l => l.split(/\s+/)[1] === '00000000');
  if (!line) {
    throw new Error('no default route; set TARGET_HOST');
  }
  const hex = line.split(/\s+/)[2];
  return [6, 4, 2, 0].map(i => parseInt(hex.slice(i, i + 2), 16)).join('.');
}

const target = windowsHost();
const server = net.createServer(client => {
  const upstream = net.connect(PORT, target);
  // Small WebSocket frames must not wait on Nagle/delayed-ACK through the emulator's NAT.
  client.setNoDelay(true);
  upstream.setNoDelay(true);
  client.pipe(upstream).pipe(client);
  if (process.env.BRIDGE_DEBUG) {
    const t0 = Date.now();
    const log = (dir, n) => console.log(`[${client.remotePort}] +${Date.now() - t0}ms ${dir} ${n}B`);
    client.on('data', d => log('tv->srv', d.length));
    upstream.on('data', d => log('srv->tv', d.length));
    client.on('close', () => log('closed', 0));
  }
  const close = () => {
    client.destroy();
    upstream.destroy();
  };
  client.on('error', close);
  upstream.on('error', close);
});
server.listen(PORT, '0.0.0.0', () => console.log(`vvd-bridge: 10.0.2.2:${PORT} (WSL) -> ${target}:${PORT} (Windows)`));
