import {test} from 'node:test';
import assert from 'node:assert/strict';
import {esc} from './html';

test('esc neutralises HTML in player names and server text', () => {
  assert.equal(esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(esc(`"Aksh" & 'Grace'`), '&quot;Aksh&quot; &amp; &#39;Grace&#39;');
});
