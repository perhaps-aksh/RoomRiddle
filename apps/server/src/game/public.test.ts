import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playableMysteries} from '@roomriddle/mystery-data';
import {toPublicMystery} from './GameSession';

test('no truth table, answer key or hint text ever reaches a client', () => {
  for (const mystery of playableMysteries) {
    const json = JSON.stringify(toPublicMystery(mystery));
    assert.ok(!('truth' in toPublicMystery(mystery)), `${mystery.summary.id} leaks its truth table`);
    for (const c of mystery.truth?.characters ?? []) {
      for (const f of c.facts) assert.ok(!json.includes(f.text), `${mystery.summary.id} leaks fact ${f.id}`);
    }
    for (const line of mystery.truth?.solution ?? []) assert.ok(!json.includes(line), `${mystery.summary.id} leaks its solution`);
    for (const p of mystery.puzzles) {
      for (const h of p.hints) assert.ok(!json.includes(h.text), `${mystery.summary.id} leaks hint ${h.id}`);
    }
  }
});
