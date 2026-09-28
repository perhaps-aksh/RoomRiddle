/**
 * Dev tool: two scripted "phones" join a room over a real server and play The
 * Last Train to an ending, alternating actions, using the same
 * @roomriddle/client the phone app uses. One phone drops and resumes midway.
 *   npx tsx apps/server/scripts/play-bots.ts <roomCode> [ws://host:4000/ws]
 */
import {WebSocket} from 'ws';
import {RoomClient, initialRoomView, memorySessionStore, reduceRoomView, type RoomView, type SocketLike} from '@roomriddle/client';
import type {ClientMessage, ServerMessage} from '@roomriddle/shared-types';

const [code, url = 'ws://127.0.0.1:4000/ws'] = process.argv.slice(2);
if (!code) throw new Error('usage: play-bots.ts <roomCode> [wsUrl]');

class Bot {
  view: RoomView = initialRoomView;
  client: RoomClient;
  private waiters: {id: string; resolve: (m: ServerMessage) => void}[] = [];
  constructor(readonly name: string) {
    this.client = new RoomClient({
      url,
      store: memorySessionStore(),
      createSocket: u => new WebSocket(u) as unknown as SocketLike,
      backoff: [200],
    });
    this.client.onMessage(m => {
      this.view = reduceRoomView(this.view, m);
      const w = this.waiters.find(x => x.id === m.requestId);
      if (w) {
        this.waiters = this.waiters.filter(x => x !== w);
        w.resolve(m);
      }
    });
  }
  do(message: ClientMessage): Promise<ServerMessage> {
    const id = this.client.send(message);
    return new Promise((resolve, reject) => {
      this.waiters.push({id, resolve});
      setTimeout(() => reject(new Error(`${this.name}: no reply to ${message.type}`)), 5000);
    });
  }
  get state() {
    return this.view.room?.gameState;
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const bots = [new Bot('Aksh'), new Bot('Grace')];
for (const b of bots) {
  const r = await b.do({type: 'JOIN_ROOM', roomCode: code, playerName: b.name});
  console.log(`[${b.name}] ${r.type}${r.type === 'ERROR' ? ` ${r.code}` : ''}`);
}
while (bots[0]!.view.room?.status !== 'playing') await sleep(100);
console.log('[bots] game started by the TV');

const plan: [string, string][][] = [
  [['DISCOVER_CLUE', 'platform-clock'], ['DISCOVER_CLUE', 'company-notice'], ['DISCOVER_CLUE', 'waiting-room-clock'], ['SUBMIT_ANSWER', 'station-clock:1159'], ['REQUEST_HINT', 'station-clock'], ['SUBMIT_ANSWER', 'station-clock:1147'], ['ADVANCE_SCENE', '']],
  [['DISCOVER_CLUE', 'torn-ticket'], ['DISCOVER_CLUE', 'departure-board'], ['DISCOVER_CLUE', 'carriage-plan'], ['SUBMIT_ANSWER', 'torn-ticket:207|c|7'], ['ADVANCE_SCENE', '']],
  [['DISCOVER_CLUE', 'pocket-watch'], ['DISCOVER_CLUE', 'conductors-ledger'], ['DROP', ''], ['DISCOVER_CLUE', 'seat-eight-card'], ['DISCOVER_CLUE', 'wired-brake'], ['SUBMIT_ANSWER', 'conductors-ledger:voss|carriage-c|1147'], ['ADVANCE_SCENE', '']],
  [['DISCOVER_CLUE', 'blackwater-lever'], ['DISCOVER_CLUE', 'lamp-room-door'], ['SUBMIT_ANSWER', 'final-signal:voss-sabotage']],
];

let turn = 0;
for (const scene of plan) {
  for (const [type, arg] of scene) {
    const bot = bots[turn++ % 2]!;
    if (type === 'DROP') {
      const before = bot.client.session?.playerId;
      (bot.client as unknown as {socket: {close: (c: number) => void}}).socket.close(3001); // simulate a network drop
      while (bot.client.connectionStatus !== 'open' || bot.view.connection === 'reconnecting') await sleep(50);
      await sleep(300);
      console.log(`[${bot.name}] dropped + resumed; same seat=${bot.client.session?.playerId === before}; players=${bot.view.room?.players.length}`);
      continue;
    }
    let message: ClientMessage;
    if (type === 'DISCOVER_CLUE') message = {type, clueId: arg};
    else if (type === 'REQUEST_HINT') message = {type, puzzleId: arg};
    else if (type === 'SUBMIT_ANSWER') {
      const [puzzleId, answer] = arg.split(/:(.*)/s) as [string, string];
      message = {type, puzzleId, answer};
    } else message = {type: 'ADVANCE_SCENE'};
    const reply = await bot.do(message);
    const s = bot.state;
    const events = reply.type === 'GAME_STATE_UPDATED' ? reply.update.events.map(e => e.type).join(',') : reply.type === 'ERROR' ? `ERROR ${reply.code}` : reply.type;
    console.log(`[${bot.name}] ${type} ${arg} -> ${events} | score=${s?.score} scene=${s?.currentSceneId}`);
  }
}
await sleep(500);
const [a, b] = bots.map(x => x.view.room!);
console.log(`[bots] status A=${a!.status} B=${b!.status}; ending=${a!.reveals?.ending?.title}; score A=${a!.gameState?.score} B=${b!.gameState?.score}`);
console.log(`[bots] states identical: ${JSON.stringify(a!.gameState) === JSON.stringify(b!.gameState)}`);
for (const x of bots) x.client.close();
process.exit(0);
