/**
 * Network clips (AI replies): fetched in JS and fed through MediaSource, because
 * the Vega player refuses plain http:// sources (FL-014).
 */
import {createW3cBackend} from '../src/audio/w3cBackend';
import {MediaSource, players} from './support/w3cmedia';

const sound = {id: 'reply.r1', channel: 'voice' as const, loop: false, status: 'final' as const, source: 'http://10.0.2.2:4000/voice/abc.m4a', description: 'reply'};
const flush = async () => {
  for (let i = 0; i < 6; i++) {
    await new Promise<void>(r => setTimeout(() => r(), 0));
  }
};
const g = globalThis as unknown as {fetch: typeof fetch}; // eslint-disable-line no-undef

beforeEach(() => {
  players.length = 0;
  MediaSource.created.length = 0;
});

test('an http clip is fetched and appended to a MediaSource, never set as the player src', async () => {
  const bytes = new ArrayBuffer(8);
  g.fetch = jest.fn(async () => ({ok: true, status: 200, arrayBuffer: async () => bytes})) as unknown as typeof fetch;
  (URL as unknown as {createObjectURL: (o: unknown) => string}).createObjectURL = () => 'blob:ms-1';
  const ended = jest.fn();
  const backend = createW3cBackend(ended, () => undefined);
  backend.play(1, sound, 0.8, sound.source);
  await flush();
  expect(g.fetch).toHaveBeenCalledWith('http://10.0.2.2:4000/voice/abc.m4a');
  expect(players[0]!.src).toBe('blob:ms-1');
  expect(MediaSource.created[0]!.appended).toEqual([bytes]);
  expect(MediaSource.created[0]!.ended).toBe(true);
  expect(ended).not.toHaveBeenCalled();
});

test('a failed fetch ends the sound (subtitle stays, nothing hangs)', async () => {
  g.fetch = jest.fn(async () => ({ok: false, status: 404})) as unknown as typeof fetch;
  const ended = jest.fn();
  const backend = createW3cBackend(ended, () => undefined);
  backend.play(2, sound, 0.8, sound.source);
  await flush();
  expect(ended).toHaveBeenCalledWith(2);
  expect(MediaSource.created).toHaveLength(0);
});
