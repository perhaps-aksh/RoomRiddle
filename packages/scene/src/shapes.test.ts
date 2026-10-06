import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import type {PlaceholderShape} from '@roomriddle/shared-types';
import {pivotFrame, rotatedPoint, scaleShape} from './shapes';

const hand: PlaceholderShape = {x: 98, y: 30, w: 4, h: 70, color: 'ink', rotate: 90, pivot: {x: 100, y: 100}};

describe('shape geometry', () => {
  test('a pivoted shape sits in a square frame centred on the pivot', () => {
    const pf = pivotFrame(hand)!;
    assert.equal(pf.frame.x + pf.frame.size / 2, 100);
    assert.equal(pf.frame.y + pf.frame.size / 2, 100);
    // Placing the inner box back in the frame gives the original position.
    assert.equal(pf.frame.x + pf.inner.x, 98);
    assert.equal(pf.frame.y + pf.inner.y, 30);
    // Large enough for the shape at any angle.
    assert.ok(pf.frame.size / 2 >= 70);
  });

  test('without a pivot there is no frame', () => {
    assert.equal(pivotFrame({...hand, pivot: undefined}), null);
  });

  test('rotation about the pivot: a hand pointing at 12 turned 90° points at 3', () => {
    const tip = rotatedPoint(hand, {x: 100, y: 30});
    assert.ok(Math.abs(tip.x - 170) < 1e-9 && Math.abs(tip.y - 100) < 1e-9);
  });

  test('scaling scales the pivot too, so hands stay on the hub of a resized clock', () => {
    const s = scaleShape(hand, 0.5, 0.5);
    assert.deepEqual(s.pivot, {x: 50, y: 50});
    assert.equal(s.x + s.w / 2, 50);
    assert.equal(scaleShape(hand, 1, 1), hand);
  });
});
