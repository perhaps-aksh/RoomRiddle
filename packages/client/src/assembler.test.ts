import assert from 'node:assert/strict';
import {test} from 'node:test';
import {MessageAssembler} from './assembler';

const joined = JSON.stringify({type: 'PLAYER_JOINED', room: {name: 'say "hi" {not a brace}', note: 'back\\slash \\" }'}, reveals: null});
const started = JSON.stringify({type: 'GAME_STARTED', pad: 'x'.repeat(9000), text: 'é—✓🚂 {[}]', nested: {a: [{b: {}}]}});

test('assembler: whole messages pass straight through', () => {
  const a = new MessageAssembler();
  assert.deepEqual(a.push(joined), [joined]);
  assert.deepEqual(a.push(started), [started]);
});

test('assembler: a message split in two (as the Vega client does: 677 + 212) is rebuilt', () => {
  const a = new MessageAssembler();
  const cut = Math.floor(joined.length * 0.76);
  assert.deepEqual(a.push(joined.slice(0, cut)), []);
  assert.deepEqual(a.push(joined.slice(cut)), [joined]);
});

test('assembler: every split point of a message, including inside strings and escapes', () => {
  for (let cut = 1; cut < joined.length; cut++) {
    const a = new MessageAssembler();
    const out = [...a.push(joined.slice(0, cut)), ...a.push(joined.slice(cut))];
    assert.deepEqual(out, [joined], `cut at ${cut}`);
  }
});

test('assembler: a large message in many pieces, then the next message whole', () => {
  const a = new MessageAssembler();
  const out: string[] = [];
  for (let at = 0; at < started.length; at += 1000) out.push(...a.push(started.slice(at, at + 1000)));
  out.push(...a.push(joined));
  assert.deepEqual(out, [started, joined]);
});

test('assembler: the tail of one message and the start of the next in one payload', () => {
  const a = new MessageAssembler();
  const stream = started + joined + started;
  const out = [...a.push(stream.slice(0, 5000)), ...a.push(stream.slice(5000, 9500)), ...a.push(stream.slice(9500))];
  assert.deepEqual(out, [started, joined, started]);
  for (const m of out) JSON.parse(m);
});

test('assembler: reset drops a partial message', () => {
  const a = new MessageAssembler();
  a.push(started.slice(0, 100));
  a.reset();
  assert.deepEqual(a.push(joined), [joined]);
});
