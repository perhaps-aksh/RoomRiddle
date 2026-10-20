/**
 * Dev tool for recording demos: one scripted phone ("Kabir") that joins a room
 * and then performs whatever lines are appended to a control file:
 *   DISCOVER_CLUE <clueId> | SUBMIT_ANSWER <puzzleId> <answer> | REQUEST_HINT <puzzleId> | ADVANCE_SCENE
 *   npx tsx apps/server/scripts/demo-bot.ts <roomCode> <controlFile> [name] [wsUrl]
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {WebSocket} from 'ws';
import {RoomClient, initialRoomView, memorySessionStore, reduceRoomView, type RoomView, type SocketLike} from '@roomriddle/client';
import type {ClientMessage} from '@roomriddle/shared-types';

const [code, control, name = 'Kabir', url = 'ws://127.0.0.1:4000/ws'] = process.argv.slice(2);
if (!code || !control) throw new Error('usage: demo-bot.ts <roomCode> <controlFile> [name] [wsUrl]');
let view: RoomView = initialRoomView;
const client = new RoomClient({url, store: memorySessionStore(), createSocket: u => new WebSocket(u) as unknown as SocketLike, backoff: [200]});
client.onMessage(m => {
  view = reduceRoomView(view, m);
  if (m.type === 'ERROR') console.log(`[${name}] ERROR ${m.code}: ${m.message}`);
});
client.send({type: 'JOIN_ROOM', roomCode: code, playerName: name});
if (!existsSync(control)) writeFileSync(control, '');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
let done = 0;
console.log(`[${name}] joining ${code}; control ${control}`);
for (;;) {
  const lines = readFileSync(control, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
  for (; done < lines.length; done++) {
    const [type, a = '', b = ''] = lines[done]!.split(/\s+/);
    if (type === 'QUIT') process.exit(0);
    let message: ClientMessage | null = null;
    if (type === 'DISCOVER_CLUE') message = {type, clueId: a};
    else if (type === 'SUBMIT_ANSWER') message = {type, puzzleId: a, answer: b};
    else if (type === 'REQUEST_HINT') message = {type, puzzleId: a};
    else if (type === 'ADVANCE_SCENE') message = {type};
    if (message) {
      client.send(message);
      console.log(`[${name}] ${lines[done]} (scene ${view.room?.gameState?.currentSceneId ?? '-'})`);
    }
  }
  await sleep(150);
}
