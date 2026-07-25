import { describe, it } from 'node:test';
import assert from 'node:assert';
import worker from '../src/index.js';

describe('Worker ROUTE_MAP fetch router', () => {
  it('should return 200 OK for direct browser GET status requests', async () => {
    const req = new Request('https://termsradar.workers.dev/status', { method: 'GET' });
    const res = await worker.fetch(req, {}, {});
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'online');
  });

  it('should return 204 No Content for OPTIONS preflight requests', async () => {
    const req = new Request('https://termsradar.workers.dev/analyze-tc', { method: 'OPTIONS' });
    const res = await worker.fetch(req, {}, {});

    assert.strictEqual(res.status, 204);
  });

  it('should return 404 for unmapped endpoints', async () => {
    const req = new Request('https://termsradar.workers.dev/non-existent', { method: 'POST' });
    const res = await worker.fetch(req, {}, {});
    const data = await res.json();

    assert.strictEqual(res.status, 404);
    assert.strictEqual(data.error, 'Endpoint not found');
  });
});
