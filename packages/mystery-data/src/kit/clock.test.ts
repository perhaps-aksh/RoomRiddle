import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import type {PlaceholderShape} from '@roomriddle/shared-types';
import {clockFace, handAngles} from './clock';
import {lastTrainManifest} from '../the-last-train/world/manifest';

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

/** Clockwise rotation of a point about the shape's pivot (or its centre). */
function rotatedPoint(s: PlaceholderShape, p: {x: number; y: number}) {
  const o = s.pivot ?? {x: s.x + s.w / 2, y: s.y + s.h / 2};
  const a = ((s.rotate ?? 0) * Math.PI) / 180;
  const dx = p.x - o.x;
  const dy = p.y - o.y;
  return {x: o.x + dx * Math.cos(a) - dy * Math.sin(a), y: o.y + dx * Math.sin(a) + dy * Math.cos(a)};
}

/** The far end of a hand (its top before rotation) after rotation. */
const tip = (h: PlaceholderShape) => rotatedPoint(h, {x: h.x + h.w / 2, y: h.y});
/** Reads the time back off the drawn hands: clockwise degrees from 12 about the pivot. */
const angleOf = (h: PlaceholderShape) => {
  const t = tip(h);
  const deg = (Math.atan2(t.x - h.pivot!.x, -(t.y - h.pivot!.y)) * 180) / Math.PI;
  return (deg + 360) % 360;
};
const readTime = (shapes: PlaceholderShape[]) => {
  const hour = angleOf(shapes.find(s => s.role === 'hand-hour')!);
  const minute = angleOf(shapes.find(s => s.role === 'hand-minute')!);
  return {hours: Math.floor(hour / 30) || 12, minutes: Math.round(minute / 6) % 60};
};
const shapesOf = (id: string) => {
  const a = lastTrainManifest.assets.find(x => x.id === id);
  assert.ok(a?.placeholder, id);
  return a.placeholder;
};

describe('clock faces', () => {
  test('hand angles: the hour hand moves with the minutes', () => {
    assert.deepEqual(handAngles({hours: 12, minutes: 0}), {hour: 0, minute: 0, second: 0});
    assert.deepEqual(handAngles({hours: 3, minutes: 0}), {hour: 90, minute: 0, second: 0});
    const a = handAngles({hours: 11, minutes: 47});
    assert.ok(near(a.hour, 353.5));
    assert.equal(a.minute, 282);
  });

  test('every hand turns about the centre of the face, and stays attached to it', () => {
    const shapes = clockFace({x: 10, y: 20, size: 200, time: {hours: 11, minutes: 47, seconds: 30}, secondHand: true});
    const hands = shapes.filter(s => s.role?.startsWith('hand-'));
    assert.equal(hands.length, 3);
    for (const h of hands) {
      assert.deepEqual(h.pivot, {x: 110, y: 120}, `${h.role} pivots on the centre`);
      // The pivot point lies on the hand's own centre line, inside it.
      assert.ok(near(h.x + h.w / 2, 110), `${h.role} is centred on the pivot`);
      assert.ok(h.y < 120 && h.y + h.h >= 120, `${h.role} reaches the pivot`);
      // After rotation the pivot is still where it was (the hand doesn't drift off the hub).
      const p = rotatedPoint(h, {x: 110, y: 120});
      assert.ok(near(p.x, 110) && near(p.y, 120));
    }
  });

  test('hands stay inside the face, minute longer than hour', () => {
    const shapes = clockFace({size: 200, time: {hours: 11, minutes: 59}});
    const face = shapes[1]!;
    const r = face.w / 2;
    const hour = shapes.find(s => s.role === 'hand-hour')!;
    const minute = shapes.find(s => s.role === 'hand-minute')!;
    for (const h of [hour, minute]) {
      const t = tip(h);
      assert.ok(Math.hypot(t.x - 100, t.y - 100) < r, `${h.role} tip inside the face`);
    }
    assert.ok(minute.h > hour.h);
  });

  test('the clocks of The Last Train show the times their clues state', () => {
    assert.deepEqual(readTime(shapesOf('last-train.clock')), {hours: 11, minutes: 59}, 'platform clock froze at 11:59');
    assert.deepEqual(readTime(shapesOf('last-train.waiting-room-clock')), {hours: 11, minutes: 53}, 'waiting-room clock reads 11:53');
    assert.deepEqual(readTime(shapesOf('last-train.pocket-watch')), {hours: 11, minutes: 47}, 'the watch stopped at 11:47');
  });

  test('the drawn clocks keep the faces inside their asset boxes', () => {
    for (const id of ['last-train.clock', 'last-train.waiting-room-clock', 'last-train.pocket-watch']) {
      const a = lastTrainManifest.assets.find(x => x.id === id)!;
      for (const s of (a.placeholder ?? []).filter(x => !x.pivot)) {
        assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= a.size.width && s.y + s.h <= a.size.height, `${id} ${s.role ?? s.color} within box`);
      }
    }
  });
});
