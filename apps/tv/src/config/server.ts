/**
 * Where the TV finds the RoomRiddle server (Phase 4).
 *
 * The server runs on the laptop (`npm run serve` at the repo root). The Vega
 * Virtual Device runs inside WSL2 and sees WSL as 10.0.2.2; the dev bridge
 * (`apps/tv/scripts/vvd-bridge.js`, run inside WSL) forwards that to the
 * Windows host, so this address survives DHCP changes and the TV app doesn't
 * need rebuilding when the laptop's LAN IP moves (FL-010). A real Fire TV on
 * the LAN would use the laptop's LAN IP here instead.
 */
export const SERVER_URL = 'ws://10.0.2.2:4000/ws';

/** The same server over HTTP (spoken replies are served at /voice/<id>). */
export function httpBase(wsUrl: string): string {
  return wsUrl.replace(/^ws(s?):/, 'http$1:').replace(/\/ws\/?$/, '');
}
