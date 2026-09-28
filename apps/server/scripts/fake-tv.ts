/**
 * Dev tool: a headless "TV" host. Creates a room, prints the code, logs every
 * server message, and starts the game once START_AT players are connected.
 *   npx tsx apps/server/scripts/fake-tv.ts [ws://host:4000/ws]
 * Env: START_AT (default 2), LOG_FILE (optional, appends JSON lines).
 */
import {appendFileSync} from 'node:fs';
import {WebSocket} from 'ws';
import type {ServerMessage} from '@roomriddle/shared-types';

const url = process.argv[2] ?? 'ws://127.0.0.1:4000/ws';
const startAt = Number(process.env.START_AT ?? 2);
const logFile = process.env.LOG_FILE;
const ws = new WebSocket(url);
let started = false;

ws.on('open', () => ws.send(JSON.stringify({type: 'CREATE_ROOM', requestId: 'tv-create'})));
ws.on('message', data => {
  const m = JSON.parse(data.toString()) as ServerMessage;
  if (logFile) appendFileSync(logFile, `${JSON.stringify(m)}\n`);
  const s = m.type === 'GAME_STATE_UPDATED' || m.type === 'GAME_STARTED' ? m.room.gameState : undefined;
  const extra =
    m.type === 'ROOM_CREATED' ? `code=${m.room.code} join=${m.room.joinUrl}`
    : m.type === 'PLAYER_JOINED' || m.type === 'PLAYER_UPDATED' ? `${m.player.name} connected=${m.player.connected} ready=${m.player.ready}`
    : m.type === 'GAME_STATE_UPDATED' ? `${m.update.cause} by ${m.update.actorName ?? '-'} score=${s?.score} scene=${s?.currentSceneId}`
    : m.type === 'GAME_COMPLETED' ? `ending=${m.endingId} score=${m.room.gameState?.score}`
    : m.type === 'ERROR' ? `${m.code}: ${m.message}`
    : '';
  console.log(`[tv] ${m.type} ${extra}`);
  if (!started && 'room' in m && m.room) {
    const online = m.room.players.filter(p => p.role === 'player' && p.connected).length;
    if (m.room.status === 'lobby' && online >= startAt) {
      started = true;
      ws.send(JSON.stringify({type: 'START_GAME', requestId: 'tv-start'}));
    }
  }
});
ws.on('close', code => {
  console.log(`[tv] closed ${code}`);
  process.exit(0);
});
