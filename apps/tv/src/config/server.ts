/**
 * Where the TV finds the RoomRiddle server (Phase 4).
 *
 * The server runs on the laptop on the same network (`npm run serve` at the
 * repo root prints the address). The Vega Virtual Device reaches the Windows
 * host at its LAN IP. When that IP changes (DHCP), update this line and
 * rebuild the TV app.
 */
export const SERVER_URL = 'ws://10.2.0.13:4000/ws';
