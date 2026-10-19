/**
 * Dev tool: headless phones. Join a room, wait for the game, then question a
 * character (after an optional delay) and print what the room sees.
 *   npx tsx apps/server/scripts/ask-bot.ts <code> <characterId> "<question>" [delayMs] [ws://host:4000/ws]
 */
import {WebSocket} from 'ws';
import type {ServerMessage} from '@roomriddle/shared-types';

const [code, characterId = 'voss', question = 'Where were you when the lights went out?', delay = '0', url = 'ws://127.0.0.1:4000/ws'] = process.argv.slice(2);
if (!code) throw new Error('usage: ask-bot <code> <characterId> <question> [delayMs] [url]');

function phone(name: string, onMessage: (m: ServerMessage, ws: WebSocket) => void): WebSocket {
  const ws = new WebSocket(url);
  ws.on('open', () => ws.send(JSON.stringify({type: 'JOIN_ROOM', roomCode: code, playerName: name})));
  ws.on('message', d => onMessage(JSON.parse(d.toString()) as ServerMessage, ws));
  return ws;
}

let asked = false;
phone(process.env.ASK_NAME2 ?? 'Mira', () => {});
phone(process.env.ASK_NAME ?? 'Aksh', (m, ws) => {
  if (m.type === 'ERROR') console.log(`[bot] ERROR ${m.code}: ${m.message}`);
  if ((m.type === 'GAME_STARTED' || (m.type === 'ROOM_JOINED' && m.room.status === 'playing')) && !asked) {
    asked = true;
    console.log(`[bot] game on; asking ${characterId} in ${delay} ms`);
    setTimeout(() => ws.send(JSON.stringify({type: 'ASK_CHARACTER', characterId, question})), Number(delay));
  }
  if (m.type === 'CHARACTER_THINKING') console.log(`[bot] ${m.characterId} thinking…`);
  if (m.type === 'CHARACTER_REPLY') console.log(`[bot] ${m.reply.characterName} (${m.reply.source}): ${m.reply.text}`);
  if (m.type === 'CHARACTER_VOICE') console.log(`[bot] voice ${m.audioUrl}`);
});
console.log(`[bot] joining ${code}`);
