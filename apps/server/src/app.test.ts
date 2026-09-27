import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createAppServer } from './app';

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createAppServer();
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
    assert.deepEqual(await res.json(), { status: 'ok', service: 'roomriddle-server', mysteries: 4 });
  });
});

test('unknown routes return 404', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/nope`);
    assert.equal(res.status, 404);
  });
});
