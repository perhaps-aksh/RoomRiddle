import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createAppServer } from './app';

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createAppServer({ playerDir: '/nonexistent' });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('GET /health reports ok and sees the mystery catalog', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok', service: 'roomriddle-server', mysteries: 5 });
  });
});

test('serves the player app for / and /join/<code>, and blocks path traversal', async () => {
  const { mkdtempSync, writeFileSync, mkdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'rr-player-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>RoomRiddle</title>');
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'assets', 'app.js'), 'console.log(1)');
  const server = createAppServer({ playerDir: dir });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  try {
    for (const path of ['/', '/join/4827']) {
      const res = await fetch(base + path);
      assert.equal(res.status, 200);
      assert.match(await res.text(), /RoomRiddle/);
    }
    const js = await fetch(`${base}/assets/app.js`);
    assert.equal(js.headers.get('content-type'), 'text/javascript; charset=utf-8');
    assert.equal((await fetch(`${base}/..%2F..%2Fpackage.json`)).status, 404);
    assert.equal((await fetch(`${base}/%E0%A4%A`)).status, 404);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('unknown routes return 404', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/nope`);
    assert.equal(res.status, 404);
  });
});

test('serves spoken replies by id, immutable, and 404s unknown or malformed ids', async () => {
  const data = Buffer.from('ID3fake-mp3');
  const server = createAppServer({ playerDir: '/nonexistent', voiceClip: (id) => (id === 'abcdef0123456789abcd' ? { data, mime: 'audio/mpeg' } : undefined) });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  try {
    const ok = await fetch(`${base}/voice/abcdef0123456789abcd.mp3`);
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('content-type'), 'audio/mpeg');
    assert.match(ok.headers.get('cache-control') ?? '', /immutable/);
    assert.deepEqual(Buffer.from(await ok.arrayBuffer()), data);
    const part = await fetch(`${base}/voice/abcdef0123456789abcd.mp3`, { headers: { range: 'bytes=3-6' } });
    assert.equal(part.status, 206);
    assert.equal(part.headers.get('content-range'), `bytes 3-6/${data.length}`);
    assert.equal(Buffer.from(await part.arrayBuffer()).toString(), 'fake');
    const tail = await fetch(`${base}/voice/abcdef0123456789abcd.mp3`, { headers: { range: 'bytes=-3' } });
    assert.equal(Buffer.from(await tail.arrayBuffer()).toString(), 'mp3');
    assert.equal((await fetch(`${base}/voice/abcdef0123456789abcd.mp3`, { headers: { range: 'bytes=99-' } })).status, 416);
    assert.equal((await fetch(`${base}/voice/0000000000000000.mp3`)).status, 404);
    assert.equal((await fetch(`${base}/voice/..%2F..%2Fsecret`)).status, 404);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
