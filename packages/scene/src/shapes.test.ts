import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import type {PlaceholderShape} from '@roomriddle/shared-types';
import {pivotFrame, rotatedPoint, scaleShape} from './shapes';
import {focusNeighbors, tagSide} from './layout';

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

describe('focus tag placement', () => {
  const tag = {width: 300, height: 60, gap: 18};
  const box = (x: number, y: number, width: number, height: number) => ({x, y, width, height});
  test('above by default', () => {
    assert.equal(tagSide(box(800, 600, 100, 100), [], tag, 140), 'above');
  });
  test('below when above would sit under the header', () => {
    assert.equal(tagSide(box(800, 150, 100, 100), [], tag, 140), 'below');
  });
  test('below when above would cover another object (notice under the clock)', () => {
    const clock = box(220, 130, 200, 200);
    const notice = box(230, 360, 180, 120);
    assert.equal(tagSide(notice, [clock], tag, 140), 'below');
  });
  test('when both sides collide, the side covering less wins', () => {
    const o = box(800, 500, 100, 100);
    assert.equal(tagSide(o, [box(800, 400, 100, 60), box(800, 620, 100, 60), box(700, 640, 100, 40)], tag, 140), 'above');
  });
});

describe('remote focus neighbours', () => {
  const b = (x: number, y: number, w = 100, h = 100) => ({x, y, width: w, height: h});
  // The station on screen: clock and notice stacked on the left, suitcase below them,
  // waiting-room clock mid-top, paper on the bench mid-bottom.
  const station = new Map([
    ['clock', b(220, 130, 200, 200)],
    ['notice', b(230, 360, 180, 120)],
    ['suitcase', b(300, 700, 170, 120)],
    ['waiting', b(890, 370, 90, 90)],
    ['paper', b(780, 700, 150, 60)],
  ]);
  const n = focusNeighbors(station);
  test('Up from the suitcase goes to the notice above it, not elsewhere', () => {
    assert.equal(n.get('suitcase')!.up, 'notice');
    assert.equal(n.get('notice')!.up, 'clock');
  });
  test('Down retraces, and the bottom row has no Down (native focus reaches the bar)', () => {
    assert.equal(n.get('clock')!.down, 'notice');
    assert.equal(n.get('notice')!.down, 'suitcase');
    assert.equal(n.get('suitcase')!.down, undefined);
    assert.equal(n.get('paper')!.down, undefined);
  });
  test('Left/Right move along the row', () => {
    assert.equal(n.get('suitcase')!.right, 'paper');
    assert.equal(n.get('paper')!.left, 'suitcase');
    assert.equal(n.get('notice')!.right, 'waiting');
    assert.equal(n.get('clock')!.left, undefined);
  });
});
